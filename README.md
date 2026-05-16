# Divvy — CSV Splitter

Drop the `divvy/` folder into your Next.js app's `app/` directory:

```
your-project/
  app/
    divvy/          ← drop here
      page.jsx
```

Then visit `/divvy` on your domain (or set up a subdomain redirect in Vercel).

**No npm installs needed** — zero dependencies, all client-side.

## To assign a subdomain (e.g. divvy.yourdomain.com)

In Vercel → your project → Settings → Domains, add `divvy.yourdomain.com`
and point it to the same deployment. Then add a redirect or rewrite in
`next.config.js` to send `divvy.yourdomain.com` → `/divvy`.
