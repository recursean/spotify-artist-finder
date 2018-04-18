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
                modifyRankingsPage(html, typeof req.query.start === "undefined" ? 1 : req.query.start, typeof req.query.size === "undefined" ? 25 : req.query.size, 
                                        typeof req.query.genre === "undefined" ? [] : req.query.genre, typeof req.query.label === "undefined" ? [] : req.query.label, function(modHTML){
                    res.send(modHTML);
                });
            }
        });
    }
})

app.get('/search.html', function(req, res){
    fs.readFile("html/search.html", "utf8", function(err, html){
        if(err)
            console.log(err);
        else{
            if(typeof req.query.search !== "undefined"){
                fillSearchTable(html, req.query.search, typeof req.query.start === "undefined" ? 1 : req.query.start, 25, function(modHTML){
                    res.send(modHTML);
                });
            }
        }
    });
})

app.get('/css/main.css', function (req, res) {
    res.sendFile("css/main.css", {root: __dirname });
})

app.get('/js/main.js', function (req, res) {
    res.sendFile("js/main.js", {root: __dirname });
})

app.get('/js/plotly-latest.min.js', function (req, res) {
    res.sendFile("js/plotly-latest.min.js", {root: __dirname });
})

app.get('/js/fillCharts.js', function (req, res) {
    res.sendFile("js/fillCharts.js", {root: __dirname });
})

