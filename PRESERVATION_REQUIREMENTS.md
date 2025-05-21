# CONTEXT PRESERVATION REQUIREMENTS FOR SECONDBRAIN

## FUNDAMENTAL PRINCIPLE: NEVER TRUNCATE OR SIMPLIFY

SecondBrain is fundamentally designed to be complex and comprehensive - like an actual human brain. This system's value comes from preserving the rich, interconnected, and nuanced nature of Tina's teaching, not from simplified extracts.

## Context Preservation Requirements

1. **Full Surrounding Context**
   - Extract MINIMUM ±5 paragraphs around any identified pattern
   - Include the ENTIRE metaphor, story, or teaching example without truncation
   - Preserve conversational flow including questions that prompted the teaching
   - Maintain speaker identification throughout (who said what)

2. **Complete Emotional Context**
   - Preserve exact wording, tone indicators, emphasis, and emotional markers
   - Include pauses, hesitations, and natural speech patterns when present
   - Preserve the "build-up" to insights as this shows the teaching methodology
   - Never paraphrase or simplify Tina's language - exact words matter

3. **Chronological Integrity**
   - Maintain timestamp information when available
   - Preserve sequence of ideas as they develop
   - Include transitional phrases between concepts
   - Note when topics recur across different sessions/transcripts

4. **Associative Connections**
   - Cross-reference related metaphors, values, and frameworks
   - Document when concepts build upon previously established ideas
   - Preserve contextual bridges between different domains (business/spiritual/personal)
   - Track evolution of concepts across multiple sessions

5. **Source Identification**
   - Document full source information (file, date, session type)
   - Include participant information when relevant
   - Tag domain contexts (business, personal, spiritual, relationships)
   - Preserve client-specific contexts that informed the teaching

6. **Technical Implementation**
   - Store COMPLETE extracted text, not summaries
   - Use unique IDs to track patterns across the system
   - Implement proper JSON schema with context fields
   - Never limit extraction size for technical convenience

## Practical Implementation

When extracting a metaphor, value, framework, or teaching pattern:

```python
def extract_with_full_context(text, pattern_indicators):
    # Find all potential pattern indicators
    matches = find_all_pattern_indicators(text, pattern_indicators)
    
    for match in matches:
        # Get paragraph containing the match
        containing_paragraph = get_paragraph(text, match.position)
        
        # Get 5 paragraphs before and after (or more if part of same story/teaching)
        pre_context = get_paragraphs_before(text, containing_paragraph.position, 5)
        post_context = get_paragraphs_after(text, containing_paragraph.position, 5)
        
        # Extend context if needed to include complete story/example
        pre_context = extend_to_complete_unit(text, pre_context, "backward")
        post_context = extend_to_complete_unit(text, post_context, "forward")
        
        # Extract speaker information
        speakers = identify_speakers(pre_context + containing_paragraph + post_context)
        
        # Store the complete context
        extracted_pattern = {
            "id": generate_unique_id(),
            "match_text": match.text,
            "full_context": pre_context + containing_paragraph + post_context,
            "speakers": speakers,
            "source": get_source_information(text),
            "domain_tags": identify_domains(containing_paragraph),
            "related_patterns": find_related_patterns(containing_paragraph)
        }
        
        store_pattern(extracted_pattern)
```

## Reminder

1. **NEVER truncate context for convenience**
2. **NEVER summarize instead of preserving exact wording**
3. **NEVER artificially limit extraction size**
4. **NEVER sacrifice complexity for simplicity**
5. **NEVER filter potentially valuable connections**

The power of the SecondBrain system comes from its comprehensive preservation of context and interconnections. Any simplification fundamentally undermines the entire purpose of the system.

## Testing Standard

For any extraction, it should be possible to:

1. Read only the extracted content and fully understand the concept in its original context
2. Trace related ideas across the system through cross-references
3. Experience the emotional and pedagogical impact as intended in the original teaching
4. Access the complete teaching unit without needing to reference the source material

If any extraction fails these tests, it lacks sufficient context and must be expanded.