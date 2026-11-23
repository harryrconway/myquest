import { findInvite, markUsed, fromThisSite } from './onboard-start.js';
import { agreementPdf } from './_onboard-pdf.js';

const TO = 'hello@myquest.au';
const SITE = 'https://myquest.au';
const MAX_FILE = 10 * 1024 * 1024;
const MAX_TOTAL = 32 * 1024 * 1024;
const FILE_TYPES = /^(application\/pdf|image\/(jpeg|png|heic|heif))$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } });
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const str = (v, n = 200) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

// The same rules the page checks, run again here so nothing can be skipped by editing the page.
const today = () => { const d = new Date(Date.now() + 10 * 3600e3); return d.toISOString().slice(0, 10); };
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const future = (v) => isDate(v) && v >= today();
const past = (v) => isDate(v) && v <= today();
const mobile = (v) => { let d = String(v || '').replace(/[\s()-]/g, ''); if (d.startsWith('+61')) d = '0' + d.slice(3); return /^04\d{8}$/.test(d) ? d : ''; };
const fmtMobile = (d) => `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
const emailOk = (v) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) && !/\.\./.test(v);
const norm = (v) => String(v || '').toLowerCase().replace(/[^a-z']+/g, ' ').trim();
const oneOf = (v, list) => list.includes(v);

function problems(d) {
  const p = [];
  const need = (ok, what) => { if (!ok) p.push(what); };
  const age = isDate(d.dob) ? (Date.now() - Date.parse(d.dob)) / 31557600000 : 0;
  need(/\S+\s+\S+/.test(d.name), 'name');
  need(mobile(d.mobile), 'mobile');
  need(emailOk(d.email), 'email');
  need(d.address.length >= 10 && /\d{4}\s*$/.test(d.address), 'address');
  need(age >= 15 && age < 90, 'date of birth');
  need(d.ecName.length >= 2 && d.ecRel.length >= 2, 'emergency contact');
  need(mobile(d.ecMobile) && mobile(d.ecMobile) !== mobile(d.mobile), 'emergency contact mobile');
  need(oneOf(d.rtw, ['citizen', 'pr', 'visa']), 'right to work');
  if (d.rtw === 'visa') need(d.visaType.length >= 2 && future(d.visaExpiry) && d.visaCond.length >= 2, 'visa details');
  need(d.licNo.length >= 4 && oneOf(d.licState, ['QLD', 'NSW', 'VIC', 'SA', 'WA', 'TAS', 'NT', 'ACT']) && future(d.licExpiry), 'licence');
  need(d.rego.length >= 2 && d.insurer.length >= 2, 'car');
  need(past(d.policeDate) && d.policeRef.length >= 4, 'police check details');
  need(oneOf(d.ndis, ['have', 'applied', 'none']), 'NDIS screening');
  if (d.ndis === 'have') need(d.ndisNo.length >= 4 && future(d.ndisExp), 'NDIS clearance');
  if (d.ndis === 'applied') need(d.ndisApp.length >= 4, 'NDIS application');
  for (const k of ['blue', 'white', 'aid', 'qleave']) need(oneOf(d[k], ['have', 'none']), k);
  if (d.blue === 'have') need(d.blueNo.length >= 4 && future(d.blueExp), 'Blue Card');
  if (d.white === 'have') need(d.whiteNo.length >= 3, 'White Card');
  if (d.aid === 'have') need(future(d.aidExp), 'first aid');
  if (d.qleave === 'have') need(d.qleaveNo.length >= 4, 'QLeave');
  need(d.days.length > 0 && d.times.length > 0, 'availability');
  need(oneOf(d.shirt, ['S', 'M', 'L', 'XL', '2XL', '3XL']), 'shirt size');
  need(oneOf(d.health, ['no', 'yes']) && (d.health === 'no' || d.healthText.length >= 3), 'safety question');
  need(['agreement', 'fwis', 'cceis', 'handbook', 'safety'].every((k) => d.read.includes(k)), 'documents read');
  need(d.agree === true, 'agreement');
  need(norm(d.sign) === norm(d.name) && d.sign.length > 3, 'typed signature');
  need(/^data:image\/png;base64,[A-Za-z0-9+/=]{200,400000}$/.test(d.signature), 'drawn signature');
  need(d.xero === true && d.servicem8 === true && d.induction === true, 'first shift ticks');
  need(oneOf(d.idChoice, ['upload', 'bring']), 'ID');
  need(d.truthful === true, 'declaration');
  return p;
}

function clean(raw) {
  const d = raw && typeof raw === 'object' ? raw : {};
  const s = (k, n) => str(d[k], n);
  const list = (k, ok) => (Array.isArray(d[k]) ? d[k].filter((v) => ok.includes(v)) : []);
  return {
    name: s('name', 80), mobile: s('mobile', 20), email: s('email', 120).toLowerCase(), address: s('address', 160), dob: s('dob', 10),
    ecName: s('ecName', 80), ecRel: s('ecRel', 40), ecMobile: s('ecMobile', 20),
    rtw: s('rtw', 10), visaType: s('visaType', 40), visaExpiry: s('visaExpiry', 10), visaCond: s('visaCond', 160),
    licNo: s('licNo', 20), licState: s('licState', 3), licExpiry: s('licExpiry', 10), rego: s('rego', 10), insurer: s('insurer', 80),
    policeDate: s('policeDate', 10), policeRef: s('policeRef', 40),
    ndis: s('ndis', 10), ndisNo: s('ndisNo', 30), ndisExp: s('ndisExp', 10), ndisApp: s('ndisApp', 30),
    blue: s('blue', 10), blueNo: s('blueNo', 30), blueExp: s('blueExp', 10), white: s('white', 10), whiteNo: s('whiteNo', 30),
    aid: s('aid', 10), aidExp: s('aidExp', 10), qleave: s('qleave', 10), qleaveNo: s('qleaveNo', 20),
    days: list('days', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']), times: list('times', ['Early morning', 'Daytime', 'Evening']),
    shirt: s('shirt', 4), health: s('health', 3), healthText: s('healthText', 600),
    read: list('read', ['agreement', 'fwis', 'cceis', 'handbook', 'safety']), agree: d.agree === true, sign: s('sign', 80),
    signedAt: s('signedAt', 40), signature: typeof d.signature === 'string' ? d.signature.slice(0, 400100) : '',
    xero: d.xero === true, servicem8: d.servicem8 === true, induction: d.induction === true,
    idChoice: s('idChoice', 10), truthful: d.truthful === true,
  };
}

function b64(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
const fileName = (s) => String(s || 'file').replace(/[^A-Za-z0-9._ ]+/g, '').slice(-60) || 'file';
const ausDate = (v) => (isDate(v) ? new Date(v + 'T12:00:00Z').toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

// Email styling shared with the enquiry and contact emails.
const EF = "font-family:'Instrument Sans',Helvetica,Arial,sans-serif";
const EHL = 'background-color:#e5f4e4;color:#143f1d;padding:0 6px;border-radius:6px';
const EHEAD = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:620px){.mq-pad{padding-left:22px!important;padding-right:22px!important}.mq-h1{font-size:30px!important;line-height:34px!important}}</style></head>`;
const ECARD = (body) => `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border:1.5px solid #111111;border-radius:24px;background-color:#ffffff;color:#111111;${EF}">${body}</table>`;
const EWRAP = (pre, card) => `<body style="margin:0;padding:0;background-color:#f2f2f0"><div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f0"><tr><td align="center" style="padding:28px 12px">${card}</td></tr></table></body></html>`;
const ELOGO = (right) => `<tr><td class="mq-pad" style="padding:28px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><a href="${SITE}"><img src="${SITE}/assets/email-logo.png" width="106" height="30" alt="MyQuest" style="display:block;border:0"></a></td><td align="right" style="${EF};font-size:14px;color:#555555">${right}</td></tr></table></td></tr>`;
const ESIG = `<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}"><div style="font-size:16px;line-height:24px;color:#222222">Kind regards,</div><div style="font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.5px;color:#111111;padding-top:2px">The MyQuest team</div>
<div style="padding-top:12px;font-size:14px;line-height:23px;color:#555555"><a href="tel:+61413154932" style="color:#111111;font-weight:600;text-decoration:none">0413 154 932</a> &nbsp;·&nbsp; <a href="mailto:hello@myquest.au" style="color:#111111;font-weight:600;text-decoration:none">hello@myquest.au</a> &nbsp;·&nbsp; <a href="${SITE}" style="color:#111111;font-weight:600;text-decoration:none">myquest.au</a><br>Gold Coast and Northern Rivers<br>MyQuest Pty Ltd &nbsp;·&nbsp; ABN 65 693 175 405</div></td></tr>`;
const EROW = (k, v) => `<tr><td style="padding:10px 12px 10px 0;border-bottom:1px solid #eeeeec;${EF};font-size:14px;color:#555555;vertical-align:top;width:38%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid #eeeeec;${EF};font-size:14px;line-height:21px;color:#111111;vertical-align:top">${esc(v)}</td></tr>`;
const ECHIP = (t) => `<span style="display:inline-block;margin:0 6px 8px 0;padding:6px 12px;border-radius:999px;background-color:#e5f4e4;color:#143f1d;${EF};font-size:13px;font-weight:600">✓ ${esc(t)}</span>`;

