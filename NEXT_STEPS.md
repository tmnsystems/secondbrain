# NEXT_STEPS.md
This file records the next manual actions to resume and complete the GitHub integration for Tina’s Second Brain monorepo.

1) Ensure you are in your monorepo root and GitHub is authenticated:
```bash
cd ~/dev/SecondBrain
# Confirm origin is set:
git remote -v
```

2) Push all outstanding commits to GitHub:
```bash
git push origin main
```

3) Trigger the CI workflow (if it does not auto-run):
```bash
git commit --allow-empty -m "Trigger CI after model routing update"
git push origin main
```

4) Verify the CI badge and Actions tab show a passing build:
   - README.md badge should turn green
   - https://github.com/tmnsystems/CoachTinaMarieAiStrategist/actions

5) Proceed to branch protection, environment variable setup, and deployment:
   - Protect `main` branch in GitHub settings
   - Add required secrets (OPENAI_API_KEY, PINECONE_*, GH_PAT)
   - Deploy `frontend/` to Vercel and `backend/` to Replit/Railway

6) **Already handled automatically**  
   The project now contains:  
   • Warning-free `next.config.js`  
   • `.env.example` (copy → `.env.local`) and `.gitignore` protection  
   • CI job to fail if secrets are missing (`.github/workflows/check-env.yml`)  
   • Unified `dev / build / deploy` scripts in `package.json`  

When you relaunch Codex, ask:  
```bash
cat NEXT_STEPS.md
```  
to see the latest status.

Use this file as a launch point; when you re-open this project with AI assistance,
ask to `cat NEXT_STEPS.md` or “What’s next?” to pick up right where you left off.