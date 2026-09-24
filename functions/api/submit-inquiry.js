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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  const URL_BASE = env.SUPABASE_URL;
  const SVC_KEY = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = env.RESEND_API_KEY;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  const required = ['biz_name', 'contact_name', 'email', 'mobile', 'suburb', 'space_type', 'sqm_range', 'frequency'];
  for (const field of required) {
    if (!body[field] || !String(body[field]).trim()) {
      return json({ error: `Missing required field: ${field}` }, 400);
    }
  }

  const row = {
    biz_name:     String(body.biz_name).trim(),
    contact_name: String(body.contact_name).trim(),
    email:        String(body.email).trim().toLowerCase(),
    mobile:       String(body.mobile).trim(),
    suburb:       String(body.suburb).trim(),
    space_type:   String(body.space_type).trim(),
    sqm_range:    String(body.sqm_range).trim(),
    frequency:    String(body.frequency).trim(),
    notes:        body.notes ? String(body.notes).trim() : null,
    estimate:     body.estimate ? String(body.estimate).trim() : null,
    source:       body.source ? String(body.source).trim() : null,
    status:       'new',
  };

  const insertRes = await fetch(`${URL_BASE}/rest/v1/inquiries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SVC_KEY}`,
      'apikey': SVC_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(row),
  });

  if (!insertRes.ok) {
    const err = await insertRes.text();
    console.error('Supabase insert error:', err);
    return json({ error: 'Failed to save inquiry.' }, 500);
  }

  const [inserted] = await insertRes.json();
  const inquiryId = inserted?.id;

  const spaceLabels = { office: 'Office', retail: 'Retail', medical: 'Medical', industrial: 'Industrial', other: 'Other' };
  const freqLabels = { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', 'once-off': 'Once-off' };

  function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const adminEmailHtml = `
    <h2 style="margin:0 0 16px">New inquiry — ${escHtml(row.biz_name)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px">
      <tr><td style="padding:6px 12px 6px 0;color:#666;width:140px">Business</td><td style="padding:6px 0"><strong>${escHtml(row.biz_name)}</strong></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Contact</td><td style="padding:6px 0">${escHtml(row.contact_name)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Email</td><td style="padding:6px 0"><a href="mailto:${escHtml(row.email)}">${escHtml(row.email)}</a></td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Mobile</td><td style="padding:6px 0">${escHtml(row.mobile)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Address</td><td style="padding:6px 0">${escHtml(row.suburb)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Space type</td><td style="padding:6px 0">${escHtml(spaceLabels[row.space_type] || row.space_type)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Size</td><td style="padding:6px 0">${escHtml(row.sqm_range)}</td></tr>
      <tr><td style="padding:6px 12px 6px 0;color:#666">Frequency</td><td style="padding:6px 0">${escHtml(freqLabels[row.frequency] || row.frequency)}</td></tr>
      ${row.estimate ? `<tr><td style="padding:6px 12px 6px 0;color:#666">Estimate</td><td style="padding:6px 0">${escHtml(row.estimate)}</td></tr>` : ''}
      ${row.notes ? `<tr><td style="padding:6px 12px 6px 0;color:#666;vertical-align:top">Notes</td><td style="padding:6px 0">${escHtml(row.notes)}</td></tr>` : ''}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#999">View in CRM: <a href="https://crm.myquest.au/crm/inquiries.html">Inquiries</a></p>
  `;

  const confirmEmailHtml = `
    <h2 style="margin:0 0 12px">Thanks, ${escHtml(row.contact_name.split(' ')[0])}.</h2>
    <p style="margin:0 0 16px">We've received your inquiry and will put a quote together and give you a call shortly.</p>
    <p style="margin:0;color:#666;font-size:13px">— The MyQuest team</p>
  `;

  try {
    await Promise.all([
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MyQuest <hello@myquest.au>',
          to: ['hello@myquest.au'],
          subject: `New inquiry: ${row.biz_name} — ${row.suburb}`,
          html: adminEmailHtml,
        }),
      }),
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MyQuest <hello@myquest.au>',
          to: [row.email],
          subject: 'We\'ve received your inquiry — MyQuest',
          html: confirmEmailHtml,
        }),
      }),
    ]);
  } catch (e) {
    console.error('Resend error (inquiry already saved):', e);
  }

  return json({ success: true, id: inquiryId });
}
