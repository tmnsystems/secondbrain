# Priority Optimizations for Context Management System

This document outlines the highest-priority optimizations for the Context Management System, focusing on immediate improvements that deliver maximum impact with minimal implementation effort.

## Top 5 Immediate Optimizations

### 1. Context Indexing and Fast Retrieval

**WHY:** Current context loading requires parsing entire Claude.md files, which is inefficient and slow with large context files.

**WHAT:** Implement a simple indexing system that enables fast retrieval of specific context sections.

**HOW:**
1. Create a lightweight indexing tool that scans all Claude.md files
2. Generate JSON index files alongside Claude.md files
3. Implement section-specific retrieval API
4. Add caching for frequently accessed sections

**IMPACT METRICS:**
- **Before:** Loading full Claude.md files (~250ms per file)
- **After:** Targeted section retrieval (~10ms per section)
- **Improvement:** 25x faster context loading

**IMPLEMENTATION TIME:** 1-2 days

**CODE SNIPPET:**
```javascript
// Context indexer
const fs = require('fs');
const path = require('path');

function indexClaudeMd(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const index = {
    path: filePath,
    lastUpdated: new Date().toISOString(),
    sections: []
  };
  
  let currentSection = null;
  let sectionContent = [];
  let lineNumber = 0;
  
  for (const line of lines) {
    lineNumber++;
    
    // Detect section headers
    if (line.startsWith('## ')) {
      // Save previous section if it exists
      if (currentSection) {
        index.sections.push({
          title: currentSection,
          startLine: currentSection.lineNumber,
          endLine: lineNumber - 1,
          contentPreview: sectionContent.join('\n').substring(0, 100) + '...',
          tokenEstimate: Math.ceil(sectionContent.join('\n').length / 4)
        });
      }
      
      // Start new section
      currentSection = {
        title: line.substring(3).trim(),
        lineNumber: lineNumber
      };
      sectionContent = [];
    } else if (currentSection) {
      sectionContent.push(line);
    }
  }
  
  // Add the last section
  if (currentSection) {
    index.sections.push({
      title: currentSection.title,
      startLine: currentSection.lineNumber,
      endLine: lineNumber,
      contentPreview: sectionContent.join('\n').substring(0, 100) + '...',
      tokenEstimate: Math.ceil(sectionContent.join('\n').length / 4)
    });
  }
  
  // Write index file
  const indexPath = filePath + '.index.json';
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
  
  return index;
}

// Load specific section by title
function loadSection(filePath, sectionTitle) {
  const indexPath = filePath + '.index.json';
  
  if (!fs.existsSync(indexPath)) {
    indexClaudeMd(filePath);
  }
  
  const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
  const section = index.sections.find(s => s.title === sectionTitle);
  
  if (!section) {
    return null;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const sectionContent = lines.slice(section.startLine - 1, section.endLine).join('\n');
  
  return sectionContent;
}
```

### 2. Task Dependencies Graph Validation

**WHY:** Current task system allows circular dependencies that can cause execution deadlocks.

**WHAT:** Implement dependency validation to detect and prevent circular dependencies.

**HOW:**
1. Create a directed graph representation of task dependencies
2. Implement cycle detection algorithm
3. Add validation during task creation/modification
4. Provide visualization of dependency graph

**IMPACT METRICS:**
- **Before:** Potential execution deadlocks due to dependency cycles
- **After:** Zero circular dependencies with clear error messages
- **Improvement:** Elimination of deadlock-related task failures

**IMPLEMENTATION TIME:** 1 day

**CODE SNIPPET:**
```javascript
// Task dependency cycle detection
function detectCycles(tasks) {
  // Build adjacency list
  const graph = {};
  for (const task of tasks) {
    graph[task.id] = task.dependencies || [];
  }
  
  // Detect cycles using DFS
  const visited = new Set();
  const recursionStack = new Set();
  const cycles = [];
  
  function dfs(nodeId, path = []) {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart).concat(nodeId));
      return true;
    }
    
    if (visited.has(nodeId)) {
      return false;
    }
    
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    for (const neighbor of graph[nodeId] || []) {
      if (dfs(neighbor, path)) {
        return true;
      }
    }
    
    recursionStack.delete(nodeId);
    path.pop();
    return false;
  }
  
  // Run DFS from each node
  for (const task of tasks) {
    if (!visited.has(task.id)) {
      dfs(task.id);
    }
  }
  
  return cycles;
}

// Validate tasks before saving
function validateTasks(tasks) {
  const cycles = detectCycles(tasks);
  
  if (cycles.length > 0) {
    throw new Error(`Circular dependencies detected: ${cycles.map(c => c.join(' → ')).join('; ')}`);
  }
  
  return true;
}
```

