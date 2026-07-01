/* POST /api/training-complete — any authenticated staff member */
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
  const { request, env, waitUntil } = context;
  const SUPABASE_URL_BASE = env.SUPABASE_URL;
  const ANON_KEY  = env.SUPABASE_ANON_KEY;
  const SVC_KEY   = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = env.RESEND_API_KEY;

  // Auth — any authenticated staff member
  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace(/^Bearer\s+/, '');
  if (!callerJwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': ANON_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  // Fetch staff name
  const profileRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=name,email`,
    { headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': ANON_KEY } }
  );
  const profiles = profileRes.ok ? await profileRes.json() : [];
  const profile  = profiles && profiles[0];
  const staffName = (profile && profile.name) || (profile && profile.email) || 'A staff member';

  // Send email to admin
  if (RESEND_KEY) {
    const now = new Date().toLocaleDateString('en-AU', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit', timeZone: 'Australia/Brisbane',
    });
    waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <cleaning@myquest.au>',
        to:      ['cleaning@myquest.au'],
        subject: `Training Completed — ${staffName}`,
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#FFD400;padding:28px 36px;">
    <svg width="120" height="30" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="#000"/>
      <path d="M20 2 C20 2 22 16 14 22" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <text x="28" y="25" font-family="'Plus Jakarta Sans',sans-serif" font-weight="700" font-size="18" fill="#000">MyQuest</text>
    </svg>
  </div>
  <div style="background:#fff;padding:36px;">
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">Training Completed</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;"><strong style="color:#111827;">${staffName}</strong> has marked their training as complete.</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
      <p style="margin:0;font-size:14px;color:#166534;"><strong>Completed:</strong> ${now}</p>
    </div>
    <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Log into the MyQuest dashboard to review their profile.</p>
    <p style="text-align:center;margin:0;"><a href="https://myquest.au/dashboard" style="display:inline-block;background:#FFD400;color:#000;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Open Dashboard →</a></p>
  </div>
</div>
</body></html>`,
      }),
    }).catch(() => {}));
  }

  return json({ ok: true }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
