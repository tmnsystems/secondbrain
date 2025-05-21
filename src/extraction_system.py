#!/usr/bin/env python3
"""
Full-Scale Content Extraction System for SecondBrain

This script processes all transcripts, articles, and interviews to extract:
1. Metaphors and analogies with full context
2. Value statements with full context
3. Teaching patterns with full context
4. Frameworks and models with full context

The extracted data is stored in structured format while preserving the original
context to maintain the full emotional nuance and meaning.
"""

import os
import json
import glob
import re
import sys
from datetime import datetime
from typing import Dict, List, Tuple, Optional, Any
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("extraction_process.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("extraction_system")

# Directory paths - modify as needed
BASE_DIR = "/Volumes/Envoy/SecondBrain"
TRANSCRIPTS_DIR = os.path.join(BASE_DIR, "transcripts")
PROCESSED_CONTENT_DIR = os.path.join(BASE_DIR, "processed_content")
PROCESSED_DATA_DIR = os.path.join(BASE_DIR, "processed_data")
OUTPUT_DIR = os.path.join(BASE_DIR, "extracted_content")

# Create output directory if it doesn't exist
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Files to store extracted data
METAPHORS_FILE = os.path.join(OUTPUT_DIR, "metaphors_database.json")
VALUES_FILE = os.path.join(OUTPUT_DIR, "values_database.json")
PATTERNS_FILE = os.path.join(OUTPUT_DIR, "teaching_patterns_database.json")
FRAMEWORKS_FILE = os.path.join(OUTPUT_DIR, "frameworks_database.json")
MASTER_INDEX_FILE = os.path.join(OUTPUT_DIR, "content_master_index.json")

class ContentExtractor:
    """Base class for extraction processing"""
    
    def __init__(self):
        self.processed_files = []
        self.create_master_index()
    
    def create_master_index(self) -> Dict:
        """
        Creates a master index of all content files available for processing
        """
        master_index = {"transcripts": [], "articles": [], "interviews": []}
        
        # Index transcripts
        transcript_files = glob.glob(os.path.join(TRANSCRIPTS_DIR, "**/*.txt"), recursive=True)
        for filepath in transcript_files:
            file_info = {
                "path": filepath,
                "filename": os.path.basename(filepath),
                "size": os.path.getsize(filepath),
                "last_modified": datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat(),
                "processed": False
            }
            master_index["transcripts"].append(file_info)
        
        # Sort transcripts by last modified date (newest first)
        master_index["transcripts"].sort(key=lambda x: x["last_modified"], reverse=True)
        
        # Save master index
        with open(MASTER_INDEX_FILE, 'w') as f:
            json.dump(master_index, f, indent=2)
        
        logger.info(f"Created master index with {len(master_index['transcripts'])} transcripts")
        return master_index
    
    def update_master_index(self, filepath: str, category: str = "transcripts") -> None:
        """
        Updates the master index to mark a file as processed
        """
        if not os.path.exists(MASTER_INDEX_FILE):
            self.create_master_index()
            
        with open(MASTER_INDEX_FILE, 'r') as f:
            master_index = json.load(f)
        
        for file_info in master_index[category]:
            if file_info["path"] == filepath:
                file_info["processed"] = True
                file_info["processed_timestamp"] = datetime.now().isoformat()
        
        with open(MASTER_INDEX_FILE, 'w') as f:
            json.dump(master_index, f, indent=2)
    
    def read_file_content(self, filepath: str) -> str:
        """
        Reads the content of a file safely
        """
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
            return content
        except Exception as e:
            logger.error(f"Error reading file {filepath}: {e}")
            return ""
    
    def get_speaker_name(self, content: str) -> str:
        """
        Tries to extract the speaker's name (Tina) from the transcript
        """
        tina_variations = ["Tina Marie:", "Tina:", "Coach Tina:", "Tina M:"]
        
        for line in content.split('\n'):
            for variation in tina_variations:
                if variation in line:
                    return variation.rstrip(':')
        
        return "Tina Marie"  # Default if not found
    
    def extract_speaker_segments(self, content: str, speaker_name: str) -> List[str]:
        """
        Extracts segments where the target speaker is talking
        """
        pattern = re.compile(f"{re.escape(speaker_name)}:(.*?)(?=\n\s*\n|\n\s*[A-Za-z]+:|\Z)", re.DOTALL)
        matches = pattern.findall(content)
        return [match.strip() for match in matches]
    
    def extract_content_with_context(self, content: str, speaker_name: str, 
                                    extract_function, min_context_lines: int = 5) -> List[Dict]:
        """
        Generic extraction function that preserves context around matches
        """
        speaker_segments = self.extract_speaker_segments(content, speaker_name)
        results = []
        
        for segment in speaker_segments:
            items = extract_function(segment)
            
            for item in items:
                # Get more context around the match
                context_start = max(0, segment.find(item["text"]) - 200)
                context_end = min(len(segment), segment.find(item["text"]) + len(item["text"]) + 200)
                
                item["context"] = segment[context_start:context_end].strip()
                results.append(item)
        
        return results

class MetaphorExtractor(ContentExtractor):
    """Extracts metaphors and analogies with context"""
    
    def __init__(self):
        super().__init__()
        # Metaphor markers for detection - expanded to be more inclusive
        self.metaphor_markers = [
            # Direct comparison markers
            "like", "as if", "as though", "resembles", "similar to", "imagine", 
            "think of", "picture", "envision", "compared to", "reminds me of",
            "it's as", "it is as", "think about", "is like", "are like", "it's like",
            "as", "just like", "sort of like", "kind of like", "same as", "similar",
            "comparable", "parallel", "akin to", "analogous to",
            
            # Common metaphorical objects/concepts
            "ecosystem", "journey", "path", "bridge", "foundation", "river",
            "seed", "garden", "building", "architecture", "ocean", "wave",
            "mountain", "tuning fork", "resonance", "frequency", "vibration",
            "magnet", "magnetic", "field", "harmony", "melody", "orchestra",
            "road", "door", "window", "mirror", "fire", "water", "earth", "air",
            "heart", "mind", "soul", "tree", "root", "branch", "flower", "fruit",
            "season", "weather", "storm", "sunshine", "darkness", "light",
            "vehicle", "car", "train", "ship", "airplane", "machine", "engine",
            "game", "puzzle", "maze", "map", "compass", "anchor", "sail",
            "battle", "war", "peace", "balance", "scale", "weight", "muscle",
            
            # More subtle metaphorical language
            "build", "construct", "grow", "nurture", "feed", "starve", "flow", "stuck",
            "high", "low", "deep", "shallow", "hard", "soft", "heavy", "light",
            "hot", "cold", "bright", "dark", "rising", "falling", "climbing",
            "see", "vision", "blind", "deaf", "taste", "touch", "feel"
        ]
        
        self.metaphor_domains = [
            "nature", "physics", "music", "architecture", "journey",
            "water", "building", "sports", "war", "family", "business",
            "technology", "medicine", "agriculture", "spirituality"
        ]
        
        self.analogies_markers = [
            "just as", "similarly", "in the same way", "likewise",
            "parallels", "corresponds to", "is to", "parallel between"
        ]
        
        # Load existing metaphors database if it exists
        if os.path.exists(METAPHORS_FILE):
            with open(METAPHORS_FILE, 'r') as f:
                self.metaphors_database = json.load(f)
        else:
            self.metaphors_database = {"metaphors": [], "sources": []}
    
    def detect_metaphors(self, text: str) -> List[Dict]:
        """
        Detects potential metaphors in text using markers
        """
        results = []
        
        # First pass: direct markers - extract more aggressively
        # Use multiple approaches to maximize extraction
        
        # 1. First try sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        # Ensure we have enough context - expand to whole paragraphs if needed
        context_window = 4  # Sentences before and after for context
        
        for sentence in sentences:
            # Check for any markers but be very inclusive
            for marker in self.metaphor_markers + self.analogies_markers:
                if marker.lower() in sentence.lower():
                    # Get more context by combining with adjacent sentences
                    sentence_index = sentences.index(sentence)
                    start_idx = max(0, sentence_index - context_window)
                    end_idx = min(len(sentences), sentence_index + context_window + 1)
                    context = " ".join(sentences[start_idx:end_idx]).strip()
                    
                    # Determine all applicable domains (can be multiple)
                    domains = ["general"]
                    for d in self.metaphor_domains:
                        if d in sentence.lower():
                            if d not in domains:
                                domains.append(d)
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "domains": domains,
                        "context": context,
                        "type": ["metaphor" if marker in self.metaphor_markers else "analogy"]
                    })
                    break  # Found one marker, no need to check others for this sentence
        
        return results
    
    def process_file(self, filepath: str) -> None:
        """
        Process a single file to extract metaphors
        """
        logger.info(f"Processing {filepath} for metaphors")
        content = self.read_file_content(filepath)
        
        if not content:
            logger.warning(f"Empty or unreadable content in {filepath}")
            return
        
        speaker_name = self.get_speaker_name(content)
        extracted_metaphors = self.extract_content_with_context(
            content, speaker_name, self.detect_metaphors, min_context_lines=10
        )
        
        # Add to database with source information
        source_info = {
            "path": filepath,
            "filename": os.path.basename(filepath),
            "processed_date": datetime.now().isoformat(),
            "metaphor_count": len(extracted_metaphors)
        }
        
        source_id = len(self.metaphors_database["sources"])
        self.metaphors_database["sources"].append(source_info)
        
        for metaphor in extracted_metaphors:
            metaphor["source_id"] = source_id
            self.metaphors_database["metaphors"].append(metaphor)
        
        # Save updated database
        with open(METAPHORS_FILE, 'w') as f:
            json.dump(self.metaphors_database, f, indent=2)
        
        # Update master index
        self.update_master_index(filepath)
        logger.info(f"Extracted {len(extracted_metaphors)} metaphors from {filepath}")

