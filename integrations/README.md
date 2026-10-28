# Enquiry integrations

Every website enquiry can also: text Harry, text the customer, and add a row to the MyQuest Leads Google Sheet.
Each one switches on only when its Cloudflare variables are set, so nothing breaks before setup.

Cloudflare variables live in: Cloudflare dashboard > Workers & Pages > (the MyQuest project) > Settings > Variables and Secrets > Production.
Changes apply from the next deployment (push a commit, or use Retry deployment on the latest one).

## 1. Lead log (Google Sheet)

1. Open the MyQuest Leads sheet (Google Drive of hello@myquest.au).
2. Extensions > Apps Script. Delete what's there, paste all of `leads-sheet.gs`, click Save.
3. Project Settings (gear icon) > Script properties > Add script property: `LEADS_SECRET` = a long random string.
4. Deploy > New deployment > Select type: Web app. Execute as: Me. Who has access: Anyone. Deploy, then allow access.
5. Copy the Web app URL (ends in `/exec`).
6. In Cloudflare add `LEADS_WEBHOOK_URL` (the URL) and `LEADS_SECRET` (same string as step 3, as an encrypted secret).

Each enquiry adds a row with the time (Brisbane), a Stage dropdown starting at "New enquiry", the space type in its colour, and every form answer.
If you change the script later, use Deploy > Manage deployments > Edit > New version so the URL stays the same.

## 2. Text messages (ClickSend)

1. Sign up at clicksend.com (free trial, no card needed), then add credit.
2. Dashboard > Developers > API Credentials: copy your username and API key.
3. In Cloudflare add `CLICKSEND_USERNAME`, `CLICKSEND_API_KEY` (encrypted secret) and `ALERT_MOBILE` = `+61413154932`.

Harry gets a text for every enquiry. The customer gets a short "thanks, Harry will call you today" text when they gave an Australian mobile.

Sender name: until "MyQuest" is registered on the ACMA SMS Sender ID Register (through ClickSend, needs an authorised ABN contact),
texts come from a ClickSend number. Unregistered business names show as "Unverified" from 1 July 2026, so only add `SMS_FROM` = `MyQuest` once registration is approved.

## 3. Protect against abuse

Cloudflare dashboard > Security > WAF > Rate limiting rules: limit `/api/submit-inquiry` to about 5 requests per 10 minutes per IP.
This stops anyone using the form to send lots of texts.

## 4. Form step tracking (Google Analytics)

Events sent from the enquiry form: `enquiry_start`, `enquiry_step` (step_number 2, 3, 4) and `generate_lead`.
In GA4: Explore > Funnel exploration, steps in that order, to see where people leave the form.
