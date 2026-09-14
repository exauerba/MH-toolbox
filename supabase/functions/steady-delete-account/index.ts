// steady — delete-account edge function.
// Uses the service-role key (server-side) to permanently delete an auth user.
// ON DELETE CASCADE on the steady_* tables (steady_profiles, steady_pins,
// steady_jar_days, steady_jar_logs, steady_timeline_entries, steady_timeline_zones,
// steady_timeline_images) removes that user's data rows too. The physical files in
// the steady-media bucket do NOT cascade, so they are removed explicitly below.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.112.3';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

const json = (obj, status, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });

/**
 * Remove a user's orphaned objects from the private `steady-media` bucket.
 * Objects live at {user_id}/{entry_id}/{uuid}{ext}. `storage.objects` rows are
 * removed by the auth-user cascade, but the physical files are not.
 */
async function deleteUserStorage(supabase, userId) {
  const bucket = supabase.storage.from('steady-media');
  const { data: entries } = await bucket.list(userId);
  if (!entries) return;
  const paths = [];
  for (const entry of entries) {
    if (entry.id === null) {
      // A folder: an entry_id directory. List and remove its files.
      const { data: files } = await bucket.list(`${userId}/${entry.name}`);
      if (files) {
        for (const file of files) paths.push(`${userId}/${entry.name}/${file.name}`);
      }
    } else {
      // A stray file directly under {user_id}.
      paths.push(`${userId}/${entry.name}`);
    }
  }
  if (paths.length) {
    await bucket.remove(paths);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!serviceRoleKey) {
    return json({ error: 'Service not configured' }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const token = authorization.replace('Bearer ', '');

    // Verify the caller's token and resolve their user id.
    const { data, error: verifyError } = await supabase.auth.getUser(token);
    if (verifyError || !data.user) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const { error: deleteError } = await supabase.auth.admin.deleteUser(data.user.id);
    if (deleteError) {
      return json({ error: 'Could not delete account' }, 500);
    }

    // Best-effort: clear the user's uploaded photos so the bucket doesn't leak
    // orphaned files. Failure here should not fail the deletion.
    await deleteUserStorage(supabase, data.user.id);

    return json({ ok: true }, 200);
  } catch (e) {
    return json({ error: 'Internal error' }, 500);
  }
});