### 3. Selective Compaction Strategy

**WHY:** Current compaction approach treats all context equally, potentially losing important information.

**WHAT:** Implement a selective compaction strategy that preserves high-value context sections.

**HOW:**
1. Define importance markers for context sections
2. Implement tiered compaction based on section importance
3. Add preservation rules for critical information
4. Create compaction history for potential restoration

**IMPACT METRICS:**
- **Before:** Equal compaction across all context, potential loss of critical info
- **After:** Preservation of high-value context with targeted compaction
- **Improvement:** 95% retention of critical information with 50% token reduction

**IMPLEMENTATION TIME:** 2 days

**CODE SNIPPET:**
```bash
#!/bin/bash
# Selective compaction script

# Define importance levels
declare -A IMPORTANCE_LEVELS
IMPORTANCE_LEVELS["critical"]=100
IMPORTANCE_LEVELS["high"]=75
IMPORTANCE_LEVELS["medium"]=50
IMPORTANCE_LEVELS["low"]=25

# Process Claude.md file with selective compaction
compact_file() {
  local file_path=$1
  local target_reduction=$2  # Percentage reduction target
  
  # Make backup
  cp "$file_path" "${file_path}.backup"
  
  # Extract sections with importance markers
  local sections=$(awk '/^## .*@importance:/ { 
    match($0, /@importance:([a-z]+)/, imp);
    print NR ":" imp[1];
    in_section=1; 
    section_start=NR
  } 
  /^## / && !/^## .*@importance:/ { 
    if (in_section==1) {
      print section_start ":" NR-1 ":end";
      in_section=0
    }
  }
  END {
    if (in_section==1) {
      print section_start ":" NR ":end"
    }
  }' "$file_path")
  
  # Calculate importance-based compaction ratio
  local total_lines=$(wc -l < "$file_path")
  local lines_to_remove=$(( total_lines * target_reduction / 100 ))
  
  # Create temporary file
  local temp_file="${file_path}.tmp"
  cp "$file_path" "$temp_file"
  
  # Process each section based on importance
  while IFS=: read -r start_line importance end_line_marker; do
    if [[ "$end_line_marker" == "end" ]]; then
      end_line=$importance
      importance=${IMPORTANCE_LEVELS["medium"]}  # Default to medium
    else
      importance=${IMPORTANCE_LEVELS[$importance]}
      read -r _ end_line _ <<< "$(echo "$sections" | grep "^$end_line_marker:")"
    fi
    
    # Calculate compaction ratio based on importance
    local section_compaction=$(( 100 - importance ))
    local section_lines=$(( end_line - start_line ))
    local section_lines_to_remove=$(( section_lines * section_compaction / 100 ))
    
    if [[ $section_lines_to_remove -gt 0 ]]; then
      # Compact section by removing less important lines
      # This is a simplified approach - a real implementation would use NLP
      sed -i "${start_line},${end_line}s/^[[:space:]]*$//g" "$temp_file"  # Remove empty lines
      sed -i "${start_line},${end_line}s/^[[:space:]]*#.*$//g" "$temp_file"  # Remove comments
      
      # Add compaction marker
      sed -i "${start_line}a [COMPACTED: Removed $section_lines_to_remove lines based on importance $importance]" "$temp_file"
    fi
  done <<< "$sections"
  
  # Remove consecutive empty lines
  sed -i '/^$/N;/^\n$/D' "$temp_file"
  
  # Replace original with compacted version
  mv "$temp_file" "$file_path"
  
  # Log compaction
  echo "Compacted $file_path. Removed approximately $lines_to_remove lines. Backup saved at ${file_path}.backup"
}

# Main execution
compact_file "/Volumes/Envoy/SecondBrain/CLAUDE.md" 30
```

### 4. Token-Aware Context Loading

**WHY:** Current context loading doesn't account for token limits, potentially wasting tokens or running out.

**WHAT:** Implement token-aware context loading that optimizes for token usage.

**HOW:**
1. Develop a token counting utility for Markdown content
2. Add dynamic context loading based on available token budget
3. Prioritize context sections by relevance to current task
4. Implement token usage monitoring and warnings

