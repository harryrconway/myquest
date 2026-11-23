// One entry per invited new starter. Only the SHA-256 hash of each link's token is kept here, so the repo never
// holds a working link. Add an entry to invite someone; remove it once they have finished.
export const INVITES = [
  {
    hash: '85e93e3ded3be9b2516c8984fcb6f129304dfabff98660293e171f8dfb306f44',
    name: 'Harry Test',
    email: 'hello@myquest.au',
    expires: '2026-12-07',
    induction: { when: 'Monday 1 December, 9am', where: '12 Example Street, Nerang QLD 4211' },
  },
];