class ValuesExtractor(ContentExtractor):
    """Extracts value statements with context"""
    
    def __init__(self):
        super().__init__()
        # Value markers - expanded to be more inclusive
        self.value_markers = [
            # Core value words
            "important", "matters", "value", "principle", "believe", "core",
            "fundamental", "essential", "critical", "key", "significant",
            "priority", "moral", "ethic", "standard", "deserve", "right",
            "wrong", "should", "must", "need to", "have to", "supposed to",
            "ought to", "crucial", "vital", "respect", "honor", "truth",
            "integrity", "honest", "honesty", "compassion", "love", "care",
            "justice", "fair", "deserve", "entitled", "worthy", "aligned",
            
            # Additional value indicators
            "always", "never", "best", "worst", "better", "good", "bad", 
            "appropriate", "inappropriate", "correct", "incorrect", "true", "false",
            "healthy", "unhealthy", "beneficial", "harmful", "positive", "negative",
            "real", "authentic", "genuine", "fake", "success", "failure", "win", "lose",
            "meaningful", "meaningless", "purpose", "pointless", "valuable", "worthless",
            "acceptable", "unacceptable", "proper", "improper", "responsible", "irresponsible",
            
            # Statements of preference/priority
            "prefer", "rather", "choose", "focus on", "emphasize", "prioritize",
            "favor", "value", "appreciate", "admire", "respect", "honor", "cherish",
            "what I want", "what you want", "what we want", "what matters is",
            "the point is", "what's important", "key thing", "bottom line",
            
            # Normative statements
            "everyone should", "nobody should", "people should", "we should", 
            "you should", "I should", "they should", "one should", "ought to", 
            "supposed to", "expected to", "responsible for", "accountable for",
            "required to", "obligated to", "committed to", "dedicated to"
        ]
        
        self.value_domains = [
            "personal", "business", "relationship", "spiritual", "societal",
            "health", "financial", "educational", "environmental", "ethical"
        ]
        
        # Load existing values database if it exists
        if os.path.exists(VALUES_FILE):
            with open(VALUES_FILE, 'r') as f:
                self.values_database = json.load(f)
        else:
            self.values_database = {"values": [], "sources": []}
    
    def detect_values(self, text: str) -> List[Dict]:
        """
        Detects potential value statements in text using markers
        """
        results = []
        
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        
        for i, sentence in enumerate(sentences):
            for marker in self.value_markers:
                if marker in sentence.lower():
                    # Get more context by combining with adjacent sentences
                    start_idx = max(0, i - 3)
                    end_idx = min(len(sentences), i + 4)
                    context = " ".join(sentences[start_idx:end_idx]).strip()
                    
                    # Determine all applicable domains (can be multiple)
                    domains = ["general"]
                    for d in self.value_domains:
                        if d in sentence.lower():
                            if d not in domains:
                                domains.append(d)
                    
                    # Determine if positive or negative value
                    negative_words = ["not", "don't", "doesn't", "shouldn't", "can't", "wrong", "bad", "harmful"]
                    is_negative = any(neg in sentence.lower() for neg in negative_words)
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "domains": domains,
                        "context": context,
                        "valence": ["negative" if is_negative else "positive"],
                        "types": ["value", "principle", "belief"]
                    })
                    break  # Found one marker, no need to check others
        
        return results
    
    def process_file(self, filepath: str) -> None:
        """
        Process a single file to extract value statements
        """
        logger.info(f"Processing {filepath} for values")
        content = self.read_file_content(filepath)
        
        if not content:
            logger.warning(f"Empty or unreadable content in {filepath}")
            return
        
        speaker_name = self.get_speaker_name(content)
        extracted_values = self.extract_content_with_context(
            content, speaker_name, self.detect_values, min_context_lines=10
        )
        
        # Add to database with source information
        source_info = {
            "path": filepath,
            "filename": os.path.basename(filepath),
            "processed_date": datetime.now().isoformat(),
            "value_count": len(extracted_values)
        }
        
        source_id = len(self.values_database["sources"])
        self.values_database["sources"].append(source_info)
        
        for value in extracted_values:
            value["source_id"] = source_id
            self.values_database["values"].append(value)
        
        # Save updated database
        with open(VALUES_FILE, 'w') as f:
            json.dump(self.values_database, f, indent=2)
        
        # Update master index
        self.update_master_index(filepath)
        logger.info(f"Extracted {len(extracted_values)} value statements from {filepath}")

