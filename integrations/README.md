# Enquiry integrations

Every website enquiry can also become a quote job in ServiceM8.
It switches on only when its Cloudflare variable is set, so nothing breaks before setup.
If it fails, the enquiry still goes through and both emails still send; the error shows in the Pages Function logs.

Cloudflare variables live in: Cloudflare dashboard > Workers & Pages > (the MyQuest project) > Settings > Variables and Secrets > Production.
Changes apply from the next deployment (push a commit, or use Retry deployment on the latest one).

## ServiceM8

1. In ServiceM8: Settings > API Keys > create a key.
2. In Cloudflare add `SERVICEM8_API_KEY` (the key, as an encrypted secret). Never paste it into a chat, email or this repo.

Each enquiry then creates:
- a client named after the business (or the person, for homes), with the street address and suburb, and that person as its primary contact. If a contact with the same email already exists, the enquiry uses that client instead of creating a duplicate
- a job with status Quote at the same address, whose description lists every form answer, the estimate shown and where the visitor came from
- the job category that matches the space type (Office, Retail, Medical, Builders, Home, NDIS and DVA or Other), if a category with that name exists in ServiceM8. Open the job and use More, Apply Template to add the matching checklist.
- the quote lines from the website estimate: the hours on the item coded CLEAN and one TRAVEL fee, at their saved prices. NDIS and DVA enquiries get no lines, as they're priced with the client. Keep those two item codes in ServiceM8 (Settings > Materials & Services) and change prices there, not in the code; if the website's rates change, update both.

## 1. Protect against spam

Cloudflare dashboard > Security > WAF > Rate limiting rules: limit `/api/submit-inquiry` to about 5 requests per 10 minutes per IP.
This stops anyone flooding your inbox or ServiceM8 with fake enquiries.

## 2. Form step tracking (Google Analytics)

Events sent from the enquiry form: `enquiry_start`, `enquiry_step` (step_number 2, 3, 4) and `generate_lead`.
In GA4: Explore > Funnel exploration, steps in that order, to see where people leave the form.
