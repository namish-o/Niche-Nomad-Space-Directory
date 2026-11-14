# Sign-in and saved views (Supabase)

The "My saved views" panel lets people save a spot on the sky (RA/Dec, field of view,
band, a note and a short description of what is there) and reopen, rename or delete it later.

- **Without any setup** saves are kept in the visitor's own browser. Nothing else to do.
- **With Supabase** (free) people can sign in with an emailed link and their saves follow
  them to any device. Each person only ever sees their own saves.

The site stays fully static: the browser talks to Supabase directly with the public
"anon" key, and the database rules (row level security) keep users apart.

## Current setup

Already done for the team site: Supabase project `spherex-blink` (Niche Nomads org) has the
table, and its URL and public anon key are in `frontend/.env.production`, so Vercel needs no
environment variables. The steps below are for setting up a different Supabase project.

## Setup, step by step (about 10 minutes)

1. Go to <https://supabase.com>, sign up, and click **New project**. Pick any name,
   make up a database password (you won't need it again), choose a region near you,
   and click **Create new project**. Wait a minute for it to start.
2. In the left menu open **SQL Editor** → **New query**. Open
   [`supabase/saved_views.sql`](../supabase/saved_views.sql) from this repo, copy all of it,
   paste it in, and click **Run**. It should say "Success. No rows returned".
3. In the left menu open **Authentication** → **Sign In / Providers**. Make sure **Email**
   is enabled (it is by default).
4. Still under **Authentication**, open **URL Configuration**:
   - **Site URL**: your live site, e.g. `https://your-site.vercel.app`
   - **Redirect URLs**: click **Add URL** and add `https://your-site.vercel.app/**`
     (and `http://localhost:5173/**` if you also run it on your computer). Save.
5. Open **Project Settings** (gear icon) → **API** (or **Data API** / **API Keys**). Copy:
   - the **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - the **anon public** key (a long text starting `eyJ...`, or `sb_publishable_...`).
   Do **not** use the `service_role` / secret key; it must never go in the website.
6. In **Vercel**: open the project → **Settings** → **Environment Variables**. Add two:
   - `VITE_SUPABASE_URL` = the Project URL
   - `VITE_SUPABASE_ANON_KEY` = the anon public key
   Tick Production, Preview and Development, then **Save**.
7. Vercel → **Deployments** → the latest one → **⋯** → **Redeploy**. (The values are baked
   in at build time, so a redeploy is needed.)

Open the site: the panel now shows "Email me a link". Enter an email, click the link in
the email, and you are back on the same view, signed in.

On Netlify or Render, add the same two variables under the site's environment settings
and redeploy. For local development put them in `frontend/.env.local` (git ignores it).

## Notes

- The anon key is meant to be public; the SQL rules are what protect the data.
- Supabase's built-in email sender allows only a few sign-in emails per hour. That is
  fine for a demo; for more, add your own SMTP under Authentication → Emails.
- Saves made before signing in stay in the browser (on this device only); once signed in the panel offers
  "Move into my account".
