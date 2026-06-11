/* POST /api/save-checklist — any authenticated user (staff need this to tick off items) */
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

export async function onRequestPost({ request, env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;

  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace(/^Bearer\s+/, '');
  if (!callerJwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': env.SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400); }

  const { jobId, checklist } = body;
  if (!jobId || !Array.isArray(checklist)) return json({ error: 'jobId and checklist are required.' }, 400);

  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${jobId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': SERVICE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ checklist, updated_at: new Date().toISOString() }),
  });

  if (!patchRes.ok) return json({ error: 'Failed to save checklist.' }, 500);
  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
