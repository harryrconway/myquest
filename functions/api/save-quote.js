/* POST /api/save-quote — create or update an internal quote. Manager+ only. */

export async function onRequestPost(context) {
  const { request, env } = context;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SERVICE_KEY  = env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: 'Server configuration error.' }, 500);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const jwt = (request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!jwt) return json({ error: 'Unauthorized.' }, 401);

  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${jwt}`, 'apikey': SERVICE_KEY },
  });
  if (!userRes.ok) return json({ error: 'Unauthorized.' }, 401);
  const user = await userRes.json();

  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=role`,
    { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
  );
  const profiles = await profileRes.json().catch(() => []);
  const role = profiles && profiles[0] ? profiles[0].role : null;
  const roleLevel = { owner: 3, manager: 2 };
  if (!role || (roleLevel[role] || 0) < 2) return json({ error: 'Forbidden.' }, 403);

  // ── Parse + validate ──────────────────────────────────────────────────────
  let body;
  try { body = await request.json(); } catch { return json({ error: 'Invalid request body.' }, 400); }

  const VALID_STATUSES = ['draft', 'sent', 'accepted', 'declined'];
  if (body.quote_status && !VALID_STATUSES.includes(body.quote_status)) {
    return json({ error: 'Invalid quote_status.' }, 400);
  }

  const MAX = { name: 100, phone: 20, email: 254, suburb: 100, notes: 500 };
  if (body.full_name     && body.full_name.length     > MAX.name)   return json({ error: 'Name too long.'   }, 400);
  if (body.phone         && body.phone.length         > MAX.phone)  return json({ error: 'Phone too long.'  }, 400);
  if (body.email         && body.email.length         > MAX.email)  return json({ error: 'Email too long.'  }, 400);
  if (body.suburb        && body.suburb.length        > MAX.suburb) return json({ error: 'Suburb too long.' }, 400);
  if (body.internal_notes && body.internal_notes.length > MAX.notes) return json({ error: 'Notes too long.' }, 400);

  // ── Build row ─────────────────────────────────────────────────────────────
  const row = {
    quote_type:          body.quote_type          || null,
    client_type:         body.client_type         || null,
    quote_status:        body.quote_status        || 'draft',
    quoted_price:        body.quoted_price != null ? parseFloat(body.quoted_price) : null,
    quote_source:        body.quote_source        || 'phone',
    suburb:              body.suburb              || null,
    postcode:            body.postcode            || null,
    street_address:      body.street_address      || null,
    state:               body.state               || null,
    parking_type:        body.parking_type        || null,
    access_instructions: body.access_instructions || null,
    service_type:        body.service_type        || null,
    bedrooms:            body.bedrooms     != null ? parseInt(body.bedrooms)     : null,
    bathrooms:           body.bathrooms    != null ? parseInt(body.bathrooms)    : null,
    living_areas:        body.living_areas != null ? parseInt(body.living_areas) : null,
    floor_area_sqm:      body.floor_area_sqm != null ? parseFloat(body.floor_area_sqm) : null,
    num_floors:          body.num_floors   != null ? parseInt(body.num_floors)   : null,
    restroom_count:      body.restroom_count != null ? parseInt(body.restroom_count) : null,
    condition:           body.condition           || null,
    furnished_status:    body.furnished_status    || null,
    pet_info:            body.pet_info            || null,
    property_size_tag:   body.property_size_tag   || null,
    extras:              body.extras              || [],
    urgency:             body.urgency             || null,
    vacate_date:         body.vacate_date         || null,
    is_recurring:        body.is_recurring        || false,
    frequency:           body.frequency           || null,
    recurrence:          body.recurrence          || 'none',
    preferred_days:      body.preferred_days      || [],
    preferred_time:      body.preferred_time      || null,
    lead_source:         body.lead_source         || null,
    full_name:           body.full_name           || null,
    phone:               body.phone               || null,
    email:               body.email               || null,
    internal_notes:      body.internal_notes      || null,
    updated_at:          new Date().toISOString(),
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  let quoteId = body.id || null;

  if (quoteId) {
    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${quoteId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey':        SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!patchRes.ok) return json({ error: 'Failed to update quote.' }, 500);
  } else {
    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey':        SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify({
        ...row,
        status:     'unscheduled',
        created_by: user.id,
        created_at: new Date().toISOString(),
      }),
    });
    if (!insertRes.ok) return json({ error: 'Failed to create quote.' }, 500);
    const inserted = await insertRes.json().catch(() => []);
    quoteId = inserted && inserted[0] ? inserted[0].id : null;
    if (!quoteId) return json({ error: 'Failed to retrieve new quote ID.' }, 500);
  }

  // ── Upsert client (if email provided) ────────────────────────────────────
  if (body.email) {
    await upsertClient({ SUPABASE_URL, SERVICE_KEY, quoteId, body });
  }

  return json({ success: true, id: quoteId });
}

async function upsertClient({ SUPABASE_URL, SERVICE_KEY, quoteId, body }) {
  try {
    const { full_name, email, phone } = body;
    const existingRes = await fetch(
      `${SUPABASE_URL}/rest/v1/clients?email=eq.${encodeURIComponent(email)}&select=id`,
      { headers: { 'Authorization': `Bearer ${SERVICE_KEY}`, 'apikey': SERVICE_KEY } }
    );
    const existing = await existingRes.json().catch(() => []);
    const clientBody = {
      full_name:      full_name           || null,
      email,
      phone:          phone               || null,
      street_address: body.street_address || null,
      suburb:         body.suburb         || null,
      state:          body.state          || null,
      postcode:       body.postcode       || null,
      updated_at:     new Date().toISOString(),
    };
    let clientId;
    if (existing && existing[0]) {
      clientId = existing[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/clients?id=eq.${clientId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey':        SERVICE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify(clientBody),
      });
    } else {
      const createRes = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey':        SERVICE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'return=representation',
        },
        body: JSON.stringify({ ...clientBody, created_at: new Date().toISOString() }),
      });
      const created = await createRes.json().catch(() => []);
      clientId = created && created[0] ? created[0].id : null;
    }
    if (clientId) {
      await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${quoteId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey':        SERVICE_KEY,
          'Content-Type':  'application/json',
          'Prefer':        'return=minimal',
        },
        body: JSON.stringify({ client_id: clientId }),
      });
    }
  } catch (_) { /* swallow — client upsert failure doesn't block the save */ }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
