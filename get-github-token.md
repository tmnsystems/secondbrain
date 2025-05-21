# Getting Your GitHub Personal Access Token

Follow these steps to generate a GitHub Personal Access Token for SecondBrain:

## Creating a Personal Access Token (PAT)

1. **Log in to your GitHub account** at https://github.com/login

2. **Go to Settings**:
   - Click on your profile picture in the top-right corner
   - Select "Settings" from the dropdown menu

3. **Navigate to Developer Settings**:
   - Scroll down to the bottom of the left sidebar
   - Click on "Developer settings"

4. **Personal Access Tokens**:
   - Click on "Personal access tokens"
   - Select "Tokens (classic)" or "Fine-grained tokens" (fine-grained is recommended for better security)

5. **Generate New Token**:
   - Click "Generate new token"
   - For fine-grained tokens, click "Generate new token (Beta)"
   - For classic tokens, click "Generate new token (classic)"

6. **Configure your token**:
   - Give your token a descriptive name like "SecondBrain"
   - Set an expiration (choose the appropriate duration based on your needs)
   - For a fine-grained token:
     - Select the specific repository or repositories to grant access to
     - Only select the permissions you need (repo access, read/write)
   - For a classic token:
     - Select the scopes needed:
       - `repo` (for full repository access)
       - `workflow` (if using GitHub Actions)
       - `read:org` (if accessing organization repositories)

7. **Generate and Copy**:
   - Click "Generate token"
   - **IMPORTANT**: Copy the token immediately - GitHub only shows it once!

8. **Add to your .env file**:
   - Open your .env file
   - Update the GITHUB_TOKEN value:
   ```
   GITHUB_TOKEN=your_github_token_here
   ```

## Required Permissions

For SecondBrain, your GitHub token needs these permissions:

### If using fine-grained token (recommended):
- Repository permissions:
  - Contents: Read and write
  - Metadata: Read-only
  - Pull requests: Read and write (if creating PRs)
  - Workflows: Read and write (if using GitHub Actions)

### If using classic token:
- `repo` scope (for private repositories)
- `workflow` scope (if using GitHub Actions)

## Why You Need This Token

The GitHub token allows your SecondBrain application to:
- Clone repositories
- Commit changes
- Create branches and pull requests
- Access private repositories
- Interact with GitHub APIs programmatically

## Security Notes

- Never share this token publicly
- Do not commit it to public repositories
- If compromised, immediately delete it from GitHub settings
- Use the shortest possible expiration time that meets your needs
- Use fine-grained tokens with limited repository access when possible