class FrameworkExtractor(ContentExtractor):
    """Extracts frameworks and models with context"""
    
    def __init__(self):
        super().__init__()
        self.framework_markers = [
            "framework", "model", "system", "methodology", "approach", 
            "steps", "stages", "phases", "process", "principles", 
            "pillars", "elements", "components", "categories", "types",
            "first step", "second step", "third step", "final step",
            "level one", "level two", "level three", "level four",
            "step one", "step two", "step three", "step four",
            "phase one", "phase two", "phase three",
            "three steps", "four steps", "five steps",
            "three phases", "four phases", "five phases",
            "three pillars", "four pillars", "five pillars",
            "three keys", "four keys", "five keys",
            "three elements", "four elements", "five elements",
            "three parts", "four parts", "five parts",
            "three stage", "four stage", "five stage",
            "three types", "four types", "five types",
            "three level", "four level", "five level"
        ]
        
        self.framework_domains = [
            "business", "personal", "relationship", "spiritual", 
            "financial", "health", "productivity", "communication",
            "leadership", "development", "growth", "success"
        ]
        
        # Load existing frameworks database if it exists
        if os.path.exists(FRAMEWORKS_FILE):
            with open(FRAMEWORKS_FILE, 'r') as f:
                self.frameworks_database = json.load(f)
        else:
            self.frameworks_database = {"frameworks": [], "sources": []}
    
    def detect_frameworks(self, text: str) -> List[Dict]:
        """
        Detects potential frameworks in text using markers
        """
        results = []
        
        # Split into paragraphs for larger context
        paragraphs = text.split('\n\n')
        
        # First check if there are numbered patterns across paragraphs
        combined_text = " ".join(paragraphs)
        # Look for sequential number patterns
        number_patterns = [
            (r"first.*second.*third", "3-step"),
            (r"step one.*step two.*step three", "3-step"),
            (r"1\..*2\..*3\.", "numbered list"),
            (r"one.*two.*three", "3-step"),
            (r"level one.*level two.*level three", "3-level"),
            (r"phase one.*phase two.*phase three", "3-phase"),
            (r"number one.*number two.*number three", "3-element")
        ]
        
        for pattern, framework_type in number_patterns:
            if re.search(pattern, combined_text, re.IGNORECASE | re.DOTALL):
                # Find the start of this framework
                for i, paragraph in enumerate(paragraphs):
                    if any(p in paragraph.lower() for p in ["first", "step one", "1.", "one", "level one", "phase one", "number one"]):
                        # Get extended context - multiple paragraphs
                        start_idx = max(0, i - 1)
                        end_idx = min(len(paragraphs), i + 5)  # Capture more to get all steps
                        context = "\n\n".join(paragraphs[start_idx:end_idx])
                        
                        # Determine domain
                        domain = "general"
                        for d in self.framework_domains:
                            if d in context.lower():
                                domain = d
                                break
                        
                        results.append({
                            "text": context,
                            "type": framework_type,
                            "domain": domain,
                            "context": context
                        })
                        break
        
        # Now check for explicit framework markers
        for i, paragraph in enumerate(paragraphs):
            for marker in self.framework_markers:
                if marker in paragraph.lower():
                    # Get extended context - multiple paragraphs
                    start_idx = max(0, i - 1)
                    end_idx = min(len(paragraphs), i + 3)
                    context = "\n\n".join(paragraphs[start_idx:end_idx])
                    
                    # Determine domain
                    domain = "general"
                    for d in self.framework_domains:
                        if d in context.lower():
                            domain = d
                            break
                    
                    results.append({
                        "text": paragraph,
                        "marker": marker,
                        "domain": domain,
                        "context": context,
                        "type": "framework" if "framework" in marker else "model" if "model" in marker else "methodology"
                    })
                    break  # Found one marker, no need to check others
        
        return results
    
    def process_file(self, filepath: str) -> None:
        """
        Process a single file to extract frameworks
        """
        logger.info(f"Processing {filepath} for frameworks")
        content = self.read_file_content(filepath)
        
        if not content:
            logger.warning(f"Empty or unreadable content in {filepath}")
            return
        
        speaker_name = self.get_speaker_name(content)
        extracted_frameworks = self.extract_content_with_context(
            content, speaker_name, self.detect_frameworks, min_context_lines=20
        )
        
        # Add to database with source information
        source_info = {
            "path": filepath,
            "filename": os.path.basename(filepath),
            "processed_date": datetime.now().isoformat(),
            "framework_count": len(extracted_frameworks)
        }
        
        source_id = len(self.frameworks_database["sources"])
        self.frameworks_database["sources"].append(source_info)
        
        for framework in extracted_frameworks:
            framework["source_id"] = source_id
            self.frameworks_database["frameworks"].append(framework)
        
        # Save updated database
        with open(FRAMEWORKS_FILE, 'w') as f:
            json.dump(self.frameworks_database, f, indent=2)
        
        # Update master index
        self.update_master_index(filepath)
        logger.info(f"Extracted {len(extracted_frameworks)} frameworks from {filepath}")

