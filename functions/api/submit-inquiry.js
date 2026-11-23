import { fromThisSite, tooFast } from './_guard.js';
const TO = 'hello@myquest.au';
const REQUIRED = ['contact_name', 'email', 'mobile', 'suburb', 'space_type', 'frequency', 'heard'];
const PERSONAL = ['home', 'ndis-dva'];

// Matches the Google Calendar event colours used for bookings.
const SPACE_COLOURS = {
  office: ['#3F51B5', '#fff'],
  retail: ['#F4511E', '#fff'],
  medical: ['#D50000', '#fff'],
  gym: ['#0B8043', '#fff'],
  home: ['#F6BF26', '#000'],
  'ndis-dva': ['#8E24AA', '#fff'],
  builder: ['#039BE5', '#fff'],
  other: ['#E67C73', '#fff'],
};

const LABELS = {
  clean_type: { maintenance: 'Maintenance clean', deep: 'Deep clean' },
  space_type: { office: 'Office', retail: 'Retail', medical: 'Medical', gym: 'Gym', home: 'Home', 'ndis-dva': 'NDIS / DVA', builder: 'Builder’s clean', other: 'Other' },
  funding: { ndis: 'NDIS', dva: 'DVA', unsure: 'Not sure yet' },
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

const GUIDE_READY = ['How to get ready for your first clean', '/guides/getting-ready-for-your-clean'];
const READING = {
  home: [['What a house clean covers', '/house-cleaning'], ['House cleaning prices on the Gold Coast', '/guides/house-cleaning-cost-gold-coast'], GUIDE_READY],
  'ndis-dva': [['How our NDIS and DVA cleaning works', '/ndis-dva-cleaning'], ['Regular clean or deep clean', '/guides/regular-vs-deep-clean'], GUIDE_READY],
  builder: [["What a builder's clean covers", '/builder-clean'], ["Builder's clean checklist before handover", '/guides/builders-clean-checklist']],
  office: [['What our office cleaning covers', '/office-cleaning'], ['Regular clean or deep clean', '/guides/regular-vs-deep-clean'], GUIDE_READY],
  medical: [['How we clean medical centres', '/medical-centre-cleaning'], ['Regular clean or deep clean', '/guides/regular-vs-deep-clean'], GUIDE_READY],
  retail: [['What our retail and showroom cleaning covers', '/retail-cleaning'], ['Regular clean or deep clean', '/guides/regular-vs-deep-clean'], GUIDE_READY],
  gym: [['What our gym and studio cleaning covers', '/gym-cleaning'], ['Gym and studio cleaning: what gets cleaned and how often', '/guides/gym-and-studio-cleaning'], GUIDE_READY],
  other: [['Regular clean or deep clean', '/guides/regular-vs-deep-clean'], GUIDE_READY, ['All our cleaning guides', '/guides']],
};

// Queensland has no daylight saving, so Brisbane is always UTC+10.
function callWhen(now = new Date()) {
  const b = new Date(now.getTime() + 10 * 3600000);
  const day = b.getUTCDay();
  const hour = b.getUTCHours();
  if (day >= 1 && day <= 5 && hour < 15) return 'today';
  if (day === 5 || day === 6) return 'on Monday';
  return 'tomorrow';
}

// What each kind of space gets in its confirmation email, taken from that space's service page.
const SPACE_COPY = {
  office: {
    noun: 'office', link: ['See the full office checklist', '/office-cleaning'],
    covers: [['Desks and touchpoints', 'Surfaces wiped, phones, light switches and door handles sanitised.'], ['Kitchen and breakroom', 'Benchtops, sink, appliances and microwave, with bins emptied and relined.'], ['Bathrooms', 'Toilets, basins, mirrors, taps and dispensers cleaned and restocked.'], ['Vacuuming and mopping', 'All floor types, under desks and along edges, not just the open areas.']],
    know: [['Around your hours', 'Early mornings, evenings or weekends, at a regular time we stick to.'], ['Same cleaner', 'Where possible, the same person each visit, so you know who is in your space.']],
  },
  medical: {
    noun: 'clinic', link: ['See how we clean medical centres', '/medical-centre-cleaning'],
    covers: [['Consultation and treatment rooms', 'Benches, surfaces and touchpoints cleaned with hospital grade disinfectant.'], ['Waiting areas', 'Chairs, tables, reception desk, door handles and light switches.'], ['Bathrooms', 'Toilets, basins, taps, mirrors and dispensers, to an infection control standard.'], ['Colour coded equipment', 'Separate cloths and mops for each zone to prevent cross contamination.']],
    know: [['After hours cleans', 'Evenings after the last patient, or early mornings before doors open.'], ['Cleaning logs', 'Signed logs and documented schedules on request, handy for accreditation.']],
  },
  retail: {
    noun: 'store', link: ['See the full retail checklist', '/retail-cleaning'],
    covers: [['Floors', 'All floor types done properly, under fixtures and along edges.'], ['Entry and glass', 'Front doors, shopfront windows and display glass cleaned streak free.'], ['Surfaces and displays', 'Shelves, counters, display cases and point of sale areas wiped and reset.'], ['Bathrooms', 'Toilets, basins, mirrors, taps and dispensers cleaned, bins relined.']],
    know: [['Before you open', 'Before open, after close or a quiet midweek window, so trade isn’t disrupted.'], ['Keys and alarms', 'Access is arranged in writing before the first clean and handled securely.']],
  },
  gym: {
    noun: 'gym', link: ['See the full gym and studio checklist', '/gym-cleaning'],
    covers: [['Training floor and equipment', 'Benches, boxes, mats and handles wiped and disinfected.'], ['Change rooms and showers', 'Toilets, showers, benches and lockers cleaned, drains cleared, supplies refilled.'], ['Touch points', 'Door handles, light switches, water fountains and check in screens.'], ['Floors', 'Chalk and dust vacuumed off rubber flooring, then mopped with a pH neutral cleaner.']],
    know: [['Around your classes', 'After the last class, before the first, or in the quiet gap between sessions.'], ['The right products', 'A pH neutral cleaner on rubber flooring, never bleach, and disinfectant where hands touch most.']],
  },
  home: {
    noun: 'home', link: ['See the full house checklist', '/house-cleaning'],
    covers: [['Kitchen', 'Benchtops, splashback, sink, stovetop and appliance fronts, microwave inside.'], ['Bathrooms', 'Showers, baths, toilets, basins, mirrors and taps cleaned and shined.'], ['Floors', 'Vacuumed and mopped throughout, along edges and under what we can move.'], ['Dusting', 'Surfaces, shelves, skirting boards, light switches and door handles.']],
    know: [['Same cleaner', 'Where possible, the same person each visit, who gets to know your home.'], ['Keys and access', 'Home, away, key safe or spare key, agreed before the first clean.']],
  },
  'ndis-dva': {
    noun: 'home', link: ['See what every clean covers', '/ndis-dva-cleaning'],
    covers: [['Kitchen', 'Benchtops, splashback, sink, stovetop and appliance fronts, microwave inside.'], ['Bathrooms', 'Showers, baths, toilets, basins, mirrors and taps cleaned and shined.'], ['Floors', 'Vacuumed and mopped throughout, along edges and under what we can move.'], ['Bedrooms and living areas', 'Surfaces wiped, mirrors and glass streak free, rooms left neat.']],
    know: [['A familiar cleaner', 'Where possible, the same patient, police checked cleaner every visit.'], ['Clear invoices', 'Itemised invoices with the details you need for your records or your funding.']],
  },
  builder: {
    noun: 'site', link: ["See the full builder's clean checklist", '/builder-clean'],
    covers: [['Debris removal', 'Leftover materials, packaging and construction waste collected and disposed of.'], ['Dust and vacuuming', 'Fine dust from floors, walls, vents and skirting boards with HEPA filter vacuums.'], ['Kitchens and bathrooms', 'Sinks, taps, showers, tiles and appliances, with grout haze removed.'], ['Windows and floors', 'Protective films and stickers removed, floors swept, vacuumed and mopped.']],
    know: [['Around other trades', 'We coordinate timing with your site manager and work alongside finishing trades.'], ['Handover ready', 'We work to your build schedule and don’t leave until the job is right.']],
  },
  other: {
    noun: 'space', link: ['See all our cleaning services', '/'],
    covers: [['A checklist agreed with you', 'We confirm exactly what gets cleaned before the first visit.'], ['Kitchens and bathrooms', 'Benches, sinks, toilets, basins, mirrors and taps cleaned.'], ['Floors', 'Vacuumed and mopped, along edges and under what we can move.'], ['Touch points and bins', 'Door handles and light switches wiped, bins emptied and relined.']],
    know: [['Same cleaner', 'Where possible, the same person each visit.'], ['Written quotes', 'A fixed price before work begins. What we quote is what you pay.']],
  },
};

// The look shared with our outreach emails: a white card with a black outline, pale green highlights.
const EF = "font-family:'Instrument Sans',Helvetica,Arial,sans-serif";
const EHL = 'background-color:#e5f4e4;color:#143f1d;padding:0 6px;border-radius:6px';
const EHEAD = (title) => `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;600;700&display=swap" rel="stylesheet">
<style>@media (max-width:620px){.mq-pad{padding-left:22px!important;padding-right:22px!important}.mq-col{display:block!important;width:100%!important;box-sizing:border-box!important;padding:0 0 10px!important}.mq-h1{font-size:34px!important;line-height:38px!important}.mq-big{font-size:32px!important;line-height:36px!important}}</style></head>`;
const ELABEL = (t) => `<div style="${EF};font-size:14px;color:#555555;padding-bottom:12px">${t}</div>`;
const ERULE = '<tr><td class="mq-pad" style="padding:30px 36px 0"><div style="border-top:1px solid #e3e3e0;height:0;line-height:0;font-size:0">&nbsp;</div></td></tr>';
const EBTN = (label, href, dark = true, full = false) => `<table role="presentation" cellpadding="0" cellspacing="0" style="${full ? 'width:100%' : ''}"><tr><td align="center" style="background-color:${dark ? '#111111' : '#ffffff'};border:1.5px solid #111111;border-radius:999px"><a href="${href}" style="display:block;padding:14px 26px;color:${dark ? '#ffffff' : '#111111'};text-decoration:none;${EF};font-size:16px;font-weight:600;white-space:nowrap">${label}</a></td></tr></table>`;
const EDOT = (i) => `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="32" height="32" align="center" style="${i === 0 ? 'background-color:#1d5c2a;color:#ffffff' : 'background-color:#ffffff;color:#111111;border:1.5px solid #111111'};border-radius:999px;${EF};font-size:14px;font-weight:600;line-height:32px">${i + 1}</td></tr></table>`;
const EPAIRS = (items, cell) => items.reduce((rows, x, i) => (i % 2 ? rows[rows.length - 1].push(x) : rows.push([x]), rows), [])
  .map(pair => `<tr>${pair.map((x, j) => `<td class="mq-col" width="50%" valign="top" style="padding:0 ${j ? 0 : 6}px 10px ${j ? 6 : 0}px">${cell(x)}</td>`).join('')}${pair.length < 2 ? '<td class="mq-col" width="50%"></td>' : ''}</tr>`).join('');
const ESIG = `<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}"><div style="font-size:16px;line-height:24px;color:#222222">Kind regards,</div><div style="font-size:24px;line-height:30px;font-weight:600;letter-spacing:-0.5px;color:#111111;padding-top:2px">The MyQuest team</div>
<div style="padding-top:12px;font-size:14px;line-height:23px;color:#555555"><a href="tel:+61413154932" style="color:#111111;font-weight:600;text-decoration:none">0413 154 932</a> &nbsp;·&nbsp; <a href="mailto:hello@myquest.au" style="color:#111111;font-weight:600;text-decoration:none">hello@myquest.au</a> &nbsp;·&nbsp; <a href="${SITE}" style="color:#111111;font-weight:600;text-decoration:none">myquest.au</a><br>Gold Coast and Northern Rivers<br>MyQuest Pty Ltd &nbsp;·&nbsp; ABN 65 693 175 405</div></td></tr>`;
const ECARD = (body) => `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;border-collapse:separate;border:1.5px solid #111111;border-radius:24px;background-color:#ffffff;color:#111111;${EF}">${body}</table>`;
const EWRAP = (pre, card) => `<body style="margin:0;padding:0;background-color:#f2f2f0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${pre}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f0"><tr><td align="center" style="padding:28px 12px">${card}</td></tr></table>
</body></html>`;

function confirmationEmail(e) {
  const first = e.contact_name.split(/\s+/)[0];
  const funded = e.space_type === 'ndis-dva';
  const when = callWhen();
  const range = /^(\$[\d,]+ to \$[\d,]+)/.exec(e.estimate);
  const gst = /(plus|including) GST/.exec(e.estimate);
  const priced = !funded && !!range;
  const big = priced ? range[1] : 'Priced with you';
  const small = priced ? 'per clean' + (gst ? `, ${gst[0]}` : '') : funded ? 'We agree the hours and rate with you before the first clean.' : 'We’ll talk through pricing with you before the first clean.';
  const startShort = e.preferred_date ? e.preferred_date.replace(/^(\w{3})\w*/, '$1').replace(/ \d{4}$/, '') : '';
  const summary = [
    LABELS.space_type[e.space_type] || e.space_type,
    e.sqm_range,
    e.bedrooms ? `${e.bedrooms} bedroom${e.bedrooms === '1' ? '' : 's'}` : '',
    LABELS.clean_type[e.clean_type] || '',
    LABELS.frequency[e.frequency] || e.frequency,
    e.preferred_time ? e.preferred_time.split(' (')[0] : '',
    startShort ? `From ${startShort}` : '',
  ].filter(Boolean).join(' · ');
  const copy = SPACE_COPY[e.space_type] || SPACE_COPY.other;
  const reading = READING[e.space_type] || READING.other;
  const steps = [
    ['We call you', `Usually ${when}, to talk through your ${copy.noun}.`],
    ['A quick walk through if needed', 'Mostly for larger, medical or ongoing cleans.'],
    [funded ? 'Agreed price, clear invoices' : 'Fixed written quote', funded ? 'Everything confirmed before the first clean.' : 'The price we quote is the price you pay.'],
  ];
  const subject = priced ? `You’re all set, ${first}. Here’s your estimate` : `You’re all set, ${first}`;
  const card = ECARD(`
<tr><td class="mq-pad" style="padding:28px 36px 0"><a href="${SITE}"><img src="${SITE}/assets/email-logo.png" width="120" height="34" alt="MyQuest" style="display:block;border:0"></a></td></tr>
<tr><td class="mq-pad" style="padding:36px 36px 0;${EF}"><div class="mq-h1" style="font-size:44px;line-height:46px;font-weight:600;letter-spacing:-1.5px;color:#111111">You’re all set, <span style="${EHL}">${esc(first)}</span>.</div>
<div style="padding-top:14px;font-size:18px;line-height:27px;color:#555555">We’ve got your enquiry for ${esc(e.suburb)}. Here’s what you asked for and what comes next.</div></td></tr>
<tr><td class="mq-pad" style="padding:28px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#e5f4e4;border-radius:20px;padding:26px 26px 22px;${EF}">
<div style="font-size:14px;color:#2c5a36">${funded ? 'Your quote' : 'Your estimate'}</div>
<div class="mq-big" style="padding-top:4px;font-size:40px;line-height:44px;font-weight:600;letter-spacing:-1.2px;color:#143f1d">${big}</div>
<div style="padding-top:4px;font-size:15px;line-height:22px;color:#2c5a36">${small}</div>
<div style="margin-top:18px;border-top:1px solid #c6e2c4;padding-top:14px;font-size:14px;line-height:22px;color:#143f1d">${esc(summary)}</div>
</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:32px 36px 0">${ELABEL('How it works from here')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${steps.map(([t, d], i) => `<td class="mq-col" width="33%" valign="top" style="padding:0 12px 0 0;${EF}">${EDOT(i)}<div style="padding-top:12px;font-size:16px;line-height:21px;font-weight:600;color:#111111">${t}</div><div style="padding-top:4px;font-size:14px;line-height:20px;color:#555555">${d}</div></td>`).join('')}</tr></table></td></tr>
${ERULE}
<tr><td class="mq-pad" style="padding:28px 36px 0">${ELABEL(`Every ${copy.noun} clean includes`)}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${EPAIRS(copy.covers, ([t, d]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:#f4f4f2;border-radius:14px;padding:14px 16px;${EF}"><div style="font-size:16px;font-weight:600;color:#111111">${t}</div><div style="padding-top:4px;font-size:14px;line-height:20px;color:#555555">${d}</div></td></tr></table>`)}</table>
<a href="${SITE}${copy.link[1]}" style="${EF};font-size:15px;font-weight:600;color:#111111">${copy.link[0]} &rarr;</a></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${EPAIRS(copy.know, ([t, d]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="border:1.5px solid #111111;border-radius:16px;padding:16px 18px;${EF}"><div style="font-size:16px;font-weight:600;color:#111111">${t}</div><div style="padding-top:5px;font-size:14px;line-height:21px;color:#555555">${d}</div></td></tr></table>`)}</table></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0">${ELABEL('Answers to what people ask first')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${reading.map(([t, u], j) => `<td class="mq-col" width="${Math.floor(100 / reading.length)}%" valign="top" style="padding:0 ${j < reading.length - 1 ? 6 : 0}px 0 0"><a href="${SITE}${u}" style="display:block;text-decoration:none;color:#111111;background-color:#f4f4f2;border-radius:14px;padding:14px 14px 16px;${EF};font-size:14.5px;line-height:20px;font-weight:600">${t}<div style="padding-top:10px;font-size:15px">&rarr;</div></a></td>`).join('')}</tr></table></td></tr>
<tr><td class="mq-pad" align="center" style="padding:30px 36px 0;${EF}"><div style="font-size:15px;line-height:24px;color:#555555;padding-bottom:16px">Want to speed things up? Reply with a few photos of your ${copy.noun} and anything we should know about access.</div>${EBTN('Call 0413 154 932', 'tel:+61413154932')}</td></tr>
${ERULE}
${ESIG}
<tr><td class="mq-pad" style="padding:26px 36px 30px;${EF};font-size:12.5px;line-height:20px;color:#999999">You’re getting this because you asked MyQuest for a quote. ${priced ? 'Your estimate is a guide based on what you told us. ' : ''}We confirm a fixed written price before any work begins. <a href="${SITE}/policies" style="color:#999999">Our policies</a></td></tr>`);
  const html = EHEAD('Enquiry received') + '\n' + EWRAP(`We’ll call you ${when} about ${esc(e.suburb)}.`, card);

  const textBody = [
    `You're all set, ${first}.`,
    '',
    `We've got your enquiry for ${e.suburb}. We'll call you ${when} to confirm your quote.`,
    '',
    `${funded ? 'Your quote' : 'Your estimate'}: ${priced ? `${big} ${small}` : `${big}. ${small}`}`,
    summary,
    '',
    'How it works from here',
    ...steps.map(([t, d], i) => `${i + 1}. ${t}: ${d}`),
    '',
    `Every ${copy.noun} clean includes`,
    ...copy.covers.map(([t, d]) => `• ${t}: ${d}`),
    `${copy.link[0]}: ${SITE}${copy.link[1]}`,
    '',
    ...copy.know.map(([t, d]) => `${t}: ${d}`),
    '',
    'Answers to what people ask first',
    ...reading.map(([t, u]) => `${t}: ${SITE}${u}`),
    '',
    `Want to speed things up? Reply with a few photos of your ${copy.noun} and anything we should know about access.`,
    'Call us: 0413 154 932',
    '',
    SIGNATURE_TEXT,
  ].join('\n');

  return { html, text: textBody, subject };
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
// Every job is priced at no less than the award's 2 hour minimum paid shift.
const MIN_HOURS = 2;
const SQM_HOURS = { 'Under 100m²': 1.5, '100 to 300m²': 3, '300 to 500m²': 5, '500m²+': 8 };
const BATH_HOURS = { 0: 0, 1: 0.5, 2: 1, 3: 1.5, 4: 2, 5: 2.5 };
// Homes are estimated by bedrooms, with the kitchen and first bathroom included.
const BED_HOURS = { 1: 1.5, 2: 2, 3: 2.5, 4: 3, 5: 3.5, 6: 4, 7: 4.5, 8: 5 };
const HOME_BATH_HOURS = { 0: 0, 1: 0, 2: 0.5, 3: 1, 4: 1.5, 5: 2 };

function count(n, max) {
  const v = parseInt(n, 10);
  return Number.isNaN(v) ? null : Math.min(Math.max(v, 0), max);
}

function estimateHours({ sqm, cleanType, kitchen, baths, bedrooms }) {
  const bath = count(baths, 5);
  const beds = count(bedrooms, 8);
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
  return Math.round(Math.max(hrs, MIN_HOURS) * 100) / 100;
}

// The estimate in hours and minutes, so the booking can be set to the right length.
function bookingLength(hours) {
  if (!hours) return '';
  const mins = Math.round(hours * 4) * 15;
  const h = Math.floor(mins / 60), m = mins % 60;
  return [h ? `${h} hour${h === 1 ? '' : 's'}` : '', m ? `${m} minutes` : ''].filter(Boolean).join(' ');
}

// The quote line's name, e.g. "Office cleaning, weekly, per visit" or "Home deep clean, once off".
function visitName(e) {
  const space = { office: 'Office', retail: 'Retail', medical: 'Medical centre', gym: 'Gym', home: 'Home', 'ndis-dva': 'Home' }[e.space_type] || '';
  const what = e.space_type === 'builder' ? 'Builder’s clean' : `${space} ${e.clean_type === 'deep' ? 'deep clean' : 'cleaning'}`.trim();
  const often = { 'once-off': 'once off', staged: 'in stages, per stage' }[e.frequency] || [LABELS.frequency[e.frequency], 'per visit'].filter(Boolean).join(', ').toLowerCase();
  return `${what.charAt(0).toUpperCase()}${what.slice(1)}, ${often}`;
}

// What the quote and invoice tell the client: what, where and how often, with no hours or internal notes.
function quoteDescription(e) {
  const where = [e.address, e.suburb].filter(Boolean).join(', ');
  const often = { daily: 'Daily visits.', weekly: 'Weekly visits.', fortnightly: 'Fortnightly visits.', monthly: 'Monthly visits.', 'once-off': 'A once off clean.', staged: 'Cleaned in stages as the work progresses.' }[e.frequency];
  return [
    `${visitName(e).split(',')[0]}${where ? ` at ${where}` : ''}.`,
    often,
    'Cleaned to our agreed checklist, with all products and equipment supplied.',
    e.space_type === 'ndis-dva' ? 'Charged at the approved hourly rate for your funding.'
      : `One fixed price ${{ 'once-off': 'for the clean', staged: 'per stage' }[e.frequency] || 'per visit'}. Anything outside the checklist is quoted separately.`,
  ].filter(Boolean).join('\n');
}

// Commercial and home quotes get one fixed price line so clients never see hours: the VISIT item, priced at the
// estimate's hours × the CLEAN hourly rate plus the TRAVEL job fee, all three saved in ServiceM8 before GST. CLEAN is
// $63.64, which is the flat $70 an hour including GST, so the GST inclusive total is rounded to the nearest 50 cents to
// land on exactly hours × $70. NDIS and DVA bill
// by the hour, so they get their capped hourly item instead (NDIS carries the support item name and number for claiming).
async function addQuoteLines(env, job, quote) {
  const items = await sm8Get(env, 'material.json');
  const find = code => items.find(m => m.active == 1 && String(m.item_number).trim().toUpperCase() === code);
  const codes = quote.visit ? ['VISIT', 'CLEAN', 'TRAVEL'] : [quote.code];
  const [item, clean, travel] = codes.map(find);
  if (!item || (quote.visit && (!clean || !travel))) throw new Error(`Items ${codes.join(', ')} not found (ServiceM8 returned ${items.length} items)`);
  const line = { job_uuid: job, material_uuid: item.uuid, name: quote.visit ? quote.name : item.name, quantity: String(quote.visit ? 1 : quote.hours), cost: item.cost || '0', tax_rate_uuid: item.tax_rate_uuid || '' };
  // ServiceM8 rejects a line unless displayed_amount matches its price.
  if (!quote.visit) {
    const price = String(Number(item.price) || 0);
    return sm8Create(env, 'jobmaterial', { ...line, price, displayed_amount: price, displayed_amount_is_tax_inclusive: '0' });
  }
  const incGst = Math.round((quote.hours * Number(clean.price) + Number(travel.price)) * 1.1 * 2) / 2;
  try {
    await sm8Create(env, 'jobmaterial', { ...line, price: (incGst / 1.1).toFixed(4), displayed_amount: incGst.toFixed(2), displayed_amount_is_tax_inclusive: '1' });
  } catch (err) {
    // Fall back to a price before GST in whole cents, which can land a cent either side of the GST inclusive total.
    console.error('ServiceM8 GST inclusive line failed, retrying before GST:', err);
    const price = (incGst / 1.1).toFixed(2);
    await sm8Create(env, 'jobmaterial', { ...line, price, displayed_amount: price, displayed_amount_is_tax_inclusive: '0' });
  }
}

// The Quote Description box on the job's Billing tab, which is what the quote and invoice show the client.
async function setQuoteDescription(env, job, description) {
  const res = await fetch(`https://api.servicem8.com/api_1.0/job/${job}.json`, {
    method: 'POST',
    headers: { 'X-Api-Key': env.SERVICEM8_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ work_done_description: description }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`ServiceM8 quote description failed: ${res.status} ${await res.text()}`);
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

// DVA only pays Household Services invoices uploaded at its Provider Upload Page, never emailed ones,
// so the job gets no DVA billing contact, just the client's DVA references, which show on the invoice.
const DVA_UPLOAD = 'connect.dva.gov.au/provider/upload';

async function addDvaReferences(env, job, e) {
  const refs = [e.dva_claim && `Claim ${e.dva_claim}`, e.dva_file && `DVA file ${e.dva_file}`, e.dva_trn && `TRN ${e.dva_trn}`].filter(Boolean).join(', ');
  if (refs) {
    const res = await fetch(`https://api.servicem8.com/api_1.0/job/${job}.json`, {
      method: 'POST',
      headers: { 'X-Api-Key': env.SERVICEM8_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ purchase_order_number: refs.slice(0, 100) }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`ServiceM8 job references failed: ${res.status}`);
  }
}

// The Booking Reminder automation only reminds clients on jobs with this badge, so every website job gets it.
async function addReminderBadge(env, job) {
  const badge = (await sm8Get(env, 'badge.json')).find(b => b.active == 1 && String(b.name).trim().toLowerCase() === 'booking reminder');
  if (!badge) throw new Error('Badge "Booking Reminder" not found');
  const has = async () => String((await sm8Get(env, `job/${job}.json`)).badges || '').includes(badge.uuid);
  // ServiceM8 stores badges as a JSON list; the API has accepted both a string and an array over time.
  for (const badges of [JSON.stringify([badge.uuid]), [badge.uuid]]) {
    const res = await fetch(`https://api.servicem8.com/api_1.0/job/${job}.json`, {
      method: 'POST',
      headers: { 'X-Api-Key': env.SERVICEM8_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ badges }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok && await has()) return;
  }
  throw new Error('ServiceM8 did not keep the badge');
}

async function noteOnJob(env, job, text) {
  await sm8Create(env, 'note', { related_object: 'job', related_object_uuid: job, note: text }).catch(err => console.error('ServiceM8 note failed:', err));
}

// Job categories in ServiceM8, by the form's space type. A name missing in ServiceM8 leaves the job uncategorised.
const SM8_CATEGORY = { office: 'Office', retail: 'Retail', medical: 'Medical', gym: 'Gym', builder: 'Builders', home: 'Home', 'ndis-dva': 'NDIS and DVA', other: 'Other' };

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

// Each enquiry becomes a quote job holding the enquiry details, with the estimate's line and the client's
// quote description already added. A new email gets a new client and contact; a known email reuses its client.
async function sendToServiceM8(env, e, validEmail, quote, description) {
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
    e.funding === 'dva' ? addDvaReferences(env, job, e).catch(async err => {
      console.error('ServiceM8 DVA references failed:', err);
      await noteOnJob(env, job, `The website couldn't add the DVA references, so please put the claim reference, DVA file number and TRN in the PO number. Reason: ${String(err.message || err).slice(0, 300)}`);
    }) : null,
    addReminderBadge(env, job).catch(async err => {
      console.error('ServiceM8 badge failed:', err);
      await noteOnJob(env, job, `The website couldn't add the Booking Reminder badge, so please add it if you want the client reminded before their clean. Reason: ${String(err.message || err).slice(0, 300)}`);
    }),
    quote ? addQuoteLines(env, job, quote).catch(async err => {
      console.error('ServiceM8 quote line failed:', err);
      const what = quote.visit ? `a VISIT line priced at ${quote.hours} hours × the CLEAN rate plus the TRAVEL fee` : `${quote.hours} hours of ${quote.code}`;
      await noteOnJob(env, job, `The website couldn't add the quote line (${what}), so please add it before sending the quote. Reason: ${String(err.message || err).slice(0, 400)}`);
    }) : null,
    setQuoteDescription(env, job, quoteDescription(e)).catch(async err => {
      console.error('ServiceM8 quote description failed:', err);
      await noteOnJob(env, job, `The website couldn't fill in the Quote Description on the Billing tab, so please add a short summary of the service before sending the quote. Reason: ${String(err.message || err).slice(0, 300)}`);
    }),
  ]);
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!fromThisSite(request)) return json({ error: 'Forbidden.' }, 403);
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
  const beds = count(body.bedrooms, 8);
  if (personal ? !beds : !text(body.sqm_range)) return json({ error: `Missing required field: ${personal ? 'bedrooms' : 'sqm_range'}` }, 400);

  // Bots fill the hidden "website" field; pretend it worked and send nothing.
  if (text(body.website) || tooFast(body.elapsed, 8000)) return json({ success: true });

  const e = Object.fromEntries(
    ['biz_name', 'contact_name', 'email', 'mobile', 'suburb', 'clean_type', 'space_type', 'sqm_range', 'frequency', 'estimate', 'notes', 'heard', 'preferred_date', 'preferred_time', 'preferred_days', 'address'].map(k => [k, text(body[k])]),
  );
  e.funding = e.space_type === 'ndis-dva' && LABELS.funding[text(body.funding)] ? text(body.funding) : '';
  const funding = LABELS.funding[e.funding] || '';
  const dva = e.funding === 'dva';
  for (const k of ['dva_file', 'dva_claim', 'dva_trn']) e[k] = dva ? text(body[k]).slice(0, 40) : '';
  const site = new URL(request.url).hostname.replace(/^www\./, '');
  const from = cameFrom(body.from, site);
  const landing = text(body.from && body.from.landing) || '/';
  const bathrooms = body.baths == null ? '' : String(parseInt(body.baths, 10) >= 5 ? '5 or more' : parseInt(body.baths, 10));
  const kitchen = body.kitchen === true ? 'Yes' : body.kitchen === false ? 'No' : '';
  const bedrooms = beds ? (beds >= 8 ? '8 or more' : String(beds)) : '';
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
    ['Funding', esc(funding)],
    ['DVA file number', esc(e.dva_file)],
    ['Claim reference', esc(e.dva_claim)],
    ['TRN', esc(e.dva_trn)],
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

  const validEmail = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/.test(e.email);
  const firstName = e.contact_name.split(/\s+/)[0];
  const priceShown = e.space_type === 'ndis-dva' ? (funding ? `${funding}, priced with them` : 'Priced with them') : (/^(\$[\d,]+ to \$[\d,]+)/.exec(e.estimate) || [])[1] || e.estimate || 'Not shown';
  const tiles = [['Estimate', esc(priceShown)], ['Suburb', esc(e.suburb)], ['Heard about us', esc(e.heard)], ['Start', esc(e.preferred_date || 'Not set yet')]];
  const shown = ['Suburb', 'Space type', 'Estimate shown', 'Preferred start', 'Heard about us'];
  const card = ECARD(`
<tr><td class="mq-pad" style="padding:26px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td><img src="${SITE}/assets/email-logo.png" width="106" height="30" alt="MyQuest" style="display:block;border:0"></td><td align="right" style="${EF};font-size:14px;color:#555555">New enquiry</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:26px 36px 0;${EF}"><span style="display:inline-block;padding:4px 12px;border-radius:999px;background-color:${colour[0]};color:${colour[1]};font-size:13px;font-weight:700">${esc(LABELS.space_type[e.space_type] || e.space_type)}</span>
<div class="mq-h1" style="padding-top:12px;font-size:36px;line-height:40px;font-weight:600;letter-spacing:-1.2px;color:#111111">${esc(who)}</div>
<div style="padding-top:4px;font-size:16px;color:#555555">${e.biz_name ? `${esc(e.contact_name)} · ` : ''}${esc(e.suburb)}</div></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${EPAIRS(tiles.map((x, i) => [x, i]), ([[k, v], i]) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="background-color:${i ? '#f4f4f2' : '#e5f4e4'};border-radius:14px;padding:14px 16px;${EF}"><div style="font-size:13px;color:${i ? '#555555' : '#2c5a36'}">${k}</div><div style="padding-top:4px;font-size:18px;font-weight:600;color:${i ? '#111111' : '#143f1d'}">${v}</div></td></tr></table>`)}</table></td></tr>
<tr><td class="mq-pad" style="padding:14px 36px 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td class="mq-col" width="50%" style="padding-right:5px">${EBTN(`Call ${esc(firstName)}`, `tel:${esc(e.mobile.replace(/\s/g, ''))}`, true, true)}</td><td class="mq-col" width="50%" style="padding-left:5px">${validEmail ? EBTN('Reply by email', `mailto:${esc(e.email)}`, false, true) : ''}</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:28px 36px 0">${ELABEL('Everything they told us')}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows.filter(([k]) => !shown.includes(k)).concat([['Came from', esc(from)], ['First page seen', esc(landing)]]).filter(([k], i, a) => a.findIndex(([x]) => x === k) === i).map(([k, v]) => `<tr><td valign="top" style="padding:12px 12px 12px 0;border-top:1px solid #e3e3e0;width:150px;${EF};font-size:15px;color:#555555">${k}</td><td style="padding:12px 0;border-top:1px solid #e3e3e0;${EF};font-size:15px;font-weight:600;color:#111111">${String(v).replace(/<a /g, '<a style="color:#111111" ')}</td></tr>`).join('')}<tr><td colspan="2" style="border-top:1px solid #e3e3e0;height:0;line-height:0;font-size:0">&nbsp;</td></tr></table></td></tr>
<tr><td class="mq-pad" style="padding:22px 36px 30px;${EF};font-size:13.5px;line-height:21px;color:#888888">Press Reply to answer ${esc(firstName)} directly. ${env.SERVICEM8_API_KEY ? 'It’s also being added to ServiceM8 as a Quote job, with the estimate lines and details filled in.' : ''}</td></tr>`);
  const html = EHEAD('New enquiry') + '\n' + EWRAP(`${esc(who)}, ${esc(e.suburb)}. ${esc(priceShown)}.`, card);


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
    // NDIS and DVA have capped hourly rates, so they get their own hourly item and no TRAVEL fee.
    // Funding not known yet is priced with the client.
    const quote = !hours ? null : e.space_type !== 'ndis-dva' ? { visit: true, hours, name: visitName(e) } : { ndis: { code: 'NDIS', hours }, dva: { code: 'DVA', hours } }[e.funding] || null;
    jobs.push(sendToServiceM8(env, e, validEmail, quote, [
      'Website enquiry',
      ['Booking length', bookingLength(hours)],
      ['Clean type', LABELS.clean_type[e.clean_type] || e.clean_type],
      ['Space type', space],
      ['Size', e.sqm_range],
      ['Bedrooms', bedrooms],
      ['Funding', funding],
      ['DVA file number', e.dva_file],
      ['Claim reference', e.dva_claim],
      ['TRN', e.dva_trn],
      dva ? `DVA invoices: show the client name, claim reference, DVA file number and TRN, then upload the PDF at ${DVA_UPLOAD} with the client's TRN. Never email them, as DVA doesn't pay emailed invoices.` : '',
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
    ].filter(r => typeof r === 'string' ? r : r[1]).map(r => typeof r === 'string' ? r : `${r[0]}: ${r[1]}`).join('\n')));
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
