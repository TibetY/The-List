# Welcome to Remix!

- 📖 [Remix docs](https://remix.run/docs)

## Development

Run the dev server:

```shellscript
npm run dev
```

## Deployment

First, build your app for production:

```sh
npm run build
```

Then run the app in production mode:

```sh
npm start
```

Now you'll need to pick a host to deploy it to.

### DIY

If you're familiar with deploying Node applications, the built-in Remix app server is production-ready.

Make sure to deploy the output of `npm run build`

- `build/server`
- `build/client`

## Database (Supabase)

The app uses [Supabase](https://supabase.com/) for auth, data, and image storage.

1. Run `supabase/schema.sql` once in the Supabase **SQL Editor**. It creates the
   `profiles`, `lists`, `list_members`, `list_invites`, and `restaurants` tables
   (with row-level security and Owner/Editor/Viewer roles), the helper
   functions/triggers, and the `restaurant-images` + `avatars` storage buckets.
   If you had data from an earlier version, also run `supabase/migrate_existing.sql`
   once to backfill profiles, default lists, and list membership.
2. Set your project's anon/public key in `app/supabaseConfig.ts` (or via the
   `SUPABASE_URL` / `SUPABASE_ANON_KEY` environment variables). The anon key is
   safe to expose — row-level security protects the data. Never put the
   `service_role` key in client config.
3. Auth uses email/password. If you want users to sign in immediately after
   signing up, disable email confirmation under **Authentication → Providers →
   Email** in the Supabase dashboard; otherwise they must confirm via email
   first.

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever css framework you prefer. See the [Vite docs on css](https://vitejs.dev/guide/features.html#css) for more information.
