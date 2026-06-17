/* GET /api/job-reminder?secret=... — alerts admin when unscheduled job approaches 2-hr response window */
export async function onRequestGet({ request, env }) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!secret || secret !== env.REMINDER_SECRET) {
    return json({ error: 'Forbidden.' }, 403);
  }

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY   = env.RESEND_API_KEY;
  const ADMIN_EMAIL  = env.ADMIN_EMAIL || 'hello@myquest.au';

  if (!RESEND_KEY) return json({ error: 'RESEND_API_KEY not configured.' }, 500);

  // Jobs older than 90 minutes that haven't had a reminder sent yet
  const cutoff = new Date(Date.now() - 90 * 60 * 1000).toISOString();

  const jobRes = await fetch(
    `${SUPABASE_URL}/rest/v1/quote_requests` +
    `?status=eq.unscheduled&schedule_reminder_sent=not.is.true&created_at=lte.${cutoff}` +
    `&select=id,full_name,phone,email,suburb,services,created_at`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );

  const jobs = await jobRes.json().catch(() => []);
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return json({ sent: 0 }, 200);
  }

  let sent = 0;
  for (const job of jobs) {
    const firstName  = (job.full_name || '').split(' ')[0] || job.full_name || 'Customer';
    const services   = Array.isArray(job.services) && job.services.length
      ? job.services.join(', ')
      : 'Cleaning service';
    const receivedAt = job.created_at
      ? new Date(job.created_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
      : 'Unknown';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [ADMIN_EMAIL],
        subject: `⏰ 30 min left to schedule — ${esc(job.full_name)}${job.suburb ? ' · ' + esc(job.suburb) : ''}`,
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

      <!-- Header -->
      <tr>
        <td style="background:#FFD400;padding:24px 32px;">
          <table cellpadding="0" cellspacing="0"><tr><td>
            <svg width="110" height="28" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="#000"/>
              <path d="M20 2 C20 2 22 16 14 22" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
              <text x="28" y="25" font-family="Arial,sans-serif" font-weight="700" font-size="18" fill="#000">MyQuest</text>
            </svg>
          </td></tr></table>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td style="padding:32px 32px 28px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(0,0,0,0.4);">Action Required</p>
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#000;letter-spacing:-0.3px;">30 minutes left to schedule</h1>
          <p style="margin:0 0 24px;font-size:15px;color:rgba(0,0,0,0.6);line-height:1.6;">
            Hey Harry — this job came in 90 minutes ago and hasn't been scheduled yet.
            You have <strong style="color:#000;">30 minutes</strong> before the 2-hour response window closes.
          </p>

          <!-- Job details -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;border-radius:10px;padding:20px 24px;margin:0 0 24px;">
            <tr>
              <td style="padding:5px 0;font-size:13px;color:rgba(0,0,0,0.45);width:90px;vertical-align:top;">Customer</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#000;">${esc(job.full_name)}</td>
            </tr>
            ${job.phone ? `<tr>
              <td style="padding:5px 0;font-size:13px;color:rgba(0,0,0,0.45);vertical-align:top;">Phone</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#000;"><a href="tel:${esc(job.phone)}" style="color:#000;text-decoration:none;">${esc(job.phone)}</a></td>
            </tr>` : ''}
            ${job.suburb ? `<tr>
              <td style="padding:5px 0;font-size:13px;color:rgba(0,0,0,0.45);vertical-align:top;">Suburb</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#000;">${esc(job.suburb)}</td>
            </tr>` : ''}
            <tr>
              <td style="padding:5px 0;font-size:13px;color:rgba(0,0,0,0.45);vertical-align:top;">Services</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#000;">${esc(services)}</td>
            </tr>
            <tr>
              <td style="padding:5px 0;font-size:13px;color:rgba(0,0,0,0.45);vertical-align:top;">Received</td>
              <td style="padding:5px 0;font-size:13px;font-weight:700;color:#000;">${esc(receivedAt)}</td>
            </tr>
          </table>

          <p style="text-align:center;margin:0 0 24px;">
            <a href="https://myquest.au/dashboard/unscheduled-jobs.html"
               style="display:inline-block;background:#FFD400;color:#000;padding:13px 32px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.01em;">
              View Unscheduled Jobs →
            </a>
          </p>

          <p style="margin:0;font-size:12px;color:rgba(0,0,0,0.35);text-align:center;">
            MyQuest · <a href="mailto:hello@myquest.au" style="color:rgba(0,0,0,0.35);text-decoration:none;">hello@myquest.au</a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body></html>`,
      }),
    }).catch(() => null);

    if (emailRes && emailRes.ok) {
      // Mark reminder as sent so we don't fire again for this job
      await fetch(
        `${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${job.id}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${SERVICE_KEY}`,
            'apikey': SERVICE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ schedule_reminder_sent: true }),
        }
      ).catch(() => {});
      sent++;
    }
  }

  return json({ sent, total: jobs.length }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