function teamEmail(d, inv, files, ref, test) {
  const first = d.name.split(/\s+/)[0];
  const rows = [
    ['Mobile', fmtMobile(mobile(d.mobile))], ['Email', d.email], ['Address', d.address], ['Date of birth', ausDate(d.dob)],
    ['Emergency contact', `${d.ecName} (${d.ecRel}), ${fmtMobile(mobile(d.ecMobile) || '0000000000')}`],
    ['Right to work', d.rtw === 'visa' ? `Visa ${d.visaType}, expires ${ausDate(d.visaExpiry)}. Conditions: ${d.visaCond}` : d.rtw === 'pr' ? 'Permanent resident' : 'Australian or NZ citizen'],
    ['Driver licence', `${d.licNo} (${d.licState}), expires ${ausDate(d.licExpiry)}`], ['Car', `Rego ${d.rego}, insured with ${d.insurer}`],
    ['Police check', `Issued ${ausDate(d.policeDate)}, reference ${d.policeRef} (attached)`],
    ['NDIS Worker Screening', { have: `${d.ndisNo}, expires ${ausDate(d.ndisExp)}`, applied: `Applied, application ${d.ndisApp}`, none: "Doesn't have one" }[d.ndis] || ''],
    ['Blue Card or WWCC', d.blue === 'have' ? `${d.blueNo}, expires ${ausDate(d.blueExp)}` : "Doesn't have one"],
    ['White Card', d.white === 'have' ? d.whiteNo : "Doesn't have one"], ['First aid', d.aid === 'have' ? `Expires ${ausDate(d.aidExp)}` : "Doesn't have one"],
    ['QLeave worker number', d.qleave === 'have' ? d.qleaveNo : "Doesn't have one"],
    ['Available', `${d.days.join(', ')}; ${d.times.join(', ').toLowerCase()}`], ['Shirt size', d.shirt],
    ['Allergies or safety notes', d.health === 'yes' ? d.healthText : 'None'],
    ['ID', d.idChoice === 'upload' ? 'Photos attached' : 'Will bring to the induction'],
  ];
  const steps = [
    'Open the police check' + (d.idChoice === 'upload' ? ' and ID photos' : '') + ' attached and make sure they look right.',
    'In Xero, go to Payroll, Employees, Onboarding, check their details and approve them.',
    'Add them as staff in ServiceM8 with the Staff (No pricing) role, if you haven’t yet.',
    `The day before the induction (${inv.induction?.when || 'date to confirm'}${inv.induction?.suburb ? `, ${inv.induction.suburb}` : ''}), text them the exact address. They have been told to expect it.`,
    `At the induction: ${d.idChoice === 'upload' ? '' : 'sight their ID and licence, '}go through the safety induction together and sign the induction record.`,
    'Save the signed agreement and police check in their folder in Staff Records. Claude can do this in the morning report.',
  ];
  const html = EHEAD('New starter') + EWRAP(`${d.name} has finished onboarding`, ECARD(`
${ELOGO(test ? 'TEST · New starter' : 'New starter')}
<tr><td class="mq-pad" style="padding:22px 36px 0"><h1 class="mq-h1" style="margin:0;${EF};font-size:34px;line-height:40px;font-weight:600;letter-spacing:-1px">${esc(d.name)} is <span style="${EHL}">ready to start</span></h1></td></tr>
<tr><td class="mq-pad" style="padding:18px 36px 0">${['Details done', 'Police check uploaded', 'Agreement signed by both', 'Handbook and safety induction read', 'Xero done', 'ServiceM8 installed', 'Induction in calendar', d.idChoice === 'upload' ? 'ID uploaded' : 'Bringing ID'].map(ECHIP).join('')}</td></tr>
<tr><td class="mq-pad" style="padding:14px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#f4f4f2;border-radius:18px;padding:20px 22px;${EF}"><div style="font-size:16px;font-weight:600;padding-bottom:8px">What to do next</div>${steps.map((s, i) => `<div style="font-size:15px;line-height:23px;padding:5px 0"><b>${i + 1}.</b> ${esc(s)}</div>`).join('')}</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0"><div style="${EF};font-size:16px;font-weight:600;padding-bottom:4px">${esc(first)}'s details</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.map(([k, v]) => EROW(k, v)).join('')}</table></td></tr>
${ESIG}
<tr><td class="mq-pad" style="padding:26px 36px 30px;${EF};font-size:12.5px;line-height:19px;color:#777777">Signed by typing their name and drawing their signature on ${esc(d.signedAt)}; MyQuest's signature was added automatically. Reference ${esc(ref)}. Nothing is stored on the website, so this email is the only copy. Tax file number, super and bank details are never collected here; they are in Xero.</td></tr>`));
  const text = `${d.name} has finished onboarding.\n\n${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nWhat to do next:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nReference ${ref}\n\nKind regards,\nThe MyQuest team\n0413 154 932 · hello@myquest.au · myquest.au\nGold Coast and Northern Rivers\nMyQuest Pty Ltd · ABN 65 693 175 405`;
  return { html, text };
}

