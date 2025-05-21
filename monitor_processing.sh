#!/bin/bash
# Monitor Style Analysis Processing
# This script provides a continuous visual indicator of processing progress

PROCESSED_DATA_DIR="./processed_data"
PROCESSED_CONTENT_DIR="./processed_content"
PROGRESS_LOG="${PROCESSED_DATA_DIR}/processing_progress.log"

# Ensure directories exist
mkdir -p "$PROCESSED_DATA_DIR"

# Print header
echo "===================================================="
echo "SecondBrain Style Analysis Processing Monitor"
echo "===================================================="
echo ""

# Function to display file counts and progress
display_stats() {
    # Count total source files
    total_source_files=$(find "$PROCESSED_CONTENT_DIR" -type f | wc -l)
    
    # Count processed style profiles
    total_profiles=$(find "$PROCESSED_DATA_DIR" -name "*_style_profile.json" | wc -l)
    
    # Get processed file size total
    processed_size=$(du -sh "$PROCESSED_DATA_DIR" | cut -f1)
    
    # Calculate percentage
    if [ $total_source_files -gt 0 ]; then
        percentage=$((total_profiles * 100 / total_source_files))
    else
        percentage=0
    fi
    
    # Create progress bar
    progress_bar=""
    bar_size=30
    completed_size=$((percentage * bar_size / 100))
    
    for ((i=0; i<completed_size; i++)); do
        progress_bar="${progress_bar}█"
    done
    
    for ((i=completed_size; i<bar_size; i++)); do
        progress_bar="${progress_bar}░"
    done
    
    # Output stats
    echo "Progress: [${progress_bar}] ${percentage}%"
    echo "Files processed: ${total_profiles} / ${total_source_files}"
    echo "Total processed data size: ${processed_size}"
    echo ""
    
    # Show processing rate if possible
    if [ -f "$BATCH_STATE_FILE" ]; then
        node -e "
        const fs = require('fs');
        try {
            const data = fs.readFileSync('${PROCESSED_DATA_DIR}/batch_processing_state.json');
            const state = JSON.parse(data);
            if (state.startTime) {
                const startTime = new Date(state.startTime);
                const now = new Date();
                const elapsedHours = (now - startTime) / (1000 * 60 * 60);
                if (elapsedHours > 0 && state.processedFiles > 0) {
                    const rate = state.processedFiles / elapsedHours;
                    console.log('Processing rate: ' + rate.toFixed(2) + ' files/hour');
                    
                    if (state.totalFiles > state.processedFiles) {
                        const remaining = state.totalFiles - state.processedFiles;
                        const etaHours = remaining / rate;
                        console.log('Estimated time remaining: ' + etaHours.toFixed(1) + ' hours');
                    }
                }
            }
        } catch (e) {
            // Ignore errors
        }
        "
        echo ""
    fi
    
    # Show most recent log entries
    if [ -f "$PROGRESS_LOG" ]; then
        echo "Recent log entries:"
        tail -n 5 "$PROGRESS_LOG"
    fi
}

# Function to check for the combined profile
check_combined_profile() {
    if [ -f "${PROCESSED_DATA_DIR}/combined_style_profile.json" ]; then
        profile_date=$(stat -f "%Sm" "${PROCESSED_DATA_DIR}/combined_style_profile.json")
        
        echo ""
        echo "===================================================="
        echo "COMBINED STYLE PROFILE EXISTS!"
        echo "Created: $profile_date"
        echo "Path: ${PROCESSED_DATA_DIR}/combined_style_profile.json"
        
        # Get profile size and content type distribution
        profile_size=$(du -h "${PROCESSED_DATA_DIR}/combined_style_profile.json" | cut -f1)
        echo "Size: $profile_size"
        
        # Try to get source types with Node.js
        node -e "
        const fs = require('fs');
        try {
            const data = fs.readFileSync('${PROCESSED_DATA_DIR}/combined_style_profile.json');
            const profile = JSON.parse(data);
            if (profile.source_types) {
                console.log('Source types included: ' + JSON.stringify(profile.source_types));
            }
            if (profile.source_profiles) {
                console.log('Number of source profiles: ' + profile.source_profiles);
            }
        } catch (e) {
            // Ignore errors
        }
        "
        echo "===================================================="
    fi
}

# Run the batch processing script stats command if it exists
if [ -f "process_in_batches.js" ]; then
    echo "Running detailed stats from process_in_batches.js:"
    node process_in_batches.js stats
    echo ""
else
    # Otherwise show basic stats
    display_stats
fi

# Check for combined profile
check_combined_profile

echo ""
echo "To process the next batch, run:"
echo "node process_in_batches.js process"
echo ""
echo "To monitor continuously (updates every 10 seconds):"
echo "watch -n 10 ./monitor_processing.sh"