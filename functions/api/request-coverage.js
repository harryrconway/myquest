/* POST /api/request-coverage — flag a job as needing a replacement
   Caller must be one of the job's assigned staff (self-service) or
   manager/owner (flagging on someone's behalf). */
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
  const SUPABASE_URL_BASE = env.SUPABASE_URL;
  const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  // Auth
  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace(/^Bearer\s+/, '');
  if (!callerJwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': env.SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  const profileRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': env.SUPABASE_ANON_KEY } }
  );
  if (!profileRes.ok) return json({ error: 'Profile lookup failed.' }, 500);
  const profiles = await profileRes.json();
  const role = profiles && profiles[0] && profiles[0].role;
  if (!role) return json({ error: 'No profile found.' }, 403);

  // Body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { jobId } = body;
  if (!jobId) return json({ error: 'jobId is required.' }, 400);

  // Fetch job
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=*`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  if (!jobRes.ok) return json({ error: 'Failed to fetch job.' }, 500);
  const jobs = await jobRes.json();
  if (!jobs || !jobs[0]) return json({ error: 'Job not found.' }, 404);
  const job = jobs[0];

  const isAssigned = Array.isArray(job.assigned_staff_ids) && job.assigned_staff_ids.includes(user.id);
  const isManager  = role === 'manager' || role === 'owner';
  if (!isAssigned && !isManager) {
    return json({ error: 'You are not assigned to this job.' }, 403);
  }
  if (job.needs_coverage) {
    return json({ error: 'This job already needs coverage.' }, 400);
  }
  if (job.status !== 'scheduled') {
    return json({ error: 'Only scheduled jobs can request coverage.' }, 400);
  }

  const updateRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        needs_coverage:        true,
        coverage_requested_by: isAssigned ? user.id : (job.assigned_staff_ids && job.assigned_staff_ids[0]) || null,
        coverage_requested_at: new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) return json({ error: 'Failed to update job.' }, 500);

  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
