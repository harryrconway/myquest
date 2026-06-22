/* GET /api/check-open-shifts?secret=... — urgent alert if a shift still
   needs coverage and starts soon. Run on a frequent cron (see
   reminder-worker), separate from the daily customer reminder. */
const ADMIN_EMAIL = 'hello@myquest.au';
const URGENT_WINDOW_HOURS = 4;
const RE_ALERT_HOURS = 2; // don't re-send for the same job within this window

export async function onRequestGet({ request, env }) {
  const secret = new URL(request.url).searchParams.get('secret');
  if (!secret || secret !== env.REMINDER_SECRET) {
    return new Response(JSON.stringify({ error: 'Forbidden.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
  }

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY   = env.RESEND_API_KEY;

  if (!RESEND_KEY) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });

  const jobRes = await fetch(
    `${SUPABASE_URL}/rest/v1/quote_requests?needs_coverage=eq.true&status=eq.scheduled` +
    `&select=id,full_name,street_address,suburb,state,scheduled_date,scheduled_time,coverage_requested_by,coverage_alert_sent_at`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const jobs = await jobRes.json().catch(() => []);
  if (!Array.isArray(jobs) || !jobs.length) {
    return new Response(JSON.stringify({ checked: 0, alerted: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const now = new Date();
  const urgent = jobs.filter(j => {
    if (!j.scheduled_date || !j.scheduled_time) return false;
    const jobTime = new Date(`${j.scheduled_date}T${j.scheduled_time}:00`);
    const hoursUntil = (jobTime - now) / (1000 * 60 * 60);
    if (hoursUntil > URGENT_WINDOW_HOURS) return false; // not urgent yet
    if (j.coverage_alert_sent_at) {
      const sinceAlert = (now - new Date(j.coverage_alert_sent_at)) / (1000 * 60 * 60);
      if (sinceAlert < RE_ALERT_HOURS) return false; // already alerted recently
    }
    return true;
  });

  if (!urgent.length) {
    return new Response(JSON.stringify({ checked: jobs.length, alerted: 0 }), { headers: { 'Content-Type': 'application/json' } });
  }

  const rows = urgent.map(j => {
    const address = [j.street_address, j.suburb, j.state].filter(Boolean).join(', ');
    return `<tr><td style="padding:8px 16px;font-weight:600;color:#000;">${esc(j.full_name)}</td>` +
      `<td style="padding:8px 16px;color:#000;">${formatDate(j.scheduled_date)} at ${formatTime(j.scheduled_time)}</td>` +
      `<td style="padding:8px 16px;color:#000;">${esc(address)}</td></tr>`;
  }).join('');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'MyQuest <hello@myquest.au>',
      to:      [ADMIN_EMAIL],
      subject: `⚠️ ${urgent.length} open shift${urgent.length > 1 ? 's' : ''} still uncovered`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:sans-serif;max-width:600px;margin:32px auto;">
  <div style="background:#dc2626;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">⚠️ Open shifts need cover soon</h2>
    <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:13px;">No one has claimed these yet, and they start within ${URGENT_WINDOW_HOURS} hours.</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
  </div>
  <p style="text-align:center;margin-top:20px;">
    <a href="https://myquest.au/dashboard/" style="display:inline-block;background:#FFD400;color:#000;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
      Open Dashboard →
    </a>
  </p>
</div>
</body></html>`,
    }),
  }).catch(() => {});

  // Stamp alert timestamps so we don't re-send for the same jobs immediately
  await Promise.all(urgent.map(j =>
    fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${j.id}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ coverage_alert_sent_at: now.toISOString() }),
    }).catch(() => {})
  ));

  return new Response(JSON.stringify({ checked: jobs.length, alerted: urgent.length }), {
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
