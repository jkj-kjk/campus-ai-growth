# Campus AI Challenge

Prototype growth system for the NxtWave Growth Challenge:

> Build Your First AI Project in 60 Minutes

## What this proves

The product is intentionally built around a growth loop:

College/community -> registration -> personal referral -> friend registration -> campus leaderboard -> measurement

It also contains a simulation dashboard for demonstrating:

- registration funnel
- acquisition sources
- referral contribution
- message A/B/C experiment
- next-action recommendation

All dashboard figures are explicitly marked as DEMO DATA.

## Local setup

1. Install Node.js.
2. Create the app:

```bash
npm install
```

3. Optional: create `.env.local`:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

4. In Supabase SQL Editor, run:

`supabase/schema.sql`

5. Start:

```bash
npm run dev
```

The app works in demo mode without Supabase, so the UI can still be shown before the backend is configured.

## Pages

- `/` - campaign landing page
- `/register` - registration flow
- `/success` - referral dashboard
- `/leaderboard` - campus leaderboard
- `/dashboard` - growth simulation

## Vercel

Push the repository to GitHub and import it into Vercel.

Add these environment variables in Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Do not add a Supabase service-role key to the frontend.

## Important

This is an assessment prototype, not a production registration system.
For a real campaign, add:

- authentication or verified email
- rate limiting / bot protection
- referral abuse detection
- privacy/consent language
- proper admin authentication
- server-side validation
- analytics platform integration
