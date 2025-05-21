# Quick Start Guide for SecondBrain

## Processing Your Existing Content (Already Set Up)

Your content in `/apps/ai-writing-system/writing_samples/` is already available for processing.

### Step 1: Process Key Files

```bash
./process_key_files.sh
```

This script will:
1. Process your style guide (`tina_style.md`)
2. Process your blog posts
3. Process your Facebook posts
4. Process 3 key coaching transcripts

Each file will be processed individually to avoid timeouts.

### Step 2: Combine the Style Profiles

```bash
node combine_profiles.js
```

This creates a comprehensive style profile that combines insights from all processed content.

### Step 3: Generate Content in Your Style

```bash
node generate_from_profile.js "Your topic" article
```

Examples:
```bash
# Generate an article
node generate_from_profile.js "Scaling a service business" article

# Generate an SOP
node generate_from_profile.js "Client onboarding process" sop

# Generate a course outline
node generate_from_profile.js "Business systems mastery" course

# Generate an action plan
node generate_from_profile.js "Implementing profit first" action_plan
```

## Adding More Content (Optional)

If you want to add more content later:

1. Add new files to the appropriate folder in `/uploads/content/`
2. Process the new file:
   ```bash
   node process_single_file.js /path/to/new/file.txt file_type priority
   ```
   Examples of file_type: `transcript`, `blog_posts`, `framework`
   Examples of priority: `very_high`, `high`, `medium`

3. Combine all profiles again:
   ```bash
   node combine_profiles.js
   ```

## Files and Directories

- `/processed_data/` - Contains all style profiles
- `/processed_data/combined_style_profile.json` - The comprehensive style profile
- `/generated_content/` - Where generated content is saved