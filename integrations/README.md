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
- a job with status Quote at the same address, whose job description lists every form answer, the booking length (the estimated hours, which staff pay is worked out from), the estimate shown and where the visitor came from. The job description is internal; quotes and invoices never show it
- a Quote Description (on the job's Billing tab) for the client: what, where and how often, with no hours
- the job category that matches the space type (Office, Retail, Medical, Gym, Builders, Home, NDIS and DVA or Other), if a category with that name exists in ServiceM8. Open the job and use More, Apply Template to add the matching checklist.
- one quote line at a fixed price per visit, so clients never see hours: the item coded VISIT, named for the job (for example "Office cleaning, weekly, per visit"), at quantity 1 and priced at the estimated hours × the CLEAN hourly rate plus the TRAVEL job fee. Since 11 November 2026 the price is a flat $70 an hour including GST with no travel fee, so CLEAN is $70 and TRAVEL is $0, and both are read as GST inclusive (the website's instant estimate uses the same $70). CLEAN and TRAVEL are internal rates only and never go on a quote. NDIS enquiries instead get the estimated hours on the item coded NDIS (House Cleaning and Other Household Activities, support item 01_020_0120_1_1, GST free), so the invoice carries the support item for claiming. DVA enquiries get the estimated hours on the item coded DVA (household cleaning at DVA's Household Services maximum, $79.90 an hour including GST for 2026). Both must show hours, and neither gets the TRAVEL fee. Not sure enquiries get no line, as they're priced with the client. Keep the VISIT, CLEAN, TRAVEL, NDIS and DVA item codes in ServiceM8 (Settings > Materials & Services) and change rates there, not in the code; if the website's rates change, update both.
- for DVA enquiries, the claim reference, DVA file number and TRN the client gave in the PO number, which shows on the invoice. Anything the client didn't give is added on the job before invoicing. There's deliberately no DVA billing contact: DVA only pays Household Services invoices uploaded at connect.dva.gov.au/provider/upload with the client's TRN, and emailed invoices aren't paid, so never send them to hhs.accounts@dva.gov.au.
- the Booking Reminder badge, so the 24 hour reminder goes out once the job is booked. Keep a badge with that exact name in ServiceM8 (Settings > Badges).

## 1. Protect against spam

Done 1 November 2026: the Cloudflare rate limiting rule "Enquiry form" (Security rules) blocks an IP for 10 seconds once it sends more than 3 requests to `/api/submit-inquiry` within 10 seconds, the most the free plan allows.
This stops anyone flooding your inbox or ServiceM8 with fake enquiries.

## 2. Form step tracking (Google Analytics)

Events sent from the enquiry form: `enquiry_start`, `enquiry_step` (step_number 2, 3, 4) and `generate_lead`.
In GA4: Explore > Funnel exploration, steps in that order, to see where people leave the form.
