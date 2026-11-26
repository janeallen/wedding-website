# Jane & Thomas — Wedding Website

The wedding website for May 29, 2027 in Morro Bay, CA, served at **janeandthomas.com**.

It's a single scrolling page behind a shared guest password, hosted on Cloudflare Workers. RSVPs are saved to a Cloudflare D1 database.

## What's where

| Path | What it is |
|---|---|
| `public/index.html` | All page content. Look for `[bracketed placeholders]` and `PHOTO SPOT` comments. |
| `public/styles.css` | Design. The color palette is at the top (`--gold` is the accent color). |
| `public/script.js` | Mobile menu, countdown, RSVP form |
| `public/images/` | Photos of Jane & Thomas (`photo-1.jpg` … `photo-4.jpg`) |
| `src/index.js` | Password gate, RSVP saving, admin CSV export |
| `src/login.js` | The password page guests see first |
| `schema.sql` | RSVP database tables |

## How the password works

- Guests enter the password once per device. It's checked **case-insensitively, ignoring spaces**.
- The password is a Cloudflare **secret** (`SITE_PASSWORD`). It is never stored in this repo.
- Changing the secret immediately signs everyone out, and they'll need the new password.

## RSVPs

Each guest in a party picks a **first course** and a **main course**, which Windows on the Water needs one week before the wedding. Dessert is split 50/50.

To download all responses as a spreadsheet, go to **janeandthomas.com/admin/rsvps.csv** and sign in with any username and the `ADMIN_PASSWORD` secret.

## Run it locally

```bash
npm install
printf 'SITE_PASSWORD=Shanty\nADMIN_PASSWORD=localadmin\n' > .dev.vars   # local only, git-ignored
npm run db:local
npm run dev          # http://localhost:8787
```

## First deploy (one time)

```bash
npx wrangler login
npx wrangler d1 create wedding-rsvps          # paste the printed database_id into wrangler.jsonc
npm run db:remote
npx wrangler secret put SITE_PASSWORD
npx wrangler secret put ADMIN_PASSWORD
npm run deploy
```

The `routes` in `wrangler.jsonc` attach the site to janeandthomas.com and www.janeandthomas.com. The www address redirects to the main one.

For automatic deploys on every push, connect this repo in the Cloudflare dashboard under **Workers & Pages → wedding-website → Settings → Builds**.
