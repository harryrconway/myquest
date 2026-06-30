/* POST /api/claim-job — any authenticated staff member claims an open shift
   Uses a conditional PATCH (filtered on needs_coverage=eq.true) so that if
   two people claim at the same instant, only the first one to land actually
   matches a row — the second gets an empty result and a clear "already
   claimed" error instead of a silent double-assignment. */
const ORIGIN = 'https://myquest.au';
const ADMIN_EMAIL = 'hello@myquest.au';

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
  const SERVICE_KEY = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY  = env.RESEND_API_KEY;

  // Auth — any authenticated staff member
  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace(/^Bearer\s+/, '');
  if (!callerJwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL_BASE}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${callerJwt}`, 'apikey': env.SUPABASE_ANON_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  // Body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  const { jobId } = body;
  if (!jobId) return json({ error: 'jobId is required.' }, 400);

  // Fetch job
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=*`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  if (!jobRes.ok) return json({ error: 'Failed to fetch job.' }, 500);
  const jobs = await jobRes.json();
  if (!jobs || !jobs[0]) return json({ error: 'Job not found.' }, 404);
  const job = jobs[0];

  if (!job.needs_coverage) {
    return json({ error: 'This shift has already been claimed.' }, 409);
  }

  // Swap: drop the person who requested coverage, add the claimer
  const currentIds = Array.isArray(job.assigned_staff_ids) ? job.assigned_staff_ids : [];
  const newIds = currentIds.filter(id => id !== job.coverage_requested_by);
  if (!newIds.includes(user.id)) newIds.push(user.id);

  // Resolve display name/colour for the new assignee list
  const claimerProfileRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/profiles?id=eq.${user.id}&select=id,name,email,colour`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const claimerProfiles = claimerProfileRes.ok ? await claimerProfileRes.json() : [];
  const claimer = claimerProfiles && claimerProfiles[0];
  if (!claimer) return json({ error: 'Your profile could not be found.' }, 403);

  let newStaffName = claimer.name || claimer.email || '';
  if (newIds.length > 1) {
    const idsList = newIds.join(',');
    const allRes = await fetch(
      `${SUPABASE_URL_BASE}/rest/v1/profiles?id=in.(${idsList})&select=id,name,email`,
      { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
    );
    const allProfiles = allRes.ok ? await allRes.json() : [];
    newStaffName = allProfiles.map(p => p.name || p.email).filter(Boolean).join(', ') || newStaffName;
  }

  // Conditional PATCH — atomic check-and-set against needs_coverage=true
  const updateRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&needs_coverage=eq.true`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        assigned_staff_ids:    newIds,
        assigned_staff_name:   newStaffName,
        assigned_staff_colour: claimer.colour || job.assigned_staff_colour || '',
        needs_coverage:        false,
        coverage_claimed_by:   user.id,
        coverage_claimed_at:   new Date().toISOString(),
        updated_at:            new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) return json({ error: 'Failed to claim job.' }, 500);
  const updated = await updateRes.json().catch(() => []);
  if (!Array.isArray(updated) || !updated.length) {
    return json({ error: 'Someone else already claimed this job.' }, 409);
  }

  // Notify the claimer + admin (fire-and-forget)
  if (RESEND_KEY) {
    waitUntil(sendClaimEmails({ RESEND_KEY, job, claimer }));
  }

  return json({ success: true });
}

async function sendClaimEmails({ RESEND_KEY, job, claimer }) {
  const dateFormatted = formatDate(job.scheduled_date);
  const timeFormatted = formatTime(job.scheduled_time);
  const services      = job.services && job.services.length ? job.services.join(', ') : 'Cleaning Service';
  const fullAddress   = [job.street_address, job.suburb, job.state, job.postcode].filter(Boolean).join(', ');
  const mapsUrl        = fullAddress ? `https://maps.google.com/?q=${encodeURIComponent(fullAddress)}` : null;
  const firstName      = (claimer.name || claimer.email).split(' ')[0];
  const phoneLink      = job.phone ? '<a href="tel:' + esc(job.phone) + '" style="color:#000;font-weight:600;">' + esc(job.phone) + '</a>' : '';
  const addressLink    = fullAddress && mapsUrl ? '<a href="' + esc(mapsUrl) + '" style="color:#1d4ed8;font-weight:600;">' + esc(fullAddress) + '</a>' : '';

  const sends = [];

  if (claimer.email) {
    sends.push(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [claimer.email],
        subject: `You picked up a shift — ${dateFormatted}`,
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
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">Thanks ${esc(firstName)}, you're covering this one!</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;">You claimed an open shift. Here's everything you need to know.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:4px 0;margin:0 0 16px;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${propRow('Date', dateFormatted, false)}
        ${propRow('Time', timeFormatted, true)}
        ${propRow('Service', esc(services), false)}
        ${propRow('Customer', esc(job.full_name), true)}
        ${propRow('Phone', phoneLink, false)}
        ${propRow('Address', addressLink, true)}
      </table>
    </div>
    ${job.access_instructions ? '<p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#92400e;margin:0 0 6px;">Access Instructions</p><div style="background:#fefce8;border:1.5px solid #fde68a;border-radius:8px;padding:16px 20px;margin:0 0 16px;"><p style="font-size:14px;color:#78350f;margin:0;line-height:1.6;">' + esc(job.access_instructions) + '</p></div>' : ''}
    <p style="color:#4b5563;line-height:1.7;margin:0 0 8px;">Questions? Contact the office:</p>
    <p style="margin:0 0 24px;"><a href="tel:+61497828838" style="color:#000;font-weight:700;font-size:16px;">0497 828 838</a></p>
    <p style="color:#6b7280;font-size:14px;margin:0;">Thanks for stepping up,<br>The MyQuest Team</p>
  </div>
</div>
</body></html>`,
      }),
    }).catch(function(e){console.error('Email send failed:',e)}));
  }

  sends.push(fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'MyQuest <hello@myquest.au>',
      to:      [ADMIN_EMAIL],
      subject: `Shift covered: ${esc(job.full_name)} — ${dateFormatted}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:sans-serif;max-width:560px;margin:32px auto;">
  <div style="background:#16a34a;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#fff;margin:0;font-size:18px;">Open shift covered ✓</h2>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;">
    <p style="margin:0 0 8px;font-size:14px;color:#111827;"><strong>${esc(job.full_name)}</strong> — ${dateFormatted} at ${timeFormatted}</p>
    <p style="margin:0;font-size:14px;color:#374151;">Picked up by <strong>${esc(claimer.name || claimer.email)}</strong>, replacing the original assignee.</p>
  </div>
</div>
</body></html>`,
    }),
  }).catch(function(e){console.error('Email send failed:',e)}));

  await Promise.all(sends);
}

function propRow(label, value, stripe) {
  if (!value && value !== 0) return '';
  const bg = stripe ? 'background:#f4f4f4;' : '';
  return `<tr style="${bg}"><td style="padding:7px 14px;font-weight:600;white-space:nowrap;color:#374151;width:120px;font-size:13px;">${label}</td><td style="padding:7px 14px;color:#111827;font-size:13px;">${value}</td></tr>`;
}

function esc(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  try {
    const [y, m, d] = dateStr.split('-');
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return dt.toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return dateStr; }
}

function formatTime(timeStr) {
  try {
    const [h, m] = timeStr.split(':').map(Number);
    const suffix = h < 12 ? 'am' : 'pm';
    const hour   = h % 12 || 12;
    return `${hour}:${String(m).padStart(2, '0')}${suffix}`;
  } catch { return timeStr; }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
