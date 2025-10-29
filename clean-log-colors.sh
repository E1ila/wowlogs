#!/bin/bash

# Remove ANSI color escape codes from all .log files in boss-swing directory

LOG_DIR="analysis-results/boss-swing"

echo "Cleaning ANSI color codes from log files in $LOG_DIR..."

count=0
for file in "$LOG_DIR"/*.log; do
  if [ -f "$file" ]; then
    sed -i '' 's/\x1b\[[0-9;]*m//g' "$file"
    echo "Cleaned: $(basename "$file")"
    ((count++))
  fi
done

echo "Done! Cleaned $count log files."
