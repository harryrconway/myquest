/* POST /api/complete-job — manager+ auth required */
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
  const RESEND_KEY  = env.RESEND_API_KEY;

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
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const profiles = await profileRes.json();
  const role = profiles && profiles[0] && profiles[0].role;
  if (role !== 'manager' && role !== 'owner') return json({ error: 'Forbidden.' }, 403);

  // Body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { jobId } = body;
  if (!jobId) return json({ error: 'jobId is required.' }, 400);

  // Fetch job
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=full_name,email,services`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const jobs = await jobRes.json();
  if (!jobs || !jobs[0]) return json({ error: 'Job not found.' }, 404);
  const job = jobs[0];

  // Update Supabase
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
        status:            'completed',
        job_completed_at:  new Date().toISOString(),
        updated_at:        new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) return json({ error: 'Failed to update job.' }, 500);

  // Send thank-you email to customer
  if (RESEND_KEY && job.email) {
    const services = job.services && job.services.length ? job.services.join(', ') : 'cleaning service';

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [job.email],
        subject: 'Thanks for choosing MyQuest — we hope you love the result',
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#2d6a4f;padding:28px 36px;">
    <svg width="120" height="30" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="white"/>
      <path d="M20 2 C20 2 22 16 14 22" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <text x="28" y="25" font-family="'Plus Jakarta Sans',sans-serif" font-weight="700" font-size="18" fill="white">MyQuest</text>
    </svg>
  </div>
  <div style="background:#fff;padding:36px;">
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">Thanks, ${job.full_name}!</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;">We've just completed your ${services}. We hope everything is looking spotless — it was a pleasure working for you.</p>
    <div style="background:#f0fdf4;border-radius:8px;padding:20px;margin:0 0 24px;text-align:center;">
      <p style="font-size:15px;color:#166534;font-weight:600;margin:0 0 8px;">Happy with the result?</p>
      <p style="font-size:14px;color:#4b5563;margin:0 0 16px;">A quick review helps other homeowners find trustworthy cleaners.</p>
      <a href="https://g.page/r/review" style="background:#2d6a4f;color:white;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">Leave a Review</a>
    </div>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 8px;">Need us again? Booking is easy:</p>
    <p style="margin:0 0 24px;"><a href="https://myquest.au" style="color:#2d6a4f;font-weight:700;font-size:15px;">myquest.au</a> &nbsp;or&nbsp; <a href="tel:+61497828838" style="color:#2d6a4f;font-weight:700;font-size:15px;">0497 828 838</a></p>
    <p style="color:#6b7280;font-size:14px;margin:0;">Thanks again,<br>The MyQuest Team</p>
  </div>
</div>
</body></html>`,
      }),
    }).catch(() => {});
  }

  return json({ success: true }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
