/* POST /api/update-profile — update profile fields including onboarding data */
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

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const {
    userId, role, cleaning_level, status, phone, colour, name,
    // Onboarding fields — any authenticated user can update their own profile
    mobile, date_of_birth, residential_address,
    emergency_contact_name, emergency_contact_number, emergency_relation,
    profile_photo_url, police_check_url, drivers_licence_url,
    vehicle_make, vehicle_model, vehicle_registration, right_to_work_url,
    availability, employment_agreement_signed_at, privacy_policy_signed_at,
    company_policy_signed_at, onboarding_complete,
  } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);

  // Allow staff to update their own onboarding data; managers/owners can update others
  const isSelf = userId === user.id;
  if (!isSelf && !['owner', 'manager'].includes(callerRole)) {
    return json({ error: 'Insufficient permissions.' }, 403);
  }

  const updates = {};
  // Any manager or owner can update name, phone and colour
  if (name   !== undefined) updates.name   = String(name   || '').trim().slice(0, 100) || null;
  if (phone  !== undefined) updates.phone  = String(phone  || '').trim().slice(0, 30)  || null;
  if (colour !== undefined) updates.colour = String(colour || '').trim().slice(0, 20);

  // Onboarding fields (self or manager+)
  const textField = (v, max) => v !== undefined ? (String(v || '').trim().slice(0, max) || null) : undefined;
  if (mobile                    !== undefined) updates.mobile                    = textField(mobile, 30);
  if (date_of_birth             !== undefined) updates.date_of_birth             = textField(date_of_birth, 10);
  if (residential_address       !== undefined) updates.residential_address       = textField(residential_address, 200);
  if (emergency_contact_name    !== undefined) updates.emergency_contact_name    = textField(emergency_contact_name, 100);
  if (emergency_contact_number  !== undefined) updates.emergency_contact_number  = textField(emergency_contact_number, 30);
  if (emergency_relation        !== undefined) updates.emergency_relation        = textField(emergency_relation, 50);
  if (profile_photo_url         !== undefined) updates.profile_photo_url         = textField(profile_photo_url, 500);
  if (police_check_url          !== undefined) updates.police_check_url          = textField(police_check_url, 500);
  if (drivers_licence_url       !== undefined) updates.drivers_licence_url       = textField(drivers_licence_url, 500);
  if (vehicle_make              !== undefined) updates.vehicle_make              = textField(vehicle_make, 50);
  if (vehicle_model             !== undefined) updates.vehicle_model             = textField(vehicle_model, 50);
  if (vehicle_registration      !== undefined) updates.vehicle_registration      = textField(vehicle_registration, 20);
  if (right_to_work_url         !== undefined) updates.right_to_work_url         = textField(right_to_work_url, 500);
  if (availability              !== undefined) updates.availability              = availability;
  if (employment_agreement_signed_at !== undefined) updates.employment_agreement_signed_at = employment_agreement_signed_at;
  if (privacy_policy_signed_at  !== undefined) updates.privacy_policy_signed_at  = privacy_policy_signed_at;
  if (company_policy_signed_at  !== undefined) updates.company_policy_signed_at  = company_policy_signed_at;
  if (onboarding_complete !== undefined) {
    updates.onboarding_complete = Boolean(onboarding_complete);
    // Auto-activate own account when onboarding completes (status update requires service role)
    if (Boolean(onboarding_complete) && isSelf) updates.status = 'active';
  }

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
