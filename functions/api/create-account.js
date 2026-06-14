/* POST /api/create-account — invite a new staff member via Supabase */
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
    const { email, name, role, cleaning_level } = body;
    if (!email || !name || !role) return json({ error: 'email, name and role are required.' }, 400);
    if (!['owner', 'manager', 'staff'].includes(role)) return json({ error: 'Invalid role.' }, 400);

    const invitePayload = JSON.stringify({
      email,
      data: { name, role, cleaning_level: Number(cleaning_level) || 1 },
      redirect_to: 'https://myquest.au/set-password.html',
    });
    const inviteHeaders = {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
    };

    async function attemptInvite() {
      return fetch(`${URL_BASE}/auth/v1/invite`, {
        method: 'POST', headers: inviteHeaders, body: invitePayload,
      });
    }

    let inviteRes = await attemptInvite();

    if (!inviteRes.ok) {
      const errBody = await inviteRes.json().catch(() => ({}));
      const raw = (errBody.msg || errBody.message || errBody.error_description || '').toLowerCase();

      if (raw.includes('already registered')) {
        // The email exists in auth.users. Check whether a profiles row also exists.
        // If no profile exists the auth user is orphaned (deleted profile but auth entry
        // survived) — clean it up and retry the invite automatically.
        const profCheckRes = await fetch(
          `${URL_BASE}/rest/v1/profiles?email=eq.${encodeURIComponent(email)}&select=id`,
          { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY } }
        );
        const existingProfiles = await profCheckRes.json().catch(() => []);

        if (Array.isArray(existingProfiles) && existingProfiles.length > 0) {
          return json({ error: 'A user with this email already has an active account.' }, 400);
        }

        // No profile — orphaned auth entry. Find the auth user by email and delete it.
        // Try filter param first; fall back to fetching a large page and searching manually.
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
          // GoTrue returns either an array or { users: [...] } depending on version
          const users = Array.isArray(listData) ? listData : (Array.isArray(listData.users) ? listData.users : []);
          const orphan = users.find(u => u.email === email);
          if (orphan) { orphanId = orphan.id; break; }
        }

        if (!orphanId) {
          return json({ error: 'This email is already registered and could not be automatically cleared. Please contact support.' }, 400);
        }

        const delRes = await fetch(`${URL_BASE}/auth/v1/admin/users/${orphanId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
        });
        if (!delRes.ok) {
          return json({ error: 'Failed to clear the previous registration for this email. Please try again.' }, 400);
        }

        // Retry the invite now that the orphan is cleared
        inviteRes = await attemptInvite();
        if (!inviteRes.ok) {
          const retryErr = await inviteRes.json().catch(() => ({}));
          return json({ error: retryErr.msg || retryErr.message || 'Failed to send invitation after cleanup. Please try again.' }, 400);
        }

      } else {
        let msg = 'Failed to send invitation. Please try again.';
        if (raw.includes('rate limit')) msg = 'Email rate limit reached. Wait a few minutes and try again.';
        else if (errBody.msg || errBody.message) msg = errBody.msg || errBody.message;
        return json({ error: msg }, 400);
      }
    }

    // Upsert the profile row — the invite creates an auth.users entry but there is no
    // database trigger to create a profiles row, so we must INSERT it here.
    const invited = await inviteRes.json().catch(() => ({}));
    if (invited.id) {
      await fetch(`${URL_BASE}/rest/v1/profiles`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SVC_KEY}`,
          'apikey': SVC_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates,return=minimal',
        },
        body: JSON.stringify({
          id:             invited.id,
          email:          email,
          name:           name,
          role:           role,
          cleaning_level: Number(cleaning_level) || 1,
          status:         'invited',
        }),
      }).catch(() => {});
    }

    return json({ success: true, id: invited.id || null, message: 'Invitation sent to ' + email });
  } catch (e) {
    return json({ error: 'Internal error: ' + (e.message || String(e)) }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
