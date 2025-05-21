#!/usr/bin/env python3
"""
Simplified extraction script that processes a single file to extract patterns.
This is a stand-alone script that doesn't depend on the more complex server system.
"""

import os
import re
import json
import sys
from datetime import datetime

# File to process
TARGET_FILE = "/Volumes/Envoy/SecondBrain/transcripts/Esther's Journey's transcript (5).txt"

# Output directory
OUTPUT_DIR = "/Volumes/Envoy/SecondBrain/extracted_content"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Output files
METAPHORS_FILE = os.path.join(OUTPUT_DIR, "metaphors_from_file.json")
VALUES_FILE = os.path.join(OUTPUT_DIR, "values_from_file.json")
FRAMEWORKS_FILE = os.path.join(OUTPUT_DIR, "frameworks_from_file.json")
PATTERNS_FILE = os.path.join(OUTPUT_DIR, "patterns_from_file.json")

# Speaker identification
SPEAKER_NAMES = ["Tina Marie:", "Tina:", "Coach Tina:", "Tina M:"]

def extract_speaker_segments(content, speaker_names):
    """Extract all segments where the target speaker is talking"""
    segments = []
    
    for speaker in speaker_names:
        pattern = re.compile(f"{re.escape(speaker)}(.*?)(?=\n\s*\n|\n\s*[A-Za-z]+:|\Z)", re.DOTALL)
        matches = pattern.findall(content)
        segments.extend([match.strip() for match in matches])
    
    return segments

def extract_metaphors(segments):
    """Extract metaphors and analogies from segments"""
    metaphor_markers = [
        # Direct comparison markers
        "like", "as if", "as though", "resembles", "similar to", "imagine", 
        "think of", "picture", "envision", "compared to", "reminds me of",
        "it's as", "it is as", "think about", "is like", "are like", "it's like",
        "as", "just like", "sort of like", "kind of like", "same as", "similar",
        
        # Common metaphorical objects
        "ecosystem", "journey", "path", "bridge", "foundation", "river",
        "seed", "garden", "building", "architecture", "ocean", "wave",
        "mountain", "tuning fork", "resonance", "frequency", "vibration"
    ]
    
    results = []
    
    for segment in segments:
        sentences = re.split(r'(?<=[.!?])\s+', segment)
        
        for i, sentence in enumerate(sentences):
            for marker in metaphor_markers:
                if marker.lower() in sentence.lower():
                    # Get context
                    start_idx = max(0, i - 4)
                    end_idx = min(len(sentences), i + 5)
                    context = " ".join(sentences[start_idx:end_idx])
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "context": context,
                        "types": ["metaphor", "analogy"],
                        "domains": ["general"]
                    })
                    break
    
    return results

def extract_values(segments):
    """Extract value statements from segments"""
    value_markers = [
        # Core value words
        "important", "matters", "value", "principle", "believe", "core",
        "fundamental", "essential", "critical", "key", "significant",
        "priority", "moral", "ethic", "standard", "deserve", "right",
        "wrong", "should", "must", "need to", "have to", "supposed to",
        "ought to", "crucial", "vital", "respect", "honor", "truth"
    ]
    
    results = []
    
    for segment in segments:
        sentences = re.split(r'(?<=[.!?])\s+', segment)
        
        for i, sentence in enumerate(sentences):
            for marker in value_markers:
                if marker.lower() in sentence.lower():
                    # Get context
                    start_idx = max(0, i - 4)
                    end_idx = min(len(sentences), i + 5)
                    context = " ".join(sentences[start_idx:end_idx])
                    
                    results.append({
                        "text": sentence,
                        "marker": marker,
                        "context": context,
                        "types": ["value", "principle", "belief"],
                        "domains": ["general"]
                    })
                    break
    
    return results

def extract_frameworks(segments):
    """Extract frameworks and models from segments"""
    framework_markers = [
        "framework", "model", "system", "methodology", "approach", 
        "steps", "stages", "phases", "process", "principles", 
        "pillars", "elements", "components", "categories", "types",
        "first step", "second step", "third step", "final step",
        "level one", "level two", "level three", "level four",
        "step one", "step two", "step three", "step four"
    ]
    
    results = []
    
    for segment in segments:
        paragraphs = segment.split('\n\n')
        
        for i, paragraph in enumerate(paragraphs):
            for marker in framework_markers:
                if marker.lower() in paragraph.lower():
                    # Get more context - multiple paragraphs
                    start_idx = max(0, i - 1)
                    end_idx = min(len(paragraphs), i + 3)
                    context = "\n\n".join(paragraphs[start_idx:end_idx])
                    
                    results.append({
                        "text": paragraph,
                        "marker": marker,
                        "context": context,
                        "types": ["framework", "model", "methodology"],
                        "domains": ["general"]
                    })
                    break
    
    return results

