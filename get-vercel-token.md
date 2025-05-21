# Getting Your Vercel Token

Follow these steps to generate a Vercel token:

1. **Log in to your Vercel account** at https://vercel.com/login

2. **Go to Account Settings**:
   - Click on your profile picture in the top-right corner
   - Select "Settings" from the dropdown menu

3. **Navigate to "Tokens"**:
   - In the left sidebar, find and click on "Tokens"
   - This is under the "Security" section

4. **Create a new token**:
   - Click "Create Token"
   - Give your token a name like "SecondBrain"
   - Select the expiration time (choose "No expiration" for permanent access)
   - Set the appropriate scope (usually "Full Account" for complete access)

5. **Copy your token**:
   - After generating, copy the token immediately
   - **IMPORTANT**: Vercel shows this token only once

6. **Add the token to your .env file**:
   - Open your .env file
   - Update the VERCEL_TOKEN value:
   ```
   VERCEL_TOKEN=your_copied_token_here
   ```

## Project Information

Your Vercel project details are:
- Project ID: `prj_aOFhryuQDitLySFPRziJlOnMHSnq`
- Team/Org ID: `team_h3KOC4f7ZcxQSpym7McGDpSM`

This information is useful when configuring deployments from code.

## Why You Need This Token

The Vercel token allows your SecondBrain application to:
- Deploy projects programmatically
- Manage Vercel project settings
- Access your team's resources
- Create previews and production deployments

## Security Notes

- Never share this token publicly
- Do not commit it to a public repository
- It has similar permissions to your Vercel login
- If compromised, immediately revoke it from your Vercel account settings