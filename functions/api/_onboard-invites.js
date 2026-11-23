// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished. Fields: hash, name, email,
// expires (YYYY-MM-DD), start (the agreement start date, shown as "on or about"), induction { when, suburb }, test (test links only).
export const INVITES = [
  {
    hash: '85e93e3ded3be9b2516c8984fcb6f129304dfabff98660293e171f8dfb306f44',
    name: 'Harry Test',
    test: true,
    email: 'hello@myquest.au',
    expires: '2026-12-07',
    start: 'Monday 1 December 2026',
    // Suburb only: the exact address is texted the day before, once their police check has been seen.
    induction: { when: 'Monday 1 December, 9am', suburb: 'Nerang' },
  },
];
