var mysql = require('mysql');
var request = require('request');
var fs = require('fs');

function sleep(seconds){
    console.log("Sleeping for " + seconds);
    var currentTime = new Date().getTime();

    while(currentTime + (seconds * 1000) >= new Date().getTime()){}
}

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

function insertToDB(conn){
    //get only unique artists
    //artistInfo = [... new Set(artistInfo)];

    //artistInfoFinal = [];
    //split into arr of arrs for bulk insert
    //for(artist in artistInfo){
    //    artistInfoFinal.push(artistInfo[artist].split("////"));
    //}

    if(genreList.length > 0){
        conn.query("insert ignore into artist_info (id, name, image_url)  VALUES ?", [artistInfo], 
            function(err){
                if(err){
                    console.log("ERROR INSERTING RECORD INTO artist_info :" + err);
                }
                else{
                    console.log("Inserted " + artistInfo.length + " records.");
                    genreList = [];
                }
        });
    }
}


function getAccessToken(callback){
    var options = {
        url: "https://accounts.spotify.com/api/token",
        method: "post",
        form: {
            grant_type: "client_credentials"
        },
        headers: {
            "Authorization": "Basic " + Buffer.from(clientID + ":" + clientSecret).toString("base64") 
        },
        json:true
    }

    function respCallback(err, resp, body){
        if(typeof resp == "undefined" | resp.statusCode != 200){
            console.log("ERROR RETRIEVING ACCESS TOKEN");

            if(typeof resp == "undefined")
                console.log("UNDEFINED RESPONSE");
            else
                console.log(resp);
            if(typeof body == "undefined")
                console.log("UNDEFINED BODY");
            else
                console.log(body);
            if(typeof err == "undefined")
                console.log("UNDEFINED ERR");
            else
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

function scrapeSearchResults(conn, albumObj){
    for(artist in albumObj.artists){
        if(albumObj.artists[artist].name.replace(/[^\x00-\x7F]/g, "") != "")
            ids.push([albumObj.artists[artist].id, albumObj.id]);
    }
}

function scrapeArtistSearchResults(conn, artistObj, lastFlag){
    if(artistObj.name.replace(/[^\x00-\x7F]/g, "") != ""){
        if(typeof artistObj.images[0] != "undefined")
            artistInfo.push([artistObj.id, artistObj.name, artistObj.images[0].url]);
        else
            artistInfo.push([artistObj.id, artistObj.name, ""]);

        genreList.push([artistObj.id, artistObj.genres]);

        if(lastFlag == true){
            console.log("Inserting records to artist_info");
            insertToDB(conn);  
        }
    }
}

function analyzeSearchResults(conn, err, resp, body){
    if(typeof resp != "undefined" && resp.statusCode == 200){
        if(sleeping){
            sleeping = false;
            console.log("Done sleeping");
        }
        if(body.albums.total > 0){
            for (album in body.albums.items){
                scrapeSearchResults(conn, body.albums.items[album]);
            }
            if(body.albums.next){
                    var options = {
                        url: body.albums.next,
                        method: "get",
                        headers: {
                            "Authorization": resp.request.headers.Authorization 
                        },
                        json:true
                    }
                
                request(options, function(err, resp, body){
                    analyzeSearchResults(conn, err, resp, body);
                });
            }
            else{
                console.log("Found " + ids.length + " artists with new music in the last 2 weeks.");
                getArtistDetail(conn, ids);
            }
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
            analyzeSearchResults(conn, err, resp, body);
        });
    }

    else{
        console.log("ERROR WITH INITIAL SEARCH QUERY");
        if(typeof resp == "undefined")
            console.log("UNDEFINED RESPONSE");
        else
            console.log(resp);
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

function searchForArtistDetail(conn){
    var lastFlag = false;
    var artistIdList = "";

    console.log(new Date().getTime() + ": " + artistIds.length + " artists left");
    for(var i = 0; i < 50; i++){
        if(artistIds.length == 0){
            lastFlag = true;
            clearInterval(searchingForDetail);
            break;
        }
        artistIdList += artistIds.pop() + ",";
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
    
    if(startTime + ((expiresIn - 500) * 1000) > new Date().getTime()){
        startTime = new Date.getTime();
        console.log("Getting new access token");
        getAccessToken();
    }
}

function getArtistDetail(conn){
    //get only unique artist ids
    for(var id in ids){
        artistIds.push(ids[id][0]);
    }
    artistIds = [... new Set(artistIds)];

    console.log("Starting to look for " + artistIds.length + " unique artist details, but sleeping first");
    sleep(120);

    searchingForDetail = setInterval(function(){
        if(artistIds.length > 0)
            searchForArtistDetail(conn);
    }, 5000);
}

function searchForArtists(conn){
    var options = {
        url: "https://api.spotify.com/v1/search?q=tag:new&type=album&market=US&limit=50",
        method: "get",
        headers: {
            "Authorization": "Bearer " + accessToken 
        },
        json:true
    }

    request(options, function(err, resp, body){
        analyzeSearchResults(conn, err, resp, body);
    });
}

function runWeeklyUpdate(conn){
    getAccessToken(function(){
        searchForArtists(conn);
    });
}

var sleeping = false;

// [0] - artist id, [1] - album id
var ids = [];
var artistInfo = [];
var genreList = [];
var artistIds = [];

var accessToken;
var refreshToken;
var expiresIn;

var startTime = new Date().getTime();
console.log("Starting data collection at: " + startTime);

var config = {
    host: "127.0.0.1",
    user: "node",
    password: "nodejs",
    database: "spotify_artist_finder_db"
}

clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
clientSecret = "378b8df5f7504b8f925ed729fdae3763";

connectToDatabase(config, function(conn){
    runWeeklyUpdate(conn);
});
