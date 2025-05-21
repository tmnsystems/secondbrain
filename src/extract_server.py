#!/usr/bin/env python3
"""
Persistent Extraction Server for SecondBrain

This script sets up a long-running process that:
1. Runs independently of terminal sessions
2. Processes all content files systematically 
3. Maintains state between restarts
4. Logs progress for monitoring
5. Generates comprehensive results

Designed to handle the full extraction of ~200 transcripts, articles, and interviews.

IMPORTANT: This system is designed to be as inclusive as possible,
capturing ANYTHING that might fall into these extraction categories (metaphors, values, 
frameworks, patterns), even if they overlap. The system never excludes potential matches
- all filtering power remains solely with the user.
"""

import os
import json
import glob
import re
import time
import signal
import atexit
import argparse
from datetime import datetime
import logging
from typing import Dict, List, Any
import subprocess
import multiprocessing
from tqdm import tqdm
import hashlib

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("/Volumes/Envoy/SecondBrain/logs/extraction_server.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("extraction_server")

# Directory paths
BASE_DIR = "/Volumes/Envoy/SecondBrain"
TRANSCRIPTS_DIR = os.path.join(BASE_DIR, "transcripts")
PROCESSED_CONTENT_DIR = os.path.join(BASE_DIR, "processed_content")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "processed_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "extracted_content")
LOG_DIR = os.path.join(BASE_DIR, "logs")
STATE_DIR = os.path.join(BASE_DIR, "state")

# Create directories if they don't exist
for directory in [OUTPUT_DIR, LOG_DIR, STATE_DIR]:
    os.makedirs(directory, exist_ok=True)

# Files for persistent state
STATE_FILE = os.path.join(STATE_DIR, "extraction_state.json")
PID_FILE = os.path.join(STATE_DIR, "extraction_server.pid")
LOCK_FILE = os.path.join(STATE_DIR, "extraction_server.lock")

# Output files
METAPHORS_FILE = os.path.join(OUTPUT_DIR, "metaphors_database.json")
VALUES_FILE = os.path.join(OUTPUT_DIR, "values_database.json")
PATTERNS_FILE = os.path.join(OUTPUT_DIR, "teaching_patterns_database.json")
MASTER_INDEX_FILE = os.path.join(OUTPUT_DIR, "content_master_index.json")

# Import the core extraction system
import sys
sys.path.append(os.path.join(BASE_DIR, "src"))
try:
    from extraction_system import MetaphorExtractor, ValuesExtractor, TeachingPatternExtractor
except ImportError:
    logger.error("Failed to import extraction system modules. Ensure extraction_system.py is in the src directory.")
    sys.exit(1)

class ExtractionServer:
    """Server class to manage the persistent extraction process"""
    
    def __init__(self, daemon=False):
        self.daemon = daemon
        self.running = False
        self.state = self.load_state()
        self.setup_signal_handlers()
        self.lock_file = None
    
    def load_state(self) -> Dict:
        """Load the current processing state or create a new one"""
        if os.path.exists(STATE_FILE):
            try:
                with open(STATE_FILE, 'r') as f:
                    state = json.load(f)
                logger.info(f"Loaded existing state: processed {len(state.get('processed_files', []))} files")
                return state
            except Exception as e:
                logger.error(f"Error loading state file: {e}")
        
        # Initialize new state
        return {
            "start_time": datetime.now().isoformat(),
            "last_update": datetime.now().isoformat(),
            "processed_files": [],
            "failed_files": [],
            "current_file": None,
            "stats": {
                "total_files": 0,
                "processed_files": 0,
                "failed_files": 0,
                "extracted_metaphors": 0,
                "extracted_values": 0,
                "extracted_patterns": 0
            }
        }
    
    def save_state(self):
        """Save the current processing state"""
        self.state["last_update"] = datetime.now().isoformat()
        
        try:
            with open(STATE_FILE, 'w') as f:
                json.dump(self.state, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving state file: {e}")
    
    def setup_signal_handlers(self):
        """Set up handlers for process signals to ensure clean shutdown"""
        signal.signal(signal.SIGTERM, self.handle_shutdown)
        signal.signal(signal.SIGINT, self.handle_shutdown)
        atexit.register(self.cleanup)
    
    def handle_shutdown(self, signum, frame):
        """Handle process termination signals"""
        logger.info(f"Received signal {signum}, shutting down gracefully")
        self.running = False
        self.cleanup()
        sys.exit(0)
    
    def cleanup(self):
        """Clean up resources before shutdown"""
        logger.info("Cleaning up before shutdown")
        self.save_state()
        
        if self.lock_file:
            try:
                self.lock_file.close()
                os.unlink(LOCK_FILE)
            except Exception as e:
                logger.error(f"Error removing lock file: {e}")
        
        if os.path.exists(PID_FILE):
            try:
                os.unlink(PID_FILE)
            except Exception as e:
                logger.error(f"Error removing PID file: {e}")
    
    def acquire_lock(self) -> bool:
        """Try to acquire the lock file to ensure only one instance runs"""
        try:
            # Check if PID file exists and process is running
            if os.path.exists(PID_FILE):
                with open(PID_FILE, 'r') as f:
                    pid = int(f.read().strip())
                
                # Check if process with this PID exists
                try:
                    os.kill(pid, 0)  # Signal 0 doesn't kill but checks if process exists
                    logger.error(f"Another extraction server is running with PID {pid}")
                    return False
                except OSError:
                    # Process doesn't exist, we can proceed
                    logger.warning(f"Found stale PID file, previous process {pid} not running")
            
            # Create lock file
            self.lock_file = open(LOCK_FILE, 'w')
            self.lock_file.write(str(os.getpid()))
            self.lock_file.flush()
            
            # Create PID file
            with open(PID_FILE, 'w') as f:
                f.write(str(os.getpid()))
            
            logger.info(f"Successfully acquired lock, PID: {os.getpid()}")
            return True
        
        except Exception as e:
            logger.error(f"Error acquiring lock: {e}")
            return False
    
    def daemonize(self):
        """Daemonize the process to run in the background"""
        if not self.daemon:
            return
        
        try:
            # First fork
            pid = os.fork()
            if pid > 0:
                # Exit first parent
                sys.exit(0)
        except OSError as e:
            logger.error(f"Fork #1 failed: {e}")
            sys.exit(1)
        
        # Decouple from parent environment
        os.chdir('/')
        os.setsid()
        os.umask(0)
        
        try:
            # Second fork
            pid = os.fork()
            if pid > 0:
                # Exit from second parent
                sys.exit(0)
        except OSError as e:
            logger.error(f"Fork #2 failed: {e}")
            sys.exit(1)
        
        # Redirect standard file descriptors
        sys.stdout.flush()
        sys.stderr.flush()
        
        si = open(os.devnull, 'r')
        so = open(os.path.join(LOG_DIR, 'daemon_stdout.log'), 'a+')
        se = open(os.path.join(LOG_DIR, 'daemon_stderr.log'), 'a+')
        
        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())
        
        logger.info(f"Successfully daemonized, PID: {os.getpid()}")
    
    def get_file_list(self) -> List[Dict]:
        """Get list of all content files to process"""
        all_files = []
        
        # Get all transcript files
        transcript_files = glob.glob(os.path.join(TRANSCRIPTS_DIR, "**/*.txt"), recursive=True)
        logger.info(f"Found {len(transcript_files)} potential transcript files")
        
        for filepath in transcript_files:
            # Check if file actually exists and is readable
            if os.path.isfile(filepath) and os.access(filepath, os.R_OK):
                try:
                    file_hash = self.get_file_hash(filepath)
                    file_size = os.path.getsize(filepath)
                    last_modified = datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
                    
                    file_info = {
                        "path": filepath,
                        "type": "transcript",
                        "filename": os.path.basename(filepath),
                        "size": file_size,
                        "hash": file_hash,
                        "last_modified": last_modified
                    }
                    all_files.append(file_info)
                except Exception as e:
                    logger.error(f"Error processing file info for {filepath}: {e}")
            else:
                logger.warning(f"File {filepath} does not exist or is not readable, skipping")
        
        # Additional file types can be added here (articles, interviews, etc.)
        
        # Sort by modified time (newest first)
        all_files.sort(key=lambda x: x["last_modified"], reverse=True)
        
        # Update stats
        self.state["stats"]["total_files"] = len(all_files)
        self.save_state()
        
        # Filter out already processed files
        processed_hashes = {f["hash"] for f in self.state.get("processed_files", [])}
        return [f for f in all_files if f["hash"] not in processed_hashes]
    
    def get_file_hash(self, filepath: str) -> str:
        """Generate a hash for the file to track changes"""
        try:
            hasher = hashlib.md5()
            with open(filepath, 'rb') as f:
                buf = f.read(65536)  # Read in 64k chunks
                while len(buf) > 0:
                    hasher.update(buf)
                    buf = f.read(65536)
            return hasher.hexdigest()
        except Exception as e:
            logger.error(f"Error generating hash for {filepath}: {e}")
            return ""
    
    def process_file(self, file_info: Dict) -> bool:
        """Process a single file with all extractors"""
        filepath = file_info["path"]
        self.state["current_file"] = file_info
        self.save_state()
        
        logger.info(f"Processing file: {filepath}")
        
        try:
            # Initialize extractors
            metaphor_extractor = MetaphorExtractor()
            values_extractor = ValuesExtractor()
            pattern_extractor = TeachingPatternExtractor()
            
            # Process with all extractors
            metaphor_extractor.process_file(filepath)
            values_extractor.process_file(filepath)
            pattern_extractor.process_file(filepath)
            
            # Update stats
            metaphor_count = len(metaphor_extractor.metaphors_database.get("metaphors", []))
            values_count = len(values_extractor.values_database.get("values", []))
            pattern_count = len(pattern_extractor.patterns_database.get("patterns", []))
            
            self.state["stats"]["extracted_metaphors"] = metaphor_count
            self.state["stats"]["extracted_values"] = values_count
            self.state["stats"]["extracted_patterns"] = pattern_count
            
            # Mark as processed
            file_info["processed_time"] = datetime.now().isoformat()
            file_info["metaphor_count"] = metaphor_count
            file_info["values_count"] = values_count
            file_info["pattern_count"] = pattern_count
            
            self.state["processed_files"].append(file_info)
            self.state["stats"]["processed_files"] = len(self.state["processed_files"])
            
            logger.info(f"Successfully processed {filepath}")
            return True
            
        except Exception as e:
            logger.error(f"Error processing {filepath}: {e}")
            file_info["error"] = str(e)
            file_info["error_time"] = datetime.now().isoformat()
            self.state["failed_files"].append(file_info)
            self.state["stats"]["failed_files"] = len(self.state["failed_files"])
            return False
        finally:
            self.state["current_file"] = None
            self.save_state()
    
    def generate_catalogs(self):
        """Generate comprehensive catalogs from extracted data"""
        logger.info("Generating comprehensive catalogs")
        
        try:
            # Import the catalog generation function
            sys.path.append(os.path.join(BASE_DIR, "src"))
            from extraction_system import generate_comprehensive_catalogs
            generate_comprehensive_catalogs()
            logger.info("Successfully generated comprehensive catalogs")
        except Exception as e:
            logger.error(f"Error generating catalogs: {e}")
    
    def run(self):
        """Main server loop"""
        if not self.acquire_lock():
            logger.error("Failed to acquire lock, another instance may be running")
            return
        
        self.daemonize()
        self.running = True
        
        logger.info("Starting extraction server")
        
        try:
            while self.running:
                # Get files to process
                files_to_process = self.get_file_list()
                
                if not files_to_process:
                    logger.info("No new files to process")
                    
                    # Generate catalogs with current data
                    self.generate_catalogs()
                    
                    # Sleep before checking again
                    logger.info("Sleeping for 5 minutes before checking for new files")
                    time.sleep(300)
                    continue
                
                logger.info(f"Found {len(files_to_process)} files to process")
                
                # Process each file
                for file_info in tqdm(files_to_process, desc="Processing files"):
                    if not self.running:
                        break
                    
                    self.process_file(file_info)
                
                # Generate catalogs after processing batch
                self.generate_catalogs()
                
                # Sleep briefly before next check
                time.sleep(10)
            
        except Exception as e:
            logger.error(f"Error in main server loop: {e}")
        finally:
            self.cleanup()

def check_status():
    """Check the status of the extraction server"""
    if not os.path.exists(PID_FILE):
        print("Extraction server is not running")
        return
    
    with open(PID_FILE, 'r') as f:
        pid = int(f.read().strip())
    
    try:
        os.kill(pid, 0)  # Signal 0 doesn't kill but checks if process exists
        print(f"Extraction server is running with PID {pid}")
    except OSError:
        print(f"Extraction server is not running (stale PID file found)")
    
    if os.path.exists(STATE_FILE):
        with open(STATE_FILE, 'r') as f:
            state = json.load(f)
        
        stats = state.get("stats", {})
        print(f"Total files: {stats.get('total_files', 0)}")
        print(f"Processed files: {stats.get('processed_files', 0)}")
        print(f"Failed files: {stats.get('failed_files', 0)}")
        print(f"Extracted metaphors: {stats.get('extracted_metaphors', 0)}")
        print(f"Extracted values: {stats.get('extracted_values', 0)}")
        print(f"Extracted patterns: {stats.get('extracted_patterns', 0)}")
        
        current_file = state.get("current_file")
        if current_file:
            print(f"Currently processing: {current_file.get('filename')}")
        
        last_update = state.get("last_update")
        if last_update:
            print(f"Last state update: {last_update}")

def stop_server():
    """Stop the extraction server if it's running"""
    if not os.path.exists(PID_FILE):
        print("Extraction server is not running")
        return
    
    with open(PID_FILE, 'r') as f:
        pid = int(f.read().strip())
    
    try:
        os.kill(pid, signal.SIGTERM)
        print(f"Sent termination signal to extraction server (PID {pid})")
        
        # Wait for process to terminate
        for _ in range(10):
            try:
                os.kill(pid, 0)
                time.sleep(1)
            except OSError:
                print("Extraction server has been stopped")
                return
        
        print("Extraction server did not terminate gracefully, sending SIGKILL")
        os.kill(pid, signal.SIGKILL)
    except OSError as e:
        print(f"Error stopping extraction server: {e}")

def main():
    """Parse command line arguments and manage the extraction server"""
    parser = argparse.ArgumentParser(description="Extraction Server for SecondBrain Content")
    
    parser.add_argument('command', choices=['start', 'stop', 'restart', 'status'],
                        help='Command to execute')
    
    parser.add_argument('--daemon', action='store_true',
                        help='Run as a daemon process in the background')
    
    args = parser.parse_args()
    
    if args.command == 'status':
        check_status()
        return
    
    if args.command == 'stop' or args.command == 'restart':
        stop_server()
        if args.command == 'stop':
            return
    
    if args.command == 'start' or args.command == 'restart':
        print(f"Starting extraction server{' as daemon' if args.daemon else ''}")
        server = ExtractionServer(daemon=args.daemon)
        server.run()

if __name__ == "__main__":
    main()