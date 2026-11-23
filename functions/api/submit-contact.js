import { fromThisSite, tooFast } from './_guard.js';
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

// Same look as the enquiry emails in submit-inquiry.js: a white card with a black outline, pale green highlights.
const EF = "font-family:'Instrument Sans',Helvetica,Arial,sans-serif";
const EHL = 'background-color:#e5f4e4;color:#143f1d;padding:0 6px;border-radius:6px';
const EHEAD = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:620px){.mq-pad{padding-left:22px!important;padding-right:22px!important}.mq-col{display:block!important;width:100%!important;box-sizing:border-box!important;padding:0 0 10px!important}.mq-h1{font-size:34px!important;line-height:38px!important}}</style></head>`;
const ELABEL = (t) => `<div style="${EF};font-size:14px;color:#555555;padding-bottom:12px">${t}</div>`;
const ERULE = '<tr><td class="mq-pad" style="padding:30px 36px 0"><div style="border-top:1px solid #e3e3e0;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>';
const EBTN = (label, href, dark = true, full = false) => `<table role="presentation" cellpadding="0" cellspacing="0" style="${full ? 'width:100%' : ''}"><tr><td align="center" style="background-color:${dark ? '#111111' : '#ffffff'};border:1.5px solid #111111;border-radius:999px"><a href="${href}" style="display:block;padding:14px 26px;color:${dark ? '#ffffff' : '#111111'};text-decoration:none;${EF};font-size:16px;font-weight:600;white-space:nowrap">${label}</a></td></tr></table>`;
const ESIG = `<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}"><div style="font-size:16px;line-height:24px;color:#222222">Kind regards,</div><div style="font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.5px;color:#111111;padding-top:2px">The MyQuest team</div>
<div style="padding-top:12px;font-size:14px;line-height:23px;color:#555555"><a href="tel:+61413154932" style="color:#111111;font-weight:600;text-decoration:none">0413 154 932</a> &nbsp;·&nbsp; <a href="mailto:hello@myquest.au" style="color:#111111;font-weight:600;text-decoration:none">hello@myquest.au</a> &nbsp;·&nbsp; <a href="${SITE}" style="color:#111111;font-weight:600;text-decoration:none">myquest.au</a><br>Gold Coast and Northern Rivers<br>MyQuest Pty Ltd &nbsp;·&nbsp; ABN 65 693 175 405</div></td></tr>`;
const ECARD = (body) => `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border:1.5px solid #111111;border-radius:24px;background-color:#ffffff;color:#111111;${EF}">${body}</table>`;
const EWRAP = (pre, card) => `<body style="margin:0;padding:0;background-color:#f2f2f0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f0"><tr><td align="center" style="padding:28px 12px">${card}</td></tr></table>
</body></html>`;
const ELOGO = (right) => `<tr><td class="mq-pad" style="padding:28px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><a href="${SITE}"><img src="${SITE}/assets/email-logo.png" width="106" height="30" alt="MyQuest" style="display:block;border:0"></a></td><td align="right" style="${EF};font-size:14px;color:#555555">${right}</td></tr></table></td></tr>`;
const EQUOTE = (label, message, green) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:${green ? '#e5f4e4' : '#f4f4f2'};border-radius:18px;padding:20px 22px;${EF}"><div style="font-size:14px;color:${green ? '#2c5a36' : '#555555'}">${label}</div><div style="padding-top:8px;font-size:16px;line-height:25px;color:#111111">“${esc(message).replace(/\n/g, '<br>')}”</div></td></tr></table>`;

// The three things people ask us most, each with a link to where the full answer lives.
const QUICK_ANSWERS = [
  ['Do you clean near me?', 'Across the Gold Coast and the Tweed, from Paradise Point to Pottsville.', 'See where we work', '/#areas'],
  ['How much does it cost?', 'A fixed written price before any work begins, with no travel or call out fee.', 'Get an instant estimate', '/#enquire'],
  ['Who will be cleaning?', 'Police checked, insured cleaners, and the same person each visit where possible.', 'More common questions', '/#faq'],
];

