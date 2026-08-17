# Breezy Days OBX

Private project for the Breezy Days OBX direct-rental website. The public site presents owner-approved property information and sends availability requests through Netlify Forms. An invitation-only owner area manages the small set of public pricing and policy values stored in Netlify Blobs.

## Architecture

- Astro static output in `dist`; there is no Astro server adapter.
- Standalone TypeScript Functions in `netlify/functions`.
- Netlify Forms for the `availability-request` form.
- Netlify Identity with an `owner` role for dashboard access.
- Netlify Blobs for validated owner settings and recovery snapshots.
- Optional Google Analytics 4 and Microsoft Clarity integrations, disabled when their public IDs are absent.

`netlify.toml` is authoritative for the build, Functions directory, role gates, redirects, and response headers. The dashboard is protected twice: Netlify’s edge rule admits only the `owner` role, and every protected Function performs its own user, role, origin, method, and payload checks. Client-side redirects are usability fallbacks, not authorization controls.

## Local setup

1. Install Node `22.19.0` from `.nvmrc`.
2. Run `npm ci`.
3. Run `npm run dev` for the Astro development server.

No account, credential, analytics identifier, Netlify site link, notification, Identity setup, or Blob store is required for the local quality gates. Public pages retain repository defaults when the public settings Function is unavailable. Browser tests deterministically replace only the external Netlify boundaries while exercising the built UI and its state logic.

To test optional analytics locally, copy `.env.example` to `.env` and add either public identifier:

```dotenv
PUBLIC_GA4_ID=
PUBLIC_CLARITY_ID=
```

These values are public integration identifiers, not secrets. Keep all `.env` files except `.env.example` untracked. Netlify supplies its runtime identifiers and authenticated request context; do not add them to this template unless a documented local workflow truly requires an override.

## Quality commands

| Command                    | Gate                                                                       |
| -------------------------- | -------------------------------------------------------------------------- |
| `npm run format:check`     | Prettier check for source and documentation                                |
| `npm run lint`             | ESLint for JavaScript, TypeScript, and Astro                               |
| `npm run check`            | Strict Astro and TypeScript diagnostics                                    |
| `npm run test:unit`        | Source unit and static-render contract tests                               |
| `npm run test:integration` | Function authorization, validation, storage, and concurrency tests         |
| `npm run test:checkers`    | Direct tests for repository checkers                                       |
| `npm run build`            | Production static build                                                    |
| `npm run check:links`      | Fresh build plus internal page, fragment, and asset validation             |
| `npm run test:e2e`         | Chromium navigation, form, owner, 404, responsive, and focus tests         |
| `npm run test:a11y`        | Axe WCAG checks for critical and serious findings on required public pages |
| `npm run check:secrets`    | Credential-pattern scan with generated directories excluded                |
| `npm run audit:prod`       | npm vulnerability audit for production dependencies only                   |
| `npm run ci`               | Fail-fast aggregate of all automated gates above                           |

Install the project browser once before running browser tests directly:

```powershell
npx playwright install chromium
```

GitHub Actions uses `npm ci`, the `.nvmrc` version, and `npx playwright install --with-deps chromium` before the aggregate gate. It needs no repository secrets and runs on pushes and pull requests. Netlify Deploy Previews use the same static build and do not require the workflow to publish or connect a site.

`npm run check:launch` is intentionally separate from CI. It blocks a production launch until marketplace ratings, counts, and quote permission have been manually reverified; CI must not pretend that client-owned evidence is current.

## Netlify project setup

After the repository is connected to the intended private Netlify project:

1. Confirm the detected command is `npm run build`, publish directory is `dist`, and Functions directory is `netlify/functions`.
2. Enable Identity, disable public registration, invite only approved owners, and assign each approved account the exact `owner` role.
3. Confirm the role-gated exact `/owner/dashboard` route and nested `/owner/dashboard/*` route return the owner login fallback to users without that role.
4. Enable Blobs for the project and exercise save, conflict, snapshot, and restore behavior with an approved owner account.
5. Confirm Netlify detects the `availability-request` form, then configure its owner-approved email notification in the Netlify UI. Do not store notification credentials in the repository.
6. Add `PUBLIC_GA4_ID` and/or `PUBLIC_CLARITY_ID` in Netlify only when analytics is approved. Leave them absent to disable analytics without affecting the site.
7. Verify the custom apex and `www` domains, TLS, DNS, canonical metadata, sitemap, and robots output. Then uncomment the prepared `www`-to-apex redirect in `netlify.toml`. Do not activate it before the domain is verified because forced host redirects can break deploy previews.
8. Run `npm run check:launch`, a production deploy, the full smoke flow, and response-header checks before launch.

## Security policy

The global Content Security Policy permits only self-hosted assets, Forms and Functions on the same origin, and the optional GA4 and Clarity endpoints. It does not contain generic third-party wildcards. `script-src 'unsafe-inline'` is the one unavoidable allowance in the static deployment because Astro emits page-specific JSON-LD. The optional analytics bootstrap itself is self-hosted. There is no `unsafe-eval`, inline event-handler permission, remote style host, or broad script host. Moving to per-response nonces would require a dynamic response layer and is outside this static architecture; maintaining separate hashes for every generated JSON-LD block would be brittle.

Netlify also sends HSTS, strict referrer and permissions policies, MIME sniffing protection, and both CSP and legacy frame denial. Owner documents receive `Cache-Control: private, no-store` and `X-Robots-Tag: noindex, nofollow, noarchive`; owner pages also include noindex metadata and are excluded by `robots.txt`. Protected Function responses set their own no-store headers because Netlify static header rules do not apply to Function responses.

The HSTS header is safe only on HTTPS hosts. Netlify serves deploys over HTTPS, but production DNS and certificate status still must be verified before activating the custom-domain canonical redirect.

## Forms and data handling

The availability form is a request, not a reservation or guaranteed price. It includes explicit acknowledgement fields and a honeypot. Netlify receives the static form submission; the repository does not collect payment data. The privacy notice describes how inquiry details are used. Owners should configure retention and notification access in the client-owned Netlify project before launch.

## Repository hygiene

Never commit credentials, exported client data, local `.env` files, Netlify state, browser artifacts, or build output. The secret-pattern gate intentionally scans repository source—including untracked source files—while excluding generated, dependency, version-control, and browser-report directories. Placeholder documentation remains allowed; real credential-shaped values do not.
