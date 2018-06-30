# Scoring function run daily @ 4am EST 
# Function used for scoring can be found in paper

library(RMySQL)
library(dplyr)
startTime = Sys.time()
conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")
rs = dbSendQuery(conn, paste("select * from artist_metrics where date between '", format(Sys.Date()-7, "%Y-%m-%d"), "00:00:00' and'", format(Sys.Date(), "%Y-%m-%d"), "23:59:59' order by id, date desc;"))
data = fetch(rs, n = -1)

print(paste(nrow(data), "number of records read from db"))

data = subset(data, followers > 100)
print(paste(nrow(data), "number of records with > 100 followers"))

# only want artists who have more than 7 days of metrics recorded as the scoring
# function bases off the past 7 days
grouped = data %>%
            group_by(id) %>%
            filter(n() >= 7)
         
grouped = grouped %>%
            ungroup()

print(paste0(nrow(grouped), " number of artists with more than 7 records"))

# get a list of distinct ids to use for scoring
distGroup = distinct(grouped, id)
print(paste0(nrow(distGroup), " number of distinct artists"))

print("Scoring artists...")
# apply the scoring function to each distinct artist
result = lapply(distGroup$id, function(distinctId){

    # get only the rows that pertain to this artist
    group = subset(grouped, id == distinctId)
     
    # artists that are new to spotify may see delay-spike in followers (ex: 0->500) in one day and will cause 
    # unusually high scores, so give them low scores until spike is presumed to be over
    # to account for spike, -100 is given to artist with single-digit followers in the past 7 days
    followers1 = (group[1,]$followers - group[2,]$followers) / group[2,]$followers
    followers2 = (group[1,]$followers - group[7,]$followers) / group[7,]$followers

    followersInc = (followers1 + followers2) / 2 * 100
    netFollowersInc = group[1,]$followers - group[2,]$followers
    
    popularity1 = ifelse(group[2,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[2,]$popularity)
    popularity2 = ifelse(group[7,]$popularity == 0, group[1,]$popularity, group[1,]$popularity - group[7,]$popularity)

    popularityInc = (popularity1 + popularity2) / 2
    netPopularityInc = group[1,]$popularity - group[2,]$popularity
     
    # return a list of the two parts of the function
    c(followersInc, popularityInc, netFollowersInc, netPopularityInc, ifelse(is.na(group[2,]$score_idx), 0, group[2,]$score_idx), 
            ifelse(is.na(group[2,]$followers_idx), 0, group[2,]$followers_idx), ifelse(is.na(group[2,]$popularity_idx), 0, group[2,]$popularity_idx), ifelse(is.na(group[2,]$score), 0, group[2,]$score))
})
print("Finished in apply loop")

# the apply usage above creates lists which must be undone in order to work with each respective row
distGroup$followers_inc <- lapply(result, "[[", 1)
distGroup$followers_inc = as.numeric(unlist(distGroup$followers_inc))
distGroup$popularity_inc <- lapply(result, "[[", 2)
distGroup$popularity_inc = as.numeric(unlist(distGroup$popularity_inc))
distGroup$net_followers_inc <- lapply(result, "[[", 3)
distGroup$net_followers_inc = as.numeric(unlist(distGroup$net_followers_inc))
distGroup$net_popularity_inc <- lapply(result, "[[", 4)
distGroup$net_popularity_inc = as.numeric(unlist(distGroup$net_popularity_inc))

# create the final score
distGroup$score = distGroup$followers_inc + distGroup$popularity_inc

distGroup = distGroup[order(distGroup$score),]
distGroup$score_idx = seq.int(nrow(distGroup))

distGroup = distGroup[order(distGroup$net_followers_inc),]
distGroup$followers_idx = seq.int(nrow(distGroup))

distGroup = distGroup[order(distGroup$net_popularity_inc),]
distGroup$popularity_idx = seq.int(nrow(distGroup))

distGroup$prev_score_idx <- lapply(result, "[[", 5)
distGroup$prev_score_idx = as.numeric(unlist(distGroup$prev_score_idx))

distGroup$prev_followers_idx <- lapply(result, "[[", 6)
distGroup$prev_followers_idx = as.numeric(unlist(distGroup$prev_followers_idx))

distGroup$prev_popularity_idx <- lapply(result, "[[", 7)
distGroup$prev_popularity_idx = as.numeric(unlist(distGroup$prev_popularity_idx))

distGroup$score_idx_change = distGroup$score_idx - distGroup$prev_score_idx
distGroup$followers_idx_change = distGroup$followers_idx - distGroup$prev_followers_idx
distGroup$popularity_idx_change = distGroup$popularity_idx - distGroup$prev_popularity_idx

distGroup$score_idx_change[distGroup$prev_score_idx == 0] = 0
distGroup$followers_idx_change[distGroup$prev_followers_idx == 0] = 0
distGroup$popularity_idx_change[distGroup$prev_popularity_idx == 0] = 0

distGroup$prev_score = lapply(result, "[[", 8)
distGroup$prev_score = as.numeric(unlist(distGroup$prev_score))

distGroup$net_score_inc = distGroup$score - distGroup$prev_score

print(paste0(nrow(subset(distGroup, score > 0)), " number of scores given"))

conn = dbConnect(MySQL(), user="node", password="nodejs", 
                    dbname="spotify_artist_finder_db", host="localhost")

apply(distGroup, 1, function(row){
    dbSendQuery(conn, paste0("update artist_metrics set score = ", format(round(as.numeric(row[6]), 2), nsmall=2), ", net_score_inc = ", as.numeric(row[17]), ", net_followers_inc = ", as.numeric(row[4]), 
                                ", net_popularity_inc = ", as.numeric(row[5]), ", score_idx = ", as.numeric(row[7]), ", followers_idx = ", as.numeric(row[8]), ", popularity_idx = ", as.numeric(row[9]), 
                                ", score_idx_change = ", as.numeric(row[13]), ", followers_idx_change = ", as.numeric(row[14]), ", popularity_idx_change = ", as.numeric(row[15]), 
                                " where id = '", row[1], "' and date between '", format(Sys.Date(), "%Y-%m-%d"), " 00:00:00' and '", format(Sys.Date(), "%Y-%m-%d"), " 23:59:59';")) 
}) 

endTime = Sys.time()
print(endTime - startTime)