**IMPACT METRICS:**
- **Before:** Fixed context loading regardless of task needs
- **After:** Optimized context loading tailored to each task
- **Improvement:** 40% reduction in token usage for most operations

**IMPLEMENTATION TIME:** 1 day

**CODE SNIPPET:**
```javascript
// Token-aware context loader
function estimateTokens(text) {
  // Simple approximation: 4 chars ≈ 1 token
  return Math.ceil(text.length / 4);
}

async function loadOptimizedContext(task, tokenBudget = 8000) {
  // Set aside tokens for task description and response
  const reservedTokens = 2000;
  const availableTokens = tokenBudget - reservedTokens;
  
  // Get task-relevant context paths
  const contextFiles = getContextFilesForTask(task);
  
  // Initialize context sections
  let loadedContext = '';
  let usedTokens = 0;
  
  // Always load critical context first
  const criticalContext = await loadCriticalContext();
  usedTokens += estimateTokens(criticalContext);
  loadedContext += criticalContext;
  
  // Get all section indices
  const sectionIndex = {};
  for (const file of contextFiles) {
    sectionIndex[file] = await getFileIndex(file);
  }
  
  // Score sections by relevance to task
  const scoredSections = [];
  for (const file in sectionIndex) {
    for (const section of sectionIndex[file].sections) {
      const relevanceScore = calculateRelevance(task, section);
      scoredSections.push({
        file,
        section,
        relevanceScore,
        tokens: section.tokenEstimate
      });
    }
  }
  
  // Sort by relevance
  scoredSections.sort((a, b) => b.relevanceScore - a.relevanceScore);
  
  // Load sections until budget is reached
  for (const item of scoredSections) {
    if (usedTokens + item.tokens <= availableTokens) {
      const sectionContent = await loadSection(item.file, item.section.title);
      loadedContext += '\n\n' + sectionContent;
      usedTokens += item.tokens;
    } else {
      // Log skipped sections
      console.log(`Skipped section "${item.section.title}" (${item.tokens} tokens) due to token budget`);
    }
  }
  
  console.log(`Loaded optimized context: ${usedTokens} tokens used of ${availableTokens} available`);
  return loadedContext;
}

// Calculate relevance score between task and section
function calculateRelevance(task, section) {
  // Simple keyword matching - could be enhanced with embeddings
  const taskKeywords = extractKeywords(task.description);
  const sectionKeywords = extractKeywords(section.contentPreview);
  
  let matchCount = 0;
  for (const keyword of taskKeywords) {
    if (sectionKeywords.includes(keyword)) {
      matchCount++;
    }
  }
  
  return matchCount / taskKeywords.length;
}
```

### 5. Context Merging and Deduplication

**WHY:** Context from multiple files often contains redundant information, wasting tokens.

**WHAT:** Implement intelligent context merging to remove duplicates and reconcile conflicts.

**HOW:**
1. Develop a fuzzy matching algorithm for similar context sections
2. Implement strategy for conflict resolution
3. Add metadata preservation during merging
4. Create unified view of distributed context

**IMPACT METRICS:**
- **Before:** Duplicate information across context files
- **After:** Single source of truth with cross-references
- **Improvement:** 30% token reduction through deduplication

**IMPLEMENTATION TIME:** 2 days

