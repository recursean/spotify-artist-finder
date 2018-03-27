library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

rs = dbSendQuery(conn, "select * from artist_metrics order by id, date desc;")
data = fetch(rs, n = -1)

grouped = data %>%
            group_by(id) %>%
            filter(n() >= 7)
         
grouped = grouped %>%
            ungroup()
print(paste0(nrow(grouped), " number of records with more than 7 records"))
distGroup = distinct(grouped, id)
print(paste0(nrow(distGroup), " number of distinct artists"))

result = lapply(distGroup$id, function(distinctId){
    group = subset(grouped, id == distinctId)
     
    followers1 = ifelse(group[2,]$followers == 0, group[1,]$followers, (group[1,]$followers - group[2,]$followers) / group[2,]$followers)
    followers2 = ifelse(group[7,]$followers == 0, group[1,]$followers, (group[1,]$followers - group[7,]$followers) / group[7,]$followers)

    followersInc = (followers1 + followers2) / 2 * 100

    popularity1 = ifelse(group[2,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[2,]$popularity)
    popularity2 = ifelse(group[7,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[7,]$popularity)

    popularityInc = (popularity1 + popularity2) / 2

    c(followersInc, popularityInc)
})

distGroup$followers_inc <- lapply(result, "[[", 1)
distGroup$followers_inc = as.numeric(unlist(distGroup$followers_inc))
distGroup$popularity_inc <- lapply(result, "[[", 2)
distGroup$popularity_inc = as.numeric(unlist(distGroup$popularity_inc))
distGroup$score = distGroup$followers_inc + distGroup$popularity_inc

print(paste0(nrow(subset(distGroup, score > 0)), "number of scores given"))
apply(distGroup, 1, function(row){
    dbSendQuery(conn, paste0("update artist_metrics set score = ", format(round(as.numeric(row[4]), 2), nsmall=2), " where id = '", row[1], "' and date between '", format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59';")) 
}) 


dbSendQuery(conn, "alter table artist_metrics order by date desc, score desc;")