function starterEmail(d, inv) {
  const first = d.name.split(/\s+/)[0];
  const ind = inv.induction || {};
  const html = EHEAD('Welcome to MyQuest') + EWRAP('Your signed agreement is attached', ECARD(`
${ELOGO('')}
<tr><td class="mq-pad" style="padding:22px 36px 0"><h1 class="mq-h1" style="margin:0;${EF};font-size:34px;line-height:40px;font-weight:600;letter-spacing:-1px">Thanks ${esc(first)}, you're <span style="${EHL}">all set</span></h1></td></tr>
<tr><td class="mq-pad" style="padding:14px 36px 0;${EF};font-size:16px;line-height:25px;color:#222222">We've got everything we need. Your casual employment agreement, signed by you and by MyQuest, is attached for your records.</td></tr>
<tr><td class="mq-pad" style="padding:20px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#111111;border-radius:18px;padding:20px 22px;${EF};color:#ffffff"><div style="font-size:13px;color:#cfcfcf">Your induction</div><div style="font-size:20px;font-weight:600;padding-top:4px">${esc(ind.when || 'We will confirm the date with you')}</div><div style="font-size:14px;line-height:21px;color:#dddddd;padding-top:4px">${ind.suburb ? `In ${esc(ind.suburb)}. ` : ''}We'll text you the exact address the day before. Wear enclosed shoes.${d.idChoice === 'bring' ? ' Bring your driver licence and your passport or birth certificate.' : ''}</div></td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0;${EF};font-size:15px;line-height:23px;color:#222222"><div style="font-size:16px;font-weight:600;padding-bottom:6px">What happens next</div>
<div style="padding:4px 0"><b>On the day:</b> we go through the safety induction together, then your first clean.</div>
<div style="padding:4px 0"><b>Your jobs</b> appear in the ServiceM8 app, with the address, access notes and checklist.</div>
<div style="padding:4px 0"><b>Getting paid:</b> weekly, every Wednesday, into the account you gave Xero. Pay slips come from Xero.</div></td></tr>
<tr><td class="mq-pad" style="padding:18px 36px 0;${EF};font-size:15px;line-height:23px;color:#222222">Any questions at all, call or text Harry on 0413 154 932.</td></tr>
${ESIG}
<tr><td style="padding:0 0 30px;font-size:0;line-height:0">&nbsp;</td></tr>`));
  const text = `Thanks ${first}, you're all set.\n\nYour casual employment agreement, signed by you and by MyQuest, is attached.\n\nYour induction: ${ind.when || 'to be confirmed'}${ind.suburb ? `, in ${ind.suburb}` : ''}. We'll text you the exact address the day before. Wear enclosed shoes.\n\nAny questions, call or text Harry on 0413 154 932.\n\nKind regards,\nThe MyQuest team\n0413 154 932 · hello@myquest.au · myquest.au\nGold Coast and Northern Rivers\nMyQuest Pty Ltd · ABN 65 693 175 405`;
  return { html, text };
}

