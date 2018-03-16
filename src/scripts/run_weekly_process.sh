#!/bin/bash
#runs once a week at 2am on sunday nights

DATE="$(date +%Y-%m-%d)"
FILENAME="_weekly_collection.txt"

node ~/spotify-artist-finder/src/nodejs/gather_artist_info.js > ~/spotify-artist-finder/logs/weekly/"$DATE$FILENAME"
