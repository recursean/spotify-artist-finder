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
                                        typeof req.query.genre === "undefined" ? [] : req.query.genre, typeof req.query.label === "undefined" ? [] : req.query.label, 
                                        typeof req.query.order === "undefined" ? "score" : req.query.order, function(modHTML){
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

app.get('/js/rankings.js', function (req, res) {
    res.sendFile("js/rankings.js", {root: __dirname });
})

app.get('/js/artistDetail.js', function (req, res) {
    res.sendFile("js/artistDetail.js", {root: __dirname });
})

app.get('/js/plotly-latest.min.js', function (req, res) {
    res.sendFile("js/plotly-latest.min.js", {root: __dirname });
})

app.get('/js/fillCharts.js', function (req, res) {
    res.sendFile("js/fillCharts.js", {root: __dirname });
})

function modifyRankingsPage(html, startIdx, resultSize, genres, labels, order, callback){
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
                queryStr += "genres like '%pop%' or "
            }
            else if(genres[i] == "rock"){
                queryStr += "genres like '%rock%' or genres like '%metal%' or genres like '%blues%' or genres like '%alternative%' or genres like '%grunge%' or genres like '%punk%' or genres like '%indie%' or "
            }
            else if(genres[i] == "hip-hop"){
                queryStr += "genres like '%hip-hop%' or genres like '%rap%' or "
            }
            else if(genres[i] == "country"){
                queryStr += "genres like '%country%' or genres like '%bluegrass%' or "
            }
            else if(genres[i] == "electronic"){
                queryStr += "genres like '%electronic%' or genres like '%edm%' or genres like '%drum and bass%' or genres like '%dubstep%' or genres like '%hardstyle%' or genres like '%house%' or genres like '%vaporwave%' or genres like '%dance%' or genres like '%techno%' or "
            }
            else if(genres[i] == "any"){
                queryStr += "genres is not null or "
            }
        }
        queryStr = queryStr.substring(0, queryStr.length - 3);
    }
    if(labels.length != 0){
        if(genres.length == 0){
            queryStr += "where ";
        }
        else{
            queryStr += "and (";
        }
        if(!Array.isArray(labels))
            labels = [labels];
        for(var i = 0; i < labels.length; i++){
            $("#" + labels[i]).attr("checked", true);
            if(labels[i] == "umg"){
                queryStr += "label not like '%Universal Music Group%' or label not like '%UMG%' or label not like '%Interscope%' or label not like '%Geffen%' or label not like '%A&M%' or label not like '%Capitol Music%' or " +
                                "label not like '%Republic Records%' or label not like '%Island Records%' or label not like '%Def Jam%' or ";
            }
            else if(labels[i] == "sony"){
                queryStr += "label not like '%Sony%' or label not like '%Columbia%' or label not like '%RCA%' or label not like '%Epic Records%' or label not like '%Roc Nation%' or ";
            }
            else if(labels[i] == "warner"){
                queryStr += "label not like '%Warner%' or label not like '%Atlantic%' or label not like '%Parlophone%' or ";
            }
        }
        queryStr = queryStr.substring(0, queryStr.length - 3);
        if(genres.length != 0)
            queryStr += ")";
    }

    if(order == "score"){
        $("#score").attr("checked", true);
    }
    else if(order == "followers"){
        $("#followers").attr("checked", true);
        queryStr += "order by net_followers_inc desc ";
    }
    else if(order == "popularity"){
        $("#popularity").attr("checked", true);
        queryStr += "order by net_popularity_inc desc ";
    }

    queryStr += "limit " + resultSize + " offset " + (startIdx-1) + ";";
    conn.query(queryStr, function(err, result, fields) {
        if(err)
            console.log(err);
        else{
            var tableString =   "<tr style='font-family:fantasy;'>" +
                                    "<td></td>" +
                                    "<td>NAME</td>" +
                                    "<td>GENRE</td>" +
                                    "<td>LABEL</td>" +
                                    "<td>SCORE</td>" +
                                    "<td>FOLLOWERS</td>" +
                                    "<td>POPULARITY</td>" +
                                "</tr>";

            for(var i = 1; i <= resultSize; i++){
                result[i-1].genres = (!result[i-1].genres ? "No genre info available" : result[i-1].genres); 

                scoreIdxChangeString = result[i-1].score_idx_change >= 0 ? "(<font color='lime'>+" + result[i-1].score_idx_change + "</font>)" : "(<font color='red'>" + result[i-1].score_idx_change + "</font>)";
                scoreNetChangeString = result[i-1].net_score_inc >= 0 ? "(<font color='lime'>+" + result[i-1].net_score_inc + "</font>)" : "(<font color='red'>" + result[i-1].net_score_inc + "</font>)";
                followersNetChangeString = result[i-1].net_followers_inc >= 0 ? "(<font color='lime'>+" + result[i-1].net_followers_inc + "</font>)" : "(<font color='red'>" + result[i-1].net_followers_inc + "</font>)";
                popularityNetChangeString = result[i-1].net_popularity_inc >= 0 ? "(<font color='lime'>+" + result[i-1].net_popularity_inc + "</font>)" : "(<font color='red'>" + result[i-1].net_popularity_inc + "</font>)";
                
                tableString +=  "<tr>" +
                                    "<td>" + (i - 1 + (+startIdx)) + " " + scoreIdxChangeString + "</td>" +
                                    "<td><a class='artistLink' href='/?artist=" + result[i-1].id + "'>" + result[i-1].name + "</a></td>" +
                                    "<td>" + result[i-1].genres + "</td>" +
                                    "<td>" + result[i-1].label + "</td>" +
                                    "<td>" + result[i-1].score + " " + scoreNetChangeString + "</td>" +
                                    "<td>" + result[i-1].followers + " " + followersNetChangeString + "</td>" +
                                    "<td>" + result[i-1].popularity + " " + popularityNetChangeString + "</td>" +
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
    conn.query("select * from (select * from artist_info where id='" + artist + "' order by most_recent_release_date desc) as a " +  
                    "join artist_metrics as b on a.id=b.id;", function(err, result,fields) {
        if(err)
            console.log(err);
        else{
            result[0].most_recent_release_date = (!result[0].most_recent_release_date ? "n/a" : result[0].most_recent_release_date.toString().substring(4, 15)); 
            result[0].genres = (!result[0].genres ? "No genre info available" : result[0].genres); 
            result[0].score = (!result[0].score ? "No score given" : result[0].score); 
            result[0].net_score_inc = (!result[0].net_score_inc ? 0 : result[0].net_score_inc); 
            result[0].net_followers_inc = (!result[0].net_followers_inc ? 0 : result[0].net_followers_inc); 
            result[0].net_popularity_inc = (!result[0].net_popularity_inc ? 0 : result[0].net_popularity_inc); 
            
            var dom = new JSDOM(html);
            var $ = require('jquery')(dom.window);
            $("#artistImage").attr("src", result[0].image_url);
        
            $("#artistName").each(function() {
                $(this).html("<b>" + result[0].name + "</b><br>"); 
            });

            scoreNetChangeString = result[0].net_score_inc >= 0 ? "(<font color='lime'>+" + result[0].net_score_inc + "</font>)" : "(<font color='red'>" + result[0].net_score_inc + "</font>)";
            followersNetChangeString = result[0].net_followers_inc >= 0 ? "(<font color='lime'>+" + result[0].net_followers_inc + "</font>)" : "(<font color='red'>" + result[0].net_followers_inc + "</font>)";
            popularityNetChangeString = result[0].net_popularity_inc >= 0 ? "(<font color='lime'>+" + result[0].net_popularity_inc + "</font>)" : "(<font color='red'>" + result[0].net_popularity_inc + "</font>)";
            
            $("#artistDetail").each(function() {
                $(this).html("<table id='artistDetailTable'>" + 
                                "<tr><th>Score</th><td>" + result[0].score + " " + scoreNetChangeString + "</td></tr>" +
                                "<tr><th>Followers</th><td>" + result[0].followers + " " + followersNetChangeString + "</td></tr>" +
                                "<tr><th>Popularity</th><td>" + result[0].popularity + " " + popularityNetChangeString + "</td></tr>" +
                                "<tr><th>Genres</th><td>" + result[0].genres + "</td></tr>" +
                                "<tr><th>Label</th><td>" + result[0].label + "</td></tr>" +
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

            /*
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
            */
            callback(dom.window.document.documentElement.outerHTML);
        }
    });
}

function fillSearchTable(html, search, startIdx, resultSize, callback){
    conn.query("select id, name from artist_info where name like '%" + search + "%' limit " + resultSize + " offset " + (startIdx-1) + ";", function(err, result, fields) {
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
                                    "<td><a class='artistLink' href='/?artist=" + result[i].id + "'>" + result[i].name + "</a></td>" +
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
