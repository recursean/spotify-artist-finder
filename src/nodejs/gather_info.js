var mysql = require('mysql');

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

connectToDatabase(config, function(conn){
    insertToDatabase(conn, "artist_info", "'12345', 'node', 'nodeGen', 3");
});