def extract_teaching_patterns(segments):
    """Extract teaching patterns from segments"""
    pattern_markers = [
        "framework", "approach", "method", "technique", "strategy",
        "process", "system", "structure", "model", "perspective",
        "paradigm", "lens", "viewpoint", "stage", "step", "phase",
        "understand how", "realize that", "see that", "notice how",
        "observe that", "pattern", "connection", "relationship"
    ]
    
    results = []
    
    for segment in segments:
        paragraphs = segment.split('\n\n')
        
        for i, paragraph in enumerate(paragraphs):
            for marker in pattern_markers:
                if marker.lower() in paragraph.lower():
                    # Get context
                    start_idx = max(0, i - 1)
                    end_idx = min(len(paragraphs), i + 2)
                    context = "\n\n".join(paragraphs[start_idx:end_idx])
                    
                    results.append({
                        "text": paragraph,
                        "marker": marker,
                        "context": context,
                        "types": ["pattern", "technique"],
                        "domains": ["general"]
                    })
                    break
    
    return results

def generate_catalogs(metaphors, values, frameworks, patterns):
    """Generate readable catalogs from the extracted data"""
    catalogs = []
    
    # Metaphors catalog
    metaphor_catalog = os.path.join(OUTPUT_DIR, "METAPHORS_CATALOG.md")
    with open(metaphor_catalog, 'w') as f:
        f.write("# Metaphors and Analogies\n\n")
        f.write("Extracted from a sample transcript with full context.\n\n")
        
        for i, metaphor in enumerate(metaphors):
            f.write(f"## Metaphor {i+1}\n\n")
            f.write("```\n")
            f.write(metaphor.get("context", "").strip())
            f.write("\n```\n\n")
    
    catalogs.append(metaphor_catalog)
    
    # Values catalog
    values_catalog = os.path.join(OUTPUT_DIR, "VALUES_CATALOG.md")
    with open(values_catalog, 'w') as f:
        f.write("# Values and Principles\n\n")
        f.write("Extracted from a sample transcript with full context.\n\n")
        
        for i, value in enumerate(values):
            f.write(f"## Value {i+1}\n\n")
            f.write("```\n")
            f.write(value.get("context", "").strip())
            f.write("\n```\n\n")
    
    catalogs.append(values_catalog)
    
    # Frameworks catalog
    frameworks_catalog = os.path.join(OUTPUT_DIR, "FRAMEWORKS_CATALOG.md")
    with open(frameworks_catalog, 'w') as f:
        f.write("# Frameworks and Models\n\n")
        f.write("Extracted from a sample transcript with full context.\n\n")
        
        for i, framework in enumerate(frameworks):
            f.write(f"## Framework {i+1}\n\n")
            f.write("```\n")
            f.write(framework.get("context", "").strip())
            f.write("\n```\n\n")
    
    catalogs.append(frameworks_catalog)
    
    # Teaching patterns catalog
    patterns_catalog = os.path.join(OUTPUT_DIR, "PATTERNS_CATALOG.md")
    with open(patterns_catalog, 'w') as f:
        f.write("# Teaching Patterns\n\n")
        f.write("Extracted from a sample transcript with full context.\n\n")
        
        for i, pattern in enumerate(patterns):
            f.write(f"## Pattern {i+1}\n\n")
            f.write("```\n")
            f.write(pattern.get("context", "").strip())
            f.write("\n```\n\n")
    
    catalogs.append(patterns_catalog)
    
    return catalogs

def main():
    print(f"Processing file: {TARGET_FILE}")
    
    try:
        # Read the file
        with open(TARGET_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Extract speaker segments
        segments = extract_speaker_segments(content, SPEAKER_NAMES)
        print(f"Extracted {len(segments)} speaker segments")
        
        # Extract patterns
        metaphors = extract_metaphors(segments)
        values = extract_values(segments)
        frameworks = extract_frameworks(segments)
        patterns = extract_teaching_patterns(segments)
        
        print(f"Extracted {len(metaphors)} metaphors")
        print(f"Extracted {len(values)} values")
        print(f"Extracted {len(frameworks)} frameworks")
        print(f"Extracted {len(patterns)} teaching patterns")
        
        # Save raw data
        with open(METAPHORS_FILE, 'w') as f:
            json.dump(metaphors, f, indent=2)
        
        with open(VALUES_FILE, 'w') as f:
            json.dump(values, f, indent=2)
        
        with open(FRAMEWORKS_FILE, 'w') as f:
            json.dump(frameworks, f, indent=2)
        
        with open(PATTERNS_FILE, 'w') as f:
            json.dump(patterns, f, indent=2)
        
        # Generate readable catalogs
        catalogs = generate_catalogs(metaphors, values, frameworks, patterns)
        
        print("\nExtraction complete!")
        print(f"Raw data saved to JSON files in {OUTPUT_DIR}")
        print("Generated catalogs:")
        for catalog in catalogs:
            print(f" - {os.path.basename(catalog)}")
        
    except Exception as e:
        print(f"Error processing file: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())