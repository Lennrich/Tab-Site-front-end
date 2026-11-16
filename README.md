# Monsey Clothing Sales — rebuild (your own code)

A fresh, minimal rebuild of monseyclothingsales.com, built from the
front-end backup in `~/workspace/tab_sites_backup/monseyclothingsales.com/`.
Nothing here touches the live site, Tab, Porkbun or Cloudflare.

**The whole point of the site is simple:** a short, memorable link —
monseyclothingsales.com (about $11/year for the domain) — to send in a
text message, instead of the long Cognito form URL. The homepage is just
two buttons per side: Register (goes to the Cognito form) and Reserve a
Slot (the slots page). Registration itself is NOT rebuilt — it still
links out to Cognito. What was rebuilt is the slots backend, which lived
in Tab's Workers and was not in the backup.

## What is in here

| File | What it is |
|---|---|
| `public/index.html` | Homepage — Boys visible, Girls hidden by default. Register buttons link to the existing Cognito forms. |
| `public/slots.html` | Slot picker — copied from the backup, same behaviour (tabs, pick a time, confirm, "book again moves your spot"). |
| `public/privacy.html`, `public/terms.html` | Copied unchanged from the backup, including the SMS consent wording. |
| `public/styles.css` | Clean recreation of the look (the backup referenced a stylesheet it did not include) — with a light corporate polish (Nov 2026): navy top rule, navy headings, softer card shadows, consistent buttons, tidier footer and document pages. Wording, links and behaviour unchanged. |
| `config.json` | **The one place to change things** — the girls flag and all sale dates/times/capacities. All dates in it are SAMPLES. |
| `src/slots.js` | The slots + booking logic, shared by the Worker and the local server. No dependencies. |
| `worker.js` | Cloudflare Worker: serves the site and `GET /api/slots`, `POST /api/book`, `GET /api/config`. |
| `server.js` | Local server (plain Node, no dependencies) for testing — same API, in-memory bookings. |
| `test.js` | Test script — run `node test.js`. |
| `wrangler.toml` | Cloudflare deploy config (fill in the D1 id — see below). |
| `schema.sql` | D1 table for bookings. |

**Deliberately NOT in here:** text sending (Twilio is out of scope),
ride-share, the Oraysa grader, any admin page, and the old
`registrations.html` password page from the backup (its password gate
was never rebuilt — bookings are read from the D1 database instead).
No passwords, tokens, phone numbers or secrets from Tab are in this code.

## The girls switch — the only flag

Girls are **fully built** (homepage side, Cognito link, sale, slots,
booking) but **completely hidden** on the live site — not greyed out,
not visible at all — so parents texted about registering their boys
are not confused.

The flag lives in **`config.json`: `SHOW_GIRLS`** — it is `false` now.

To turn girls on later, either:

1. **No redeploy (easiest):** in the Cloudflare dashboard, set the
   Worker variable `SHOW_GIRLS` to `true`. The Worker checks that
   first; the homepage and the slots API both follow it.
2. **Or:** change `"SHOW_GIRLS": false` to `true` in `config.json`
   and redeploy.

Either way, no code changes and no rebuild of the girls side — it is
already there. While the flag is off, the slots API returns no girls
sales at all, and booking a girls sale is rejected, so even a direct
link to `slots.html?group=girls` shows "No girls' sales are open."

## How to edit the sale dates / slots

Edit **`config.json`** only. Each sale has:

- `slug` — short id, e.g. `boys-sale-sample` (used in the slots URL)
- `title`, `when` — shown on the slots page
- `open` — `true` to take bookings, `false` to close the sale
- `days` — each with `label` (e.g. "Sunday, Dec 6"), `short` (short
  version used in confirmations), and `slots`
- each slot: `slot` (unique id), `label` (e.g. "9:00 AM"),
  `capacity` (how many shoppers fit in that time)

**All dates/times in the file now are SAMPLES** — Sample Day 1 / 2,
9:00 / 10:00 / 11:00 AM, capacities 10 / 10 / 3, plus one 1-seat slot
to show the "full" state. Change them to the real sale dates before
go-live, and keep the slot ids unique.

One booking per phone number per sale: booking again with the same
phone **moves** the spot and frees the old one, as on the original site.

## Test it locally

```bash
node test.js        # runs the full slots/book flow over HTTP
node server.js      # then open http://localhost:8787/
```

`test.js` checks: girls hidden by default, boys slots and spots-left,
booking, moving a booking by the same phone, full-slot rejection,
short-phone and honeypot rejection, and girls booking rejected.

## Deploy it (when Porkbun / Cloudflare access is back)

1. Create a D1 database in your own Cloudflare account and put its id
   in `wrangler.toml` (replace `REPLACE_WITH_YOUR_D1_ID`), then run
   the table setup: `npx wrangler d1 execute monsey-clothing-sales --file schema.sql`
2. Deploy: `npx wrangler deploy`
3. In Cloudflare, point monseyclothingsales.com at this Worker
   (custom domain on the Worker, or a Pages/Workers route).
   Until then, nothing here affects the live site.
4. To see bookings: query D1, e.g.
   `npx wrangler d1 execute monsey-clothing-sales --command "SELECT sale, slot, first_name, last_name, phone, created_at FROM bookings ORDER BY created_at;"`

## Still needed before go-live (Eli's decisions)

- **Real sale dates, times and capacities** for the boys sale — the
  ones in `config.json` are samples only.
- **Domain pointing** — only once Porkbun/Cloudflare access is back;
  do not point the domain at this code until the real dates are in.
- **Text/email to parents** — send the short link
  monseyclothingsales.com; text sending itself is not part of this build.
- **Girls go-live date** — when to flip `SHOW_GIRLS` on (and the real
  girls sale dates, which are also samples in `config.json` now).
