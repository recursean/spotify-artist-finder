library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

rs = dbSendQuery(conn, paste0("select id from artist_metrics where date between '", format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59' group by id having count(*) > 1;"))
data = fetch(rs, n = -1)

apply(data, 1, function(row){
     dbSendQuery(conn, paste0("delete from artist_metrics where id = '", row[1], "';"))
})

dbSendQuery(conn, "alter table artist_metrics order by date desc, score desc;")

#apply(data, 1, function(row){
#     dbSendQuery(conn, paste0("delete from artist_info where id = '", row[1], "';"))
#})
