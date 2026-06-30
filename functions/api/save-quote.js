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

  // ── Save ──────────────────────────────────────────────────────────────────
  const quoteId = body.id || null;

  if (quoteId) {
    // Sparse PATCH — only update fields explicitly provided in the request body.
    // This lets acceptQuote send just {id, quote_status} without clobbering other data.
    const PATCHABLE = [
      'quote_type', 'client_type', 'quote_status', 'quoted_price', 'quote_source',
      'suburb', 'postcode', 'street_address', 'state', 'parking_type', 'access_instructions',
      'service_type', 'bedrooms', 'bathrooms', 'living_areas', 'floor_area_sqm',
      'num_floors', 'restroom_count', 'condition', 'furnished_status', 'pet_info',
      'property_size_tag', 'extras', 'urgency', 'vacate_date', 'is_recurring',
      'frequency', 'recurrence', 'preferred_days', 'preferred_time', 'lead_source',
      'full_name', 'phone', 'email', 'internal_notes', 'hours', 'hourly_rate',
    ];
    const patchRow = { updated_at: new Date().toISOString() };
    for (const key of PATCHABLE) {
      if (key in body) patchRow[key] = body[key] ?? null;
    }

    const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests?id=eq.${quoteId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey':        SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify(patchRow),
    });
    if (!patchRes.ok) {
      const errBody = await patchRes.json().catch(() => ({}));
      console.error('save-quote patch error:', JSON.stringify(errBody));
      return json({ error: 'Failed to update quote.' }, 500);
    }
  } else {
    // Full INSERT with defaults for all fields
    const insertRow = {
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
      hours:               body.hours        != null ? parseFloat(body.hours)        : null,
      hourly_rate:         body.hourly_rate  != null ? parseFloat(body.hourly_rate)  : null,
      status:              'unscheduled',
      created_by:          user.id,
      created_at:          new Date().toISOString(),
      updated_at:          new Date().toISOString(),
    };

    const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/quote_requests`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey':        SERVICE_KEY,
        'Content-Type':  'application/json',
        'Prefer':        'return=representation',
      },
      body: JSON.stringify(insertRow),
    });
    if (!insertRes.ok) {
      const errBody = await insertRes.json().catch(() => ({}));
      console.error('Supabase insert error:', JSON.stringify(errBody));
      return json({ error: 'Failed to create quote.', detail: errBody }, 500);
    }
    const inserted = await insertRes.json().catch(() => []);
    const newId = inserted && inserted[0] ? inserted[0].id : null;
    if (!newId) return json({ error: 'Failed to retrieve new quote ID.' }, 500);
    return json({ success: true, id: newId });
  }

  return json({ success: true, id: quoteId });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
