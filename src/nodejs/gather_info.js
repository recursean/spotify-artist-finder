var mysql = require('mysql');
var request = require('request');
var fs = require('fs');

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

function insertToDatabase(conn, table, valueString){
    conn.query("insert into " + table + " VALUES( " + valueString + ")", 
        function(err){
            if(err){
                console.log("ERROR INSERTING RECORD INTO " + table + ": " + err);
            }
            else{
                console.log("Inserted record");
            }
        });
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

function scrapeArtistResults(err, resp, body){
    if(resp.statusCode == 200){
        for (artist in body.artists.items){
            console.log(body.artists.items[artist].id);
            console.log(body.artists.items[artist].name);
            console.log(body.artists.items[artist].genres.toString()); 
        }
    }

    else if(resp.statusCode == 429){
        console.log(resp.caseless.dict['retry-after']);
        process.exit(1);
    }

    else{
        console.log("ERROR WITH ARTIST SEARCH QUERY");
        console.log(resp);
        process.exit(1);
    }
}

function searchForArtists(accessToken, conn){
    try {
        var genreFile = fs.readFileSync("../python/genre_list.txt", "utf8");
    }
    catch(e){
        console.log("ERROR READING FROM GENRE LIST FILE");
        console.log(e.stack);
        process.exit(1);
    }
    var genreList = genreFile.split("|");
    
    for (genre in genreList){
        var options = {
            url: "https://api.spotify.com/v1/search?q=year%3A2017%20genre:%22" + genreList[genre].replace(" ", "%20") + "%22&type=artist&market=US",
            method: "get",
            headers: {
                "Authorization": "Bearer " + accessToken 
            },
            json:true
        }

        request(options, scrapeArtistResults);
    }
}

function runWeeklyUpdate(conn){
    clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
    clientSecret = "378b8df5f7504b8f925ed729fdae3763";

    getAccessToken(clientID, clientSecret, function(accessToken){
        searchForArtists(accessToken, conn);
    });
}

connectToDatabase(config, function(conn){
    runWeeklyUpdate(conn);
});
