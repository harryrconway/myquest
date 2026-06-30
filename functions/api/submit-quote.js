/* POST /api/submit-quote — public endpoint, stores quote request + sends emails */
const ALLOWED_ORIGINS = ['https://myquest.au', 'http://localhost:8788', 'http://localhost:8789'];

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export async function onRequestOptions({ request }) {
  return new Response(null, { headers: corsHeaders(request) });
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
  const ANON_KEY     = env.SUPABASE_ANON_KEY || SERVICE_KEY;
  const RESEND_KEY   = env.RESEND_API_KEY;
  const ADMIN_EMAIL  = env.ADMIN_EMAIL || 'hello@myquest.au';

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server configuration error.' }, 500, request);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400, request); }

  const { full_name, phone, email } = body;
  if (!full_name || !phone || !email) {
    return json({ error: 'Name, phone and email are required.' }, 400, request);
  }

  const MAX = { name: 100, phone: 20, email: 254, suburb: 100, notes: 500, generic: 500 };
  if (full_name.length > MAX.name)         return json({ error: 'Name is too long.'   }, 400, request);
  if (phone.length    > MAX.phone)         return json({ error: 'Phone is too long.'  }, 400, request);
  if (email.length    > MAX.email)         return json({ error: 'Email is too long.'  }, 400, request);
  if (body.suburb  && body.suburb.length  > MAX.suburb) return json({ error: 'Suburb is too long.'  }, 400, request);
  if (body.notes   && body.notes.length   > MAX.notes)  return json({ error: 'Notes are too long.'  }, 400, request);

  // Insert to Supabase
  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey': ANON_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify({
      status:              'unscheduled',
      full_name:           full_name,
      phone:               phone,
      email:               email,
      preferred_contact:   body.preferred_contact   || null,
      street_address:      body.street_address      || null,
      suburb:              body.suburb               || null,
      state:               body.state                || null,
      postcode:            body.postcode             || null,
      access_instructions: body.access_instructions || null,
      property_type:       body.property_type        || null,
      bedrooms:            body.bedrooms    ? parseInt(body.bedrooms)    : null,
      bathrooms:           body.bathrooms   ? parseInt(body.bathrooms)   : null,
      living_areas:        body.living_areas ? parseInt(body.living_areas) : null,
      floor_area_sqm:      body.floor_area_sqm ? parseInt(body.floor_area_sqm) : null,
      staff_count:         body.staff_count  ? parseInt(body.staff_count)  : null,
      services:            body.services    || [],
      frequency:           body.frequency           || null,
      condition:           body.condition            || null,
      extras:              body.extras               || [],
      preferred_days:      body.preferred_days       || [],
      preferred_time:      body.preferred_time       || null,
      flexible_schedule:   body.flexible_schedule    || false,
      notes:               body.notes                || null,
    }),
  });

  if (!insertRes.ok) {
    return json({ error: 'Failed to save quote request. Please try again.' }, 500, request);
  }

  const insertedRows = await insertRes.json().catch(() => []);
  const newJobId = insertedRows && insertedRows[0] ? insertedRows[0].id : null;

  // Upsert client record by email — registered with waitUntil so Cloudflare
  // keeps the worker alive until it finishes (fire-and-forget without waitUntil
  // gets killed as soon as the response is returned).
  if (newJobId && email) {
    waitUntil(upsertClient({ SUPABASE_URL, SERVICE_KEY, ANON_KEY, newJobId, body }));
  }

  // Send emails (also fire-and-forget; non-blocking)
  if (RESEND_KEY) {
    waitUntil(sendEmails({ RESEND_KEY, ADMIN_EMAIL, full_name, phone, email, body }));
  }

  return json({ success: true }, 200, request);
}

