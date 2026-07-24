# kekirenovering.se

Marketing site for **KEKI Renovering AB** — renovation, carpentry and building services in Järfälla & Stockholm.

Static site (plain HTML/CSS/JS, no build step) deployed to **GitHub Pages** via GitHub Actions on every push.

## Structure

```
index.html            The whole site (single landing page, Swedish)
css/main.css          Styles — brand gold #F2B01E on charcoal, light + dark theme
js/main.js            Gallery, mobile menu, scroll reveals, reviews, quote form
assets/images/        Logo + real project photos (from the previous site)
.github/workflows/    Pages deployment
```

## Backend wiring

The site talks to the **same Azure Functions backend as the previous site**
(`mf-stonedesign-api-…azurewebsites.net/api`):

| Feature | Endpoint | Notes |
|---|---|---|
| Quote form | `POST /submit-quote` | `multipart/form-data`; `helpWith` must be one of the API's valid options (the form maps friendly labels → valid values); `website` is a honeypot and must stay empty |
| Reviews | `GET /get-reviews` | Section renders only if the API answers with approved reviews; otherwise stays hidden |

**CORS:** the Azure Function must allow this site's origin. If the form fails from
`https://pouyanmeishany.github.io`, add that origin (and later `https://www.kekirenovering.se`)
to the Function App's CORS settings in the Azure portal
(*Function App → API → CORS → Allowed Origins*).

## Local development

Any static file server works:

```bash
npx serve .
```

## Deployment

Push to `master` → the **Deploy to GitHub Pages** workflow publishes automatically.
Live at: https://pouyanmeishany.github.io/kekirenovering/

## Pointing kekirenovering.se here (custom domain)

1. Repo → *Settings → Pages → Custom domain* → enter `www.kekirenovering.se` (GitHub creates a `CNAME` file).
2. At the DNS provider, add a `CNAME` record: `www` → `pouyanmeishany.github.io`.
3. For the apex `kekirenovering.se`, add `A` records to GitHub Pages IPs
   (`185.199.108.153`, `.109.`, `.110.`, `.111.`) or an `ALIAS`/`ANAME` record.
4. Wait for the certificate, then tick **Enforce HTTPS**.
5. Add the new origin to the Azure Function's CORS allow-list (see above).
