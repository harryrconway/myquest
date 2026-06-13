/* POST /api/delete-account — permanently delete a user */
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
  if (!profiles.length || profiles[0].role !== 'owner') return json({ error: 'Only owners can delete accounts.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { userId } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);
  if (userId === user.id) return json({ error: 'You cannot delete your own account.' }, 400);

  // Delete profile row first (auth delete may not cascade depending on DB setup)
  await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Prefer': 'return=minimal' },
  });

  const delRes = await fetch(`${URL_BASE}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
  });
  if (!delRes.ok) return json({ error: 'Failed to delete account.' }, 500);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
