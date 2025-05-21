#!/bin/bash
# Full SecondBrain Analysis with Continuous Processing and Monitoring
# This script handles the entire analysis process without timing out

# Set variables
PROCESSED_CONTENT_DIR="./processed_content"
PROCESSED_DATA_DIR="./processed_data"
BATCH_STATE_FILE="${PROCESSED_DATA_DIR}/batch_processing_state.json"
PROGRESS_LOG="${PROCESSED_DATA_DIR}/processing_progress.log"
BATCH_SIZE=5
MAX_RUNTIME_MINUTES=5
TERMINAL_WIDTH=$(tput cols || echo 80)

# Create required directories
mkdir -p "$PROCESSED_DATA_DIR"

# Function to display a centered header
center_text() {
    local text="$1"
    local width=${2:-$TERMINAL_WIDTH}
    local padding=$(( (width - ${#text}) / 2 ))
    
    if [ $padding -lt 0 ]; then
        padding=0
    fi
    
    printf "%${padding}s" ""
    echo "$text"
}

# Function to display a progress bar
show_progress_bar() {
    local percent=$1
    local width=${2:-50}
    local completed=$((percent * width / 100))
    
    printf "["
    for ((i=0; i<completed; i++)); do
        printf "█"
    done
    for ((i=completed; i<width; i++)); do
        printf "░"
    done
    printf "] %3d%%\n" "$percent"
}

# Display header
clear
echo "========================================================"
center_text "SecondBrain Comprehensive Style Analysis"
center_text "Processing ALL Content While Preserving Context"
echo "========================================================"
echo ""

# Step 1: Check if content has been processed
echo "Step 1: Checking content processing status..."
total_content_files=$(find "$PROCESSED_CONTENT_DIR" -type f 2>/dev/null | wc -l)

if [ "$total_content_files" -eq 0 ]; then
    echo "No processed content found. Need to run initial content processing."
    echo "Running content processing..."
    echo ""
    
    # Run the content processing
    node local_context_system.js process-force
    
    # Verify content was processed
    total_content_files=$(find "$PROCESSED_CONTENT_DIR" -type f 2>/dev/null | wc -l)
    if [ "$total_content_files" -eq 0 ]; then
        echo "ERROR: Content processing failed! Please check for errors."
        exit 1
    fi
    
    echo ""
    echo "Content processing complete! Found $total_content_files files."
else
    echo "Found $total_content_files processed content files. Ready for style analysis."
fi

echo ""

# Step 2: Setup style analysis
echo "Step 2: Setting up style analysis..."

# Initialize the batch processing status if it doesn't exist
if [ ! -f "$BATCH_STATE_FILE" ]; then
    echo "Initializing batch processing state..."
    echo "{}" > "$BATCH_STATE_FILE"
fi

# Clean up previous progress log if we're starting fresh
if [ ! -s "$BATCH_STATE_FILE" ] || [ "$(cat "$BATCH_STATE_FILE")" = "{}" ]; then
    echo "Starting fresh analysis - cleaning progress log..."
    > "$PROGRESS_LOG"
    
    # Check if a content index exists
    if [ ! -f "${PROCESSED_CONTENT_DIR}/content_index.json" ]; then
        echo "ERROR: No content index found! Content processing may not have completed successfully."
        exit 1
    fi
fi

echo ""

# Step 3: Display initial stats and begin processing
echo "Step 3: Beginning style analysis of ALL content..."
echo ""

# Function to check if combined profile exists and is valid
check_combined_profile() {
    if [ -f "${PROCESSED_DATA_DIR}/combined_style_profile.json" ]; then
        if grep -q "source_profiles" "${PROCESSED_DATA_DIR}/combined_style_profile.json"; then
            echo "Combined style profile exists and appears valid!"
            return 0
        fi
    fi
    return 1
}

# Function to check progress state and return completion percentage
get_progress_percentage() {
    if [ -f "$BATCH_STATE_FILE" ]; then
        # Try to extract completed percentage with Node
        percentage=$(node -e "
            try {
                const fs = require('fs');
                const data = fs.readFileSync('$BATCH_STATE_FILE', 'utf8');
                const state = JSON.parse(data);
                if (state.totalFiles && state.totalFiles > 0) {
                    console.log(Math.round((state.processedFiles || 0) * 100 / state.totalFiles));
                } else {
                    console.log('0');
                }
            } catch (e) {
                console.log('0');
            }
        ")
        echo "$percentage"
    else
        echo "0"
    fi
}

# Function to display current stats
display_stats() {
    echo "------------------------------------------------"
    echo "Current Progress:"
    
    # Count processed style profiles
    total_profiles=$(find "$PROCESSED_DATA_DIR" -name "*_style_profile.json" | wc -l)
    
    # Get index content file count
    index_count=$(node -e "
        try {
            const fs = require('fs');
            const data = fs.readFileSync('${PROCESSED_CONTENT_DIR}/content_index.json', 'utf8');
            const index = JSON.parse(data);
            console.log(index.length);
        } catch (e) {
            console.log('Unknown');
        }
    ")
    
    # Display counts
    echo "Files processed: $total_profiles / $index_count"
    
    # Get percentage
    percentage=$(get_progress_percentage)
    show_progress_bar "$percentage"
    
    # Show recent log entries if they exist
    if [ -f "$PROGRESS_LOG" ]; then
        echo ""
        echo "Recent activity:"
        tail -n 3 "$PROGRESS_LOG"
    fi
    
    echo "------------------------------------------------"
}

# Main processing loop
while true; do
    # Display current stats
    display_stats
    
    # Check if combined profile exists
    if check_combined_profile; then
        echo ""
        echo "========================================================"
        center_text "FULL ANALYSIS COMPLETE!"
        echo "========================================================"
        echo ""
        node -e "
            try {
                const fs = require('fs');
                const data = fs.readFileSync('${PROCESSED_DATA_DIR}/combined_style_profile.json', 'utf8');
                const profile = JSON.parse(data);
                console.log('Analysis includes ' + profile.source_profiles + ' files');
                console.log('Source types: ' + JSON.stringify(profile.source_types));
                console.log('Created at: ' + profile.created_at);
            } catch (e) {
                console.log('Error reading profile details: ' + e.message);
            }
        "
        echo ""
        echo "You can now generate content using the complete style profile:"
        echo "npm run master-article --topic=\"Your topic\""
        break
    fi
    
    # Run a batch
    echo ""
    echo "Processing next batch of files..."
    echo ""
    
    # Run with a timeout to prevent hanging
    timeout ${MAX_RUNTIME_MINUTES}m node process_in_batches.js process
    
    # Check if we need to exit
    status=$?
    if [ $status -eq 124 ] || [ $status -eq 142 ]; then
        echo ""
        echo "Batch processing took too long and was terminated."
        echo "This is normal - the script will resume on the next batch."
    elif [ $status -ne 0 ]; then
        echo ""
        echo "WARNING: Batch processing exited with status $status"
        echo "Will try again in 5 seconds..."
        sleep 5
    else
        echo ""
        echo "Batch completed successfully!"
    fi
    
    # Give a slight pause before next batch
    sleep 2
    
    # Clear screen for next update
    clear
    echo "========================================================"
    center_text "SecondBrain Comprehensive Style Analysis"
    center_text "Processing ALL Content While Preserving Context"
    echo "========================================================"
    echo ""
done

# Copy combined profile to master profile if needed
if [ -f "${PROCESSED_DATA_DIR}/combined_style_profile.json" ] && [ ! -f "${PROCESSED_DATA_DIR}/master_style_profile.json" ]; then
    echo "Copying combined profile to master_style_profile.json..."
    cp "${PROCESSED_DATA_DIR}/combined_style_profile.json" "${PROCESSED_DATA_DIR}/master_style_profile.json"
fi

echo ""
echo "Comprehensive style analysis complete! Your SecondBrain system is now ready to generate authentic content that truly matches your unique voice."