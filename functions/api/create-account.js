/* POST /api/create-account — invite a new staff member via Supabase */
export async function onRequestPost(context) {
  const { request, env } = context;
  const URL_BASE   = env.SUPABASE_URL;
  const SVC_KEY    = env.SUPABASE_SERVICE_KEY;
  if (!URL_BASE || !SVC_KEY) return json({ error: 'Server configuration error.' }, 500);

  const callerJwt = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!callerJwt) return json({ error: 'Unauthorised.' }, 401);

  // Verify caller is authenticated
  const userRes = await fetch(`${URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': SVC_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorised.' }, 401);
  const user = await userRes.json();

  // Check caller is owner
  const profileRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=role`, {
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
  });
  const profiles = await profileRes.json();
  if (!profiles.length || profiles[0].role !== 'owner') return json({ error: 'Only owners can create accounts.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { email, name, role, cleaning_level } = body;
  if (!email || !name || !role) return json({ error: 'email, name and role are required.' }, 400);
  if (!['owner','manager','staff'].includes(role)) return json({ error: 'Invalid role.' }, 400);

  // Send invite
  const inviteRes = await fetch(`${URL_BASE}/auth/v1/invite`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      data: { name, role, cleaning_level: Number(cleaning_level) || 1 },
      redirect_to: 'https://myquest.au/set-password.html',
    }),
  });
  if (!inviteRes.ok) {
    const err = await inviteRes.json().catch(() => ({}));
    const msg = (err.msg || '').includes('already registered') ? 'A user with this email already exists.' : 'Failed to send invitation. Please try again.';
    return json({ error: msg }, 400);
  }
  return json({ success: true, message: 'Invitation sent to ' + email });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