class TeachingPatternExtractor(ContentExtractor):
    """Extracts teaching patterns with context"""
    
    def __init__(self):
        super().__init__()
        self.pattern_markers = [
            "framework", "approach", "method", "technique", "strategy",
            "process", "system", "structure", "model", "perspective",
            "paradigm", "lens", "viewpoint", "stage", "step", "phase",
            "understand how", "realize that", "see that", "notice how",
            "observe that", "pattern", "connection", "relationship", 
            "this is why", "this is how", "this is what", "that's why"
        ]
        
        # Load existing patterns database if it exists
        if os.path.exists(PATTERNS_FILE):
            with open(PATTERNS_FILE, 'r') as f:
                self.patterns_database = json.load(f)
        else:
            self.patterns_database = {"patterns": [], "sources": []}
    
    def detect_patterns(self, text: str) -> List[Dict]:
        """
        Detects potential teaching patterns in text using markers
        """
        results = []
        
        # Split into paragraphs
        paragraphs = text.split('\n\n')
        
        for paragraph in paragraphs:
            # Check if paragraph has any pattern markers
            if any(marker in paragraph.lower() for marker in self.pattern_markers):
                # Get surrounding paragraphs for context
                paragraph_index = paragraphs.index(paragraph)
                start_idx = max(0, paragraph_index - 1)
                end_idx = min(len(paragraphs), paragraph_index + 2)
                context = "\n\n".join(paragraphs[start_idx:end_idx]).strip()
                
                # Check which marker was found
                markers_found = [m for m in self.pattern_markers if m in paragraph.lower()]
                
                results.append({
                    "text": paragraph,
                    "markers": markers_found,
                    "context": context
                })
        
        return results
    
    def process_file(self, filepath: str) -> None:
        """
        Process a single file to extract teaching patterns
        """
        logger.info(f"Processing {filepath} for teaching patterns")
        content = self.read_file_content(filepath)
        
        if not content:
            logger.warning(f"Empty or unreadable content in {filepath}")
            return
        
        speaker_name = self.get_speaker_name(content)
        extracted_patterns = self.extract_content_with_context(
            content, speaker_name, self.detect_patterns, min_context_lines=15
        )
        
        # Add to database with source information
        source_info = {
            "path": filepath,
            "filename": os.path.basename(filepath),
            "processed_date": datetime.now().isoformat(),
            "pattern_count": len(extracted_patterns)
        }
        
        source_id = len(self.patterns_database["sources"])
        self.patterns_database["sources"].append(source_info)
        
        for pattern in extracted_patterns:
            pattern["source_id"] = source_id
            self.patterns_database["patterns"].append(pattern)
        
        # Save updated database
        with open(PATTERNS_FILE, 'w') as f:
            json.dump(self.patterns_database, f, indent=2)
        
        # Update master index
        self.update_master_index(filepath)
        logger.info(f"Extracted {len(extracted_patterns)} teaching patterns from {filepath}")

