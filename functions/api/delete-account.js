/* ============================================================
   POST /api/delete-account
   Permanently deletes a Supabase Auth user + their profile.
   Requires: Authorization: Bearer <JWT> from an owner account.
   Body: { userId }
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
  if (!callerProfile || callerProfile.role !== 'owner') return json({ error: 'Only owners can delete accounts.' }, 403);

  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const { userId } = body;
  if (!userId) return json({ error: 'userId is required.' }, 400);

  // Prevent self-deletion
  if (userId === userData.user.id) return json({ error: 'You cannot delete your own account.' }, 400);

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
  if (deleteError) return json({ error: 'Failed to delete account.' }, 500);

  return json({ success: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' },
  });
}
