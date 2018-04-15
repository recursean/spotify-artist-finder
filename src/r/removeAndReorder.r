# Function used to remove any duplicate artist records and create the dily_aggr table

library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

# some new artist IDs change & both the new and old are used to search for metrics
# the below query deletes any artists with more than one record for the current day
rs = dbSendQuery(conn, paste0("select id from artist_metrics where date between '", format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59' group by id having count(*) > 1;"))
data = fetch(rs, n = -1)
if(nrow(data) > 0){
    apply(data, 1, function(row){
        dbSendQuery(conn, paste0("delete from artist_metrics where id = '", row[1], "';"))
    })
}

# create the daily_aggr table which is what the website rankings page pulls from
dbSendQuery(conn, "drop table daily_aggr;");
rs = dbSendQuery(conn, paste0("create table daily_aggr as (select b.name, a.score, c.genre, b.most_recent_release_date, b.label from (select * from artist_metrics where date between '", 
                            format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59') as a join artist_info as b on a.id = b.id left join (select distinct * from genres)  as c on b.id = c.id order by a.score desc);"))
