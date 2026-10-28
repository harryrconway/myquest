# MyQuest — AI Developer Context

## What this is
Marketing website for a cleaning business: commercial (offices, medical, retail and showrooms, builders) and homes (house cleaning page, plus an NDIS & DVA page). NDIS and DVA content lives on `/ndis-dva-cleaning` and the home page, with a link in the other services section of each service page; the site never states NDIS registration or DVA approval status. Static HTML on Cloudflare Pages, one Pages Function (`functions/api/submit-inquiry.js`) that emails enquiries through Resend, sends the customer a confirmation email, and (when their Cloudflare variables are set) texts through ClickSend and logs leads to a Google Sheet. Setup for those is in `integrations/README.md`. No CRM, no database, no framework, no build step. Keep it that way unless the owner asks otherwise.

Pages publishes only `public/`. Everything else in the repo is private. Never add docs, notes, secrets or server code under `public/`.

## Conventions
- Each page is one self-contained HTML file with inline CSS and JS. Keep pages fast: no third-party scripts, fonts or embeds other than Google Analytics (`G-XGVV9RYC00`, right after `<meta charset>` on every page, allowed in the CSP in `_headers`) and Cloudflare Web Analytics (injected by Cloudflare itself). A successful enquiry sends a GA `generate_lead` event with space_type, heard and clean_type.
- The only font is Instrument Sans, self-hosted at `public/assets/fonts/instrument-sans.woff2` and preloaded on every page.
- Internal links use clean URLs (`/office-cleaning`, not `/office-cleaning.html`).
- Default to no code comments. Only add one when the WHY is non-obvious.
- Every page carries a source capture snippet before `</head>` that stores the visitor's first referrer, landing page and UTM tags in `sessionStorage.mqFrom`; the form sends it with the enquiry. New pages need it too.

## When adding or changing a page
- Unique `<title>`, meta description, canonical, Open Graph and Twitter tags (`/assets/og.png`, 1200×630).
- Structured data: LocalBusiness on the home page, Service plus BreadcrumbList on service pages.
- Add it to `public/sitemap.xml` and `public/llms.txt`, and update `lastmod`.
- Check it at 375px wide (see README, Mobile requirement).

## Writing style
- Never use em dashes (—), en dashes (–) or hyphens in any written copy (page text, headings, meta descriptions, alt text, emails). Rephrase instead, for example "police checked" not "police-checked", "once off" not "once-off". Code, CSS, class names, URLs and file names are exempt.
