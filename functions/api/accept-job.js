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
  const { request, env, waitUntil } = context;
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
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': env.SUPABASE_ANON_KEY } }
  );
  if (!profileRes.ok) return json({ error: 'Profile lookup failed (' + profileRes.status + '). Check SUPABASE_SERVICE_KEY in Cloudflare.' }, 500);
  const profiles = await profileRes.json();
  const role = profiles && profiles[0] && profiles[0].role;
  if (!role) return json({ error: 'No profile found for this user. Ensure your profile exists in Supabase.' }, 403);
  if (role !== 'manager' && role !== 'owner') return json({ error: 'Forbidden — role is ' + role }, 403);

  // Body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { jobId, scheduledDate, scheduledTime, assignedStaffIds, assignedStaffColour, assignedStaffName, internalNotes, recurrence, checklistTemplate } = body;
  if (!jobId || !scheduledDate || !scheduledTime) {
    return json({ error: 'jobId, scheduledDate and scheduledTime are required.' }, 400);
  }

  // Fetch full job record (need all fields for clone pre-generation + emails)
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=*`,
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

  // Pre-generate future recurring instances so they appear on the calendar immediately
  if (recurrence && recurrence !== 'none') {
    const cloneCounts = { weekly: 11, fortnightly: 5, monthly: 2 };
    const count = cloneCounts[recurrence] || 0;
    if (count > 0) {
      const svcHeaders = {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      };
      const clones = [];
      for (let i = 1; i <= count; i++) {
        const d = new Date(scheduledDate + 'T00:00:00');
        if (recurrence === 'weekly') d.setDate(d.getDate() + 7 * i);
        else if (recurrence === 'fortnightly') d.setDate(d.getDate() + 14 * i);
        else if (recurrence === 'monthly') d.setMonth(d.getMonth() + i);
        const freshChecklist = checklist.map(item => ({ id: crypto.randomUUID(), text: item.text, done: false }));
        clones.push({
          full_name:            job.full_name,
          phone:                job.phone,
          email:                job.email,
          preferred_contact:    job.preferred_contact,
          street_address:       job.street_address,
          suburb:               job.suburb,
          state:                job.state,
          postcode:             job.postcode,
          access_instructions:  job.access_instructions,
          property_type:        job.property_type,
          bedrooms:             job.bedrooms,
          bathrooms:            job.bathrooms,
          living_areas:         job.living_areas,
          floor_area_sqm:       job.floor_area_sqm,
          staff_count:          job.staff_count,
          services:             job.services,
          service_type:         job.service_type,
          frequency:            job.frequency,
          condition:            job.condition,
          extras:               job.extras,
          preferred_days:       job.preferred_days,
          preferred_time:       job.preferred_time,
          flexible_schedule:    job.flexible_schedule,
          notes:                job.notes,
          client_id:            job.client_id,
          status:               'scheduled',
          scheduled_date:       d.toISOString().split('T')[0],
          scheduled_time:       scheduledTime,
          assigned_staff_ids:   assignedStaffIds   || [],
          assigned_staff_colour: assignedStaffColour || '',
          assigned_staff_name:  assignedStaffName   || '',
          internal_notes:       internalNotes       || null,
          recurrence:           recurrence,
          recurrence_parent_id: jobId,
          checklist:            freshChecklist,
          job_accepted_at:      new Date().toISOString(),
          created_at:           new Date().toISOString(),
          updated_at:           new Date().toISOString(),
        });
      }
      waitUntil(fetch(`${SUPABASE_URL_BASE}/rest/v1/quote_requests`, {
        method: 'POST',
        headers: svcHeaders,
        body: JSON.stringify(clones),
      }).catch(() => {}));
    }
  }

  // Send booking confirmation to customer + staff assignment emails
  if (RESEND_KEY) {
    const dateFormatted = formatDate(scheduledDate);
    const timeFormatted = formatTime(scheduledTime);
    const services = job.services && job.services.length ? job.services.join(', ') : 'Cleaning Service';
    const address  = [job.street_address, job.suburb, job.state].filter(Boolean).join(', ');

    const emailPromises = [];

    // Customer confirmation
    if (job.email) {
      emailPromises.push(fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'MyQuest <hello@myquest.au>',
          to:      [job.email],
          subject: 'Your cleaning has been scheduled — MyQuest',
          html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:560px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:#FFD400;padding:28px 36px;">
    <svg width="120" height="30" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="white"/>
      <path d="M20 2 C20 2 22 16 14 22" stroke="white" stroke-width="1.5" stroke-linecap="round" fill="none"/>
      <text x="28" y="25" font-family="'Plus Jakarta Sans',sans-serif" font-weight="700" font-size="18" fill="white">MyQuest</text>
    </svg>
  </div>
  <div style="background:#fff;padding:36px;">
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">You're all booked in!</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;">Hi ${job.full_name}, we're looking forward to seeing you. Here are your booking details:</p>
    <div style="background:#FFFDE7;border:1px solid #FFE566;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Date:</strong> ${dateFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Time:</strong> ${timeFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Service:</strong> ${services}</p>
    </div>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 8px;">Our team will arrive at the scheduled time. If you need to reschedule or have any questions, call us:</p>
    <p style="margin:0 0 24px;"><a href="tel:+61497828838" style="color:#FFD400;font-weight:700;font-size:16px;">0497 828 838</a></p>
    <p style="color:#6b7280;font-size:14px;margin:0;">See you soon,<br>The MyQuest Team<br>
    <a href="https://myquest.au" style="color:#FFD400;">myquest.au</a></p>
  </div>
</div>
</body></html>`,
        }),
      }).catch(() => {}));
    }

    // Staff assignment emails
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeStaffIds = Array.isArray(assignedStaffIds)
      ? assignedStaffIds.filter(id => typeof id === 'string' && UUID_RE.test(id))
      : [];
    if (safeStaffIds.length > 0) {
      try {
        const ids = safeStaffIds.join(',');
        const staffRes = await fetch(
          `${SUPABASE_URL_BASE}/rest/v1/profiles?id=in.(${ids})&select=id,name,email`,
          { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
        );
        const staffProfiles = staffRes.ok ? await staffRes.json() : [];

        for (const member of (staffProfiles || [])) {
          if (!member.email) continue;
          const firstName = (member.name || member.email).split(' ')[0];
          emailPromises.push(fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from:    'MyQuest <hello@myquest.au>',
              to:      [member.email],
              subject: `You've been assigned a job — ${dateFormatted}`,
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
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#111827;">Hi ${firstName}, you've got a job!</h2>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 20px;">You've been assigned to the following job. See the details below.</p>
    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Date:</strong> ${dateFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Time:</strong> ${timeFormatted}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Service:</strong> ${services}</p>
      <p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Customer:</strong> ${job.full_name}</p>
      ${address ? `<p style="margin:6px 0;font-size:15px;color:#111827;"><strong>Address:</strong> ${address}</p>` : ''}
    </div>
    <p style="color:#4b5563;line-height:1.7;margin:0 0 8px;">If you have any questions, contact the office:</p>
    <p style="margin:0 0 24px;"><a href="tel:+61497828838" style="color:#000;font-weight:700;font-size:16px;">0497 828 838</a></p>
    <p style="color:#6b7280;font-size:14px;margin:0;">Thanks,<br>The MyQuest Team</p>
  </div>
</div>
</body></html>`,
            }),
          }).catch(() => {}));
        }
      } catch { /* staff email failure doesn't block response */ }
    }

    if (emailPromises.length > 0) {
      waitUntil(Promise.all(emailPromises));
    }
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
