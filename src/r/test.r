# Function used to remove any duplicate artist records and create the dily_aggr table

library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

# some new artist IDs change & both the new and old are used to search for metrics
# the below query deletes any artists with more than one record for the current day
rs = dbSendQuery(conn, paste0("select id from artist_info where name like '?%';"))
data = fetch(rs, n = -1)
print(nrow(data))
if(nrow(data) > 0){
    apply(data, 1, function(row){
        dbSendQuery(conn, paste0("delete from genres where id = '", row[1], "';"))
    })
}