function confirmationEmail(name, message) {
  const first = name.split(/\s+/)[0];
  const card = ECARD(`
${ELOGO('Message received')}
<tr><td class="mq-pad" style="padding:36px 36px 0;${EF}"><div class="mq-h1" style="font-size:44px;line-height:46px;font-weight:600;letter-spacing:-1.5px;color:#111111">Thanks, ${esc(first)}.<br><span style="${EHL}">We’re on it.</span></div>
<div style="padding-top:14px;font-size:18px;line-height:27px;color:#555555">We’ll reply soon, usually the same day. Here are quick answers to the things people ask us most.</div></td></tr>
<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}">${QUICK_ANSWERS.map(([q, a, l, u]) => `<div style="padding:18px 0;border-top:1px solid #e3e3e0"><div style="font-size:19px;line-height:25px;font-weight:600;color:#111111">${q}</div><div style="padding-top:6px;font-size:15px;line-height:23px;color:#555555">${a}</div><div style="padding-top:8px"><a href="${SITE}${u}" style="${EF};font-size:15px;font-weight:600;color:#111111">${l} &rarr;</a></div></div>`).join('')}<div style="border-top:1px solid #e3e3e0;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>
<tr><td class="mq-pad" style="padding:26px 36px 0">${EQUOTE('Your message', message)}</td></tr>
<tr><td class="mq-pad" style="padding:26px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="mq-col" width="50%" style="padding-right:5px">${EBTN('Call 0413 154 932', 'tel:+61413154932', true, true)}</td><td class="mq-col" width="50%" style="padding-left:5px">${EBTN('Get an estimate', `${SITE}/#enquire`, false, true)}</td></tr></table></td></tr>
${ERULE}
${ESIG}
<tr><td class="mq-pad" style="padding:26px 36px 30px;${EF};font-size:12.5px;line-height:20px;color:#999999">You’re getting this because you sent MyQuest a message through our website. <a href="${SITE}/policies" style="color:#999999">Our policies</a></td></tr>`);
  const html = EHEAD('Message received') + '\n' + EWRAP(`We’ll reply soon, usually the same day.`, card);
  const textBody = [
    `Thanks, ${first}. We're on it.`,
    '',
    "We'll reply soon, usually the same day. Here are quick answers to the things people ask us most.",
    '',
    ...QUICK_ANSWERS.flatMap(([q, a, l, u]) => [q, a, `${l}: ${SITE}${u}`, '']),
    'Your message',
    `"${message}"`,
    '',
    'Call us: 0413 154 932',
    `Get an estimate: ${SITE}/#enquire`,
    '',
    SIGNATURE_TEXT,
  ].join('\n');
  return { html, text: textBody, subject: `Thanks, ${first}. We’re on it` };
}

export async function onRequestPost({ request, env }) {
  if (!fromThisSite(request)) return json({ error: 'Forbidden.' }, 403);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  // Bots fill the hidden "website" field; pretend it worked and send nothing. Matches submit-inquiry.js.
  if (text(body.website) || tooFast(body.elapsed, 3000)) return json({ success: true });

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
  if (message.split(/\s+/).filter(Boolean).length > 100) return json({ error: 'Please keep your message to 100 words.' }, 400);

  const first = name.split(/\s+/)[0];
  const rows = [
    ['Mobile', `<a href="tel:${esc(phone)}" style="color:#111111">${esc(phone.replace(/^(\d{4})(\d{3})(\d{3})$/, '$1 $2 $3'))}</a>`],
    ['Email', `<a href="mailto:${esc(email)}" style="color:#111111">${esc(email)}</a>`],
    ['Page', esc(page)],
  ].filter(([, v]) => v);
  const card = ECARD(`
${ELOGO('New message')}
<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:#111111;color:#ffffff;font-size:13px;font-weight:700">Contact form</span>
<div class="mq-h1" style="padding-top:12px;font-size:36px;line-height:40px;font-weight:600;letter-spacing:-1.2px;color:#111111">${esc(name)}</div>
${page ? `<div style="padding-top:4px;font-size:16px;color:#555555">Sent from ${esc(page)}</div>` : ''}</td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0">${EQUOTE('Their message', message, true)}</td></tr>
<tr><td class="mq-pad" style="padding:18px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="mq-col" width="50%" style="padding-right:5px">${EBTN(`Call ${esc(first)}`, `tel:${esc(phone)}`, true, true)}</td><td class="mq-col" width="50%" style="padding-left:5px">${EBTN('Reply by email', `mailto:${esc(email)}`, false, true)}</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:26px 36px 0">${ELABEL('Their details')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v]) => `<tr><td valign="top" style="padding:12px 12px 12px 0;border-top:1px solid #e3e3e0;width:120px;${EF};font-size:15px;color:#555555">${k}</td><td style="padding:12px 0;border-top:1px solid #e3e3e0;${EF};font-size:15px;font-weight:600;color:#111111">${v}</td></tr>`).join('')}<tr><td colspan="2" style="border-top:1px solid #e3e3e0;height:0;line-height:0;font-size:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 30px;${EF};font-size:13.5px;line-height:21px;color:#888888">Press Reply to answer ${esc(first)} directly.</td></tr>`);
  const html = EHEAD('New contact message') + '\n' + EWRAP(`${esc(name)}: ${esc(message.slice(0, 90))}`, card);

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
    const c = confirmationEmail(name, message);
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