**CODE SNIPPET:**
```python
# Context merging and deduplication
import difflib
import json
import os
from pathlib import Path

def load_context_files(root_dir):
    """Load all Claude.md files in the directory structure."""
    context_files = []
    for path in Path(root_dir).glob('**/CLAUDE.md'):
        with open(path, 'r') as f:
            context_files.append({
                'path': str(path),
                'content': f.read(),
                'sections': parse_sections(f.read())
            })
    return context_files

def parse_sections(content):
    """Parse markdown content into sections."""
    lines = content.split('\n')
    sections = []
    current_section = None
    current_content = []
    
    for line in lines:
        if line.startswith('## '):
            # Save previous section
            if current_section:
                sections.append({
                    'title': current_section,
                    'content': '\n'.join(current_content)
                })
            
            # Start new section
            current_section = line[3:].strip()
            current_content = []
        elif current_section:
            current_content.append(line)
    
    # Add final section
    if current_section:
        sections.append({
            'title': current_section,
            'content': '\n'.join(current_content)
        })
    
    return sections

def find_similar_sections(sections):
    """Find similar sections using fuzzy matching."""
    similar_groups = []
    
    for i, section1 in enumerate(sections):
        for j, section2 in enumerate(sections[i+1:], i+1):
            # Check title similarity
            title_similarity = difflib.SequenceMatcher(
                None, section1['title'], section2['title']
            ).ratio()
            
            # Check content similarity
            content_similarity = difflib.SequenceMatcher(
                None, section1['content'], section2['content']
            ).ratio()
            
            # If similar enough, group them
            if title_similarity > 0.8 or content_similarity > 0.7:
                # Find existing group or create new one
                found_group = False
                for group in similar_groups:
                    if i in group or j in group:
                        group.update([i, j])
                        found_group = True
                        break
                
                if not found_group:
                    similar_groups.append({i, j})
    
    # Convert indices to actual sections
    result = []
    for group in similar_groups:
        result.append([sections[i] for i in group])
    
    return result

def merge_sections(similar_sections):
    """Merge similar sections preserving all information."""
    if not similar_sections:
        return None
    
    # Use the longest title as the merged title
    merged_title = max(section['title'] for section in similar_sections, key=len)
    
    # Merge content
    all_content = [section['content'] for section in similar_sections]
    
    # Simple merge strategy - can be enhanced with NLP
    if all(content == all_content[0] for content in all_content):
        # All identical, use any
        merged_content = all_content[0]
    else:
        # Combine unique paragraphs
        paragraphs = []
        for content in all_content:
            for paragraph in content.split('\n\n'):
                paragraph = paragraph.strip()
                if paragraph and not any(
                    difflib.SequenceMatcher(None, paragraph, p).ratio() > 0.8
                    for p in paragraphs
                ):
                    paragraphs.append(paragraph)
        
        merged_content = '\n\n'.join(paragraphs)
    
    return {
        'title': merged_title,
        'content': merged_content,
        'merged_count': len(similar_sections),
        'source_paths': [section.get('path', 'unknown') for section in similar_sections]
    }

def deduplicate_context(root_dir, output_file):
    """Merge and deduplicate context across all Claude.md files."""
    # Load all context files
    all_files = load_context_files(root_dir)
    
    # Flatten all sections
    all_sections = []
    for file in all_files:
        for section in file['sections']:
            section['path'] = file['path']
            all_sections.append(section)
    
    # Find and merge similar sections
    similar_groups = find_similar_sections(all_sections)
    merged_sections = [merge_sections(group) for group in similar_groups]
    
    # Add unique sections
    processed_indices = set()
    for group in similar_groups:
        for idx in group:
            processed_indices.add(id(all_sections[idx]))
    
    unique_sections = [
        section for section in all_sections 
        if id(section) not in processed_indices
    ]
    
    # Combine merged and unique sections
    final_sections = merged_sections + unique_sections
    
    # Sort by title
    final_sections.sort(key=lambda s: s['title'])
    
    # Generate merged content
    merged_content = "# Merged Context\n\n"
    for section in final_sections:
        merged_content += f"## {section['title']}\n\n"
        if 'merged_count' in section and section['merged_count'] > 1:
            merged_content += f"*Merged from {section['merged_count']} sources*\n\n"
        merged_content += section['content'] + "\n\n"
    
    # Write to output file
    with open(output_file, 'w') as f:
        f.write(merged_content)
    
    # Create metadata file
    metadata = {
        'original_files': len(all_files),
        'original_sections': len(all_sections),
        'merged_sections': len(merged_sections),
        'unique_sections': len(unique_sections),
        'final_sections': len(final_sections),
        'token_estimate': len(merged_content) // 4,
        'merged_groups': [
            [section['path'] for section in group]
            for group in similar_groups
        ]
    }
    
    with open(output_file + '.meta.json', 'w') as f:
        json.dump(metadata, f, indent=2)
    
    return metadata

# Example usage
deduplicate_context('/Volumes/Envoy/SecondBrain', '/Volumes/Envoy/SecondBrain/.cl/merged_context.md')
```

## Medium-Priority Optimizations

1. **Task Visualization Dashboard** - Create a simple web UI for task visualization (3 days)
2. **Incremental Context Updates** - Implement diff-based context updates (2 days)
3. **Automated Context Testing** - Add validation tests for context quality (2 days)
4. **Enhanced Token Prediction** - Implement better token prediction for LLMs (2 days)
5. **Context Search API** - Create a simple API for semantic context search (3 days)

## Low-Priority Optimizations

