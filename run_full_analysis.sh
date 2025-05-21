#!/bin/bash
# Full SecondBrain Analysis and Profile Generation
# This script runs a complete analysis of all content and creates a master style profile

echo "======================================================="
echo "SecondBrain Full Style Analysis and Profile Generation"
echo "======================================================="

# 1. Process all content (force processing to ensure completeness)
echo "Processing all content files..."
node local_context_system.js process-force

# 2. Analyze style from all processed content
echo "Analyzing style from all processed content..."
node style_analyzer.js analyze

# 3. Create master style profile
echo "Creating master style profile..."
node combine_profiles.js create

echo "======================================================="
echo "Style analysis complete!"
echo "You can now generate content using the following commands:"
echo "npm run master-article --topic=\"Your topic\""
echo "npm run master-sop --topic=\"Your topic\""
echo "npm run master-course --topic=\"Your topic\""
echo "npm run master-plan --topic=\"Your topic\""
echo "======================================================="