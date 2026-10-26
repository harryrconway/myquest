const TO = 'hello@myquest.au';
const REQUIRED = ['contact_name', 'email', 'mobile', 'suburb', 'space_type', 'sqm_range', 'frequency', 'heard'];

const LABELS = {
  clean_type: { maintenance: 'Maintenance clean', deep: 'Deep clean' },
  space_type: { office: 'Office', retail: 'Retail', medical: 'Medical', home: 'Home', 'ndis-dva': 'NDIS / DVA', other: 'Other' },
  frequency: { weekly: 'Weekly', fortnightly: 'Fortnightly', monthly: 'Monthly', 'once-off': 'Once off' },
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

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON.' }, 400);
  }

  for (const field of REQUIRED) {
    if (!text(body[field])) return json({ error: `Missing required field: ${field}` }, 400);
  }
  if (!['home', 'ndis-dva'].includes(text(body.space_type)) && !text(body.biz_name)) return json({ error: 'Missing required field: biz_name' }, 400);

  // Bots fill the hidden "website" field; pretend it worked and send nothing.
  if (text(body.website)) return json({ success: true });

  const e = Object.fromEntries(
    ['biz_name', 'contact_name', 'email', 'mobile', 'suburb', 'clean_type', 'space_type', 'sqm_range', 'frequency', 'estimate', 'notes', 'heard'].map(k => [k, text(body[k])]),
  );
  const site = new URL(request.url).hostname.replace(/^www\./, '');
  const from = cameFrom(body.from, site);
  const landing = text(body.from && body.from.landing) || '/';
  const bathrooms = body.baths == null ? '' : String(parseInt(body.baths, 10) >= 3 ? '3 or more' : parseInt(body.baths, 10));
  const kitchen = body.kitchen === true ? 'Yes' : body.kitchen === false ? 'No' : '';

  const who = e.biz_name || e.contact_name;
  const rows = [
    ['Business', e.biz_name ? `<strong>${esc(e.biz_name)}</strong>` : ''],
    ['Contact', esc(e.contact_name)],
    ['Email', `<a href="mailto:${esc(e.email)}">${esc(e.email)}</a>`],
    ['Mobile', `<a href="tel:${esc(e.mobile)}">${esc(e.mobile)}</a>`],
    ['Suburb', esc(e.suburb)],
    ['Clean type', esc(LABELS.clean_type[e.clean_type] || e.clean_type)],
    ['Space type', esc(LABELS.space_type[e.space_type] || e.space_type)],
    ['Size', esc(e.sqm_range)],
    ['Frequency', esc(LABELS.frequency[e.frequency] || e.frequency)],
    ['Kitchen', kitchen],
    ['Bathrooms', bathrooms],
    ['Estimate shown', esc(e.estimate)],
    ['Notes', esc(e.notes).replace(/\n/g, '<br>')],
    ['Heard about us', `<strong>${esc(e.heard)}</strong>`],
    ['Came from', esc(from)],
    ['First page seen', esc(landing)],
  ].filter(([, v]) => v);

  const html = `
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
        subject: `New ${{ home: 'home ', 'ndis-dva': 'NDIS / DVA ' }[e.space_type] || ''}enquiry: ${who} — ${e.suburb} (via ${e.heard})`,
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

  return json({ success: true });
}
