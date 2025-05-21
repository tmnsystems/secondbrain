#!/usr/bin/env python3
"""
Comprehensive extraction script that processes all transcript files.
This extracts metaphors, values, frameworks, and teaching patterns from all transcripts.
"""

import os
import re
import json
import sys
import glob
import time
from datetime import datetime
from tqdm import tqdm

# Directories
TRANSCRIPTS_DIR = "/Volumes/Envoy/SecondBrain/transcripts"
OUTPUT_DIR = "/Volumes/Envoy/SecondBrain/extracted_content"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Output files
MASTER_INDEX_FILE = os.path.join(OUTPUT_DIR, "master_content_index.json")
MASTER_METAPHORS_FILE = os.path.join(OUTPUT_DIR, "ALL_METAPHORS.json")
MASTER_VALUES_FILE = os.path.join(OUTPUT_DIR, "ALL_VALUES.json")
MASTER_FRAMEWORKS_FILE = os.path.join(OUTPUT_DIR, "ALL_FRAMEWORKS.json")
MASTER_PATTERNS_FILE = os.path.join(OUTPUT_DIR, "ALL_PATTERNS.json")

# Speaker identification
SPEAKER_NAMES = ["Tina Marie:", "Tina:", "Coach Tina:", "Tina M:"]

# Extraction markers
METAPHOR_MARKERS = [
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
    
    # More subtle metaphorical language
    "build", "construct", "grow", "nurture", "feed", "starve", "flow", "stuck",
    "high", "low", "deep", "shallow", "hard", "soft", "heavy", "light",
    "hot", "cold", "bright", "dark", "rising", "falling", "climbing"
]

VALUE_MARKERS = [
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
    
    # Statements of preference/priority
    "prefer", "rather", "choose", "focus on", "emphasize", "prioritize",
    "favor", "what matters is", "the point is", "what's important", 
    "key thing", "bottom line"
]

FRAMEWORK_MARKERS = [
    "framework", "model", "system", "methodology", "approach", 
    "steps", "stages", "phases", "process", "principles", 
    "pillars", "elements", "components", "categories", "types",
    "first step", "second step", "third step", "final step",
    "level one", "level two", "level three", "level four",
    "step one", "step two", "step three", "step four",
    "phase one", "phase two", "phase three",
    "three steps", "four steps", "five steps"
]

PATTERN_MARKERS = [
    "framework", "approach", "method", "technique", "strategy",
    "process", "system", "structure", "model", "perspective",
    "paradigm", "lens", "viewpoint", "stage", "step", "phase",
    "understand how", "realize that", "see that", "notice how",
    "observe that", "pattern", "connection", "relationship",
    "this is why", "this is how", "this is what", "that's why"
]

def get_all_transcript_files():
    """Get a list of all transcript files to process"""
    files = glob.glob(os.path.join(TRANSCRIPTS_DIR, "**/*.txt"), recursive=True)
    # Make sure the files exist and are readable
    valid_files = []
    for filepath in files:
        if os.path.isfile(filepath) and os.access(filepath, os.R_OK):
            valid_files.append(filepath)
    
    # Sort by modification time (newest first)
    valid_files.sort(key=lambda x: os.path.getmtime(x), reverse=True)
    return valid_files

def extract_speaker_segments(content, speaker_names):
    """Extract all segments where the target speaker is talking"""
    segments = []
    
    for speaker in speaker_names:
        pattern = re.compile(f"{re.escape(speaker)}(.*?)(?=\n\s*\n|\n\s*[A-Za-z]+:|\Z)", re.DOTALL)
        matches = pattern.findall(content)
        segments.extend([match.strip() for match in matches])
    
    return segments

def extract_metaphors(segments, filepath):
    """Extract metaphors and analogies from segments"""
    results = []
    
    for segment in segments:
        sentences = re.split(r'(?<=[.!?])\s+', segment)
        
        for i, sentence in enumerate(sentences):
            for marker in METAPHOR_MARKERS:
                if marker.lower() in sentence.lower():
                    # Get context
                    start_idx = max(0, i - 4)
                    end_idx = min(len(sentences), i + 5)
                    context = " ".join(sentences[start_idx:end_idx])
                    
                    # Determine domains
                    domains = ["general"]
                    domain_keywords = {
                        "business": ["business", "company", "client", "market", "product", "service", "customer"],
                        "personal": ["personal", "self", "growth", "mind", "body", "emotion", "feeling"],
                        "relationship": ["relationship", "partner", "marriage", "love", "connect", "family"],
                        "spiritual": ["spirit", "soul", "god", "universe", "faith", "spiritual", "divine"]
                    }
                    
                    for domain, keywords in domain_keywords.items():
                        if any(keyword in sentence.lower() for keyword in keywords):
                            if domain not in domains:
                                domains.append(domain)
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "context": context,
                        "source_file": os.path.basename(filepath),
                        "types": ["metaphor", "analogy"],
                        "domains": domains
                    })
                    break
    
    return results