def process_all_files():
    """
    Process all content files with all extractors
    
    IMPORTANT: This function is designed to be as inclusive as possible, 
    capturing ANYTHING that might fall into these categories, even if they overlap.
    Nothing is excluded - all filtering power remains with the user.
    """
    metaphor_extractor = MetaphorExtractor()
    values_extractor = ValuesExtractor()
    framework_extractor = FrameworkExtractor()
    patterns_extractor = TeachingPatternExtractor()
    
    # Load master index
    if os.path.exists(MASTER_INDEX_FILE):
        with open(MASTER_INDEX_FILE, 'r') as f:
            master_index = json.load(f)
    else:
        master_index = metaphor_extractor.create_master_index()
    
    # Process transcripts
    for file_info in master_index["transcripts"]:
        if not file_info.get("processed", False):
            filepath = file_info["path"]
            
            try:
                # Process with all extractors
                metaphor_extractor.process_file(filepath)
                values_extractor.process_file(filepath)
                framework_extractor.process_file(filepath)
                patterns_extractor.process_file(filepath)
                
                logger.info(f"Successfully processed {filepath}")
            except Exception as e:
                logger.error(f"Error processing {filepath}: {e}")
    
    # Generate summary
    logger.info("=== Processing Complete ===")
    logger.info(f"Extracted {len(metaphor_extractor.metaphors_database['metaphors'])} metaphors")
    logger.info(f"Extracted {len(values_extractor.values_database['values'])} value statements")
    logger.info(f"Extracted {len(framework_extractor.frameworks_database['frameworks'])} frameworks")
    logger.info(f"Extracted {len(patterns_extractor.patterns_database['patterns'])} teaching patterns")

