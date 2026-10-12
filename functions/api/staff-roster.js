const ORIGIN = 'https://myquest.au';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': ORIGIN,
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestGet({ request, env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SVC_KEY = env.SUPABASE_SERVICE_KEY;

  // Verify JWT
  const authHeader = request.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SVC_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized' }, 401);
  const { email } = await userRes.json();
  if (!email) return json({ error: 'Unauthorized' }, 401);

  // Look up staff record — derive identity from verified JWT, never from request body
  const staffRes = await fetch(
    `${SUPABASE_URL}/rest/v1/staff?email=eq.${encodeURIComponent(email)}&select=id,status`,
    { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
  );
  const staffRows = await staffRes.json();
  if (!Array.isArray(staffRows) || !staffRows.length) return json({ error: 'Forbidden' }, 403);
  const staff = staffRows[0];
  if (staff.status === 'exited') return json({ error: 'Forbidden' }, 403);

  // Return last 90 days + all future jobs assigned to this staff member
  // Only expose non-sensitive columns — no pricing or HR data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const jobsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/jobs?assigned_staff_id=eq.${encodeURIComponent(staff.id)}&date=gte.${cutoffStr}&select=id,client_name,date,start_time,start_tz,type,status,site&order=date.asc`,
    { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
  );
  if (!jobsRes.ok) {
    console.error('jobs query failed:', jobsRes.status, await jobsRes.text());
    return json({ error: 'Could not load roster' }, 500);
  }
  const jobs = await jobsRes.json();
  return json({ jobs: Array.isArray(jobs) ? jobs : [] });
}