def extract_values(segments, filepath):
    """Extract value statements from segments"""
    results = []
    
    for segment in segments:
        sentences = re.split(r'(?<=[.!?])\s+', segment)
        
        for i, sentence in enumerate(sentences):
            for marker in VALUE_MARKERS:
                if marker.lower() in sentence.lower():
                    # Get context
                    start_idx = max(0, i - 4)
                    end_idx = min(len(sentences), i + 5)
                    context = " ".join(sentences[start_idx:end_idx])
                    
                    # Determine domains
                    domains = ["general"]
                    domain_keywords = {
                        "business": ["business", "company", "client", "market", "product", "service", "customer"],
                        "personal": ["personal", "self", "growth", "mind", "body", "emotion", "feeling"],
                        "relationship": ["relationship", "partner", "marriage", "love", "connect", "family"],
                        "spiritual": ["spirit", "soul", "god", "universe", "faith", "spiritual", "divine"]
                    }
                    
                    for domain, keywords in domain_keywords.items():
                        if any(keyword in sentence.lower() for keyword in keywords):
                            if domain not in domains:
                                domains.append(domain)
                    
                    # Determine if positive or negative value
                    negative_words = ["not", "don't", "doesn't", "shouldn't", "can't", "wrong", "bad", "harmful"]
                    is_negative = any(neg in sentence.lower() for neg in negative_words)
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "context": context,
                        "source_file": os.path.basename(filepath),
                        "types": ["value", "principle", "belief"],
                        "domains": domains,
                        "valence": "negative" if is_negative else "positive"
                    })
                    break
    
    return results

def extract_frameworks(segments, filepath):
    """Extract frameworks and models from segments"""
    results = []
    
    for segment in segments:
        paragraphs = segment.split('\n\n')
        
        for i, paragraph in enumerate(paragraphs):
            for marker in FRAMEWORK_MARKERS:
                if marker.lower() in paragraph.lower():
                    # Get more context - multiple paragraphs
                    start_idx = max(0, i - 1)
                    end_idx = min(len(paragraphs), i + 3)
                    context = "\n\n".join(paragraphs[start_idx:end_idx])
                    
                    # Determine domains
                    domains = ["general"]
                    domain_keywords = {
                        "business": ["business", "company", "client", "market", "product", "service", "customer"],
                        "personal": ["personal", "self", "growth", "mind", "body", "emotion", "feeling"],
                        "relationship": ["relationship", "partner", "marriage", "love", "connect", "family"],
                        "spiritual": ["spirit", "soul", "god", "universe", "faith", "spiritual", "divine"]
                    }
                    
                    for domain, keywords in domain_keywords.items():
                        if any(keyword in paragraph.lower() for keyword in keywords):
                            if domain not in domains:
                                domains.append(domain)
                    
                    results.append({
                        "text": paragraph,
                        "marker": marker,
                        "context": context,
                        "source_file": os.path.basename(filepath),
                        "types": ["framework", "model", "methodology"],
                        "domains": domains
                    })
                    break
    
    return results

def extract_teaching_patterns(segments, filepath):
    """Extract teaching patterns from segments"""
    results = []
    
    for segment in segments:
        paragraphs = segment.split('\n\n')
        
        for i, paragraph in enumerate(paragraphs):
            for marker in PATTERN_MARKERS:
                if marker.lower() in paragraph.lower():
                    # Get context
                    start_idx = max(0, i - 1)
                    end_idx = min(len(paragraphs), i + 2)
                    context = "\n\n".join(paragraphs[start_idx:end_idx])
                    
                    # Determine domains
                    domains = ["general"]
                    domain_keywords = {
                        "business": ["business", "company", "client", "market", "product", "service", "customer"],
                        "personal": ["personal", "self", "growth", "mind", "body", "emotion", "feeling"],
                        "relationship": ["relationship", "partner", "marriage", "love", "connect", "family"],
                        "spiritual": ["spirit", "soul", "god", "universe", "faith", "spiritual", "divine"]
                    }
                    
                    for domain, keywords in domain_keywords.items():
                        if any(keyword in paragraph.lower() for keyword in keywords):
                            if domain not in domains:
                                domains.append(domain)
                    
                    results.append({
                        "text": paragraph,
                        "marker": marker,
                        "context": context,
                        "source_file": os.path.basename(filepath),
                        "types": ["pattern", "technique"],
                        "domains": domains
                    })
                    break
    
    return results