async function upsertClient({ SUPABASE_URL, SERVICE_KEY, ANON_KEY, newJobId, body }) {
  try {
    const { full_name, email, phone } = body;
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?email=eq.${encodeURIComponent(email)}&select=id`,
      { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': ANON_KEY } }
    );
    const existing = await existingRes.json().catch(() => []);
    const clientBody = {
      full_name:      full_name,
      email:          email,
      phone:          phone || null,
      street_address: body.street_address || null,
      suburb:         body.suburb         || null,
      state:          body.state          || null,
      postcode:       body.postcode       || null,
      updated_at:     new Date().toISOString(),
    };
    let clientId;
    if (existing && existing[0]) {
      clientId = existing[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify(clientBody),
      });
    } else {
      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation',
        },
        body: JSON.stringify({ ...clientBody, created_at: new Date().toISOString() }),
      });
      const created = await createRes.json().catch(() => []);
      clientId = created && created[0] ? created[0].id : null;
    }
    if (clientId) {
      await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${newJobId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ client_id: clientId }),
      });
    }
  } catch (e) { /* swallow — upsert failure doesn't affect the user */ }
}

async function sendEmails({ RESEND_KEY, ADMIN_EMAIL, full_name, phone, email, body }) {
  const suburb   = body.suburb ? body.suburb : '';
  const services = body.services && body.services.length ? body.services.join(', ') : 'Not specified';
  const address  = [body.street_address, body.suburb, body.state, body.postcode].filter(Boolean).join(', ');
  const extras   = body.extras && body.extras.length ? body.extras.join(', ') : null;

  // Customer confirmation
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'MyQuest <hello@myquest.au>',
      to:      [email],
      subject: "We've received your quote request — MyQuest",
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
    <h2 style="font-size:22px;font-weight:700;margin:0 0 12px;color:#000;">Hi ${full_name}, we've got your request!</h2>
    <p style="color:#000;line-height:1.7;margin:0 0 20px;">Thanks for reaching out to MyQuest. We've received your quote request and a member of our team will be in touch within <strong>2 hours</strong>.</p>
    <div style="background:#f4f4f4;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:rgba(0,0,0,0.4);margin:0 0 12px;">Your request</p>
      <p style="margin:4px 0;font-size:14px;color:#000;"><strong>Services:</strong> ${services}</p>
      ${address ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Address:</strong> ${escHtmlEmail(address)}</p>` : (suburb ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Suburb:</strong> ${suburb}</p>` : '')}
      ${body.property_type ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Property:</strong> ${body.property_type}</p>` : ''}
      ${body.bedrooms ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Bedrooms:</strong> ${body.bedrooms}</p>` : ''}
      ${body.bathrooms ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Bathrooms:</strong> ${body.bathrooms}</p>` : ''}
      ${body.frequency ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Frequency:</strong> ${body.frequency}</p>` : ''}
      ${extras ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Extras:</strong> ${escHtmlEmail(extras)}</p>` : ''}
      ${body.preferred_days && body.preferred_days.length ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Preferred days:</strong> ${escHtmlEmail(body.preferred_days.join(', '))}</p>` : ''}
      ${body.preferred_time ? `<p style="margin:4px 0;font-size:14px;color:#000;"><strong>Preferred time:</strong> ${escHtmlEmail(body.preferred_time)}</p>` : ''}
      ${body.notes ? `<p style="margin:4px 0;font-size:14px;color:#000;font-style:italic;">"${escHtmlEmail(body.notes)}"</p>` : ''}
    </div>
    <p style="color:#000;line-height:1.7;margin:0 0 8px;">If you have any questions before we reach out, give us a call:</p>
    <p style="margin:0 0 24px;"><a href="tel:+61497828838" style="color:#000;font-weight:700;font-size:16px;">0497 828 838</a></p>
    <p style="color:rgba(0,0,0,0.45);font-size:14px;margin:0;">The MyQuest Team<br>
    <a href="https://myquest.au" style="color:#000;font-weight:700;">myquest.au</a></p>
  </div>
</div>
</body></html>`,
    }),
  }).catch(function(e){console.error('Email send failed:',e)});

  // Admin notification
  const rows = [
    row('Name', escHtmlEmail(full_name), false),
    row('Phone', `<a href="tel:${escHtmlEmail(phone)}" style="color:#000;font-weight:600;">${escHtmlEmail(phone)}</a>`, true),
    row('Email', `<a href="mailto:${escHtmlEmail(email)}" style="color:#000;font-weight:600;">${escHtmlEmail(email)}</a>`, false),
    body.preferred_contact ? row('Preferred contact', escHtmlEmail(body.preferred_contact), true)  : '',
    address                ? row('Address',           escHtmlEmail(address),                 false) : '',
    body.property_type     ? row('Property type',     escHtmlEmail(body.property_type),      true)  : '',
    body.bedrooms          ? row('Bedrooms',           body.bedrooms,                         false) : '',
    body.bathrooms         ? row('Bathrooms',          body.bathrooms,                        true)  : '',
    body.living_areas      ? row('Living areas',       body.living_areas,                     false) : '',
    services               ? row('Services',           escHtmlEmail(services),                true)  : '',
    body.frequency         ? row('Frequency',          escHtmlEmail(body.frequency),          false) : '',
    body.condition         ? row('Condition',          escHtmlEmail(body.condition),          true)  : '',
    body.preferred_days && body.preferred_days.length ? row('Preferred days', escHtmlEmail(body.preferred_days.join(', ')), false) : '',
    body.preferred_time    ? row('Preferred time',     escHtmlEmail(body.preferred_time),     true)  : '',
    body.notes             ? row('Notes',              escHtmlEmail(body.notes),              false) : '',
  ].filter(Boolean).join('');

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'MyQuest <hello@myquest.au>',
      to:      [ADMIN_EMAIL],
      subject: `New Quote Request — ${full_name}${suburb ? ' · ' + suburb : ''}`,
      html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f3f4f6;">
<div style="font-family:sans-serif;max-width:600px;margin:32px auto;">
  <div style="background:#FFD400;padding:20px 24px;border-radius:8px 8px 0 0;">
    <h2 style="color:#000;margin:0;font-size:18px;">New Quote Request</h2>
    <p style="color:rgba(0,0,0,0.55);margin:4px 0 0;font-size:13px;">Submitted ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}</p>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;overflow:hidden;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;">${rows}</table>
  </div>
  <p style="text-align:center;margin-top:20px;">
    <a href="https://myquest.au/dashboard/unscheduled-jobs.html"
       style="display:inline-block;background:#FFD400;color:#000;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
      View in Dashboard →
    </a>
  </p>
</div>
</body></html>`,
    }),
  }).catch(function(e){console.error('Email send failed:',e)});
}

function row(label, value, stripe) {
  var bg = stripe ? 'background:#f4f4f4;' : '';
  return `<tr style="${bg}">
    <td style="padding:8px 16px;font-weight:600;white-space:nowrap;color:#000;width:140px;">${label}</td>
    <td style="padding:8px 16px;color:#000;">${value}</td>
  </tr>`;
}

function escHtmlEmail(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(data, status = 200, request = null) {
  const origin = request ? (request.headers.get('Origin') || '') : '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowed,
    },
  });
}
