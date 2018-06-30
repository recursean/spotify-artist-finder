# Scoring function run daily @ 4am EST 
# Function used for scoring can be found in paper

library(RMySQL)
library(dplyr)

conn <<- dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

rs = dbSendQuery(conn, "select * from genres;")
data = fetch(rs, n = -1)

distGroup = distinct(data, id)

result = lapply(distGroup$id, function(distinctId){

    # get only the rows that pertain to this artist
    group = subset(data, id == distinctId)
    
    c(toString(group$genre))
})

distGroup$genreStr <- lapply(result, "[[", 1)
distGroup$genreStr = as.character(unlist(distGroup$genreStr))


apply(distGroup, 1, function(row){
        dbSendQuery(conn, paste0("update artist_info set genres = '", row[2], "' where id = '", row[1], "';")) 
}) 
