# Scoring function run daily @ 4am EST 
# Function used for scoring can be found in paper

library(RMySQL)
library(dplyr)

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

rs = dbSendQuery(conn, "select * from artist_metrics order by id, date desc;")
data = fetch(rs, n = -1)

# only want artists who have more than 7 days of metrics recorded as the scoring
# function bases off the past 7 days
grouped = data %>%
            group_by(id) %>%
            filter(n() >= 7)
         
grouped = grouped %>%
            ungroup()

print(paste0(nrow(grouped), " number of records with more than 7 records"))

# get a list of distinct ids to use for scoring
distGroup = distinct(grouped, id)
print(paste0(nrow(distGroup), " number of distinct artists"))

# apply the scoring function to each distinct artist
result = lapply(distGroup$id, function(distinctId){

    # get only the rows that pertain to this artist
    group = subset(grouped, id == distinctId)
     
    # artists that are new to spotify may see delay-spike in followers (ex: 0->500) in one day and will cause 
    # unusually high scores, so give them low scores until spike is presumed to be over
    # to account for spike, -100 is given to artist with single-digit followers in the past 7 days
    followers1 = ifelse(nchar(group[2,]$followers) == 1, -100, (group[1,]$followers - group[2,]$followers) / group[2,]$followers)
    followers2 = ifelse(nchar(group[7,]$followers) == 1, -100, (group[1,]$followers - group[7,]$followers) / group[7,]$followers)

    followersInc = (followers1 + followers2) / 2 * 100

    popularity1 = ifelse(group[2,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[2,]$popularity)
    popularity2 = ifelse(group[7,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[7,]$popularity)

    popularityInc = (popularity1 + popularity2) / 2

    # return a list of the two parts of the function
    c(followersInc, popularityInc)
})

# the apply usage above creates lists which must be undone in order to work with each respective row
distGroup$followers_inc <- lapply(result, "[[", 1)
distGroup$followers_inc = as.numeric(unlist(distGroup$followers_inc))
distGroup$popularity_inc <- lapply(result, "[[", 2)
distGroup$popularity_inc = as.numeric(unlist(distGroup$popularity_inc))

# create the final score
distGroup$score = distGroup$followers_inc + distGroup$popularity_inc

print(paste0(nrow(subset(distGroup, score > 0)), " number of scores given"))

apply(distGroup, 1, function(row){
    dbSendQuery(conn, paste0("update artist_metrics set score = ", format(round(as.numeric(row[4]), 2), nsmall=2), " where id = '", row[1], "' and date between '", format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59';")) 
}) 
