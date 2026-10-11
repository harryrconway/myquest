const OWNER_EMAILS = ['harryrconway@icloud.com', 'hello@myquest.au'];
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SVC_KEY = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = env.RESEND_API_KEY;

  // Verify JWT and check owner
  const authHeader = request.headers.get('Authorization') || '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SVC_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized' }, 401);
  const { email: callerEmail } = await userRes.json();
  if (!OWNER_EMAILS.includes(callerEmail)) return json({ error: 'Forbidden' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const { staffId } = body;
  if (!staffId) return json({ error: 'Missing staffId' }, 400);

  // Fetch staff record
  const staffRes = await fetch(`${SUPABASE_URL}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}&select=id,email,name`, {
    headers: { 'Authorization': `Bearer ${SVC_KEY}`, 'apikey': SVC_KEY },
  });
  if (!staffRes.ok) return json({ error: 'Staff lookup failed' }, 500);
  const staffList = await staffRes.json();
  if (!staffList.length || !staffList[0].email) return json({ error: 'Staff not found' }, 404);
  const staff = staffList[0];

  // Create auth user if they don't exist yet (email_confirm skips the confirmation email)
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: staff.email, email_confirm: true }),
  });

  // Generate a magic link for the staff email
  const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'magiclink',
      email: staff.email,
      options: { redirect_to: 'https://myquest.au/crm/profile.html' },
    }),
  });
  if (!linkRes.ok) {
    const err = await linkRes.text();
    console.error('generate_link error:', err);
    return json({ error: 'Could not generate invite link' }, 500);
  }
  const { action_link: magicLink } = await linkRes.json();

  // Send invite email via Resend
  const firstName = (staff.name || '').split(' ')[0] || 'there';
  const emailHtml = `
    <div style="font-family:Inter,system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#1a1a1a">
      <p style="margin:0 0 16px">Hi ${firstName},</p>
      <p style="margin:0 0 24px">You've been invited to the MyQuest staff portal. Click below to sign in.</p>
      <a href="${magicLink}" style="display:inline-block;background:#0a1628;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px">Access MyQuest</a>
      <p style="margin:24px 0 0;font-size:12px;color:#888">This link expires in 24 hours. If you weren't expecting this, you can ignore it.</p>
    </div>
  `;

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'MyQuest <hello@myquest.au>',
      to: [staff.email],
      subject: 'Your MyQuest staff portal access',
      html: emailHtml,
    }),
  });
  if (!sendRes.ok) {
    const err = await sendRes.text();
    console.error('Resend error:', err);
    return json({ error: 'Could not send email' }, 500);
  }

  // Stamp invited_at
  await fetch(`${SUPABASE_URL}/rest/v1/staff?id=eq.${encodeURIComponent(staffId)}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({ invited_at: new Date().toISOString() }),
  });

  return json({ success: true });
}
