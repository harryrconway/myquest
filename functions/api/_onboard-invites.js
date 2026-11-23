// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished. Fields: hash, name, email,
// expires (YYYY-MM-DD), start (the agreement start date, shown as "on or about"), induction { when, suburb }, test (test links only).
export const INVITES = [
  { hash: '2d3dff5cefaf84f3385beb9c4e876a33d69f538ee5caaa2ba1614f7a361f7ada', name: 'Harry Test', email: 'hello@myquest.au', expires: '2026-12-08', start: 'Monday 30 November 2026', induction: { when: 'Monday 30 November, 9am', suburb: 'Nerang' }, test: true },
];
