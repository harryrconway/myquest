/* POST /api/ensure-storage — creates the staff-documents bucket if it doesn't exist */
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

  try {
    const res = await fetch(`${URL_BASE}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SVC_KEY}`,
        'apikey': SVC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ id: 'staff-documents', name: 'staff-documents', public: false }),
    });

    if (res.ok) return json({ ok: true });

    const data = await res.json().catch(() => ({}));
    const msg  = (data.message || data.error || '').toLowerCase();
    if (msg.includes('already exists') || msg.includes('duplicate') || res.status === 409) {
      return json({ ok: true });
    }
    return json({ error: data.message || 'Could not create storage bucket.' }, 500);
  } catch (e) {
    return json({ error: e.message || 'Request failed.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