function modifyRankingsPage(html, startIdx, resultSize, genres, labels, callback){
    var dom = new JSDOM(html);
    var $ = require('jquery')(dom.window);
    
    if(resultSize == "25")
        $("#size1").attr("checked", true);
    else if(resultSize == "50")
        $("#size2").attr("checked", true);
    else if(resultSize == "100")
        $("#size3").attr("checked", true);
    
    var queryStr = "select * from daily_aggr ";
    if(genres.length != 0){
        queryStr += "where ";
        if(!Array.isArray(genres))
            genres = [genres];
        for(var i = 0; i < genres.length; i++){
            $("#" + genres[i]).attr("checked", true);
            if(genres[i] == "pop"){
                queryStr += "genre like '%pop%' or "
            }
            else if(genres[i] == "rock"){
                queryStr += "genre like '%rock%' or genre like '%metal%' or "
            }
            else if(genres[i] == "hip-hop"){
                queryStr += "genre like '%hip-hop%' or genre like '%rap%' or "
            }
            else if(genres[i] == "country"){
                queryStr += "genre like '%country%' or "
            }
            else if(genres[i] == "electronic"){
                queryStr += "genre like '%electronic%' or genre like '%edm%' or "
            }
            else if(genres[i] == "indie"){
                queryStr += "genre like '%indie%' or "
            }
            else if(genres[i] == "any"){
                queryStr += "genre is not null or "
            }
        }
        queryStr = queryStr.substring(0, queryStr.length - 3);
    }
    if(labels.length != 0){
        if(genres.length == 0){
            queryStr += "where ";
        }
        else{
            queryStr += "or ";
        }
        if(!Array.isArray(labels))
            labels = [labels];
        for(var i = 0; i < labels.length; i++){
            $("#" + labels[i]).attr("checked", true);
            if(labels[i] == "umg"){
                queryStr += "label not like '%Universal Music Group%' or ";
            }
            else if(labels[i] == "sony"){
                queryStr += "label not like '%Sony%' or ";
            }
            else if(labels[i] == "warner"){
                queryStr += "label not like '%Warner%' or ";
            }
        }
        queryStr = queryStr.substring(0, queryStr.length - 3);
    }
    queryStr += "limit " + resultSize + " offset " + (startIdx-1) + ";";
    
    conn.query(queryStr, function(err, result, fields) {
        if(err)
            console.log(err);
        else{
            var tableString =   "<tr>" +
                                    "<td></td>" +
                                    "<td>NAME</td>" +
                                    "<td>GENRE</td>" +
                                    "<td>LABEL</td>" +
                                    "<td>SCORE</td>" +
                                    "<td>RECENT RELEASE</td>" +
                                "</tr>";

            for(var i = 1; i <= resultSize; i++){
                result[i-1].most_recent_release_date = (!result[i-1].most_recent_release_date ? "n/a" : result[i-1].most_recent_release_date.toString().substring(4, 15)); 
                result[i-1].genre = (!result[i-1].genre ? "Not yet classified" : result[i-1].genre); 
                tableString +=  "<tr>" +
                                    "<td>" + (i - 1 + (+startIdx)) + "</td>" +
                                    "<td><a class='artistLink' href='/?artist=" + result[i-1].name + "'>" + result[i-1].name + "</a></td>" +
                                    "<td>" + result[i-1].genre + "</td>" +
                                    "<td>" + result[i-1].label + "</td>" +
                                    "<td>" + result[i-1].score + "</td>" +
                                    "<td>" + result[i-1].most_recent_release_date + "</td>" +
                                "</tr>";
            }
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
    conn.query("select * from (select * from artist_info where name='" + artist + "' order by most_recent_release_date desc) as a " + 
                        "join artist_metrics as b on a.id=b.id;", function(err, result,fields) {
        if(err)
            console.log(err);
        else{
            result[0].most_recent_release_date = (!result[0].most_recent_release_date ? "n/a" : result[0].most_recent_release_date.toString().substring(4, 15)); 

            var dom = new JSDOM(html);
            var $ = require('jquery')(dom.window);
            $("#artistImage").attr("src", result[0].image_url);
        
            $("#artistName").each(function() {
                $(this).html("<b>" + result[0].name + "</b><br>"); 
            });

            $("#artistDetail").each(function() {
                $(this).html("<table id='artistDetailTable'>" + 
                                "<tr><th>Label</th><td>" + result[0].label + "</td></tr>" +
                                "<tr><th>Followers</th><td>" + result[0].followers + "</td></tr>" +
                                "<tr><th>Popularity</th><td>" + result[0].popularity + "</td></tr>" +
                                "<tr><th>Score</th><td>" + result[0].score + "</td></tr>" +
                                "<tr><th>Most Recent Release</th><td>" + result[0].most_recent_release_title + "</td></tr>" +
                                "<tr><th>Recent Release Date</th><td>" + result[0].most_recent_release_date + "</td></tr>" +
                            "</table>") 
            });
   
            $("#topTracks").each(function() {
                $(this).html("<iframe src='https://open.spotify.com/embed?uri=spotify:artist:" + result[0].id + "&view=list' width='300' height='380' frameborder='0' allowtransparency='true' allow='encrypted-media'></iframe>");
            });      
            
            var scoreString = "";
            var dateString = "";
            var followersString = "";
            var popularityString = "";

            for(var i = result.length-1; i >= 0; i--){
                dateString += "'" + result[i].date.toISOString().substring(0,10) + " 00:00:00',";
                scoreString += result[i].score + ",";
                followersString += result[i].followers + ",";
                popularityString += result[i].popularity + ",";
            }

            dateString = dateString.substring(0, dateString.length-1);
            scoreString = scoreString.substring(0, scoreString.length-1);
            followersString = followersString.substring(0, followersString.length-1);
            popularityString = popularityString.substring(0, popularityString.length-1);
            $("#scoreChart").each(function() {
                $(this).html("<script>" +
                                "var scores = {" +
                                    "x: [" + dateString + "]," +
                                    "y: [" + scoreString + "]," +
                                    "type: 'scatter'" +
                                "};" +
                                "var layout = {" +
                                    "title: 'Score'," +
                                    "xaxis: {showgrid:true, title:'Day'}," +
                                    "yaxis: {showgrid:true, title:'Score'}," +
                                "};" + 
                                "var fig = {data: [scores], layout: layout};" +
                                "Plotly.newPlot('scoreChart', fig);");
            });
            $("#followersChart").each(function() {
                $(this).html("<script>" +
                                "var scores = {" +
                                    "x: [" + dateString + "]," +
                                    "y: [" + followersString + "]," +
                                    "type: 'scatter'" +
                                "};" +
                                "var layout = {" +
                                    "title: 'Followers'," +
                                    "xaxis: {showgrid:true, title:'Day'}," +
                                    "yaxis: {showgrid:true, title:'Followers'}" +
                                "};" + 
                                "var fig = {data: [scores], layout: layout};" +
                                "Plotly.newPlot('followersChart', fig);");
            });
            $("#popularityChart").each(function() {
                $(this).html("<script>" +
                                "var scores = {" +
                                    "x: [" + dateString + "]," +
                                    "y: [" + popularityString + "]," +
                                    "type: 'scatter'" +
                                "};" +
                                "var layout = {" +
                                    "title: 'Popularity'," +
                                    "xaxis: {showgrid:true, title:'Day'}," +
                                    "yaxis: {showgrid:true, title:'Popularity'}" +
                                "};" + 
                                "var fig = {data: [scores], layout: layout};" +
                                "Plotly.newPlot('popularityChart', fig);");
            });

            var genreString = "";
            conn.query("select genre from genres where id = '" + result[0].id + "';", function(err, result2, fields) {
                if(err)
                    console.log(err);
                else{
                    for(var i = 0; i < result2.length; i++){
                        genreString += "<li>" + result2[i].genre + "</li>";
                    }
                }
                if(genreString == ""){
                    $("#genreList").each(function() {
                        $(this).html("Genres <br><ul><li>Not classified yet</li></ul>");
                    });
                }
                else{
                    $("#genreList").each(function() {
                        $(this).html("Genres <br><ul>" + genreString + "</ul>");
                    });
                }
                callback(dom.window.document.documentElement.outerHTML);
            });
        }
    });
}

function fillSearchTable(html, search, startIdx, resultSize, callback){
    conn.query("select name from artist_info where name like '%" + search + "%' limit " + resultSize + " offset " + (startIdx-1) + ";", function(err, result, fields) {
        if(err)
            console.log(err);
        else{
            var tableString =   "<tr>" +
                                    "<td></td>" +
                                    "<td>NAME</td>" +
                                "</tr>";

            for(var i = 0; i < result.length; i++){
                tableString +=  "<tr>" +
                                    "<td>" + (i + (+startIdx)) + "</td>" +
                                    "<td><a class='artistLink' href='/?artist=" + result[i].name + "'>" + result[i].name + "</a></td>" +
                                "</tr>";
            }
         
            var dom = new JSDOM(html);
            var $ = require('jquery')(dom.window);
            $("#searchTable").each(function () {
                $(this).html(tableString);
            });
            $("#pageInfo").each(function(){
                $(this).html("Showing results <span id='low'>" + startIdx + "</span> - <span id='high'>" + (+startIdx + +resultSize - 1) + "</span>");
            });

            $(".search").attr("value", search);
            callback(dom.window.document.documentElement.outerHTML);
        }
    });
}
