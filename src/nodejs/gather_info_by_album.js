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

function insertToDB(conn, ids, names){
    //ids & names arr will have same length
    for(i = 0; i < ids.length; i++){
        console.log("inserting record for " + names[i]);
        conn.query("insert into artist_info (id, name)  VALUES( '" + ids[i] + "','" + names[i].replace("'", "\\'")  + "')", 
            function(err){
                if(err){
                    console.log("ERROR INSERTING RECORD INTO artist_info for: " + names[i] + ":" + err);
                }
        });
    }
}

var config = {
    host: "127.0.0.1",
    user: "node",
    password: "nodejs",
    database: "spotify_artist_finder_db"
}

function getAccessToken(clientID, clientSecret, callback){
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
        if(resp.statusCode != 200){
            console.log("ERROR RETRIEVING ACCESS TOKEN");
            console.log(err);
            process.exit(1);
        }
        else{
            console.log("Spotify access token retrieved");
            callback(body.access_token);
        }
    }

    request(options, respCallback);
}

function scrapeAlbumResults(conn, albumObj){
    var ids = [];
    var names = [];

    for(artist in albumObj.artists){
        ids.push(albumObj.artists[artist].id);
        names.push(albumObj.artists[artist].name);
    }
    
    insertToDB(conn, ids, names);
}

function analyzeResults(conn, err, resp, body){
    if(typeof resp != "undefined" && resp.statusCode == 200){
        if(sleeping){
            sleeping = false;
            console.log("Done sleeping");
        }
        if(body.albums.total > 0){
            for (album in body.albums.items){
                scrapeAlbumResults(conn, body.albums.items[album]);
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
                    analyzeResults(conn, err, resp, body);
                });
            }
        }
    }

    else if(typeof resp != "undefined" && (resp.statusCode == 429 || resp.statusCode == 502)){
        //don't sleep for each 429 recieved after the first, as they were all sent during retry-after period. thus should be good after sleep
        if(!sleeping){
            sleeping = true;
            if(resp.statusCode == 429)
                sleep(resp.caseless.dict['retry-after']);
            //502 --> Bad Gateway, assuming overload of traffic
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
            analyzeResults(conn, err, resp, body);
        });
    }

    else{
        console.log("ERROR WITH ALBUM SEARCH QUERY");
        if(typeof resp == "undefined")
            console.log("UNDEFINED RESPONSE");
        else
            console.log(resp);
    }


}

function searchForArtists(accessToken, conn){
    var alphabet = "abcdefghijklmnopqrstuvwxyz".split("");
    for (letterAlbum in alphabet){
        for(letterArtist in alphabet){
            var options = {
                url: "https://api.spotify.com/v1/search?q=album:" + alphabet[letterAlbum] + "*+artist:" + alphabet[letterArtist] + "*+year:2017-2018&type=album&market=US",
                method: "get",
                headers: {
                    "Authorization": "Bearer " + accessToken 
                },
                json:true
            }
        
            request(options, function(err, resp, body){
                analyzeResults(conn, err, resp, body);
            });
        }
    }
}

function runWeeklyUpdate(conn){
    clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
    clientSecret = "378b8df5f7504b8f925ed729fdae3763";

    getAccessToken(clientID, clientSecret, function(accessToken){
        searchForArtists(accessToken, conn);
    });
}

var sleeping = false;

connectToDatabase(config, function(conn){
    runWeeklyUpdate(conn);
});
