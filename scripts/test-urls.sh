#!/bin/bash

if [ "$#" -ne 1 ]; then
    echo "Usage: $0 path_to_your_csv_file"
    exit 1
fi

input="$1"

# Validate if file exists
if [ ! -f "$input" ]; then
    echo "File not found!"
    exit 1
fi

temp_file=$(mktemp)

# Skip the header
tail -n +2 "$input" > "$temp_file"

# Prepare the updated_file.csv and write headers
echo "url,visitors,page_views,status_code" > updated_file.csv

echo "Starting to process URLs..."

# Initialize a counter
count=0

# Process the CSV
while IFS=, read -r url visitors page_views _status_code; do
    full_url="https://datahub.io$url"
    echo "Processing $full_url..."
    new_status_code=$(curl -o /dev/null -s -w "%{http_code}" "$full_url")

    # Outputting updated data to file, while loop messages are on terminal
    printf "%s,%s,%s,%s\n" "$url" "$visitors" "$page_views" "$new_status_code" >> updated_file.csv

    # Increment the counter
    ((count++))
    echo "Processed $count URLs."
done < "$temp_file"

# Cleanup
rm "$temp_file"

echo "Processing complete. Updated data saved to updated_file.csv."
