/* POST /api/send-invite — send a set-password invite email to an onboarding staff member */
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
    const RESEND_KEY = env.RESEND_API_KEY;
    if (!URL_BASE || !SVC_KEY) return json({ error: 'Server configuration error.' }, 500);

    const callerJwt = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
    if (!callerJwt) return json({ error: 'Unauthorised.' }, 401);

    const userRes = await fetch(`${URL_BASE}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': SVC_KEY },
    });
    if (!userRes.ok) return json({ error: 'Unauthorised.' }, 401);
    const caller = await userRes.json();

    const profileRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${caller.id}&select=role`, {
      headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
    });
    if (!profileRes.ok) return json({ error: 'Could not verify permissions.' }, 500);
    const callerProfiles = await profileRes.json();
    if (!Array.isArray(callerProfiles) || !callerProfiles.length || callerProfiles[0].role !== 'owner') {
      return json({ error: 'Only owners can send invitations.' }, 403);
    }

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
    const { userId } = body;
    if (!userId) return json({ error: 'userId is required.' }, 400);

    // Fetch the staff member's profile
    const staffRes = await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${userId}&select=id,name,email,status`, {
      headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
    });
    if (!staffRes.ok) return json({ error: 'Could not look up staff member.' }, 500);
    const staffProfiles = await staffRes.json();
    if (!Array.isArray(staffProfiles) || !staffProfiles.length) return json({ error: 'Staff member not found.' }, 404);
    const staff = staffProfiles[0];

    if (!staff.email) return json({ error: 'Staff member has no email address on record.' }, 400);

    // Generate a password-recovery link (lets them set their password for the first time)
    const linkRes = await fetch(`${URL_BASE}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SVC_KEY}`,
        'apikey': SVC_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'recovery',
        email: staff.email,
        redirect_to: 'https://myquest.au/set-password.html',
      }),
    });

    if (!linkRes.ok) {
      const linkErr = await linkRes.json().catch(() => ({}));
      return json({ error: linkErr.msg || linkErr.message || 'Could not generate invite link. Please try again.' }, 500);
    }

    const linkData = await linkRes.json();
    const actionLink = linkData.action_link || linkData.properties?.action_link;
    if (!actionLink) return json({ error: 'No invite link returned from auth service.' }, 500);

    // Send email via Resend
    if (RESEND_KEY) {
      const firstName = (staff.name || 'there').split(' ')[0];
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'MyQuest <noreply@myquest.au>',
          to: [staff.email],
          subject: "You've been invited to MyQuest",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
              <h2 style="font-size:22px;font-weight:800;color:#000;margin:0 0 8px;">Welcome to MyQuest</h2>
              <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
                Hi ${firstName}, you've been added to the team. Click the button below to set your password and get started.
              </p>
              <a href="${actionLink}" style="display:inline-block;background:#000;color:#fff;font-size:14px;font-weight:700;padding:12px 24px;border-radius:10px;text-decoration:none;">
                Set my password
              </a>
              <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;line-height:1.5;">
                This link expires in 24 hours. If you weren't expecting this, you can ignore this email.
              </p>
            </div>
          `,
        }),
      }).catch(() => {});
    }

    // Update invited_at on the profile
    await fetch(`${URL_BASE}/rest/v1/profiles?id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SVC_KEY}`,
        'apikey': SVC_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ invited_at: new Date().toISOString() }),
    }).catch(() => {});

    return json({ success: true, message: 'Invite sent to ' + staff.email });
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
