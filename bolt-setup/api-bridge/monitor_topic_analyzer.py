#!/usr/bin/env python3
"""
Monitoring script for the Topic Analyzer

This script starts the topic analyzer and monitors its progress every 15 minutes.
If there is no progress for a given period, it will report the issue.
"""

import os
import sys
import time
import json
import logging
import datetime
import subprocess
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("monitor_analyzer.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("AnalyzerMonitor")

# Configuration
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "topic_database")
PROGRESS_FILE = os.path.join(OUTPUT_DIR, "processing_progress.json")
CHECK_INTERVAL = 15 * 60  # 15 minutes in seconds
MAX_INACTIVITY = 2 * CHECK_INTERVAL  # Maximum allowed inactivity (30 minutes)
ANALYZER_SCRIPT = os.path.join(os.path.dirname(__file__), "topic_analyzer.py")

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_last_activity_time():
    """Get the timestamp of the last activity from the progress file."""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                progress_data = json.load(f)
                return progress_data.get("last_activity_time", 0)
        return 0
    except Exception as e:
        logger.error(f"Error reading progress file: {str(e)}")
        return 0

def get_processed_count():
    """Get the number of processed files from the progress file."""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                progress_data = json.load(f)
                return len(progress_data.get("processed_files", []))
        return 0
    except Exception as e:
        logger.error(f"Error reading progress file: {str(e)}")
        return 0

def check_analyzer_process(pid=None):
    """Check if the analyzer process is still running."""
    try:
        # This is a simple implementation - would need adjustments for Windows
        if pid:
            # Check specific PID
            try:
                os.kill(pid, 0)  # Doesn't kill the process, just checks if it exists
                return True
            except OSError:
                return False
        
        # Check if any python process is running the analyzer script
        result = subprocess.run(
            ["ps", "aux"], 
            capture_output=True, 
            text=True, 
            check=False
        )
        
        return ANALYZER_SCRIPT in result.stdout
    except Exception as e:
        logger.error(f"Error checking analyzer process: {str(e)}")
        return False

def start_analyzer(client_filter=None, chunk_size=10):
    """
    Start the topic analyzer script as a separate process.
    
    Args:
        client_filter: Optional list of client names to filter by
        chunk_size: Number of files to process in each chunk
    """
    try:
        logger.info(f"Starting analyzer script: {ANALYZER_SCRIPT}")
        
        # Check if the script exists
        if not os.path.exists(ANALYZER_SCRIPT):
            logger.error(f"Analyzer script not found: {ANALYZER_SCRIPT}")
            return None
        
        # Make the script executable
        os.chmod(ANALYZER_SCRIPT, 0o755)
        
        # Build command with arguments
        cmd = [sys.executable, ANALYZER_SCRIPT]
        
        if client_filter:
            cmd.append("--clients")
            cmd.extend(client_filter)
        
        cmd.extend(["--chunk-size", str(chunk_size)])
        
        logger.info(f"Starting analyzer with command: {' '.join(cmd)}")
        
        # Start the analyzer as a background process
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            start_new_session=True  # Detach from the parent process
        )
        
        logger.info(f"Analyzer started with PID: {process.pid}")
        return process.pid
    except Exception as e:
        logger.error(f"Error starting analyzer: {str(e)}")
        return None

def monitor_progress():
    """Monitor the progress of the topic analyzer."""
    logger.info("Starting monitor for topic analyzer")
    
    analyzer_pid = None
    last_processed_count = get_processed_count()
    
    while True:
        try:
            current_time = time.time()
            
            # Check if analyzer is running
            analyzer_running = check_analyzer_process(analyzer_pid)
            
            if not analyzer_running:
                logger.warning("Analyzer process not found. Starting a new instance.")
                analyzer_pid = start_analyzer()
                time.sleep(5)  # Wait for the process to initialize
                continue
            
            # Get current progress
            last_activity_time = get_last_activity_time()
            current_processed_count = get_processed_count()
            
            # Check for progress
            if current_processed_count > last_processed_count:
                logger.info(f"Progress detected: {current_processed_count - last_processed_count} new files processed")
                last_processed_count = current_processed_count
            
            # Check for inactivity
            inactivity_time = current_time - last_activity_time
            if inactivity_time > MAX_INACTIVITY:
                logger.warning(f"No activity detected for {inactivity_time / 60:.2f} minutes. Restarting analyzer.")
                
                # Attempt to kill the existing process
                if analyzer_pid:
                    try:
                        os.kill(analyzer_pid, 15)  # SIGTERM
                        logger.info(f"Sent SIGTERM to analyzer process {analyzer_pid}")
                    except OSError:
                        pass
                
                time.sleep(5)  # Wait before starting a new process
                analyzer_pid = start_analyzer()
            else:
                logger.info(f"Analyzer is active. Last activity: {inactivity_time / 60:.2f} minutes ago. Processed files: {current_processed_count}")
            
            # Wait for the next check
            logger.info(f"Next check in {CHECK_INTERVAL / 60:.2f} minutes")
            time.sleep(CHECK_INTERVAL)
            
        except KeyboardInterrupt:
            logger.info("Monitor stopped by user")
            break
        except Exception as e:
            logger.error(f"Error in monitor loop: {str(e)}")
            time.sleep(60)  # Wait a bit before retrying after an error

def main():
    """Main entry point."""
    import argparse
    
    # Set up command line argument parsing
    parser = argparse.ArgumentParser(description='Monitor the topic analyzer process')
    parser.add_argument('--clients', nargs='+', help='List of client names to filter (e.g., aretas fuji esther)')
    parser.add_argument('--chunk-size', type=int, default=10, help='Number of files to process before exporting results')
    args = parser.parse_args()
    
    try:
        # Check if analyzer is already running
        if check_analyzer_process():
            logger.info("Analyzer is already running. Starting monitor only.")
        else:
            logger.info("Analyzer not running. Starting a new instance.")
            if args.clients:
                logger.info(f"Filtering for clients: {', '.join(args.clients)}")
            start_analyzer(client_filter=args.clients, chunk_size=args.chunk_size)
        
        # Start monitoring
        monitor_progress()
        
    except Exception as e:
        logger.critical(f"Critical error in monitor: {str(e)}")
        return 1
    return 0

if __name__ == "__main__":
    exit_code = main()
    exit(exit_code)