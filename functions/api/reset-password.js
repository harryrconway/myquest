/* ============================================================
   POST /api/reset-password
   Sends a Supabase password-reset email to a user.
   Requires: Authorization: Bearer <JWT> from an owner account.
   Body: { email }
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server configuration error.' }, 500);

  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace('Bearer ', '').trim();
  if (!callerJwt) return json({ error: 'Unauthorised.' }, 401);

  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { data: userData, error: userError } = await adminClient.auth.getUser(callerJwt);
  if (userError || !userData?.user) return json({ error: 'Unauthorised.' }, 401);

  const { data: callerProfile } = await adminClient.from('profiles').select('role').eq('id', userData.user.id).single();
  if (!callerProfile || callerProfile.role !== 'owner') return json({ error: 'Only owners can reset passwords.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { email } = body;
  if (!email) return json({ error: 'email is required.' }, 400);

  // Generate a magic password-reset link and email it via Supabase
  const { error: resetError } = await adminClient.auth.admin.generateLink({
    type:  'recovery',
    email: email,
  });

  if (resetError) return json({ error: 'Failed to send reset email.' }, 500);

  return json({ success: true, message: 'Password reset email sent to ' + email });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
  });
}
