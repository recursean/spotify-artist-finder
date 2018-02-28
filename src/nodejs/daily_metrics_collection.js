var mysql = require('mysql');
var request = require('request');
var nodemailer = require('nodemailer');

function sleep(seconds){
    console.log("Sleeping for " + seconds);
    var currentTime = new Date().getTime();

    while(currentTime + (seconds * 1000) >= new Date().getTime()){}
}

//put in sep file??
function connectToDatabase(config, callback){
    console.log("Connecting to database...");

    var conn = mysql.createConnection(config);

    conn.connect(function(err) {
        if(err){
            console.log("ERROR CONNECTING TO DATABASE: " + err);
            process.exit(1);
        }
        else{
            console.log("Connected");
            callback(conn);
        }
    });
}

//put in sep file??
function getAccessToken(callback){
    var options = {
        url: "https://accounts.spotify.com/api/token",
        method: "post",
        form: {
            grant_type: "client_credentials"
        },
        headers:{
            "Authorization": "Basic " + Buffer.from(clientID + ":" + clientSecret).toString("base64")
        },
        json:true
    }

    function respCallback(err, resp, body){
        if(resp.statusCode != 200){
            console.log("ERROR RETRIEVING ACCESS TOKEN");
            console.log(err);
            process.exit(1);
        }
        else{
            console.log("Spotify access token retrieved");
            accessToken = body.access_token;
            expiresIn = parseInt(body.expires_in) - 500;
            if(callback)
                callback();
        }
    }

    request(options, respCallback);
}

function sendUpdate(conn, numMetrics){
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
           user: 'spotifyartistfinder@gmail.com',
            pass: 'finderartistspotify'
        }
    });

    var time = new Date().getTime() - initTime;

    var mailOptions = {
        from: 'spotifyartistfinder@gmail.com',
        to: 'seanmcshane96@gmail.com',
        subject: 'Daily Metric Collection',
        text: 'Daily metric collection process has completed.\n\n Total Artists: ' + numMetrics + '\n\nTook ' + time + 'ms'
    };

    transporter.sendMail(mailOptions, function(err, info){
        if(err){
            console.log('ERROR SENDING EMAIL UPDATE' + err);
            process.exit(1);
        }
        else{
            console.log('Email update sent. Exiting...');
            conn.end(function(err){
                if(err)
                    console.log("ERROR CLOSING DATABASE CONNECTION" + err);
                process.exit();
            });
        }
    });
}

function insertToDatabase(conn){
    conn.query("insert ignore into artist_metrics (id, followers, popularity) VALUES ?", [metrics],
        function(err){
            if(err){
                console.log("ERROR INSERTING INTO ARTIST_METRICS " + err);
                process.exit(1);
            }
            else{
                console.log("Inserted " + metrics.length + " artist metrics.");
                sendUpdate(conn, metrics.length);
            }
        });
}

function scrapeArtistSearchResults(conn, artistObj, lastFlag){
    metrics.push([artistObj.id, artistObj.followers.total, artistObj.popularity]);

    if(lastFlag){
        console.log("Inserting to DB");
        insertToDatabase(conn);
    }
}

function analyzeArtistSearchResults(conn, err, resp, body, lastFlag){
    if(typeof resp != "undefined" && resp.statusCode == 200){
        if(sleeping){
            sleeping = false;
            console.log("Done sleeping");
        }
        for (artist in body.artists){
            scrapeArtistSearchResults(conn, body.artists[artist], lastFlag);
            if(lastFlag)
                lastFlag = false;
        }
    }

    else if(typeof resp != "undefined" && (resp.statusCode == 429 || resp.statusCode == 502 || resp.statusCode == 503)){
        //don't sleep for each 429 recieved after the first, as they were all sent during retry-after period. thus should be good after sleep
        if(!sleeping){
            sleeping = true;
            if(resp.statusCode == 429)
                sleep(resp.caseless.dict['retry-after']);
            //502 --> Bad Gateway, 503 --> service unavailable, assuming overload of traffic
            else
                sleep(10);
        }
        var options = {
            url: resp.request.href,
            method: "get",
            headers: {
                "Authorization": resp.request.headers.Authorization
            },
            json: true
        }

        request(options, function(err, resp, body){
            analyzeArtistSearchResults(conn, err, resp, body, lastFlag);
        });
    }

    else{
        console.log("ERROR WITH ARTIST DETAILS SEARCH QUERY");
        if(typeof resp == "undefined")
            console.log("UNDEFINED RESPONSE");
        else
            console.log(resp);
        if(typeof body == "undefined")
            console.log("UNDEFINED BODY");
        else
            console.log(body);
        if(typeof err == "undefined")
            console.log("UNDEFINED RESPONSE");
        else
            console.log(err);
    }
}

function searchForArtistMetrics(conn){
    var lastFlag = false;
    var artistIdList = "";
     
    console.log(new Date().getTime() + ": " + ids.length + " artists left");
     
    for(var i = 0; i < 50; i++){
        if(ids.length == 0){
            lastFlag = true;
            clearInterval(searchingForMetrics);
            break;
        }
        artistIdList += ids.pop().id + ",";
    }
    var options = {
        url: "https://api.spotify.com/v1/artists?ids=" + artistIdList.substring(0, artistIdList.length-1),
        method: "get",
        headers: {
            "Authorization": "Bearer " + accessToken 
        },
        json:true
    }
 
    request(options, function(err, resp, body){
        analyzeArtistSearchResults(conn, err, resp, body, lastFlag);
    });

    artistIdList = "";
    if(startTime + ((expiresIn - 500) * 1000) < new Date().getTime()){
        startTime = new Date().getTime();
        console.log("Getting new access token");
        getAccessToken();
    }
}

function runDailyUpdate(conn){
    getAccessToken(function(){
        conn.query("select id from artist_info;", 
                    function(err, rows){
                        if(err){
                            console.log("ERROR SELECTING IDs FROM DB: " + err);
                            process.exit(1);
                        }
                        else{
                            ids = rows;
                            console.log("Selected " + rows.length + " IDs from artist_info table");
                            searchingForMetrics = setInterval(function(){
                                if(ids.length > 0)
                                    searchForArtistMetrics(conn);
                            }, 1000);
                        }
                    });
    });
}

var sleeping = false;

var ids = [];
//[artist id, followers, popularity]
var metrics = [];

var accessToken;
var expiresIn;

var startTime = new Date().getTime();
var initTime = startTime;
console.log("Starting data collection at: " + startTime);

var config = {
    host: "127.0.0.1",
    user: "node",
    password: "nodejs",
    database: "spotify_artist_finder_db"
}

var clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
var clientSecret = "378b8df5f7504b8f925ed729fdae3763";

connectToDatabase(config, function(conn){
    runDailyUpdate(conn);
});
