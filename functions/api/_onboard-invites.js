// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished. Fields: hash, name, email,
// expires (YYYY-MM-DD), start (the agreement start date, shown as "on or about"), induction { when, suburb }, test (test links only).
export const INVITES = [
  {
    hash: 'f62df7697959d8e1273a2a37ad9a196162e54248f174f05f392a8ffdbc6cee68',
    name: 'Harry Conway',
    email: 'hello@myquest.au',
    expires: '2026-11-24',
    start: 'Monday 1 December 2026',
    induction: { when: 'Monday 1 December, 9am', suburb: 'Nerang' },
  },
];
