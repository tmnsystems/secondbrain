# Processed Data Context Reference

<!-- @inherit: /Volumes/Envoy/SecondBrain/CLAUDE.md -->
<!-- IMPORTANT: Load the root CLAUDE.md file first before processing this context -->

This document contains key information about the processed_data directory within the SecondBrain system.

## Overview

The processed_data directory stores the results of style analysis performed on content sources, including transcripts, blog posts, and other written materials. These style profiles are used by the Style Analysis and Content Generation System to create content that matches the authentic voice of the content creator.

## Data Structure

1. **Individual Style Profiles**
   - Filename pattern: `*_style_profile.json`
   - Each file contains style analysis for a single content source
   - Captures writing patterns, tone, vocabulary, and structural preferences

2. **Master Style Profile**
   - File: `master_style_profile.json`
   - Aggregated style profile combining all individual profiles
   - Weighted toward high-quality, representative content
   - Used as the primary reference for content generation

3. **Batch Processing State**
   - File: `batch_processing_state.json`
   - Tracks processing progress across multiple content sources
   - Used for resuming interrupted processing jobs

## Style Profile Schema

Each style profile contains the following components:

```json
{
  "metadata": {
    "source_file": "string",
    "processing_date": "ISO datetime",
    "word_count": "number",
    "quality_score": "number (0-100)"
  },
  "lexical_features": {
    "vocabulary_richness": "number (0-100)",
    "average_word_length": "number",
    "frequent_words": ["array of strings"],
    "signature_phrases": ["array of strings"]
  },
  "syntactic_features": {
    "average_sentence_length": "number",
    "sentence_complexity": "number (0-100)",
    "paragraph_structure": {
      "average_length": "number",
      "transition_patterns": ["array of strings"]
    }
  },
  "tonal_features": {
    "formality_score": "number (0-100)",
    "emotional_valence": "number (-100 to 100)",
    "persuasiveness_score": "number (0-100)",
    "humor_score": "number (0-100)"
  },
  "structural_patterns": {
    "opening_patterns": ["array of patterns"],
    "closing_patterns": ["array of patterns"],
    "argument_structure": ["array of patterns"]
  },
  "metaphor_usage": {
    "frequency": "number (0-100)",
    "domains": ["array of conceptual domains"],
    "examples": ["array of examples"]
  },
  "rhetoric_devices": {
    "analogies": "frequency score (0-100)",
    "repetition": "frequency score (0-100)",
    "contrast": "frequency score (0-100)",
    "questions": "frequency score (0-100)"
  }
}
```

## Processing Flow

1. **Content Ingestion**
   - Source content is processed via `process_content.js`
   - Each file generates a corresponding JSON in `processed_content/`

2. **Style Analysis**
   - Individual style profiles are created via `style_analyzer.js`
   - Stored as `*_style_profile.json` in this directory

3. **Profile Aggregation**
   - Individual profiles are combined via `combine_profiles.js`
   - Produces the `master_style_profile.json` file

4. **Content Generation**
   - Generated content references the master profile
   - Output stored in `generated_content/` directory

## Integration Points

1. **Content Processing System**
   - Provides input for style analysis
   - Source files in `processed_content/` directory

2. **Style Analysis System**
   - Creates and updates style profiles
   - Documentation in `STYLE_SYSTEM.md`

3. **Content Generation System**
   - Consumes style profiles for authentic content creation
   - Produces output in `generated_content/` directory

## Usage Guidelines

1. **Accessing Style Data**
   - Load individual profiles for specific content sources
   - Use the master profile for representative style analysis
   - Query specific features using the JSON paths

2. **Updating Profiles**
   - Run `npm run analyze-style` to update all profiles
   - Run `npm run combine-profiles` to regenerate the master profile
   - Process new content with `npm run process`

3. **Troubleshooting**
   - Check `batch_processing_state.json` for processing errors
   - Verify file permissions if profiles fail to update
   - Ensure content sources exist before analysis

## Development Notes

1. **Adding New Style Features**
   - Update the style_analyzer.js to extract new features
   - Add the feature to the style profile schema
   - Maintain backward compatibility for existing profiles

2. **Performance Optimization**
   - Large profiles (>5MB) should be processed incrementally
   - Use streaming for master profile generation
   - Consider database storage for very large collections

3. **Data Preservation**
   - Style profiles should NEVER be truncated or simplified
   - All nuances of the original style must be preserved
   - Follow the Prime Directive: complete content preservation

---

Remember that style profiles are the foundation of authentic content generation. Ensure that all processing maintains the integrity and completeness of the style data according to the SecondBrain system's principles.