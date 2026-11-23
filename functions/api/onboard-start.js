import { INVITES } from './_onboard-invites.js';
import { fromThisSite } from './_guard.js';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' },
  });
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Constant time compare, so the response time says nothing about how close a guessed token was.
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Each finished link gets a "used" marker in Cloudflare KV (binding ONBOARD_USED), keyed by its hash. Nothing
// personal is kept, and the marker clears itself after 60 days. Test links are never marked.
export async function isUsed(env, inv) {
  if (inv.test || !env || !env.ONBOARD_USED) return false;
  return !!(await env.ONBOARD_USED.get(inv.hash));
}
export async function markUsed(env, inv) {
  if (inv.test || !env || !env.ONBOARD_USED) return;
  await env.ONBOARD_USED.put(inv.hash, new Date().toISOString(), { expirationTtl: 60 * 60 * 24 * 60 });
}

export async function findInvite(token, env) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const h = await sha256(token);
  const inv = INVITES.find((i) => same(i.hash, h));
  if (!inv) return null;
  // A link works until the end of its expiry day, Brisbane time.
  if (Date.now() > Date.parse(`${inv.expires}T23:59:59+10:00`)) return { expired: true };
  if (await isUsed(env, inv)) return { used: true };
  return inv;
}

export { fromThisSite };

export async function onRequestPost({ request, env }) {
  if (!fromThisSite(request)) return json({ ok: false }, 403);
  const type = request.headers.get('Content-Type') || '';
  if (!type.includes('application/json')) return json({ ok: false }, 415);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false }, 400); }
  const inv = await findInvite(body && body.t, env);
  if (!inv) return json({ ok: false, reason: 'invalid' }, 404);
  if (inv.expired) return json({ ok: false, reason: 'expired' }, 410);
  if (inv.used) return json({ ok: false, reason: 'used' }, 410);
  return json({
    ok: true,
    name: inv.name,
    email: inv.email,
    expires: inv.expires,
    induction: { when: inv.induction?.when || '', suburb: inv.induction?.suburb || '' },
    test: !!inv.test,
  });
}

export async function onRequest() {
  return json({ ok: false }, 405);
}
