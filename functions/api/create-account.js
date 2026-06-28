/* POST /api/create-account — create a new staff account (no invite email sent) */
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
  try {
    const { request, env } = context;
    const URL_BASE   = env.SUPABASE_URL;
    const SVC_KEY    = env.SUPABASE_SERVICE_KEY;
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
    if (!profileRes.ok) return json({ error: 'Could not verify account permissions (' + profileRes.status + ').' }, 500);
    const profiles = await profileRes.json();
    if (!Array.isArray(profiles) || !profiles.length || profiles[0].role !== 'owner') {
      return json({ error: 'Only owners can create accounts.' }, 403);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
    const { email, name, role, cleaning_level, phone, start_date, colour } = body;
    if (!email || !name || !role) return json({ error: 'email, name and role are required.' }, 400);
    if (!['owner', 'manager', 'staff', 'junior-cleaner', 'mid-cleaner', 'senior-cleaner'].includes(role)) return json({ error: 'Invalid role.' }, 400);

    // Check if a profile already exists for this email
    const existingProfRes = await fetch(
      `${URL_BASE}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`,
      { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
    );
    const existingProfiles = await existingProfRes.json().catch(() => []);
    if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
      return json({ error: 'A user with this email already has an active account.' }, 400);
    }

    // Create auth user without sending an email (admin API)
    // email_confirm: true so the user is in a confirmed state — a recovery link
    // can be sent later via /api/send-invite when the owner is ready to invite them.
    const randomPassword = crypto.randomUUID() + crypto.randomUUID();
    const createRes = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SVC_KEY}`,
        'apikey': SVC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { name, role, cleaning_level: Number(cleaning_level) || 1 },
      }),
    });

    if (!createRes.ok) {
      const errBody = await createRes.json().catch(() => ({}));
      const raw = (errBody.msg || errBody.message || errBody.error_description || '').toLowerCase();

      if (raw.includes('already registered') || raw.includes('already been registered')) {
        // Auth entry exists but no profile row — orphaned. Find and delete the auth user.
        let orphanId = null;
        for (const url of [
          `${URL_BASE}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=50`,
          `${URL_BASE}/auth/v1/admin/users?page=1&per_page=1000`,
        ]) {
          const listRes = await fetch(url, {
            headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
          });
          if (!listRes.ok) continue;
          const listData = await listRes.json().catch(() => ({}));
          const users = Array.isArray(listData) ? listData : (Array.isArray(listData.users) ? listData.users : []);
          const orphan = users.find(u => u.email === email);
          if (orphan) { orphanId = orphan.id; break; }
        }

        if (!orphanId) return json({ error: 'This email is already registered and could not be automatically cleared. Please contact support.' }, 400);

        const delRes = await fetch(`${URL_BASE}/auth/v1/admin/users/${orphanId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
        });
        if (!delRes.ok) return json({ error: 'Failed to clear the previous registration for this email. Please try again.' }, 400);

        // Retry
        const retryRes = await fetch(`${URL_BASE}/auth/v1/admin/users`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: randomPassword, email_confirm: true, user_metadata: { name, role } }),
        });
        if (!retryRes.ok) {
          const retryErr = await retryRes.json().catch(() => ({}));
          return json({ error: retryErr.msg || retryErr.message || 'Failed to create account after cleanup. Please try again.' }, 400);
        }
        const retried = await retryRes.json().catch(() => ({}));
        if (retried.id) {
          await createProfileRow(URL_BASE, SVC_KEY, retried.id, email, name, role, cleaning_level, phone, start_date, colour);
        }
        return json({ success: true, id: retried.id || null });
      }

      return json({ error: errBody.msg || errBody.message || 'Failed to create account. Please try again.' }, 400);
    }

    const created = await createRes.json().catch(() => ({}));
    if (created.id) {
      await createProfileRow(URL_BASE, SVC_KEY, created.id, email, name, role, cleaning_level, phone, start_date, colour);
    }

    return json({ success: true, id: created.id || null });
  } catch (e) {
    return json({ error: 'Internal error: ' + (e.message || String(e)) }, 500);
  }
}

async function createProfileRow(URL_BASE, SVC_KEY, userId, email, name, role, cleaning_level, phone, start_date, colour) {
  const profileData = {
    id:             userId,
    email:          email,
    name:           name,
    role:           role,
    cleaning_level: Number(cleaning_level) || 1,
    status:         'onboarding',
  };
  if (phone)      profileData.phone      = String(phone).trim().slice(0, 30) || null;
  if (start_date) profileData.start_date = String(start_date).slice(0, 10);
  if (colour)     profileData.colour     = String(colour).trim().slice(0, 20);

  await fetch(`${URL_BASE}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(profileData),
  }).catch(() => {});
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
