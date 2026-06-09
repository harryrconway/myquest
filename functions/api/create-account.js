/* ============================================================
   POST /api/create-account
   Creates a new Supabase Auth user via email invite.
   Requires: Authorization: Bearer <JWT> from an owner account.
   Body: { email, name, role, cleaning_level }
   ============================================================ */
import { createClient } from '@supabase/supabase-js';

export async function onRequestPost(context) {
  const { request, env } = context;

  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Server configuration error.' }, 500);
  }

  // Verify the caller's JWT
  const authHeader = request.headers.get('Authorization') || '';
  const callerJwt  = authHeader.replace('Bearer ', '').trim();
  if (!callerJwt) return json({ error: 'Unauthorised.' }, 401);

  const callerClient = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: userData, error: userError } = await callerClient.auth.getUser(callerJwt);
  if (userError || !userData?.user) return json({ error: 'Unauthorised.' }, 401);

  // Check caller is owner
  const { data: callerProfile } = await callerClient
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single();

  if (!callerProfile || callerProfile.role !== 'owner') {
    return json({ error: 'Only owners can create accounts.' }, 403);
  }

  // Parse body
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { email, name, role, cleaning_level } = body;
  if (!email || !name || !role) return json({ error: 'email, name, and role are required.' }, 400);

  const validRoles = ['owner', 'manager', 'staff'];
  if (!validRoles.includes(role)) return json({ error: 'Invalid role.' }, 400);

  // Invite via Supabase Admin (sends an email invite; no password set server-side)
  const adminClient = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      name:           name,
      role:           role,
      cleaning_level: Number(cleaning_level) || 1,
    },
  });

  if (inviteError) {
    // Surface a clean message — don't leak Supabase internals
    const msg = inviteError.message && inviteError.message.includes('already registered')
      ? 'A user with this email already exists.'
      : 'Failed to send invitation. Please try again.';
    return json({ error: msg }, 400);
  }

  return json({ success: true, message: 'Invitation sent to ' + email });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
