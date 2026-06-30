/* POST /api/login — validate Turnstile, proxy Supabase password auth */
const ORIGIN = 'https://myquest.au';

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const SUPABASE_URL = env.SUPABASE_URL;
    const ANON_KEY     = env.SUPABASE_ANON_KEY;
    const TS_SECRET    = env.TURNSTILE_SECRET;

    if (!SUPABASE_URL || !ANON_KEY) return json({ error: 'Server configuration error.' }, 500);

    let body;
    try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

    const { email, password, turnstile_token } = body;
    if (!email || !password) return json({ error: 'Email and password are required.' }, 400);

    // Validate Turnstile when a secret is configured.
    // In local dev without TURNSTILE_SECRET set, the check is skipped automatically.
    if (TS_SECRET) {
      if (!turnstile_token) return json({ error: 'Security check is required.' }, 403);
      const tsRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret:   TS_SECRET,
          response: turnstile_token,
          remoteip: request.headers.get('CF-Connecting-IP') || undefined,
        }),
      });
      const tsData = await tsRes.json().catch(() => ({ success: false }));
      if (!tsData.success) return json({ error: 'Security check failed. Please try again.' }, 403);
    }

    const authRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify({ email: String(email).trim().toLowerCase(), password }),
    });

    if (!authRes.ok) {
      return json({ error: 'Invalid email or password. Contact your administrator if you believe this is an error.' }, 401);
    }

    const session = await authRes.json();
    return json({
      access_token:  session.access_token,
      refresh_token: session.refresh_token,
      expires_in:    session.expires_in,
      token_type:    session.token_type,
      user: { id: session.user.id, email: session.user.email },
    });
  } catch (e) {
    return json({ error: 'Internal error.' }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': ORIGIN },
  });
}
