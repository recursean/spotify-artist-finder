#!/bin/bash

DATE="$(date +%Y-%m-%d)"
FILENAME="_daily_scoring.txt"

Rscript ~/spotify-artist-finder/src/r/scoreArtists.r > ~/spotify-artist-finder/logs/daily/"$DATE$FILENAME"
