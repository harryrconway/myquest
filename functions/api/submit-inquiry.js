const TO = 'hello@myquest.au';
const REQUIRED = ['contact_name', 'email', 'mobile', 'suburb', 'space_type', 'frequency', 'heard'];
const PERSONAL = ['home', 'ndis-dva'];

// Matches the Google Calendar event colours used for bookings.
const SPACE_COLOURS = {
  office: ['#3F51B5', '#fff'],
  retail: ['#F4511E', '#fff'],
  medical: ['#D50000', '#fff'],
  home: ['#F6BF26', '#000'],
  'ndis-dva': ['#8E24AA', '#fff'],
  builder: ['#039BE5', '#fff'],
  other: ['#E67C73', '#fff'],
};

const LABELS = {
  clean_type: { maintenance: 'Maintenance clean', deep: 'Deep clean' },
  space_type: { office: 'Office', retail: 'Retail', medical: 'Medical', home: 'Home', 'ndis-dva': 'NDIS / DVA', builder: 'Builder’s clean', other: 'Other' },
  frequency: { daily: 'Daily', weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', 'once-off': 'Once off', staged: 'In stages' },
};

const REFERRERS = [
  [/(^|\.)google\./, 'Google'],
  [/(^|\.)bing\.com$/, 'Bing'],
  [/(^|\.)duckduckgo\.com$/, 'DuckDuckGo'],
  [/(^|\.)facebook\.com$|(^|\.)fb\.com$/, 'Facebook'],
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/(^|\.)linkedin\.com$|(^|\.)lnkd\.in$/, 'LinkedIn'],
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function text(value) {
  return value == null ? '' : String(value).trim().slice(0, 2000);
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Turns the visitor's first page of the session into something readable, e.g. "Google search" or "facebook / cpc (spring)".
function cameFrom(from, siteHost) {
  if (!from || typeof from !== 'object') return 'Unknown';
  const utm = [text(from.utm_source), text(from.utm_medium)].filter(Boolean).join(' / ');
  if (utm) return utm + (text(from.utm_campaign) ? ` (${text(from.utm_campaign)})` : '');
  if (from.click === 'gclid') return 'Google Ads';
  if (from.click === 'fbclid') return 'Facebook or Instagram link';
  let host = '';
  try {
    host = new URL(text(from.ref)).hostname.replace(/^www\./, '');
  } catch {}
  if (!host || host === siteHost) return 'Direct (typed the address, a bookmark or an app)';
  const known = REFERRERS.find(([re]) => re.test(host));
  return known ? `${known[1]} (${host})` : host;
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

// Queensland has no daylight saving, so Brisbane is always UTC+10.
function callWhen(now = new Date()) {
  const b = new Date(now.getTime() + 10 * 3600000);
  const day = b.getUTCDay();
  const hour = b.getUTCHours();
  if (day >= 1 && day <= 5 && hour < 15) return 'today';
  if (day === 5 || day === 6) return 'on Monday';
  return 'tomorrow';
}

function confirmationEmail(e) {
  const first = e.contact_name.split(/\s+/)[0];
  const funded = e.space_type === 'ndis-dva';
  const when = callWhen();
  const range = /^(\$[\d,]+ to \$[\d,]+)/.exec(e.estimate);
  const month = /~(\$[\d,]+)\/month/.exec(e.estimate);
  const gst = /(plus|including) GST/.exec(e.estimate);
  const big = funded || !range ? 'Priced with you' : range[1];
  const small = funded || !range
    ? 'We’ll talk through pricing with you before the first clean.'
    : 'per clean' + (gst ? ` ${gst[0]}` : '') + (month ? ` · about ${month[1]} a month` : '');
  const startShort = e.preferred_date ? e.preferred_date.replace(/^(\w{3})\w*/, '$1').replace(/ \d{4}$/, '') : '';
  const summary = [
    LABELS.space_type[e.space_type] || e.space_type,
    e.sqm_range,
    e.bedrooms ? `${e.bedrooms} bedroom${e.bedrooms === '1' ? '' : 's'}` : '',
    LABELS.frequency[e.frequency] || e.frequency,
    e.preferred_time ? e.preferred_time.split(' (')[0] : '',
    startShort ? `From ${startShort}` : '',
  ].filter(Boolean).join(' · ');
  const steps = [
    ['Enquiry received', ''],
    ['We call you', `Usually ${when}, to talk through your space.`],
    ['A quick walk through if needed', 'Mostly for larger, medical or ongoing cleans.'],
    [funded ? 'Agreed price, clear invoices' : 'Fixed written quote', funded ? 'Everything confirmed before the first clean.' : 'The price we quote is the price you pay.'],
  ];

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Enquiry received</title></head>
<body style="margin:0;padding:0;background:#f4f4f2">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Thanks ${esc(first)}. We’ll call you ${when} to confirm your quote.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f2"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111">
<tr><td style="background:#111111;padding:28px 36px"><a href="${SITE}"><img src="${SITE}/assets/email-logo-white.png" width="120" height="34" alt="MyQuest" style="display:block;border:0"></a></td></tr>
<tr><td align="center" style="padding:40px 36px 0">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:56px;height:56px;border-radius:28px;background:#111;color:#fff;font-size:26px;line-height:56px">&#10003;</td></tr></table>
<h1 style="margin:18px 0 8px;font-size:28px;line-height:1.2;letter-spacing:-0.5px">Enquiry received</h1>
<p style="margin:0;color:#555;font-size:15px;line-height:1.6">Thanks ${esc(first)}. We’ll call you ${when} to confirm your quote.</p>
</td></tr>
<tr><td style="padding:28px 36px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e4e4;border-radius:14px">
<tr><td align="center" style="padding:24px 20px">
<p style="margin:0 0 6px;font-size:11px;letter-spacing:2px;color:#777;text-transform:uppercase">${funded ? 'Your quote' : 'Your estimate'}</p>
<p style="margin:0;font-size:34px;line-height:1.15;font-weight:bold;letter-spacing:-0.5px">${big}</p>
<p style="margin:6px 0 0;color:#666;font-size:13px;line-height:1.5">${small}</p>
</td></tr>
<tr><td align="center" style="border-top:1px solid #eeeeee;padding:16px 20px;font-size:13px;color:#444;line-height:1.7">${esc(summary)}</td></tr>
</table>
</td></tr>
<tr><td style="padding:30px 36px 0">
<p style="margin:0 0 14px;font-size:11px;letter-spacing:2px;color:#777;text-transform:uppercase">What happens next</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45">
${steps.map(([t, d], i) => `<tr><td width="34" valign="top" style="padding:0 0 14px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" style="width:24px;height:24px;border-radius:12px;font-size:12px;line-height:24px;${i === 0 ? 'background:#111;color:#fff' : i === 1 ? 'border:1.5px solid #111;color:#111;line-height:21px' : 'border:1.5px solid #bbb;color:#888;line-height:21px'}">${i === 0 ? '&#10003;' : i + 1}</td></tr></table></td><td valign="top" style="padding:2px 0 14px"><b>${t}</b>${d ? `<br><span style="color:#666">${d}</span>` : ''}</td></tr>`).join('')}
</table>
</td></tr>
<tr><td align="center" style="padding:22px 36px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#111;border-radius:999px"><a href="tel:+61413154932" style="display:block;padding:17px 20px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:bold">Call us now · 0413 154 932</a></td></tr></table>
<p style="margin:14px 0 0;font-size:14px"><a href="${SITE}" style="color:#111">Back to myquest.au &rarr;</a></p>
</td></tr>
<tr><td style="padding:26px 36px 0">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f6f4;border-radius:12px"><tr><td style="padding:16px 20px;font-size:14px;line-height:1.6;color:#333">Want to speed things up? Just reply to this email with a few photos of your space and anything we should know about access.</td></tr></table>
<p style="margin:14px 0 0;font-size:12px;color:#888;line-height:1.6">${funded ? '' : 'Your estimate is a guide based on what you told us. '}We confirm a fixed written price before any work begins. <a href="${SITE}/policies" style="color:#888">Our policies</a></p>
</td></tr>
<tr><td style="padding:32px 36px 36px">
<div style="height:1px;background:#e6e6e6;margin:0 0 26px;line-height:1px;font-size:1px">&nbsp;</div>
${SIGNATURE_HTML}
</td></tr>
</table>
</td></tr></table>
</body></html>`;

  const textBody = [
    'Enquiry received',
    '',
    `Thanks ${first}. We'll call you ${when} to confirm your quote.`,
    '',
    `${funded ? 'Your quote' : 'Your estimate'}: ${big} ${funded ? '' : small}`.trim(),
    summary,
    '',
    'What happens next',
    ...steps.map(([t, d], i) => `${i + 1}. ${t}${d ? `: ${d}` : ''}`),
    '',
    'Call us: 0413 154 932',
    `Website: ${SITE}`,
    '',
    'Want to speed things up? Reply to this email with a few photos of your space and anything we should know about access.',
    '',
    SIGNATURE_TEXT,
  ].join('\n');

  return { html, text: textBody, subject: `We've received your enquiry, ${first}` };
}

// ServiceM8 returns the new record's id in a header, not the body.
async function sm8Create(env, record, body) {
  const res = await fetch(`https://api.servicem8.com/api_1.0/${record}.json`, {
    method: 'POST',
    headers: { 'X-Api-Key': env.SERVICEM8_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const uuid = res.headers.get('x-record-uuid');
  if (!res.ok || !uuid) throw new Error(`ServiceM8 ${record} failed: ${res.status} ${await res.text()}`);
  return uuid;
}

async function sm8Get(env, path) {
  const res = await fetch(`https://api.servicem8.com/api_1.0/${path}`, {
    headers: { 'X-Api-Key': env.SERVICEM8_API_KEY },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`ServiceM8 GET ${path.split('?')[0]} failed: ${res.status}`);
  return res.json();
}

// Same hours as the website's instant estimate, so the quote matches what the customer was shown.
const SQM_HOURS = { 'Under 100m²': 1.5, '100 to 300m²': 3, '300 to 500m²': 5, '500m²+': 8 };
const BATH_HOURS = { 0: 0, 1: 0.5, 2: 1, 3: 1.5 };
// Homes are estimated by bedrooms, with the kitchen and first bathroom included.
const BED_HOURS = { 1: 1.5, 2: 2, 3: 2.5, 4: 3, 5: 3.5 };
const HOME_BATH_HOURS = { 0: 0, 1: 0, 2: 0.5, 3: 1 };

function count(n, max) {
  const v = parseInt(n, 10);
  return Number.isNaN(v) ? null : Math.min(Math.max(v, 0), max);
}

function estimateHours({ sqm, cleanType, kitchen, baths, bedrooms }) {
  const bath = count(baths, 3);
  const beds = count(bedrooms, 5);
  let hrs;
  if (beds) {
    hrs = BED_HOURS[beds] + HOME_BATH_HOURS[bath ?? 1];
    if (cleanType === 'deep') hrs *= 1.5;
  } else {
    hrs = SQM_HOURS[sqm];
    if (!hrs) return null;
    if (cleanType === 'deep') hrs *= 1.5;
    if (kitchen === true) hrs += 0.75;
    if (bath != null) hrs += BATH_HOURS[bath];
  }
  return Math.round(hrs * 100) / 100;
}

// Adds the cleaning hours and the travel and supplies fee to the quote, using the ServiceM8 items CLEAN and TRAVEL.
async function addQuoteLines(env, job, hours) {
  const items = await sm8Get(env, 'material.json');
  const find = code => items.find(m => m.active == 1 && String(m.item_number).trim().toUpperCase() === code);
  const lines = [[find('CLEAN'), hours], [find('TRAVEL'), 1]].filter(([m]) => m);
  if (lines.length < 2) throw new Error(`Items CLEAN and TRAVEL not found (ServiceM8 returned ${items.length} items)`);
  for (const [m, qty] of lines) {
    // ServiceM8 rejects a line unless displayed_amount matches the item's price, shown here before GST.
    const price = String(Number(m.price) || 0);
    await sm8Create(env, 'jobmaterial', {
      job_uuid: job, material_uuid: m.uuid, name: m.name, quantity: String(qty), price, displayed_amount: price,
      displayed_amount_is_tax_inclusive: '0', cost: m.cost || '0', tax_rate_uuid: m.tax_rate_uuid || '',
    });
  }
}

// A repeat enquiry from the same email reuses that client instead of creating a duplicate.
// Reuses a client only while it is still active, so archived test or old clients are never picked up.
async function findClientByEmail(env, email) {
  if (!email) return null;
  const q = encodeURIComponent(`email eq '${email.replace(/'/g, "''")}' and active eq 1`);
  const contacts = await sm8Get(env, `companycontact.json?%24filter=${q}`);
  for (const c of contacts) {
    const companies = await sm8Get(env, `company.json?%24filter=${encodeURIComponent(`uuid eq '${c.company_uuid}' and active eq 1`)}`);
    if (companies.length) return c.company_uuid;
  }
  return null;
}

async function noteOnJob(env, job, text) {
  await sm8Create(env, 'note', { related_object: 'job', related_object_uuid: job, note: text }).catch(err => console.error('ServiceM8 note failed:', err));
}

// Job categories in ServiceM8, by the form's space type. A name missing in ServiceM8 leaves the job uncategorised.
const SM8_CATEGORY = { office: 'Office', retail: 'Retail', medical: 'Medical', builder: 'Builders', home: 'Home', 'ndis-dva': 'NDIS and DVA', other: 'Other' };

async function sm8CategoryUuid(env, spaceType) {
  const name = SM8_CATEGORY[spaceType];
  if (!name) return null;
  try {
    const res = await fetch('https://api.servicem8.com/api_1.0/category.json', {
      headers: { 'X-Api-Key': env.SERVICEM8_API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const match = (await res.json()).find(c => c.active == 1 && String(c.name).trim().toLowerCase() === name.toLowerCase());
    return match ? match.uuid : null;
  } catch {
    return null;
  }
}

// Each enquiry becomes a quote job holding the enquiry details, with the estimate's lines already added.
// A new email gets a new client and contact; a known email reuses its client.
async function sendToServiceM8(env, e, validEmail, hours, description) {
  const [first, ...rest] = e.contact_name.split(/\s+/);
  const contact = { first, last: rest.join(' '), mobile: e.mobile, ...(validEmail ? { email: e.email } : {}) };
  const address = [e.address, e.suburb].filter(Boolean).join(', ');
  const existing = validEmail ? await findClientByEmail(env, e.email).catch(err => { console.error(err); return null; }) : null;
  const [company, category] = await Promise.all([
    existing || sm8Create(env, 'company', { name: (e.biz_name || e.contact_name).slice(0, 100), address }),
    sm8CategoryUuid(env, e.space_type),
  ]);
  const job = await sm8Create(env, 'job', { status: 'Quote', company_uuid: company, job_address: address, job_description: description, ...(category ? { category_uuid: category } : {}) });
  await Promise.all([
    existing ? null : sm8Create(env, 'companycontact', { company_uuid: company, ...contact, type: 'JOB', is_primary_contact: '1' }),
    sm8Create(env, 'jobcontact', { job_uuid: job, ...contact, type: 'JOB' }),
    hours ? addQuoteLines(env, job, hours).catch(async err => {
      console.error('ServiceM8 quote lines failed:', err);
      await noteOnJob(env, job, `The website couldn't add the quote lines (${hours} hours of CLEAN plus TRAVEL), so please add them before sending the quote. Reason: ${String(err.message || err).slice(0, 400)}`);
    }) : null,
  ]);
}

export async function onRequestPost({ request, env, waitUntil }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  for (const field of REQUIRED) {
    if (!text(body[field])) return json({ error: `Missing required field: ${field}` }, 400);
  }
  const personal = PERSONAL.includes(text(body.space_type));
  if (!personal && !text(body.biz_name)) return json({ error: 'Missing required field: biz_name' }, 400);
  const beds = count(body.bedrooms, 5);
  if (personal ? !beds : !text(body.sqm_range)) return json({ error: `Missing required field: ${personal ? 'bedrooms' : 'sqm_range'}` }, 400);

  // Bots fill the hidden "website" field; pretend it worked and send nothing.
  if (text(body.website)) return json({ success: true });

  const e = Object.fromEntries(
    ['biz_name', 'contact_name', 'email', 'mobile', 'suburb', 'clean_type', 'space_type', 'sqm_range', 'frequency', 'estimate', 'notes', 'heard', 'preferred_date', 'preferred_time', 'preferred_days', 'address'].map(k => [k, text(body[k])]),
  );
  const site = new URL(request.url).hostname.replace(/^www\./, '');
  const from = cameFrom(body.from, site);
  const landing = text(body.from && body.from.landing) || '/';
  const bathrooms = body.baths == null ? '' : String(parseInt(body.baths, 10) >= 3 ? '3 or more' : parseInt(body.baths, 10));
  const kitchen = body.kitchen === true ? 'Yes' : body.kitchen === false ? 'No' : '';
  const bedrooms = beds ? (beds >= 5 ? '5 or more' : String(beds)) : '';
  e.bedrooms = bedrooms;

  const who = e.biz_name || e.contact_name;
  const colour = SPACE_COLOURS[e.space_type] || ['#666666', '#fff'];
  const rows = [
    ['Business', e.biz_name ? `<strong>${esc(e.biz_name)}</strong>` : ''],
    ['Contact', esc(e.contact_name)],
    ['Email', `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>`],
    ['Mobile', `<a href="tel:${esc(e.mobile)}">${esc(e.mobile)}</a>`],
    ['Address', esc(e.address)],
    ['Suburb', esc(e.suburb)],
    ['Clean type', esc(LABELS.clean_type[e.clean_type] || e.clean_type)],
    ['Space type', `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-weight:bold;background:${colour[0]};color:${colour[1]}">${esc(LABELS.space_type[e.space_type] || e.space_type)}</span>`],
    ['Size', esc(e.sqm_range)],
    ['Bedrooms', esc(bedrooms)],
    ['Frequency', esc(LABELS.frequency[e.frequency] || e.frequency)],
    ['Kitchen', kitchen],
    ['Bathrooms', bathrooms],
    ['Estimate shown', esc(e.estimate)],
    ['Preferred start', esc(e.preferred_date)],
    ['Preferred time', esc(e.preferred_time)],
    ['Best days', esc(e.preferred_days)],
    ['Notes', esc(e.notes).replace(/\n/g, '<br>')],
    ['Heard about us', `<strong>${esc(e.heard)}</strong>`],
    ['Came from', esc(from)],
    ['First page seen', esc(landing)],
  ].filter(([, v]) => v);

  const html = `
    <div style="background:${colour[0]};color:${colour[1]};padding:10px 16px;border-radius:8px;margin:0 0 16px;font-family:Arial,sans-serif;font-size:13px;font-weight:bold;letter-spacing:1px;text-transform:uppercase">${esc(LABELS.space_type[e.space_type] || e.space_type)}</div>
    <h2 style="margin:0 0 16px;font-family:Arial,sans-serif">New enquiry: ${esc(who)}</h2>
    <table style="border-collapse:collapse;width:100%;font-size:14px;font-family:Arial,sans-serif">
      ${rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#666;width:140px;vertical-align:top">${k}</td><td style="padding:6px 0">${v}</td></tr>`).join('')}
    </table>
    <p style="margin:20px 0 0;font-size:13px;color:#999;font-family:Arial,sans-serif">Press Reply to answer ${esc(e.contact_name)} directly.</p>`;

  const validEmail = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(e.email);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'MyQuest website <hello@myquest.au>',
        to: [TO],
        reply_to: validEmail ? e.email : undefined,
        subject: `New ${{ home: 'home ', 'ndis-dva': 'NDIS / DVA ' }[e.space_type] || ''}enquiry: ${who}, ${e.suburb} (via ${e.heard})`,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.error('Resend error:', res.status, await res.text());
      return json({ error: 'Could not send enquiry.' }, 502);
    }
  } catch (err) {
    console.error('Resend error:', err);
    return json({ error: 'Could not send enquiry.' }, 502);
  }

  const space = LABELS.space_type[e.space_type] || e.space_type;
  const freq = LABELS.frequency[e.frequency] || e.frequency;
  const jobs = [];
  if (env.SERVICEM8_API_KEY) {
    const hours = estimateHours({ sqm: e.sqm_range, cleanType: e.clean_type, kitchen: body.kitchen, baths: body.baths, bedrooms: personal ? beds : null });
    jobs.push(sendToServiceM8(env, e, validEmail, e.space_type === 'ndis-dva' ? null : hours, [
      'Website enquiry',
      ['Clean type', LABELS.clean_type[e.clean_type] || e.clean_type],
      ['Space type', space],
      ['Size', e.sqm_range],
      ['Bedrooms', bedrooms],
      ['Frequency', freq],
      ['Kitchen', kitchen],
      ['Bathrooms', bathrooms],
      ['Estimate shown', e.estimate],
      ['Preferred start', e.preferred_date],
      ['Preferred time', e.preferred_time],
      ['Best days', e.preferred_days],
      ['Notes', e.notes],
      ['Heard about us', e.heard],
      ['Came from', from],
    ].filter(r => typeof r === 'string' || r[1]).map(r => typeof r === 'string' ? r : `${r[0]}: ${r[1]}`).join('\n')));
  }
  if (jobs.length) {
    const done = Promise.allSettled(jobs).then(results => results.forEach(r => r.status === 'rejected' && console.error(r.reason)));
    if (waitUntil) waitUntil(done); else await done;
  }

  if (validEmail) {
    try {
      const c = confirmationEmail(e);
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'MyQuest <hello@myquest.au>', to: [e.email], reply_to: TO, subject: c.subject, html: c.html, text: c.text }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) console.error('Confirmation email error:', res.status, await res.text());
    } catch (err) {
      console.error('Confirmation email error:', err);
    }
  }

  return json({ success: true });
}
