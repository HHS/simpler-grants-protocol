#!/bin/bash

# Script to copy the yaml files and add the 'title' attribute in each YAML schema file
# to match the filename

SCHEMAS_DIR="${1}"
OUTPUT_DIR="${2}"

# Check if the directory exists
if [ ! -d "$SCHEMAS_DIR" ]; then
  echo "Error: Directory not found: $SCHEMAS_DIR"
  exit 1
fi

# Create generated directory alongside yaml directory
GENERATED_DIR="$(dirname "$OUTPUT_DIR")/schemas"
mkdir -p "$GENERATED_DIR"
echo "Created directory: $GENERATED_DIR"

# Copy all yaml files to generated directory
echo "Copying YAML files from $SCHEMAS_DIR to $GENERATED_DIR"
cp "$SCHEMAS_DIR"/*.yaml "$GENERATED_DIR/" 2>/dev/null || true
echo "Copied $(ls -1 "$GENERATED_DIR"/*.yaml 2>/dev/null | wc -l | tr -d ' ') YAML files"

echo "Processing YAML files in: $SCHEMAS_DIR"

# Find .yaml files only at the root level (not in subdirectories)
find "$GENERATED_DIR" -maxdepth 1 -name "*.yaml" -type f | while read -r file; do
  # Get the filename without extension
  filename=$(basename "$file" .yaml)
  
  # Check if file already has a title line
  if grep -q "^title:" "$file"; then
    # Update existing title
    sed -i '' "s/^title:.*$/title: $filename/" "$file"
    echo "Updated title in: $file"
  else
    # Add title after $id line
    if grep -q '^\$id:' "$file"; then
      sed -i '' "/^\$id:/a\\
title: $filename
" "$file"
      echo "Added title to: $file"
    else
      # If no $id line, add title after $schema line
      if grep -q '^\$schema:' "$file"; then
        sed -i '' "/^\$schema:/a\\
title: $filename
" "$file"
        echo "Added title after \$schema in: $file"
      else
        # Prepend title to the file
        sed -i '' "1i\\
title: $filename
" "$file"
        echo "Prepended title to: $file"
      fi
    fi
  fi
done

echo "Done processing all YAML files."