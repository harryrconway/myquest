/* POST /api/complete-job — staff+ auth required */
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
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const profiles = await profileRes.json();
  const role = profiles && profiles[0] && profiles[0].role;
  if (role !== 'staff' && role !== 'manager' && role !== 'owner') return json({ error: 'Forbidden.' }, 403);

  // Body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { jobId } = body;
  if (!jobId) return json({ error: 'jobId is required.' }, 400);

  // Fetch full job
  const jobRes = await fetch(
    `${SUPABASE_URL_BASE}/rest/v1/quote_requests?id=eq.${jobId}&select=*`,
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

  // Auto-clone if recurring — extend from the latest future instance to avoid duplicates
  if (job.recurrence && job.recurrence !== 'none' && job.scheduled_date) {
    waitUntil((async () => {
      try {
        const parentId = job.recurrence_parent_id || job.id;
        const todayStr = new Date().toISOString().split('T')[0];
        const svcHeaders = {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        };

        // Find the latest future scheduled instance in this recurring series
        const latestRes = await fetch(
          `${SUPABASE_URL_BASE}/rest/v1/quote_requests?recurrence_parent_id=eq.${parentId}&status=eq.scheduled&scheduled_date=gte.${todayStr}&select=scheduled_date&order=scheduled_date.desc&limit=1`,
          { headers: svcHeaders }
        );
        const latestArr = latestRes.ok ? await latestRes.json() : [];
        const fromDate = (latestArr[0] && latestArr[0].scheduled_date) || job.scheduled_date;

        const nextBase = new Date(fromDate + 'T00:00:00');
        if (job.recurrence === 'weekly') nextBase.setDate(nextBase.getDate() + 7);
        else if (job.recurrence === 'fortnightly') nextBase.setDate(nextBase.getDate() + 14);
        else if (job.recurrence === 'monthly') nextBase.setMonth(nextBase.getMonth() + 1);

        const freshChecklist = Array.isArray(job.checklist) && job.checklist.length
          ? job.checklist.map(item => ({ id: crypto.randomUUID(), text: item.text, done: false }))
          : [];

        await fetch(`${SUPABASE_URL_BASE}/rest/v1/quote_requests`, {
          method: 'POST',
          headers: {
            ...svcHeaders,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
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
            scheduled_date:       nextBase.toISOString().split('T')[0],
            scheduled_time:       job.scheduled_time,
            assigned_staff_ids:   job.assigned_staff_ids   || [],
            assigned_staff_colour: job.assigned_staff_colour || '',
            assigned_staff_name:  job.assigned_staff_name  || '',
            internal_notes:       job.internal_notes       || null,
            recurrence:           job.recurrence,
            recurrence_parent_id: parentId,
            checklist:            freshChecklist,
            job_accepted_at:      new Date().toISOString(),
            created_at:           new Date().toISOString(),
            updated_at:           new Date().toISOString(),
          }),
        });
      } catch (e) { /* clone failure doesn't block complete */ }
    })());
  }

  // Send thank-you email to customer via waitUntil so Cloudflare doesn't kill it
  if (RESEND_KEY && job.email) {
    const firstName = (job.full_name || '').split(' ')[0] || job.full_name;
    const services  = job.services && job.services.length ? job.services.join(', ') : 'cleaning service';
    const address   = [job.street_address, job.suburb].filter(Boolean).join(', ') || '';
    const dateStr   = job.scheduled_date
      ? new Date(job.scheduled_date + 'T00:00:00').toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })
      : 'today';

    waitUntil(fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'MyQuest <hello@myquest.au>',
        to:      [job.email],
        subject: `Thanks for choosing MyQuest, ${firstName} — your clean is done!`,
        html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:#FFD400;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <svg width="110" height="28" viewBox="0 0 140 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 18 C4 8 12 2 20 2 C20 2 20 14 12 20 C8 23 4 22 4 18 Z" fill="#000"/>
                    <path d="M20 2 C20 2 22 16 14 22" stroke="#000" stroke-width="1.5" stroke-linecap="round" fill="none"/>
                    <text x="28" y="25" font-family="Arial,sans-serif" font-weight="700" font-size="18" fill="#000">MyQuest</text>
                  </svg>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px 28px;">
            <h1 style="margin:0 0 6px;font-size:24px;font-weight:700;color:#111;letter-spacing:-0.5px;">All done, ${firstName}!</h1>
            <p style="margin:0 0 24px;font-size:15px;color:#000;line-height:1.6;">Your ${services} on <strong>${dateStr}</strong>${address ? ' at <strong>' + address + '</strong>' : ''} is complete. We hope everything is looking spotless.</p>

            <!-- Divider -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr><td style="border-top:1px solid #eee;"></td></tr></table>

            <!-- Review CTA -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9f9f9;border-radius:8px;padding:20px 24px;margin:0 0 28px;">
              <tr>
                <td>
                  <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#000;">Happy with the result?</p>
                  <p style="margin:0 0 16px;font-size:14px;color:rgba(0,0,0,0.55);line-height:1.55;">A quick Google review helps other locals find trustworthy cleaners — it only takes a minute.</p>
                  <p style="margin:0;text-align:center;"><a href="https://g.page/r/myquest-review" style="display:inline-block;background:#FFD400;color:#000;padding:11px 26px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.01em;">Leave a Review &#8594;</a></p>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 20px;text-align:center;">
              <a href="https://myquest.au/#quote"
                 style="display:inline-block;background:#FFD400;color:#000;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:-0.01em;">
                Book Another Clean &#8594;
              </a>
            </p>
            <p style="margin:0 0 32px;text-align:center;font-size:13px;color:rgba(0,0,0,0.5);">
              Or call us on <a href="tel:+61497828838" style="color:rgba(0,0,0,0.5);font-weight:600;text-decoration:none;">0497 828 838</a>
            </p>

            <p style="margin:0;font-size:14px;color:rgba(0,0,0,0.5);line-height:1.6;">Thank you for choosing MyQuest,<br><strong style="color:#000;">The MyQuest Team</strong></p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:16px 32px;border-top:1px solid #eee;">
            <p style="margin:0;font-size:11px;color:rgba(0,0,0,0.35);text-align:center;">
              MyQuest Cleaning Services &nbsp;&bull;&nbsp; Northern Rivers &amp; Gold Coast &nbsp;&bull;&nbsp;
              <a href="mailto:hello@myquest.au" style="color:rgba(0,0,0,0.35);text-decoration:none;">hello@myquest.au</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
      }),
    }).catch(() => {}));
  }

  return json({ success: true }, 200);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
