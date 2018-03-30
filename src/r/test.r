library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

rs = dbSendQuery(conn, "select id from artist_metrics where date between '2018-03-29 00:00:00' and '2018-03-29 23:59:59' group by id having count(*) > 1;")
data = fetch(rs, n = -1)

apply(data, 1, function(row){
     dbSendQuery(conn, paste0("delete from artist_metrics where id = '", row[1], "';"))
})
#apply(data, 1, function(row){
#     dbSendQuery(conn, paste0("delete from artist_info where id = '", row[1], "';"))
#})
