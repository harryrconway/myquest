# MyQuest

Website for MyQuest Pty Ltd, commercial and house cleaning on the Gold Coast and Tweed Heads: [myquest.au](https://myquest.au).

**Stack:** static HTML on Cloudflare Pages, one Pages Function for the enquiry form, Resend to email enquiries. No framework, no build step, no database.

---

## Layout

| Path | What it is |
|---|---|
| `public/` | Everything the website serves. Each page is a single HTML file with its CSS and JS inline. |
| `public/assets/` | Logos, icons, the share image (`og.png`) and the self-hosted Instrument Sans font. |
| `public/_headers`, `public/_redirects` | Security and cache headers, and redirects for retired URLs. |
| `functions/api/submit-inquiry.js` | `POST /api/submit-inquiry`: emails the enquiry to hello@myquest.au. |

Cloudflare Pages publishes only `public/` (build output directory `public`) plus `functions/`. Nothing outside `public/` is readable on the live site, so never put docs, notes or secrets in there.

## Local development

```bash
npx wrangler pages dev public --port 8788
```

The form needs `RESEND_API_KEY` in a local `.dev.vars` file (see `.dev.vars.example`; it's gitignored). Without it the form shows its error message, everything else works. For pages only, `python3 -m http.server 8788 --directory public` is enough.

## Enquiries

The form on the home page posts to `/api/submit-inquiry`. Space types are office, retail, medical, home, ndis-dva and other; business name is optional for home and ndis-dva, and ndis-dva skips the instant estimate (pricing depends on the client's support arrangements). Service page buttons link to `/?space=<type>#enquire` so the form opens with that type picked. The function emails hello@myquest.au through Resend with the customer as the reply-to. The subject ends with how they heard about us, e.g. `(via Facebook)`, so Gmail search answers "how many enquiries came from Facebook".

Every email also includes **Came from** (the referring site, UTM tags or ad click, captured on the visitor's first page of the session) and **First page seen**. Tag links you post with UTM parameters to make this precise, for example `https://myquest.au/?utm_source=facebook&utm_medium=social&utm_campaign=spring`.

A hidden honeypot field drops most spam bots without a captcha.

## Production settings

- Cloudflare Pages → myquest → Settings: build output directory `public`, no build command.
- Environment variable: `RESEND_API_KEY` (encrypted). Nothing else is needed.

## Deployment

Push to `main` and Cloudflare Pages deploys in about 20 seconds.

## Mobile requirement

**Every UI change must render correctly on mobile (375px viewport).** Before committing any HTML or CSS change, check:

- No horizontal overflow: nothing should make the page scroll sideways
- Tap targets are at least 44×44px
- Multi-column grids collapse to 1–2 columns on small screens
- Fixed or overlay elements account for the 56px mobile bar
- Text does not overflow its container
