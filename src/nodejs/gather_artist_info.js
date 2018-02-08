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
    artistInfo = [... new Set(artistInfo)];

    artistInfoFinal = [];
    //split into arr of arrs for bulk insert
    for(artist in artistInfo){
        artistInfoFinal.push(artistInfo[artist].split("////"));
    }

    conn.query("insert ignore into artist_info (id, name)  VALUES ?", [artistInfoFinal], 
        function(err){
            if(err){
                console.log("ERROR INSERTING RECORD INTO artist_info :" + err);
            }
            else{
                console.log("Inserted " + artistInfoFinal.length + " records.");
                getArtistDetail(artistInfoFinal);
            }
    });
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
    for(artist in albumObj.artists){
        //splitting with special string to allow unique function to be applied to array (unqiue wont work with arr of arrs)
        artistInfo.push(albumObj.artists[artist].id + "////" +  albumObj.artists[artist].name.replace(/[^\x00-\x7F]/g, ""));
    }
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
            else{
                insertToDB(conn);
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
    var options = {
        url: "https://api.spotify.com/v1/search?q=tag:new&type=album&market=US&limit=50",
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

function runWeeklyUpdate(conn){
    clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
    clientSecret = "378b8df5f7504b8f925ed729fdae3763";

    getAccessToken(clientID, clientSecret, function(accessToken){
        searchForArtists(accessToken, conn);
    });
}

function getArtistDetail(artistInfoFinal){
    for(artistInfoArr in artistInfoFinal){
        var options = {
            url: "https://api.spotify.com/v1/search?q=tag:new&type=album&market=US&limit=50",
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

var sleeping = false;
var artistInfo = [];

var config = {
    host: "127.0.0.1",
    user: "node",
    password: "nodejs",
    database: "spotify_artist_finder_db"
}

connectToDatabase(config, function(conn){
    runWeeklyUpdate(conn);
});
