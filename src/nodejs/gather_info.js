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

function insertToDB(conn, values){
    conn.query("insert into artist_info (id, name)  VALUES( '" + values[0] + "','" + values[1].replace("'", "\\'")  + "')", 
        function(err){
            if(err){
                console.log("ERROR INSERTING RECORD INTO artist_info: " + err);
            }
        });

    if(values.length == 4){
        conn.query("insert into artist_detail (id, image_url)  VALUES( '" + values[0] + "','" + values[3]  + "')", 
            function(err){
                if(err){
                    console.log("ERROR INSERTING RECORD INTO artist_detail: " + err);
                }
        });
    }
    
    else{
        conn.query("insert into artist_detail (id)  VALUES( '" + values[0]  + "')", 
            function(err){
                if(err){
                    console.log("ERROR INSERTING RECORD INTO artist_detail: " + err);
                }
        });
    }
    
    for(genre in values[2]){
        conn.query("insert into genres (id, genre)  VALUES( '" + values[0] + "','" + values[2][genre].replace("'", "\\'")  + "')", 
            function(err){
                if(err){
                    console.log("ERROR INSERTING RECORD INTO genres: " + err);
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

function scrapeArtistResults(conn, artistObj){
    if(typeof artistObj.images[0] != 'undefined')
        insertToDB(conn, [artistObj.id, artistObj.name, artistObj.genres, artistObj.images[0].url]);
    else
        insertToDB(conn, [artistObj.id, artistObj.name, artistObj.genres]);
}

function analyzeResults(conn, err, resp, body){
    if(resp.statusCode == 200){
        if(sleeping)
            sleeping = false;

        for (artist in body.artists.items){
            scrapeArtistResults(conn, body.artists.items[artist]);
        }
        if(body.artists.next){
                var options = {
                    url: body.artists.next,
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

    else if(resp.statusCode == 429){
        //don't sleep for each 429 recieved after the first, as they were all sent during retry-after period. thus should be good after sleep
        if(!sleeping){
            sleeping = true;
            sleep(resp.caseless.dict['retry-after']);
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
        
        request(options, function(err, resp, body){
            analyzeResults(conn, err, resp, body);
        });
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
