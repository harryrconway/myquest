// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished. Fields: hash, name, email,
// expires (YYYY-MM-DD), start (the agreement start date, shown as "on or about"), induction { when, suburb }, test (test links only).
export const INVITES = [
  {
    hash: 'c5459db8e7efe982e0fcb70339510c388956e605fb3a97a491c272669458f83b',
    name: 'Emmett Jupe',
    email: '',
    expires: '2026-11-29',
    start: '30 November 2026',
    induction: { when: 'Monday 30 November, 9am', suburb: 'Nerang' },
  },
];
