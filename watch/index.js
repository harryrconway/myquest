const SITE = 'https://myquest.au';
const SUPABASE_URL = 'https://sfyalevtmdiwvefnsaja.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_7efLI_KQ7QAkZenEyXeuOA_qNnnH8U2';
const ALERT_TO = 'hello@myquest.au';
const REMIND_EVERY = 6 * 60 * 60 * 1000;

const CHECKS = [
  {
    name: 'Database',
    run: () => request(`${SITE}/api/health`),
    fix: 'Supabase has probably paused the project. Open supabase.com/dashboard, open MyQuest and press Restore. New enquiries still reach this inbox in the meantime, marked "NOT saved to CRM".',
  },
  {
    name: 'CRM sign in',
    run: () => request(`${SUPABASE_URL}/auth/v1/health`, { headers: { apikey: SUPABASE_PUBLISHABLE_KEY } }),
    fix: 'Staff can\'t sign in to the CRM. This is usually the same Supabase pause, so check supabase.com/dashboard first.',
  },
  {
    name: 'Enquiry form',
    run: () => request(`${SITE}/api/submit-inquiry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }, 400),
    fix: 'The enquiry form isn\'t answering. Check the latest deployment of the myquest project in Cloudflare Pages.',
  },
  {
    name: 'Website',
    run: () => request(`${SITE}/`),
    fix: 'myquest.au isn\'t loading. Check Cloudflare Pages and the myquest.au DNS records.',
  },
];

async function request(url, init = {}, expected = 200) {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(10000) });
    return res.status === expected;
  } catch {
    return false;
  }
}

async function failingChecks() {
  const first = await Promise.all(CHECKS.map(c => c.run()));
  const suspect = CHECKS.filter((c, i) => !first[i]);
  if (!suspect.length) return [];
  await new Promise(r => setTimeout(r, 5000));
  const second = await Promise.all(suspect.map(c => c.run()));
  return suspect.filter((c, i) => !second[i]);
}

function sydneyTime(ms) {
  return new Date(ms).toLocaleString('en-AU', { timeZone: 'Australia/Sydney', dateStyle: 'medium', timeStyle: 'short' });
}

async function sendEmail(env, subject, html) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'MyQuest alerts <hello@myquest.au>', to: [ALERT_TO], subject, html }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.error('Resend error:', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.error('Resend error:', e);
    return false;
  }
}

async function watch(env, now) {
  const failing = await failingChecks();
  const names = failing.map(c => c.name);
  const prev = JSON.parse((await env.STATE.get('state')) || '{"failing":[]}');

  if (names.length) {
    const changed = names.join('|') !== prev.failing.join('|');
    const due = !prev.alertedAt || now - prev.alertedAt >= REMIND_EVERY;
    if (!changed && !due) return { failing: names, emailed: false };
    const since = prev.failing.length ? prev.since : now;
    const items = failing.map(c => `<li style="margin:0 0 10px"><strong>${c.name}</strong><br>${c.fix}</li>`).join('');
    const sent = await sendEmail(env, `MyQuest problem: ${names.join(', ')}`, `
      <p style="margin:0 0 12px">These checks are failing on myquest.au, since ${sydneyTime(since)}:</p>
      <ul style="margin:0 0 16px;padding-left:20px">${items}</ul>
      <p style="margin:0;color:#666;font-size:13px">You'll get a reminder every 6 hours while it's down, and an email when it's working again.</p>`);
    await env.STATE.put('state', JSON.stringify({ failing: names, since, alertedAt: sent ? now : prev.alertedAt || null }));
    return { failing: names, emailed: sent };
  }

  if (prev.failing.length) {
    const sent = await sendEmail(env, 'MyQuest is working again', `
      <p style="margin:0">Everything on myquest.au is working again (${prev.failing.join(', ')} recovered). It was down from ${sydneyTime(prev.since)} to ${sydneyTime(now)}.</p>`);
    if (sent) await env.STATE.put('state', JSON.stringify({ failing: [] }));
    return { failing: [], emailed: sent };
  }

  return { failing: [], emailed: false };
}

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(watch(env, event.scheduledTime).then(r => console.log('watch', JSON.stringify(r))));
  },
};
