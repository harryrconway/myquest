/* POST /api/accept-job — manager+ auth required */
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

  const { jobId, scheduledDate, scheduledTime, assignedStaffIds, assignedStaffColour, assignedStaffName, internalNotes, recurrence, checklistTemplate } = body;
  if (!jobId || !scheduledDate || !scheduledTime) {
    return json({ error: 'jobId, scheduledDate and scheduledTime are required.' }, 400);
  }

  // Fetch job to get customer email and details
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=full_name,email,services,suburb,street_address,state,postcode,bedrooms,bathrooms`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  if (!jobRes.ok) return json({ error: 'Failed to fetch job.' }, 500);
  const jobs = await jobRes.json();
  if (!jobs || !jobs[0]) return json({ error: 'Job not found.' }, 404);
  const job = jobs[0];

  // Build checklist from template (sent by client from localStorage) or use built-in default
  const defaultItems = checklistTemplate && Array.isArray(checklistTemplate) && checklistTemplate.length > 0
    ? checklistTemplate
    : ['Vacuum all floors', 'Mop hard floors', 'Clean kitchen benches', 'Wipe stovetop', 'Clean sinks',
       'Scrub toilets', 'Clean shower/bath', 'Dust surfaces', 'Empty bins', 'Wipe mirrors', 'Wipe door handles'];
  const checklist = defaultItems.map(text => ({ id: crypto.randomUUID(), text, done: false }));

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
        status:                 'scheduled',
        scheduled_date:         scheduledDate,
        scheduled_time:         scheduledTime,
        assigned_staff_ids:     assignedStaffIds || [],
        assigned_staff_colour:  assignedStaffColour || '',
        assigned_staff_name:    assignedStaffName   || '',
        internal_notes:         internalNotes || null,
        recurrence:             recurrence || 'none',
        checklist:              checklist,
        job_accepted_at:        new Date().toISOString(),
        updated_at:             new Date().toISOString(),
      }),
    }
  );
  if (!updateRes.ok) return json({ error: 'Failed to update job.' }, 500);

  // Send booking confirmation to customer
  if (RESEND_KEY && job.email) {
    const dateFormatted = formatDate(scheduledDate);
    const timeFormatted = formatTime(scheduledTime);
    const services = job.services && job.services.length ? job.services.join(', ') : 'Cleaning Service';

    fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [job.email],
        subject: 'Your cleaning has been scheduled — MyQuest',
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
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">You're all booked in!</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;">Hi ${job.full_name}, we're looking forward to seeing you. Here are your booking details:</p>
    <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Date:</strong> ${dateFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Time:</strong> ${timeFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Service:</strong> ${services}</p>
    </div>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 8px;">Our team will arrive at the scheduled time. If you need to reschedule or have any questions, call us:</p>
    <p style="margin:0 0 24px;"><a href="tel:+61497828838" style="color:#2d6a4f;font-weight:700;font-size:16px;">0497 828 838</a></p>
    <p style="color:#6b7280;font-size:14px;margin:0;">See you soon,<br>The MyQuest Team<br>
    <a href="https://myquest.au" style="color:#2d6a4f;">myquest.au</a></p>
  </div>
</div>
</body></html>`,
      }),
    }).catch(() => {});
  }

  return json({ success: true }, 200);
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