async function send(env, payload) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

export async function onRequestPost({ request, env }) {
  if (!fromThisSite(request)) return json({ ok: false }, 403);
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_TOTAL) return json({ ok: false, error: 'Your files are too large together. Try smaller photos.' }, 413);
  if (!(request.headers.get('Content-Type') || '').includes('multipart/form-data')) return json({ ok: false }, 415);
  let form;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'Something went wrong sending. Please try again.' }, 400); }

  const inv = await findInvite(form.get('t'), env);
  if (!inv) return json({ ok: false, error: 'This link is not valid. Call Harry on 0413 154 932.' }, 404);
  if (inv.expired) return json({ ok: false, error: 'This link has expired. Call Harry on 0413 154 932 for a new one.' }, 410);
  if (inv.used) return json({ ok: false, error: 'This link has already been used to send your details. Call Harry on 0413 154 932 if you need to change anything.' }, 410);

  let d;
  try { d = clean(JSON.parse(form.get('data') || '{}')); } catch { return json({ ok: false, error: 'Something went wrong sending. Please try again.' }, 400); }
  if (!d.name) d.name = inv.name;
  if (!emailOk(d.email)) d.email = inv.email || TO;

  const files = [];
  const take = async (key, label, required) => {
    const f = form.get(key);
    if (!f || typeof f === 'string' || !f.size) { if (required) throw new Error(`Please add your ${label}.`); return; }
    const okType = FILE_TYPES.test(f.type) || /\.(pdf|jpe?g|png|heic|heif)$/i.test(f.name || '');
    if (!okType) throw new Error(`Your ${label} must be a PDF or a photo.`);
    if (f.size > MAX_FILE) throw new Error(`Your ${label} is over 10 MB.`);
    const ext = ((f.name || '').match(/\.[A-Za-z0-9]{2,5}$/) || [''])[0].toLowerCase();
    files.push({ filename: fileName(`${label[0].toUpperCase()}${label.slice(1)}, ${d.name}${ext}`), content: b64(new Uint8Array(await f.arrayBuffer())) });
  };

  if (!inv.test) {
    const p = problems(d);
    if (p.length) return json({ ok: false, error: `Some answers need fixing: ${p.join(', ')}.` }, 422);
  }
  try {
    await take('police', 'police check', !inv.test);
    if (d.idChoice === 'upload') { await take('id1', 'driver licence', !inv.test); await take('id2', 'passport or birth certificate', !inv.test); }
  } catch (e) { return json({ ok: false, error: e.message }, 422); }

  const ref = `MQ${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const sentAt = new Date();
  const signedAt = isNaN(Date.parse(d.signedAt)) ? sentAt : new Date(Math.min(Date.parse(d.signedAt), sentAt.getTime()));
  d.signedAt = signedAt.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  let pdfBytes;
  try {
    const png = d.signature.startsWith('data:image/png;base64,') ? Uint8Array.from(atob(d.signature.split(',')[1]), (c) => c.charCodeAt(0)) : null;
    pdfBytes = await agreementPdf({
      name: d.name, address: d.address, start: inv.start || '', email: d.email,
      signedAt, sentAt, ip: request.headers.get('CF-Connecting-IP') || '', signaturePng: png, ref,
    });
  } catch (e) {
    return json({ ok: false, error: 'We could not make your agreement. Please try again, or call Harry on 0413 154 932.' }, 500);
  }
  const agreement = { filename: fileName(`Casual employment agreement, ${d.name}, signed.pdf`), content: b64(pdfBytes) };

  try {
    const team = teamEmail(d, inv, [agreement, ...files], ref, inv.test);
    await send(env, {
      from: 'MyQuest website <hello@myquest.au>', to: [TO], reply_to: d.email,
      subject: `${inv.test ? 'TEST: ' : ''}New starter: ${d.name} has finished onboarding`, html: team.html, text: team.text,
      attachments: [agreement, ...files],
    });
    const mine = starterEmail(d, inv);
    await send(env, {
      from: 'MyQuest <hello@myquest.au>', to: [d.email], reply_to: TO,
      subject: `Welcome to MyQuest, ${d.name.split(/\s+/)[0]}: your signed agreement`, html: mine.html, text: mine.text,
      attachments: [agreement],
    });
  } catch (e) {
    return json({ ok: false, error: 'We could not send your details just now. Please try again in a minute, or call Harry on 0413 154 932.' }, 502);
  }
  try { await markUsed(env, inv); } catch (e) { console.error('Could not mark the link as used:', e); }
  return json({ ok: true, ref, when: inv.induction?.when || '', suburb: inv.induction?.suburb || '' });
}

export async function onRequest() {
  return json({ ok: false }, 405);
}
