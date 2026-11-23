const ALLOWED = ['https://myquest.au', 'https://www.myquest.au'];

// Only accept form sends made by a page on this site. Browsers always label a fetch with where it came from;
// scripts posting from elsewhere either say so or send nothing, and both are refused.
export function fromThisSite(request) {
  const own = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) return origin === own || ALLOWED.includes(origin);
  return request.headers.get('Sec-Fetch-Site') === 'same-origin';
}

// People take more than a few seconds to fill in a form; bots post straight away. Pages cached from before this
// check send no timing, so a missing value is let through.
export function tooFast(value, minMs) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n < minMs;
}
