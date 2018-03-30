const fs = require('fs');
const mysql = require('mysql');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const express = require('express');
const app = express();
const jquery = require('jquery');
var conn;

function connectToDatabase(callback){
    console.log("Connecting to database...");

    var config = {
        host: "127.0.0.1",
        user: "node",
        password: "nodejs",
        database: "spotify_artist_finder_db"
    }

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

connectToDatabase(function(dbconn){
    conn = dbconn;
    app.listen(80, function () {
        console.log('Listening on port 80...');
    });
})

app.get('/', function (req, res) {
   if(typeof req.query.artist !== "undefined"){
        fs.readFile("html/artist.html", "utf8", function(err, html){
            if(err)
                console.log(err)
            else{
                modifyArtistPage(html, req.query.artist, function(modHTML){
                    res.send(modHTML);
                });
            }
        });
    }
    else{
        fs.readFile("html/index.html", "utf8", function(err, html){
            if(err)
                console.log(err);
            else{
                modifyRankingsPage(html, typeof req.query.start === "undefined" ? 1 : req.query.start, 25, function(modHTML){
                    res.send(modHTML);
                });
            }
        });
    }
})

app.get('/css/main.css', function (req, res) {
    res.sendFile("css/main.css", {root: __dirname });
})

app.get('/js/main.js', function (req, res) {
    res.sendFile("js/main.js", {root: __dirname });
})

function modifyRankingsPage(html, startIdx, resultSize, callback){
    conn.query("select distinct(b.name), a.score, c.genre, b.most_recent_release_date from (select * from artist_metrics limit " + resultSize + " offset " + 
                    (startIdx-1) + ") as a join artist_info as b on a.id = b.id left join genres as c on b.id = c.id;", function(err, result, fields) {
        if(err)
            console.log(err);
        else{
            var tableString =   "<tr>" +
                                    "<td></td>" +
                                    "<td>NAME</td>" +
                                    "<td>GENRE</td>" +
                                    "<td>SCORE</td>" +
                                    "<td>RECENT RELEASE</td>" +
                                "</tr>";

            for(var i = 1; i <= resultSize; i++){
                result[i-1].most_recent_release_date = (!result[i-1].most_recent_release_date ? "n/a" : result[i-1].most_recent_release_date.toString().substring(4, 15)); 
                tableString +=  "<tr>" +
                                    "<td>" + (i - 1 + (+startIdx)) + "</td>" +
                                    "<td><a class='artistLink' href='/?artist=" + result[i-1].name + "'>" + result[i-1].name + "</a></td>" +
                                    "<td>" + result[i-1].genre + "</td>" +
                                    "<td>" + result[i-1].score + "</td>" +
                                    "<td>" + result[i-1].most_recent_release_date + "</td>" +
                                "</tr>";
            }
            var dom = new JSDOM(html);
            var $ = require('jquery')(dom.window);
            $("table").each(function () {
                $(this).html(tableString);
            });
            $("#pageInfo").each(function(){
                $(this).html("Showing results <span id='low'>" + startIdx + "</span> - <span id='high'>" + (+startIdx + +resultSize - 1) + "</span>");
            }); 
            callback(dom.window.document.documentElement.outerHTML);
        }
    });
}

function modifyArtistPage(html, artist, callback){
    conn.query("select * from (select * from artist_info where name='" + artist + "' order by most_recent_release_date desc limit 1) as a " + 
                        "join artist_metrics as b on a.id=b.id left join genres as c on b.id=c.id;", function(err, result,fields) {
        if(err)
            console.log(err);
        else{
            var dom = new JSDOM(html);
            var $ = require('jquery')(dom.window);
            $(".bodyContainer").each(function () {
                $(this).html("<img id='artistImage' src='" + result[0].image_url + "'>");
            });

            callback(dom.window.document.documentElement.outerHTML);
        }
    });
}
