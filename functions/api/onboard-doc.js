import { findInvite } from './onboard-start.js';
import { agreementHtml, SAFETY_HTML, HANDBOOK_HTML } from './_onboard-docs.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

const clip = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function onRequestPost({ request }) {
  if (!(request.headers.get('Content-Type') || '').includes('application/json')) return json({ ok: false }, 415);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const inv = await findInvite(body && body.t);
  if (!inv) return json({ ok: false, reason: 'invalid' }, 404);
  if (inv.expired) return json({ ok: false, reason: 'expired' }, 410);

  switch (body.doc) {
    case 'agreement':
      return json({
        ok: true,
        title: 'Casual employment agreement',
        html: agreementHtml({
          name: clip(body.name, 80) || inv.name,
          address: clip(body.address, 160),
          start: inv.start || '',
        }),
      });
    case 'handbook':
      return json({ ok: true, title: 'MyQuest Staff Handbook', html: HANDBOOK_HTML });
    case 'safety':
      return json({ ok: true, title: 'Safety induction', html: SAFETY_HTML });
    default:
      return json({ ok: false }, 404);
  }
}

export async function onRequest() {
  return json({ ok: false }, 405);
}
