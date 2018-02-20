#!/bin/bash

DATE="$(date +%Y-%m-%d)"
FILENAME="_weekly_collection.txt"

node ~/spotify-artist-finder/src/nodejs/daily_metrics_collection.js > ~/spotify-artist-finder/logs/daily/"$DATE$FILENAME"
