#!/bin/bash

# Define the output file
output_file="code.txt"

# Clear the output file if it already exists
> "$output_file"

# Find and process files excluding specific directories and file types
find . -type f \
    ! -name '*.json' \
    ! -name '*.txt' \
    ! -name '*.csv' \
    ! -path '*/.git/*' \
    ! -path '*/node_modules/*' \
    -print0 | while IFS= read -r -d '' file; do
    echo "--- File: $file ---" >> "$output_file"
    cat "$file" >> "$output_file"
    echo -e "\n" >> "$output_file"
done

echo "Code has been saved to $output_file"
