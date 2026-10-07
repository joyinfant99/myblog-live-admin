# Joy Infant · Admin

The private admin for [joyinfant.com](https://www.joyinfant.com): posts, categories, music releases, analytics,
private notes and inspiration, and a status dashboard that watches my other apps. Built with Next.js (App Router),
Tailwind, Firebase sign-in and a Node/Express API. It installs as an app on phones and desktops (PWA).

## Run it locally

```bash
npm install
cp .env.example .env.local   # then point it at a backend, e.g. http://localhost:3001
npm run dev                  # http://localhost:3200
```

## Settings

| Variable | What it is |
|---|---|
| `NEXT_PUBLIC_API_URL` | The backend API, e.g. `https://blog-api.joyinfant.com` |
| `NEXT_PUBLIC_SITE_URL` | The public site, used by "View site" |

Sign-in is Firebase. The backend only lets in the emails listed in its `ADMIN_EMAILS` setting.

## Deploy

Pushing to `main` deploys to Vercel (`vercel.json` pins the Next.js framework; `package.json` pins Node 24).

## Install as an app

Open the site on a phone: Android and desktop Chrome offer **Install app** (also in the sidebar); on iPhone use
Share → **Add to Home Screen**. The service worker (`public/sw.js`) never caches pages or API data; offline it shows
`public/offline.html`.
