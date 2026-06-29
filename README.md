# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment (Netlify)

This app is configured to deploy to **Netlify Functions** via
`@netlify/remix-adapter` (wired into `vite.config.ts`) and `netlify.toml`.

1. Connect the repo in Netlify (or run `netlify deploy`). The build settings
   come from `netlify.toml` — build command `npm run build`, publish directory
   `build/client`; the adapter emits the server function automatically.
2. Set the `SUPABASE_URL` and `SUPABASE_ANON_KEY` environment variables in
   Netlify (see the Database section below).
3. For local development that mirrors production, use `netlify dev`.

### DIY (Node server)

The built-in Remix server also works (`npm run build` then `npm start`); deploy
the output of `build/server` + `build/client`.

## Database (Supabase)

The app uses [Supabase](https://supabase.com/) for auth, data, and image storage.

1. Run `supabase/schema.sql` once in the Supabase **SQL Editor**. It creates the
   `profiles`, `lists`, `list_members`, `list_invites`, and `restaurants` tables
   (with row-level security and Owner/Editor/Viewer roles), the helper
   functions/triggers, and the `restaurant-images` + `avatars` storage buckets.
   If you had data from an earlier version, also run `supabase/migrate_existing.sql`
   once to backfill profiles, default lists, and list membership.
2. Configure the project URL and anon/public key via environment variables:
   - **Production (Netlify):** add `SUPABASE_URL` and `SUPABASE_ANON_KEY` under
     Site settings → Environment variables.
   - **Local dev:** copy `.env.example` to `.env` and fill them in. Run with
     `netlify dev` (which injects the site's env vars) or otherwise ensure the
     variables are present in `process.env`.

   The anon key is safe to expose to the browser — row-level security protects
   the data; the server injects it into `window.ENV` for the client. Never use
   the `service_role` key here.
3. Auth uses email/password. If you want users to sign in immediately after
   signing up, disable email confirmation under **Authentication → Providers →
   Email** in the Supabase dashboard; otherwise they must confirm via email
   first.
4. **Email link URLs.** Confirmation and password-reset links are built from the
   public site origin. Set **Authentication → URL Configuration → Site URL** to
   your deployed URL and add `<site>/auth/confirm` to **Redirect URLs** —
   otherwise Supabase falls back to its default Site URL (`http://localhost:3000`)
   and the links point at localhost. Also set the `SITE_URL` env var (see
   `.env.example`) so the app sends the correct `emailRedirectTo` even when it
   runs behind a proxy whose request host is internal.
5. To enable **Continue with Google**, turn on the Google provider under
   **Authentication → Providers → Google** (client ID/secret) and add
   `<site>/auth/confirm` to the Redirect URLs. Until it's enabled, the button
   shows a friendly error and email/password still works.

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