def process_file(filepath):
    """Process a single file for all pattern types"""
    try:
        # Read the file
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract speaker segments
        segments = extract_speaker_segments(content, SPEAKER_NAMES)
        
        # Skip if no segments were found
        if not segments:
            print(f"Warning: No speaker segments found in {filepath}")
            return [], [], [], []
        
        # Extract patterns
        metaphors = extract_metaphors(segments, filepath)
        values = extract_values(segments, filepath)
        frameworks = extract_frameworks(segments, filepath)
        patterns = extract_teaching_patterns(segments, filepath)
        
        return metaphors, values, frameworks, patterns
    
    except Exception as e:
        print(f"Error processing {filepath}: {e}")
        return [], [], [], []

def generate_master_catalogs(all_metaphors, all_values, all_frameworks, all_patterns):
    """Generate master catalogs from all extracted data"""
    # Master metaphors catalog
    metaphor_catalog = os.path.join(OUTPUT_DIR, "MASTER_METAPHORS_CATALOG.md")
    with open(metaphor_catalog, 'w') as f:
        f.write("# Master Metaphors and Analogies Catalog\n\n")
        f.write("All metaphors and analogies extracted from Tina's transcripts with full context.\n\n")
        
        # Group by domain
        domain_groups = {}
        for metaphor in all_metaphors:
            for domain in metaphor.get("domains", ["general"]):
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(metaphor)
        
        # Write each domain section
        for domain, metaphors in sorted(domain_groups.items()):
            f.write(f"## {domain.title()} Metaphors\n\n")
            f.write(f"*{len(metaphors)} metaphors in this domain*\n\n")
            
            for i, metaphor in enumerate(metaphors[:50]):  # Limit to 50 per domain to keep file manageable
                source_file = metaphor.get("source_file", "Unknown")
                
                f.write(f"### {domain.title()} Metaphor {i+1}\n\n")
                f.write(f"**Source**: {source_file}\n\n")
                f.write("```\n")
                f.write(metaphor.get("context", "").strip())
                f.write("\n```\n\n")
            
            if len(metaphors) > 50:
                f.write(f"*...and {len(metaphors) - 50} more metaphors in this domain*\n\n")
    
    # Master values catalog
    values_catalog = os.path.join(OUTPUT_DIR, "MASTER_VALUES_CATALOG.md")
    with open(values_catalog, 'w') as f:
        f.write("# Master Values and Principles Catalog\n\n")
        f.write("All value statements extracted from Tina's transcripts with full context.\n\n")
        
        # Group by domain
        domain_groups = {}
        for value in all_values:
            for domain in value.get("domains", ["general"]):
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(value)
        
        # Write each domain section
        for domain, values in sorted(domain_groups.items()):
            f.write(f"## {domain.title()} Values\n\n")
            f.write(f"*{len(values)} value statements in this domain*\n\n")
            
            for i, value in enumerate(values[:50]):  # Limit to 50 per domain
                source_file = value.get("source_file", "Unknown")
                valence = value.get("valence", "positive")
                
                f.write(f"### {domain.title()} Value {i+1}\n\n")
                f.write(f"**Source**: {source_file}\n")
                f.write(f"**Valence**: {valence}\n\n")
                f.write("```\n")
                f.write(value.get("context", "").strip())
                f.write("\n```\n\n")
            
            if len(values) > 50:
                f.write(f"*...and {len(values) - 50} more value statements in this domain*\n\n")
    
    # Master frameworks catalog
    frameworks_catalog = os.path.join(OUTPUT_DIR, "MASTER_FRAMEWORKS_CATALOG.md")
    with open(frameworks_catalog, 'w') as f:
        f.write("# Master Frameworks and Models Catalog\n\n")
        f.write("All frameworks and models extracted from Tina's transcripts with full context.\n\n")
        
        # Group by domain
        domain_groups = {}
        for framework in all_frameworks:
            for domain in framework.get("domains", ["general"]):
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(framework)
        
        # Write each domain section
        for domain, frameworks in sorted(domain_groups.items()):
            f.write(f"## {domain.title()} Frameworks\n\n")
            f.write(f"*{len(frameworks)} frameworks in this domain*\n\n")
            
            for i, framework in enumerate(frameworks):  # Show all frameworks as there are usually fewer
                source_file = framework.get("source_file", "Unknown")
                
                f.write(f"### {domain.title()} Framework {i+1}\n\n")
                f.write(f"**Source**: {source_file}\n\n")
                f.write("```\n")
                f.write(framework.get("context", "").strip())
                f.write("\n```\n\n")
    
    # Master teaching patterns catalog
    patterns_catalog = os.path.join(OUTPUT_DIR, "MASTER_PATTERNS_CATALOG.md")
    with open(patterns_catalog, 'w') as f:
        f.write("# Master Teaching Patterns Catalog\n\n")
        f.write("All teaching patterns extracted from Tina's transcripts with full context.\n\n")
        
        # Group by domain
        domain_groups = {}
        for pattern in all_patterns:
            for domain in pattern.get("domains", ["general"]):
                if domain not in domain_groups:
                    domain_groups[domain] = []
                domain_groups[domain].append(pattern)
        
        # Write each domain section
        for domain, patterns in sorted(domain_groups.items()):
            f.write(f"## {domain.title()} Teaching Patterns\n\n")
            f.write(f"*{len(patterns)} teaching patterns in this domain*\n\n")
            
            for i, pattern in enumerate(patterns[:50]):  # Limit to 50 per domain
                source_file = pattern.get("source_file", "Unknown")
                
                f.write(f"### {domain.title()} Pattern {i+1}\n\n")
                f.write(f"**Source**: {source_file}\n\n")
                f.write("```\n")
                f.write(pattern.get("context", "").strip())
                f.write("\n```\n\n")
            
            if len(patterns) > 50:
                f.write(f"*...and {len(patterns) - 50} more patterns in this domain*\n\n")
    
    return [metaphor_catalog, values_catalog, frameworks_catalog, patterns_catalog]

