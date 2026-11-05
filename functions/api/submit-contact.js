const TO = 'hello@myquest.au';
const REQUIRED = ['name', 'email', 'phone', 'message'];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function text(value, max = 2000) {
  return value == null ? '' : String(value).trim().slice(0, max);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const SITE = 'https://myquest.au';

// Matches the hello@myquest.au Gmail signature.
const SIG_LINK = 'color:#1a1a1a;text-decoration:none';
const SIG_BAR = '<span style="color:#bbbbbb">&nbsp;&nbsp;|&nbsp;&nbsp;</span>';
const SIGNATURE_HTML = `<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a">Kind regards,</p>
<p style="margin:0 0 12px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a"><b>The MyQuest Team</b></p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr><td style="border-left:3px solid #1a1a1a;padding:2px 0 2px 12px;font-family:Arial,Helvetica,sans-serif">
<div style="font-size:20px;font-weight:bold;color:#1a1a1a;letter-spacing:-0.5px;line-height:24px">MyQuest</div>
<div style="font-size:10px;color:#777777;letter-spacing:2px;line-height:14px;padding-bottom:6px">COMMERCIAL &amp; HOME CLEANING</div>
<div style="font-size:13px;color:#1a1a1a;line-height:19px"><a href="tel:+61413154932" style="${SIG_LINK}">0413 154 932</a>${SIG_BAR}<a href="mailto:hello@myquest.au" style="${SIG_LINK}">hello@myquest.au</a>${SIG_BAR}<a href="${SITE}" style="${SIG_LINK}">myquest.au</a></div>
<div style="font-size:12px;color:#555555;line-height:18px">Gold Coast &amp; Northern Rivers</div>
<div style="font-size:11px;color:#999999;line-height:17px;padding-top:2px">MyQuest Pty Ltd&nbsp;&nbsp;|&nbsp;&nbsp;ABN 65 693 175 405</div>
</td></tr></table>`;
const SIGNATURE_TEXT = [
  'Kind regards,',
  'The MyQuest Team',
  '',
  'MyQuest',
  'COMMERCIAL & HOME CLEANING',
  '0413 154 932 | hello@myquest.au | myquest.au',
  'Gold Coast & Northern Rivers',
  'MyQuest Pty Ltd | ABN 65 693 175 405',
].join('\n');

function confirmationEmail(name) {
  const first = name.split(/\s+/)[0];
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Message received</title></head>
<body style="margin:0;padding:0;background:#f4f4f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Thanks ${esc(first)}, we've got your message and will be in touch soon, usually the same day.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111">
<tr><td style="background:#111111;padding:28px 36px"><a href="${SITE}"><img src="${SITE}/assets/email-logo-white.png" width="120" height="34" alt="MyQuest" style="display:block;border:0"></a></td></tr>
<tr><td align="center" style="padding:40px 36px 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:56px;height:56px;border-radius:28px;background:#111;color:#fff;font-size:26px;line-height:56px">&#10003;</td></tr></table>
<h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;letter-spacing:-0.5px">Message received</h1>
<p style="margin:0;color:#555;font-size:15px;line-height:1.6">Thanks ${esc(first)}. We'll be in touch soon, usually the same day.</p>
</td></tr>
<tr><td style="padding:30px 36px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#111;border-radius:999px"><a href="tel:+61413154932" style="display:block;padding:17px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">Call us now · 0413 154 932</a></td></tr></table>
<p align="center" style="margin:14px 0 0;font-size:14px;text-align:center"><a href="${SITE}" style="color:#111">Back to myquest.au &rarr;</a></p>
</td></tr>
<tr><td style="padding:32px 36px 36px">
<div style="height:1px;background:#e6e6e6;margin:0 0 26px;line-height:1px;font-size:1px">&nbsp;</div>
${SIGNATURE_HTML}
</td></tr>
</table>
</td></tr></table>
</body></html>`;
  const textBody = [
    'Message received',
    '',
    `Thanks ${first}. We'll be in touch soon, usually the same day.`,
    '',
    'Call us: 0413 154 932',
    `Website: ${SITE}`,
    '',
    SIGNATURE_TEXT,
  ].join('\n');
  return { html, text: textBody, subject: `We've received your message, ${first}` };
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  // Bots fill the hidden "website" field; pretend it worked and send nothing. Matches submit-inquiry.js.
  if (text(body.website)) return json({ success: true });

  for (const field of REQUIRED) {
    if (!text(body[field])) return json({ error: `Missing required field: ${field}` }, 400);
  }

  const name = text(body.name, 150);
  const email = text(body.email, 200);
  const phone = text(body.phone, 10).replace(/\D/g, '').slice(0, 10);
  const message = text(body.message, 4000);
  const page = text(body.page, 200);

  const validEmail = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(email);
  if (!validEmail) return json({ error: 'Please enter a valid email.' }, 400);
  if (!/^04\d{8}$/.test(phone)) return json({ error: 'Enter a 10 digit mobile number starting with 04.' }, 400);

  const rows = [
    ['Name', esc(name)],
    ['Email', `<a href="mailto:${esc(email)}">${esc(email)}</a>`],
    ['Mobile', `<a href="tel:${esc(phone)}">${esc(phone)}</a>`],
    ['Message', esc(message).replace(/\n/g, '<br>')],
    ['Page', esc(page)],
  ].filter(([, v]) => v);

  const html = `
    <h2 style="margin:0 0 16px;font-family:Arial,sans-serif">New contact message: ${esc(name)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;font-family:Arial,sans-serif">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;width:100px;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`).join('')}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#999;font-family:Arial,sans-serif">Press Reply to answer ${esc(name)} directly.</p>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MyQuest website <hello@myquest.au>',
        to: [TO],
        reply_to: email,
        subject: `New contact message: ${name}`,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return json({ error: 'Could not send message.' }, 502);
    }
  } catch (err) {
    console.error('Resend error:', err);
    return json({ error: 'Could not send message.' }, 502);
  }

  try {
    const c = confirmationEmail(name);
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'MyQuest <hello@myquest.au>', to: [email], reply_to: TO, subject: c.subject, html: c.html, text: c.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error('Confirmation email error:', res.status, await res.text());
  } catch (err) {
    console.error('Confirmation email error:', err);
  }

  return json({ success: true });
}
