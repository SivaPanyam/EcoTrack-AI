# Vercel Deployment Guide - EcoTrack AI

## Step 1: Push to GitHub

Your code is already on GitHub at `https://github.com/SivaPanyam/EcoTrack-AI.git`

Verify the latest version is pushed:

```bash
git add .
git commit -m "Add Vercel configuration"
git push origin main
```

## Step 2: Connect to Vercel

1. Go to **https://vercel.com**
2. Sign up (or login) with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select **"SivaPanyam/EcoTrack-AI"** repository
5. Click **"Import"**

## Step 3: Configure Environment Variables

In the Vercel dashboard, go to **Settings → Environment Variables** and add:

| Variable               | Value                                               |
| ---------------------- | --------------------------------------------------- |
| `GOOGLE_GENAI_API_KEY` | Your actual Gemini API key                          |
| `AUTH0_AUDIENCE`       | `https://dev-r5227zj1zyeb0gnn.us.auth0.com/api/v2/` |
| `AUTH0_ISSUER_URL`     | `https://dev-r5227zj1zyeb0gnn.us.auth0.com/`        |

## Step 4: Deploy

Click **"Deploy"** - Vercel will:

- Build frontend (Vite)
- Build backend (TypeScript)
- Deploy to a live URL (e.g., `https://ecotrack-ai.vercel.app`)

## Step 5: Update Auth0

Once deployed, copy your Vercel URL and update Auth0:

1. Go to **Auth0 Dashboard → Applications → Your App**
2. Under **Allowed Callback URLs**, add your Vercel URL
3. Under **Allowed Logout URLs**, add your Vercel URL
4. Under **Web Origins**, add your Vercel URL

## What's Configured

- **vercel.json**: Tells Vercel how to build both frontend & backend
- **build:all script**: Builds frontend + backend in correct order
- **.vercelignore**: Skips unnecessary files during deployment

## Auto-Deployment

- Every `git push` automatically deploys to Vercel
- No manual intervention needed after setup!
