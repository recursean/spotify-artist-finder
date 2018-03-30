library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

dbSendQuery(conn, "alter table artist_metrics order by date desc, score desc;")