def main():
    start_time = time.time()
    print("Starting comprehensive extraction of all transcripts...")
    
    # Get all transcript files
    transcript_files = get_all_transcript_files()
    print(f"Found {len(transcript_files)} transcript files to process")
    
    # Master collections for all extracted items
    all_metaphors = []
    all_values = []
    all_frameworks = []
    all_patterns = []
    
    # Process each file
    processed_files = []
    failed_files = []
    
    for filepath in tqdm(transcript_files, desc="Processing files"):
        try:
            metaphors, values, frameworks, patterns = process_file(filepath)
            
            # Add to master collections
            all_metaphors.extend(metaphors)
            all_values.extend(values)
            all_frameworks.extend(frameworks)
            all_patterns.extend(patterns)
            
            # Record file info
            file_info = {
                "path": filepath,
                "filename": os.path.basename(filepath),
                "processed_time": datetime.now().isoformat(),
                "metaphor_count": len(metaphors),
                "value_count": len(values),
                "framework_count": len(frameworks),
                "pattern_count": len(patterns)
            }
            processed_files.append(file_info)
            
        except Exception as e:
            print(f"Error processing {filepath}: {e}")
            failed_files.append({
                "path": filepath,
                "filename": os.path.basename(filepath),
                "error": str(e),
                "error_time": datetime.now().isoformat()
            })
    
    # Save master collections
    with open(MASTER_METAPHORS_FILE, 'w') as f:
        json.dump(all_metaphors, f, indent=2)
    
    with open(MASTER_VALUES_FILE, 'w') as f:
        json.dump(all_values, f, indent=2)
    
    with open(MASTER_FRAMEWORKS_FILE, 'w') as f:
        json.dump(all_frameworks, f, indent=2)
    
    with open(MASTER_PATTERNS_FILE, 'w') as f:
        json.dump(all_patterns, f, indent=2)
    
    # Save master index
    master_index = {
        "processed_files": processed_files,
        "failed_files": failed_files,
        "start_time": datetime.fromtimestamp(start_time).isoformat(),
        "end_time": datetime.now().isoformat(),
        "total_files": len(transcript_files),
        "processed_count": len(processed_files),
        "failed_count": len(failed_files),
        "total_metaphors": len(all_metaphors),
        "total_values": len(all_values),
        "total_frameworks": len(all_frameworks),
        "total_patterns": len(all_patterns)
    }
    
    with open(MASTER_INDEX_FILE, 'w') as f:
        json.dump(master_index, f, indent=2)
    
    # Generate master catalogs
    catalogs = generate_master_catalogs(all_metaphors, all_values, all_frameworks, all_patterns)
    
    # Print summary
    elapsed_time = time.time() - start_time
    print("\nExtraction complete!")
    print(f"Processed {len(processed_files)} files in {elapsed_time:.2f} seconds")
    print(f"Failed to process {len(failed_files)} files")
    print("\nExtracted patterns:")
    print(f" - Metaphors: {len(all_metaphors)}")
    print(f" - Values: {len(all_values)}")
    print(f" - Frameworks: {len(all_frameworks)}")
    print(f" - Teaching Patterns: {len(all_patterns)}")
    print("\nGenerated master catalogs:")
    for catalog in catalogs:
        print(f" - {os.path.basename(catalog)}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())