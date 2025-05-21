# Vercel Deployment Guide for SecondBrain

This document outlines the recommended approach for deploying the SecondBrain ecosystem components to Vercel, with special attention to addressing known deployment issues.

## Current Deployment Status

The SecondBrain monorepo contains multiple applications, with different deployment requirements:

- **CoachTinaMarieAI**: Next.js application with TypeScript, experiencing Vercel deployment issues
- **TubeToTask**: Python-based application, currently hosted on Replit
- **NymirAI**: TypeScript application with Vite, deployable to Vercel
- **Other applications**: In various stages of development

## Identified Issues with CoachTinaMarieAI Deployment

1. **TypeScript Configuration Issues**:
   - Corrupted tsconfig.json file (now fixed)
   - Inconsistent TypeScript version requirements
   - Missing type definitions for some dependencies

2. **Package Management**:
   - Conflicts between npm and pnpm locks
   - Dependency version mismatches
   - Potential duplicate packages

3. **Monorepo Structure**:
   - Vercel's handling of monorepo deployments requires specific configuration
   - Shared code and dependencies between projects may cause conflicts

4. **Environment Configuration**:
   - Sensitive environment variables must be properly set in Vercel
   - API keys and service configurations differ between environments

## Recommended Deployment Strategy

### 1. Project-Specific Deployments

Instead of deploying the entire monorepo, configure separate project deployments:

```bash
# Configure each project deployment individually
cd apps/CoachTinaMarieAI
vercel --scope <your-vercel-team>

cd ../NymirAI
vercel --scope <your-vercel-team>

# etc. for other deployable applications
```

### 2. TypeScript & Build Configuration

For each Next.js project:

1. Ensure tsconfig.json is properly configured:
   - Correct target (es2018 or higher)
   - Proper module resolution settings
   - Include all necessary type definition files

2. Configure Vercel build settings:
   - Set the root directory to the specific project folder
   - Specify the correct build command
   - Configure output directory settings if needed

Example vercel.json for CoachTinaMarieAI:

```json
{
  "builds": [
    {
      "src": "apps/CoachTinaMarieAI",
      "use": "@vercel/next",
      "config": {
        "rootDirectory": "apps/CoachTinaMarieAI"
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/apps/CoachTinaMarieAI/$1"
    }
  ]
}
```

### 3. Environment Variable Management

Create appropriate .env.local or .env.production files for each project, then:

1. Configure environment variables in the Vercel dashboard
2. Ensure all required API keys are available:
   - OpenAI API key
   - Pinecone API key
   - Supabase credentials
   - Stripe keys (if applicable)
   - Other service credentials

### 4. Monorepo Considerations

If sharing code between applications:

1. Consider using Turborepo for better monorepo management
2. Alternatively, extract shared code into separate npm packages
3. Use path aliases to reference shared code without build issues

## Deployment Workflow

1. **Local Testing**:
   ```bash
   cd apps/CoachTinaMarieAI
   npm run build
   ```

2. **Preview Deployment**:
   ```bash
   vercel
   ```

3. **Production Deployment**:
   ```bash
   vercel --prod
   ```

## Troubleshooting Common Issues

### TypeScript Errors

If encountering TypeScript compilation errors:

1. Check for missing type definitions:
   ```bash
   npm install --save-dev @types/missing-package
   ```

2. Verify tsconfig.json includes all necessary files:
   ```json
   "include": [
     "**/*.ts",
     "**/*.tsx",
     "global.d.ts",
     "next-env.d.ts",
     ".next/types/**/*.ts"
   ]
   ```

3. Ensure proper module resolution:
   ```json
   "moduleResolution": "node",
   "baseUrl": ".",
   "paths": {
     "@/*": ["./*"]
   }
   ```

### Build Failures

For general build failures:

1. Check Vercel build logs for specific errors
2. Ensure all dependencies are properly installed
3. Verify that build scripts are correctly defined in package.json
4. Test the build locally before deployment

### Environment Variables

If environment variables are not accessible:

1. Verify they are properly set in the Vercel dashboard
2. Check that they are being imported correctly in your code
3. Ensure that any required runtime variables are properly exposed

## Next Steps

1. Update project configuration for each application
2. Test builds locally before deployment
3. Implement the deployment strategy outlined above
4. Monitor deployments for issues and optimize as needed