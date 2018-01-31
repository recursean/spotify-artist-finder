var mysql = require('mysql');
var request = require('request');

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

function getAccessToken(clientID, clientSecret){
    var options = {
        url: "https://accounts.spotify.com/api/token",
        grant_type: "client_credentials",
        headers:{
            "Authorization": "Basic " + btoa(clientID + ":" + clientSecret); 
        }
    }

    function callback(error, resp, body){
        console.log(response.statusCode);
        console.log(body);
    }

    request(options, callback);
}

function runWeeklyUpdate(conn){
    clientID = "ff1c1bafd14c4fedaa1ff416b8186130";
    clientSecret = "378b8df5f7504b8f925ed729fdae3763";

    accessToken = getAccessToken(clientID, clientSecret);
}

connectToDatabase(config, function(conn){
    runWeeklyUpdate(conn);
});