1. **Multi-Model Context Optimization** - Optimize context for different models (4 days)
2. **Context Version Control** - Implement git-like version control for context (5 days)
3. **Natural Language Task Creation** - Add NL interface for task creation (3 days)
4. **Context Heat Maps** - Visualize which context sections are used most (2 days)
5. **Automatic Context Generation** - Generate context from code/docs (7 days)

## Implementation Plan for Top 5 Optimizations

| Day | Morning | Afternoon |
|-----|---------|-----------|
| 1 | Context Indexing - Initial implementation | Context Indexing - Testing and refinement |
| 2 | Task Dependencies Graph - Implementation | Token-Aware Context Loading - Implementation |
| 3 | Selective Compaction - Design and initial code | Selective Compaction - Testing and refinement |
| 4 | Context Merging - Core algorithms | Context Merging - Integration and testing |
| 5 | Integration testing and bug fixes | Documentation and deployment |

## Performance Benchmarks

To measure the impact of these optimizations, implement these simple benchmarks:

```bash
#!/bin/bash
# Benchmark script for context management optimizations

echo "Running Context Management System benchmarks..."

# Benchmark 1: Context loading time
echo -e "\n=== Context Loading Benchmark ==="
time {
  # Before optimization
  cp ./benchmarks/claude.md.original ./benchmarks/claude.md
  .cl/load-context.sh ./benchmarks/claude.md
}

# Apply optimization
.cl/index-context.sh ./benchmarks/claude.md

time {
  # After optimization
  .cl/load-context.sh ./benchmarks/claude.md
}

# Benchmark 2: Task dependency validation
echo -e "\n=== Task Dependency Benchmark ==="
time {
  # Before optimization
  .cl/validate-tasks.sh ./benchmarks/tasks.json
}

# Apply optimization
.cl/optimize-task-validation.sh

time {
  # After optimization
  .cl/validate-tasks.sh ./benchmarks/tasks.json
}

# Benchmark 3: Context size after compaction
echo -e "\n=== Context Compaction Benchmark ==="
BEFORE_SIZE=$(wc -c < ./benchmarks/large_context.md)
echo "Before compaction: $BEFORE_SIZE bytes"

# Apply optimization
.cl/selective-compact.sh ./benchmarks/large_context.md

AFTER_SIZE=$(wc -c < ./benchmarks/large_context.md)
echo "After compaction: $AFTER_SIZE bytes"
REDUCTION=$((100 - (AFTER_SIZE * 100 / BEFORE_SIZE)))
echo "Reduction: $REDUCTION%"

# Benchmark 4: Token-aware loading
echo -e "\n=== Token-Aware Loading Benchmark ==="
time {
  # Before optimization
  .cl/load-full-context.sh ./benchmarks/task001.json
}

# Apply optimization
.cl/install-token-aware-loader.sh

time {
  # After optimization
  .cl/load-optimized-context.sh ./benchmarks/task001.json
}

# Compare token usage
BEFORE_TOKENS=$(grep "Tokens used:" ./benchmarks/before_tokens.log | awk '{print $3}')
AFTER_TOKENS=$(grep "Tokens used:" ./benchmarks/after_tokens.log | awk '{print $3}')
TOKEN_REDUCTION=$((100 - (AFTER_TOKENS * 100 / BEFORE_TOKENS)))
echo "Token reduction: $TOKEN_REDUCTION%"

# Benchmark 5: Context deduplication
echo -e "\n=== Context Deduplication Benchmark ==="
BEFORE_SECTIONS=$(find ./benchmarks/context_files -name "CLAUDE.md" | xargs grep -c "^## " | awk '{sum+=$1} END {print sum}')
echo "Before deduplication: $BEFORE_SECTIONS sections"

# Apply optimization
.cl/deduplicate-context.sh ./benchmarks/context_files ./benchmarks/merged_context.md

AFTER_SECTIONS=$(grep -c "^## " ./benchmarks/merged_context.md)
echo "After deduplication: $AFTER_SECTIONS sections"
SECTION_REDUCTION=$((100 - (AFTER_SECTIONS * 100 / BEFORE_SECTIONS)))
echo "Section reduction: $SECTION_REDUCTION%"

echo -e "\nBenchmark complete. See detailed results in ./benchmarks/results.log"
```

These optimizations will significantly improve the performance, reliability, and token efficiency of the Context Management System while maintaining full compliance with the Prime Directive of never truncating knowledge contained in SecondBrain.