/* POST /api/email-quote — send a formatted quote email to the client. Manager+ only. */

export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY   = env.RESEND_API_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server configuration error.' }, 500);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const jwt = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SERVICE_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role,name`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const profiles = await profileRes.json().catch(() => []);
  const caller   = profiles && profiles[0] ? profiles[0] : null;
  const roleLevel = { owner: 3, manager: 2 };
  if (!caller || (roleLevel[caller.role] || 0) < 2) return json({ error: 'Forbidden.' }, 403);

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }
  if (!body.id) return json({ error: 'Quote ID required.' }, 400);

  // ── Fetch quote ───────────────────────────────────────────────────────────
  const quoteRes = await fetch(
    `${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${body.id}` +
    `&select=id,full_name,email,phone,suburb,postcode,street_address,state,` +
    `quote_type,service_type,bedrooms,bathrooms,living_areas,floor_area_sqm,` +
    `extras,preferred_days,preferred_time,is_recurring,frequency,quoted_price,email_log`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const quotes = await quoteRes.json().catch(() => []);
  const quote  = quotes && quotes[0] ? quotes[0] : null;
  if (!quote)         return json({ error: 'Quote not found.' }, 404);
  if (!quote.email)   return json({ error: 'This quote has no client email address. Add an email before sending.' }, 400);
  if (!RESEND_KEY)    return json({ error: 'Email service not configured.' }, 500);

  // ── Build email ───────────────────────────────────────────────────────────
  const quoteNum     = `QT-${body.id.slice(0, 8).toUpperCase()}`;
  const clientName   = quote.full_name || 'Valued client';
  const address      = [quote.street_address, quote.suburb, quote.state, quote.postcode].filter(Boolean).join(', ');
  const isRes        = quote.quote_type === 'residential';
  const price        = quote.quoted_price ? `$${parseFloat(quote.quoted_price).toFixed(2)}` : 'TBC';
  const serviceLabel = {
    regular: 'Regular clean', eol: 'End of lease / Bond clean',
    custom:  'Custom clean',  deep: 'Deep clean', builders: 'Builders clean',
  }[quote.service_type] || 'Professional cleaning service';
  const serviceDetail = isRes
    ? [quote.bedrooms && `${quote.bedrooms} bed`, quote.bathrooms && `${quote.bathrooms} bath`].filter(Boolean).join(', ')
    : quote.floor_area_sqm ? `${quote.floor_area_sqm} sqm` : '';
  const freq   = quote.is_recurring && quote.frequency ? `${quote.frequency} service` : 'One-off service';
  const extras = quote.extras && quote.extras.length ? quote.extras.join(', ') : null;
  const days   = quote.preferred_days && quote.preferred_days.length ? quote.preferred_days.join(', ') : null;
  const today  = new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const expiry = new Date(Date.now() + 30 * 86400000).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,sans-serif;">
<div style="max-width:620px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.10);">

  <div style="background:#0f172a;padding:28px 36px;">
    <table style="width:100%;border-collapse:collapse;"><tr>
      <td><div style="font-size:22px;font-weight:800;color:#FFD400;">MyQuest</div>
          <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:3px;">Professional Cleaning Services</div></td>
      <td style="text-align:right;"><div style="font-size:28px;font-weight:800;color:#fff;">QUOTE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.55);margin-top:2px;">${esc(quoteNum)}</div></td>
    </tr></table>
  </div>

  <table style="width:100%;border-collapse:collapse;padding:28px 36px;border-bottom:2px solid #f1f5f9;">
    <tr>
      <td style="padding:28px 36px 20px;vertical-align:top;width:50%;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:6px;">From</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;">MyQuest Cleaning</div>
        <div style="font-size:13px;color:#64748b;margin-top:4px;line-height:1.6;">Adelaide, SA<br>hello@myquest.au<br>0497 828 838</div>
      </td>
      <td style="padding:28px 36px 20px;vertical-align:top;width:50%;">
        <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.1em;color:#94a3b8;margin-bottom:6px;">Prepared for</div>
        <div style="font-size:15px;font-weight:800;color:#0f172a;">${esc(clientName)}</div>
        ${address ? `<div style="font-size:13px;color:#64748b;margin-top:4px;line-height:1.6;">${esc(address)}</div>` : ''}
        ${quote.email ? `<div style="font-size:13px;color:#64748b;">${esc(quote.email)}</div>` : ''}
      </td>
    </tr>
  </table>
  <div style="padding:10px 36px 20px;border-bottom:2px solid #f1f5f9;">
    <div style="font-size:12px;color:#94a3b8;">Prepared: ${today} &nbsp;·&nbsp; Valid until: ${expiry}</div>
  </div>

  <div style="padding:24px 36px;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="border-bottom:2px solid #e2e8f0;">
          <th style="text-align:left;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding-bottom:10px;">Service</th>
          <th style="text-align:right;font-size:10.5px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;padding-bottom:10px;">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="padding:16px 0;border-bottom:1px solid #f8fafc;vertical-align:top;">
            <div style="font-size:15px;font-weight:700;color:#0f172a;">${esc(serviceLabel)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:5px;line-height:1.6;">
              ${esc(freq)}${serviceDetail ? '<br>' + esc(serviceDetail) : ''}
              ${extras ? '<br>Includes: ' + esc(extras) : ''}
            </div>
          </td>
          <td style="padding:16px 0;border-bottom:1px solid #f8fafc;text-align:right;font-size:16px;font-weight:800;color:#0f172a;vertical-align:top;">${esc(price)}</td>
        </tr>
      </tbody>
    </table>

    <table style="width:100%;border-collapse:collapse;border-top:2.5px solid #0f172a;margin-top:4px;">
      <tr>
        <td style="padding:16px 0;vertical-align:bottom;">
          <div style="font-size:13px;font-weight:700;color:#0f172a;">Total quoted price</div>
          <div style="font-size:11px;color:#94a3b8;margin-top:2px;">Per service · Includes GST</div>
        </td>
        <td style="padding:16px 0;text-align:right;font-size:28px;font-weight:800;color:#0f172a;vertical-align:bottom;">${esc(price)}</td>
      </tr>
    </table>

    ${days || quote.preferred_time ? `
    <div style="background:#f8fafc;border-radius:10px;padding:14px 16px;margin-top:8px;font-size:13px;color:#374151;line-height:1.8;">
      ${days ? `<strong style="color:#0f172a;">Preferred days:</strong> ${esc(days)}<br>` : ''}
      ${quote.preferred_time ? `<strong style="color:#0f172a;">Preferred time:</strong> ${esc(quote.preferred_time)}` : ''}
    </div>` : ''}
  </div>

  <div style="padding:0 36px 36px;">
    <div style="border-top:1.5px solid #f1f5f9;padding-top:20px;">
      <p style="font-size:13px;color:#64748b;line-height:1.7;margin:0 0 20px;">This quote is valid for 30 days from the date above. Pricing is based on the property details provided and may be adjusted after an on-site assessment.</p>
      <div style="text-align:center;">
        <a href="mailto:hello@myquest.au?subject=Accepting%20quote%20${esc(quoteNum)}"
           style="display:inline-block;background:#FFD400;color:#000;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:800;font-size:15px;">
          ✓ Accept this quote
        </a>
      </div>
      <p style="font-size:12px;color:#94a3b8;text-align:center;margin:16px 0 0;">Questions? Call us on <a href="tel:0497828838" style="color:#0f172a;font-weight:700;">0497 828 838</a> or reply to this email</p>
    </div>
  </div>

</div>
</body></html>`;

  const sendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from:    'MyQuest <hello@myquest.au>',
      to:      [quote.email],
      subject: `Your cleaning quote — MyQuest (${quoteNum})`,
      html,
    }),
  });

  if (!sendRes.ok) {
    const errText = await sendRes.text().catch(() => '');
    return json({ error: 'Failed to send email.', detail: errText }, 500);
  }

  // ── Append email_log + update status ──────────────────────────────────────
  const existingLog = Array.isArray(quote.email_log) ? quote.email_log : [];
  existingLog.push({
    sent_at:      new Date().toISOString(),
    sent_by_id:   user.id,
    sent_by_name: caller.name || 'Staff',
    subject:      `Your cleaning quote — MyQuest (${quoteNum})`,
  });

  await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${body.id}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'apikey':        SERVICE_KEY,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      email_log:    existingLog,
      quote_status: 'sent',
      quote_sent_at: new Date().toISOString(),
      updated_at:   new Date().toISOString(),
    }),
  });

  return json({ success: true });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
