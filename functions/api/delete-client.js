/* POST /api/delete-client — permanently delete a client record */
const ORIGIN = 'https://myquest.au';

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
  const role = profiles[0] && profiles[0].role;
  if (!['owner', 'manager'].includes(role)) return json({ error: 'Only owners and managers can delete clients.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { clientId } = body;
  if (!clientId) return json({ error: 'clientId is required.' }, 400);

  // Delink any jobs that reference this client before deleting
  await fetch(`${URL_BASE}/rest/v1/quote_requests?client_id=eq.${clientId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify({ client_id: null }),
  });

  const delRes = await fetch(`${URL_BASE}/rest/v1/clients?id=eq.${clientId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Prefer': 'return=minimal' },
  });
  if (!delRes.ok) return json({ error: 'Failed to delete client.' }, 500);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
