import type { Config } from '@netlify/functions';

/**
 * Supabase free-tier projects are paused after ~7 days with no activity, which
 * makes the app fail to load until someone manually resumes the project in the
 * dashboard. This scheduled function makes one tiny authenticated request to the
 * REST API each day so the project always counts as active and never sleeps.
 *
 * It uses the same public env the app already relies on (SUPABASE_URL /
 * SUPABASE_ANON_KEY) — no secret key is needed. The query is RLS-filtered to
 * nothing for the anon role, but it still hits Postgres, which is all the
 * keep-alive needs.
 *
 * Schedule + bundling are automatic: Netlify discovers files in
 * netlify/functions/ and registers the cron from the `config.schedule` below.
 */
export default async () => {
  const url = (process.env.SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_ANON_KEY ?? '').trim();

  if (!url || !key) {
    console.error('keep-alive: missing SUPABASE_URL / SUPABASE_ANON_KEY');
    return new Response('Missing Supabase env', { status: 500 });
  }

  try {
    const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    console.log(`keep-alive: pinged Supabase, status ${res.status}`);
    return new Response(`ok ${res.status}`, { status: 200 });
  } catch (error) {
    console.error('keep-alive: ping failed', error);
    return new Response('Ping failed', { status: 502 });
  }
};

export const config: Config = {
  // Once a day is well within the ~7-day inactivity window.
  schedule: '@daily',
};
