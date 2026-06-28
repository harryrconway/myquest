/* POST /api/get-staff-profile — return full profile for self or owner */
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
  if (!profileRes.ok) return json({ error: 'Profile lookup failed.' }, 500);
  const profiles = await profileRes.json();
  const callerRole = profiles && profiles[0] && profiles[0].role;

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { userId } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);

  const isSelf  = userId === user.id;
  const isOwner = callerRole === 'owner';
  if (!isSelf && !isOwner) return json({ error: 'Insufficient permissions.' }, 403);

  // Owners get full HR data; staff only get their own personal/contact fields
  const ownerFields = [
    'id', 'name', 'email', 'phone', 'mobile', 'role', 'status', 'colour',
    'cleaning_level', 'start_date', 'availability',
    'address', 'suburb', 'state', 'postcode', 'residential_address',
    'emergency_contact_name', 'emergency_contact_number', 'emergency_relation',
    'profile_photo_url', 'police_check_url', 'drivers_licence_url', 'right_to_work_url',
    'hr_notes', 'employment_agreement_url', 'employment_agreement_received_at',
    'onboarding_complete', 'employment_agreement_signed_at',
    'company_policy_signed_at', 'privacy_policy_signed_at',
    'invited_at',
  ];
  const selfFields = [
    'id', 'name', 'email', 'phone', 'mobile', 'role', 'status', 'colour',
    'profile_photo_url', 'address', 'suburb', 'state', 'postcode',
    'emergency_contact_name', 'emergency_contact_number', 'emergency_relation',
    'onboarding_complete',
  ];
  const fields = (isOwner ? ownerFields : selfFields).join(',');

  const targetRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${userId}&select=${fields}`, {
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
  });
  if (!targetRes.ok) return json({ error: 'Failed to fetch profile.' }, 500);
  const data = await targetRes.json();
  if (!data || !data[0]) return json({ error: 'Profile not found.' }, 404);

  return json({ profile: data[0] });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
