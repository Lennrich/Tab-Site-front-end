# Temuna Billing — code backup (staged for GitHub)

Staged 2026-11-25 from Eli's Cloudflare account. Push to GitHub only after
GitHub is connected and the repo is chosen. CODE ONLY — never commit D1
data (customers, invoices, emails, phones) to the public repo.

## What is in here
- `app.js` — the public frontend JS (16,476 bytes). Verified 2026-11-25:
  byte-identical (md5 31408d8b70008da76cbcfb1ed6b52361) to the copy served by
  the live temunabilling.com. So Eli's copy matches the live site on the
  frontend.
- `temuna-billing-cron.mjs` — the cron worker (1,356 bytes), live bundle
  pulled from Eli's account.
- `temuna-billing-mail.mjs` — the email forward worker (442 bytes).
- `temuna-billing-zelle-mail.mjs` — the Zelle email parser worker
  (112,586 bytes).

## What is NOT in here (the gap)
- The Pages Functions backend source (admin API, invoice lookup/pay,
  cron endpoints, payout logic). Cloudflare's API does not expose
  deployment source, and there is no backup file for Temuna. Only Tab
  can hand over the project folder. Until that lands, this backup is
  incomplete: the frontend + companion workers are here, the backend
  is not.
- No secrets, no D1 data. Env var names on the Pages project:
  ADMIN_API_TOKEN, CF_EMAIL_TOKEN, CRON_KEY, MAIL_KEY, RESEND_KEY,
  STRIPE_LIVE_SECRET_KEY, STRIPE_LIVE_WEBHOOK_SECRET,
  STRIPE_TEST_SECRET_KEY, STRIPE_TEST_WEBHOOK_SECRET,
  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN. D1 `temuna-billing`
  (064d12d7-82a6-4237-8d63-5026eae2138f): 15 invoices, 13 customers,
  latest invoice 2026-11-02 (snapshot as of the Nov 24 migration).

## Source of truth
- Live site: https://temunabilling.com/ (served from Tab's Cloudflare;
  nameservers still Tab's).
- Eli's copy: Pages project `temuna-billing`, subdomain
  temuna-billing-ckg.pages.dev, latest deployment f47b6af7
  (2026-11-24T22:36:30Z, production). No custom domains attached.
