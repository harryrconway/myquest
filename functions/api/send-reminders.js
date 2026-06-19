/* GET /api/send-reminders?secret=... — sends reminder emails for jobs scheduled tomorrow */
export async function onRequestGet({ request, env }) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!secret || secret !== env.REMINDER_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY   = env.RESEND_API_KEY;

  if (!RESEND_KEY) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  // Tomorrow's date in UTC (cron fires at 21:00 UTC = 07:00 AEST next day)
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  const jobRes = await fetch(
    `${SUPABASE_URL}/rest/v1/quote_requests?status=eq.scheduled&scheduled_date=eq.${tomorrowStr}` +
    `&select=id,full_name,email,service_type,scheduled_date,scheduled_time,street_address,suburb,state,postcode,services,property_type,bedrooms,bathrooms,extras,notes,assigned_staff_name,staff_count,recurrence,access_instructions`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );

  const jobs = await jobRes.json().catch(() => []);
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return new Response(JSON.stringify({ sent: 0, date: tomorrowStr }), { headers: { 'Content-Type': 'application/json' } });
  }

  let sent = 0;
  for (const job of jobs) {
    if (!job.email) continue;
    const dateLabel     = formatDate(job.scheduled_date);
    const timeLabel     = formatTime(job.scheduled_time);
    const addressLabel  = [job.street_address, job.suburb, job.state, job.postcode].filter(Boolean).join(', ');
    const servicesLabel = (job.services && job.services.length ? job.services.join(', ') : null) || job.service_type || null;
    const extrasLabel   = job.extras && job.extras.length ? job.extras.join(', ') : null;
    const propSummary   = [job.bedrooms ? job.bedrooms + ' bed' : '', job.bathrooms ? job.bathrooms + ' bath' : ''].filter(Boolean).join(' / ') || null;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [job.email],
        subject: `Reminder: Your clean is tomorrow — MyQuest`,
        html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f4f5f0;">
<div style="font-family:'Plus Jakarta Sans',Helvetica,Arial,sans-serif;max-width:560px;margin:32px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.09);">
  <div style="background:#FFD400;padding:32px 40px;">
    <svg width="120" height="30" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="#000"/>
      <path d="M20 2 C20 2 22 16 14 22" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <text x="28" y="25" font-family="sans-serif" font-weight="700" font-size="18" fill="#000">MyQuest</text>
    </svg>
    <p style="color:rgba(0,0,0,0.6);margin:14px 0 0;font-size:15px;font-weight:500;">Your clean is tomorrow!</p>
  </div>
  <div style="padding:36px 40px;">
    <h2 style="font-size:22px;font-weight:800;color:#0f172a;margin:0 0 10px;letter-spacing:-0.02em;">
      See you tomorrow, ${esc(job.full_name)}.
    </h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 24px;">
      Your MyQuest team is scheduled to arrive tomorrow. Here are your booking details:
    </p>
    <div style="background:#FFFDE7;border:1.5px solid #FFE566;border-radius:12px;padding:24px;margin:0 0 28px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:5px 0;color:#4b5563;width:80px;vertical-align:top;">Date</td>
          <td style="padding:5px 0;font-weight:700;color:#0f172a;">${dateLabel}</td>
        </tr>
        <tr>
          <td style="padding:5px 0;color:#4b5563;vertical-align:top;">Time</td>
          <td style="padding:5px 0;font-weight:700;color:#0f172a;">${timeLabel}</td>
        </tr>
        ${addressLabel ? `<tr><td style="padding:5px 0;color:#4b5563;vertical-align:top;">Address</td><td style="padding:5px 0;font-weight:700;color:#0f172a;">${esc(addressLabel)}</td></tr>` : ''}
        ${servicesLabel ? `<tr><td style="padding:5px 0;color:#4b5563;vertical-align:top;">Service</td><td style="padding:5px 0;font-weight:700;color:#0f172a;">${esc(servicesLabel)}</td></tr>` : ''}
        ${propSummary ? `<tr><td style="padding:5px 0;color:#4b5563;vertical-align:top;">Property</td><td style="padding:5px 0;font-weight:700;color:#0f172a;">${esc(propSummary)}</td></tr>` : ''}
        ${extrasLabel ? `<tr><td style="padding:5px 0;color:#4b5563;vertical-align:top;">Extras</td><td style="padding:5px 0;font-weight:700;color:#0f172a;">${esc(extrasLabel)}</td></tr>` : ''}
        ${job.assigned_staff_name ? `<tr><td style="padding:5px 0;color:#4b5563;vertical-align:top;">Cleaner</td><td style="padding:5px 0;font-weight:700;color:#0f172a;">${esc(job.assigned_staff_name)}</td></tr>` : ''}
      </table>
    </div>
    ${job.access_instructions ? `
    <div style="background:#fefce8;border:1.5px solid #fde68a;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;margin:0 0 6px;">Access Instructions</p>
      <p style="font-size:14px;color:#78350f;margin:0;line-height:1.6;">${esc(job.access_instructions)}</p>
    </div>` : ''}
    ${job.notes ? `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin:0 0 24px;">
      <p style="font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;color:#0369a1;margin:0 0 6px;">Notes</p>
      <p style="font-size:14px;color:#0369a1;margin:0;line-height:1.6;">${esc(job.notes)}</p>
    </div>` : ''}
    <p style="color:#6b7280;font-size:14px;line-height:1.7;margin:0 0 6px;">
      Questions or need to reschedule? Give us a call:
    </p>
    <p style="margin:0 0 28px;">
      <a href="tel:+61497828838" style="color:#FFD400;font-weight:700;font-size:16px;">0497 828 838</a>
    </p>
    <p style="color:#9ca3af;font-size:13px;margin:0;line-height:1.6;">
      See you tomorrow,<br>
      The MyQuest Team<br>
      <a href="https://myquest.au" style="color:#FFD400;">myquest.au</a>
    </p>
  </div>
</div>
</body></html>`,
      }),
    }).catch(() => null);

    if (res && res.ok) sent++;
  }

  return new Response(JSON.stringify({ sent, total: jobs.length, date: tomorrowStr }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-');
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
      .toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(t) {
  try {
    const [h, m] = t.split(':').map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`;
  } catch { return t || ''; }
}
