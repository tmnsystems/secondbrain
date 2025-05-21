#!/bin/bash
# Process key files one at a time to avoid timeouts

cd "$(dirname "$0")"

# Create output directory
mkdir -p processed_data

echo "===== Processing Key Style Document ====="
node process_single_file.js ./apps/ai-writing-system/writing_samples/tina_style.md style_guide very_high

echo "===== Processing Blog Posts ====="
node process_single_file.js ./apps/ai-writing-system/writing_samples/written_content/Blog\ Posts\ .txt blog_posts high

echo "===== Processing Facebook Posts ====="
node process_single_file.js ./apps/ai-writing-system/writing_samples/facebook/facebookposts2015-21725.md social_media medium

echo "===== Processing Transcript 1 ====="
node process_single_file.js ./apps/ai-writing-system/writing_samples/transcripts/Done\ Transcript\ for\ Fuji_Tina\ Coaching.txt transcript high

echo "===== Processing Transcript 2 ====="
node process_single_file.js "./apps/ai-writing-system/writing_samples/transcripts/Done Transcript for Maria & Tina🪄.txt" transcript high

echo "===== Processing Transcript 3 ====="
node process_single_file.js ./apps/ai-writing-system/writing_samples/transcripts/Done\ Transcript\ for\ Laura\ +\ Tina.txt transcript high

echo "===== Processing Complete ====="
echo "Now you can generate content with: node generate_from_profile.js \"Your topic\" article"