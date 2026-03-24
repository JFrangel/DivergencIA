# DivergencIA — Deployment Guide

## Prerequisites
- Node.js 18+
- Supabase project: `bmbgjvmmwwogwecyxezx`

## Environment Variables
```env
VITE_SUPABASE_URL=https://bmbgjvmmwwogwecyxezx.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

## Local Development
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Deploy to Vercel

### Via CLI
```bash
cd frontend
npx vercel --prod
```

### Via Dashboard
1. Import repo on vercel.com
2. Set Root Directory: `frontend`
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### Post-Deploy: Update Supabase Auth
1. Go to https://supabase.com/dashboard/project/bmbgjvmmwwogwecyxezx/auth/url-configuration
2. Set **Site URL** to your deployment URL (e.g., `https://divergencia.vercel.app`)
3. Add **Redirect URL**: `https://divergencia.vercel.app/**`
4. Save

## Deploy to Netlify

### Via CLI
```bash
cd frontend
npm run build
npx netlify deploy --prod --dir=dist
```

### Via Dashboard
1. Import repo on app.netlify.com
2. Set Base Directory: `frontend`
3. Build Command: `npm run build`
4. Publish Directory: `frontend/dist`
5. Add environment variables

### Post-Deploy: Update Supabase Auth
Same as Vercel — update Site URL and Redirect URLs with your Netlify domain.

## Deploy to Both (Multi-Environment)
You can deploy to both Vercel and Netlify simultaneously. In Supabase Auth settings:
- Set **Site URL** to your primary domain
- Add **Redirect URLs** for ALL deployments:
  ```
  https://divergencia.vercel.app/**
  https://divergencia.netlify.app/**
  http://localhost:5173/**
  ```

## Supabase Configuration Checklist
- [ ] Auth URL configuration updated
- [ ] Storage buckets created: `avatars` (public), `archivos` (auth), `avance-attachments` (auth)
- [ ] RLS policies enabled on all tables
- [ ] Edge functions deployed (if any)
