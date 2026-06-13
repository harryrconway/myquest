/* POST /api/update-profile — update role, status or cleaning_level */
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
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': (env.SUPABASE_ANON_KEY || SVC_KEY) },
  });
  if (!profileRes.ok) return json({ error: 'Profile lookup failed (' + profileRes.status + ').' }, 500);
  const profiles = await profileRes.json();
  const callerRole = profiles && profiles[0] && profiles[0].role;
  if (!['owner', 'manager'].includes(callerRole)) return json({ error: 'Insufficient permissions.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { userId, role, cleaning_level, status, phone, colour, name } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);

  const updates = {};
  // Any manager or owner can update name, phone and colour
  if (name   !== undefined) updates.name   = String(name   || '').trim().slice(0, 100) || null;
  if (phone  !== undefined) updates.phone  = String(phone  || '').trim().slice(0, 30)  || null;
  if (colour !== undefined) updates.colour = String(colour || '').trim().slice(0, 20);
  // Only owners can change role, level, or account status
  if (callerRole === 'owner') {
    if (role !== undefined) {
      if (!['owner','manager','staff'].includes(role)) return json({ error: 'Invalid role.' }, 400);
      updates.role = role;
    }
    if (cleaning_level !== undefined) updates.cleaning_level = Number(cleaning_level) || 1;
    if (status !== undefined) {
      if (!['active','suspended'].includes(status)) return json({ error: 'Invalid status.' }, 400);
      updates.status = status;
    }
  }
  if (!Object.keys(updates).length) return json({ error: 'No fields to update.' }, 400);

  const patchRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(updates),
  });
  if (!patchRes.ok) return json({ error: 'Failed to update profile.' }, 500);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