def generate_comprehensive_catalogs():
    """
    Generates comprehensive catalog documents from extracted data
    """
    # Generate metaphors catalog
    if os.path.exists(METAPHORS_FILE):
        with open(METAPHORS_FILE, 'r') as f:
            metaphors_data = json.load(f)
        
        metaphor_catalog_path = os.path.join(OUTPUT_DIR, "COMPREHENSIVE_METAPHORS_CATALOG.md")
        with open(metaphor_catalog_path, 'w') as f:
            f.write("# Comprehensive Metaphors Catalog\n\n")
            f.write("This catalog contains metaphors and analogies extracted from Tina's complete body of work, ")
            f.write("preserving the full context to maintain emotional nuance and depth.\n\n")
            
            # Group by domain
            domain_groups = {}
            for metaphor in metaphors_data["metaphors"]:
                domain = metaphor.get("domain", "general")
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(metaphor)
            
            # Write each domain section
            for domain, metaphors in sorted(domain_groups.items()):
                f.write(f"## {domain.title()} Metaphors\n\n")
                
                for i, metaphor in enumerate(metaphors):
                    source_id = metaphor.get("source_id", 0)
                    source = metaphors_data["sources"][source_id] if source_id < len(metaphors_data["sources"]) else {}
                    filename = source.get("filename", "Unknown source")
                    
                    f.write(f"### {domain.title()} Metaphor {i+1}\n\n")
                    f.write(f"**Source**: {filename}\n\n")
                    f.write("```\n")
                    f.write(metaphor.get("context", metaphor.get("text", "")).strip())
                    f.write("\n```\n\n")
            
        logger.info(f"Generated comprehensive metaphors catalog at {metaphor_catalog_path}")
    
    # Generate values catalog
    if os.path.exists(VALUES_FILE):
        with open(VALUES_FILE, 'r') as f:
            values_data = json.load(f)
        
        values_catalog_path = os.path.join(OUTPUT_DIR, "COMPREHENSIVE_VALUES_CATALOG.md")
        with open(values_catalog_path, 'w') as f:
            f.write("# Comprehensive Values Catalog\n\n")
            f.write("This catalog contains value statements extracted from Tina's complete body of work, ")
            f.write("preserving the full context to maintain emotional nuance and depth.\n\n")
            
            # Group by domain
            domain_groups = {}
            for value in values_data["values"]:
                domain = value.get("domain", "general")
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(value)
            
            # Write each domain section
            for domain, values in sorted(domain_groups.items()):
                f.write(f"## {domain.title()} Values\n\n")
                
                for i, value in enumerate(values):
                    source_id = value.get("source_id", 0)
                    source = values_data["sources"][source_id] if source_id < len(values_data["sources"]) else {}
                    filename = source.get("filename", "Unknown source")
                    
                    f.write(f"### {domain.title()} Value {i+1}\n\n")
                    f.write(f"**Source**: {filename}\n")
                    f.write(f"**Valence**: {value.get('valence', 'positive')}\n\n")
                    f.write("```\n")
                    f.write(value.get("context", value.get("text", "")).strip())
                    f.write("\n```\n\n")
            
        logger.info(f"Generated comprehensive values catalog at {values_catalog_path}")
    
    # Generate frameworks catalog
    if os.path.exists(FRAMEWORKS_FILE):
        with open(FRAMEWORKS_FILE, 'r') as f:
            frameworks_data = json.load(f)
        
        frameworks_catalog_path = os.path.join(OUTPUT_DIR, "COMPREHENSIVE_FRAMEWORKS_CATALOG.md")
        with open(frameworks_catalog_path, 'w') as f:
            f.write("# Comprehensive Frameworks Catalog\n\n")
            f.write("This catalog contains frameworks and models extracted from Tina's complete body of work, ")
            f.write("preserving the full context to maintain emotional nuance and depth.\n\n")
            
            # Group by domain
            domain_groups = {}
            for framework in frameworks_data["frameworks"]:
                domain = framework.get("domain", "general")
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(framework)
            
            # Write each domain section
            for domain, frameworks in sorted(domain_groups.items()):
                f.write(f"## {domain.title()} Frameworks\n\n")
                
                for i, framework in enumerate(frameworks):
                    source_id = framework.get("source_id", 0)
                    source = frameworks_data["sources"][source_id] if source_id < len(frameworks_data["sources"]) else {}
                    filename = source.get("filename", "Unknown source")
                    framework_type = framework.get("type", "Framework")
                    
                    f.write(f"### {domain.title()} {framework_type.title()} {i+1}\n\n")
                    f.write(f"**Source**: {filename}\n\n")
                    f.write("```\n")
                    f.write(framework.get("context", framework.get("text", "")).strip())
                    f.write("\n```\n\n")
                    
        logger.info(f"Generated comprehensive frameworks catalog at {frameworks_catalog_path}")
    
    # Generate teaching patterns catalog
    if os.path.exists(PATTERNS_FILE):
        with open(PATTERNS_FILE, 'r') as f:
            patterns_data = json.load(f)
        
        patterns_catalog_path = os.path.join(OUTPUT_DIR, "COMPREHENSIVE_TEACHING_PATTERNS_CATALOG.md")
        with open(patterns_catalog_path, 'w') as f:
            f.write("# Comprehensive Teaching Patterns Catalog\n\n")
            f.write("This catalog contains teaching patterns extracted from Tina's complete body of work, ")
            f.write("preserving the full context to maintain emotional nuance and depth.\n\n")
            
            # Write each pattern
            for i, pattern in enumerate(patterns_data["patterns"]):
                source_id = pattern.get("source_id", 0)
                source = patterns_data["sources"][source_id] if source_id < len(patterns_data["sources"]) else {}
                filename = source.get("filename", "Unknown source")
                
                f.write(f"## Teaching Pattern {i+1}\n\n")
                f.write(f"**Source**: {filename}\n")
                markers = pattern.get("markers", [])
                if markers:
                    f.write(f"**Pattern markers**: {', '.join(markers)}\n")
                f.write("\n```\n")
                f.write(pattern.get("context", pattern.get("text", "")).strip())
                f.write("\n```\n\n")
            
        logger.info(f"Generated comprehensive teaching patterns catalog at {patterns_catalog_path}")

def main():
    """Main function to run the extraction system"""
    logger.info("Starting comprehensive extraction process")
    process_all_files()
    generate_comprehensive_catalogs()
    logger.info("Extraction process complete")

if __name__ == "__main__":
    main()