// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished. Fields: hash, name, email,
// expires (YYYY-MM-DD), start (the agreement start date, shown as "on or about"), induction { when, suburb }, test (test links only).
export const INVITES = [
  {
    hash: '52d842ba8f67d13ec92b6f023f8a871c9633dd2e14bdeaa3b359eb41f8fa794c',
    name: 'Kailani Williams',
    email: '',
    expires: '2026-12-10',
    start: '',
    induction: { when: '', suburb: '' },
  },
];
