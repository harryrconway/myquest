/* POST /api/reset-password — send password reset email via Supabase */
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
  if (!profiles.length || profiles[0].role !== 'owner') return json({ error: 'Only owners can reset passwords.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { email } = body;
  if (!email) return json({ error: 'email is required.' }, 400);

  const resetRes = await fetch(
    `${URL_BASE}/auth/v1/recover?redirect_to=${encodeURIComponent('https://myquest.au/set-password.html')}`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }
  );
  if (!resetRes.ok) {
    const err = await resetRes.json().catch(() => ({}));
    return json({ error: err.msg || err.message || 'Failed to send reset email.' }, 500);
  }
  return json({ success: true, message: 'Password reset email sent to ' + email });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
