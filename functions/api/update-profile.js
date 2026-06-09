/* ============================================================
   POST /api/update-profile
   Updates role, cleaning_level, or status for a user.
   Requires: Authorization: Bearer <JWT> from an owner account.
   Body: { userId, role?, cleaning_level?, status? }
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
  if (!callerProfile || callerProfile.role !== 'owner') return json({ error: 'Only owners can update profiles.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { userId, role, cleaning_level, status } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);

  const updates = {};
  if (role !== undefined) {
    const validRoles = ['owner', 'manager', 'staff'];
    if (!validRoles.includes(role)) return json({ error: 'Invalid role.' }, 400);
    updates.role = role;
  }
  if (cleaning_level !== undefined) updates.cleaning_level = Number(cleaning_level) || 1;
  if (status !== undefined) {
    const validStatuses = ['active', 'suspended'];
    if (!validStatuses.includes(status)) return json({ error: 'Invalid status.' }, 400);
    updates.status = status;
  }

  if (Object.keys(updates).length === 0) return json({ error: 'No fields to update.' }, 400);

  const { error: updateError } = await adminClient.from('profiles').update(updates).eq('id', userId);
  if (updateError) return json({ error: 'Failed to update profile.' }, 500);

  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
  });
}
