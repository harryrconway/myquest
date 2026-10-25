function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Reads one row so Supabase sees database activity and never pauses the free project; watch/ calls this on a schedule.
export async function onRequestGet({ env }) {
  try {
    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/inquiries?select=id&limit=1`, {
      headers: { 'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'apikey': env.SUPABASE_SERVICE_KEY },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.error('Health check failed:', res.status, await res.text());
      return json({ ok: false }, 503);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('Health check failed:', e);
    return json({ ok: false }, 503);
  }
}
