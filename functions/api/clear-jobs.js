/* POST /api/clear-jobs — owner auth required */
const ORIGIN = 'https://myquest.au';
const VALID_TARGETS = ['unscheduled', 'scheduled', 'completed', 'archived', 'all'];

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPABASE_URL_BASE = env.SUPABASE_URL;
  const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  // Verify caller JWT
  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace(/^Bearer\s+/, '');
  if (!callerJwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': env.SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  // Must be owner
  const profileRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const profiles = await profileRes.json();
  const role = profiles && profiles[0] && profiles[0].role;
  if (role !== 'owner') return json({ error: 'Forbidden. Owner access required.' }, 403);

  // Parse body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { target } = body;
  if (!target || !VALID_TARGETS.includes(target)) {
    return json({ error: 'Invalid target. Must be one of: ' + VALID_TARGETS.join(', ') }, 400);
  }

  const statuses = target === 'all'
    ? ['unscheduled', 'scheduled', 'completed', 'archived']
    : [target];

  try {
    // Delete all matching quote_requests rows
    const responses = await Promise.all(statuses.map(function (status) {
      return fetch(`${SUPABASE_URL_BASE}/rest/v1/quote_requests?status=eq.${status}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
          'Prefer': 'return=minimal',
        },
      });
    }));

    const failed = responses.filter(function (r) { return !r.ok; });
    if (failed.length) {
      const detail = await Promise.all(failed.map(function (r) { return r.text(); }));
      console.error('clear-jobs delete failed:', detail.join(' | '));
      return json({ error: 'Delete failed. Please try again.' }, 500);
    }

    // For 'all', also delete every staff/manager profile (and their auth user)
    // The calling owner's own profile is preserved.
    if (target === 'all') {
      const staffRes = await fetch(
        `${SUPABASE_URL_BASE}/rest/v1/profiles?id=neq.${user.id}&select=id`,
        { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
      );
      if (staffRes.ok) {
        const staffProfiles = await staffRes.json().catch(() => []);
        if (Array.isArray(staffProfiles) && staffProfiles.length > 0) {
          // Delete auth users first (ignore individual failures — orphans are tolerable)
          await Promise.all(staffProfiles.map(function (p) {
            return fetch(`${SUPABASE_URL_BASE}/auth/v1/admin/users/${p.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY },
            }).catch(() => {});
          }));

          // Delete all non-owner profile rows in one request
          const ids = staffProfiles.map(function (p) { return p.id; }).join(',');
          await fetch(`${SUPABASE_URL_BASE}/rest/v1/profiles?id=in.(${ids})`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${SERVICE_KEY}`,
              'apikey': SERVICE_KEY,
              'Prefer': 'return=minimal',
            },
          });
        }
      }
    }

    return json({ success: true });
  } catch (err) {
    return json({ error: 'Delete failed: ' + err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
