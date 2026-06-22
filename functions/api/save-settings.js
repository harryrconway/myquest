/* POST /api/save-settings — upsert a company_settings key (owner only) */
export async function onRequestPost(context) {
  const { request, env } = context;
  const URL_BASE = env.SUPABASE_URL;
  const SVC_KEY  = env.SUPABASE_SERVICE_KEY;
  if (!URL_BASE || !SVC_KEY) return json({ error: 'Server configuration error.' }, 500);

  const callerJwt = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!callerJwt) return json({ error: 'Unauthorised.' }, 401);

  const userRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': SVC_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorised.' }, 401);
  const user = await userRes.json();

  const profileRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
  });
  const profiles = await profileRes.json();
  const callerRole = profiles && profiles[0] && profiles[0].role;
  if (callerRole !== 'owner') return json({ error: 'Insufficient permissions.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { key, value } = body;
  if (!key || typeof key !== 'string') return json({ error: 'key is required.' }, 400);
  if (value === undefined) return json({ error: 'value is required.' }, 400);

  const ALLOWED_KEYS = ['rates', 'checklist_template', 'message_of_week'];
  if (!ALLOWED_KEYS.includes(key)) return json({ error: 'Invalid settings key.' }, 400);

  const upsertRes = await fetch(`${URL_BASE}/rest/v1/company_settings`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify({ key, value, updated_at: new Date().toISOString() }),
  });
  if (!upsertRes.ok) {
    const detail = await upsertRes.text();
    return json({ error: 'Failed to save settings: ' + detail }, 500);
  }
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
