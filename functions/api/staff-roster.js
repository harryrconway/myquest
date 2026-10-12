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

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': ORIGIN,
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });

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

  // Look up staff record by email — identity derived from verified JWT only
  const staffRes = await fetch(
    `${SUPABASE_URL}/rest/v1/staff?email=eq.${encodeURIComponent(email)}&select=id,status&limit=1`,
    { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
  );
  if (!staffRes.ok) {
    const errText = await staffRes.text();
    console.error('staff lookup failed:', staffRes.status, errText);
    return json({ error: 'Staff lookup error' }, 500);
  }
  const staffRows = await staffRes.json();
  if (!Array.isArray(staffRows) || !staffRows.length) {
    return json({ error: 'No staff record found for this account' }, 403);
  }
  const staff = staffRows[0];
  if (staff.status === 'exited') return json({ error: 'Account deactivated' }, 403);

  // Return last 90 days + all future jobs for this staff member
  // Non-sensitive columns only — no pricing or HR data
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const jobsRes = await fetch(
    `${SUPABASE_URL}/rest/v1/jobs?assigned_staff_id=eq.${staff.id}&date=gte.${cutoffStr}&select=id,client_name,date,start_time,start_tz,type,status,site&order=date.asc`,
    { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
  );
  if (!jobsRes.ok) {
    const errText = await jobsRes.text();
    console.error('jobs query failed:', jobsRes.status, errText);
    return json({ error: 'Could not load roster' }, 500);
  }
  const jobs = await jobsRes.json();
  return json({ jobs: Array.isArray(jobs) ? jobs : [] });
}
