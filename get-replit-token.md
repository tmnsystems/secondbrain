# Getting Your Replit Token

Follow these steps to generate a Replit API token:

1. **Log in to your Replit account** at https://replit.com/login

2. **Go to Account Settings**:
   - Click on your profile picture in the top-right corner
   - Select "Account" from the dropdown menu

3. **Navigate to "API Tokens"**:
   - In the left sidebar, find and click on "API Tokens" or similar option
   - This may be under a "Developer" or "Advanced" section

4. **Create a new token**:
   - Click "Generate new API token" or similar button
   - Give your token a name like "SecondBrain"
   - Select the appropriate scopes:
     - read (required)
     - write (if you'll be making changes to Repls)
     - deploy (if you'll be deploying from SecondBrain)

5. **Copy your token**:
   - After generating, copy the token immediately
   - **IMPORTANT**: Replit usually shows this token only once

6. **Add the token to your .env file**:
   - Open your .env file
   - Update the REPLIT_TOKEN value:
   ```
   REPLIT_TOKEN=your_copied_token_here
   ```

## Why You Need This Token

The Replit token allows your SecondBrain application to:
- Access your Replit workspace programmatically
- Create or modify Repls
- Run code on Replit
- Deploy applications to Replit

## Security Notes

- Never share this token publicly
- Do not commit it to a public repository
- It has similar permissions to your Replit password
- If compromised, immediately revoke it from your Replit account settings