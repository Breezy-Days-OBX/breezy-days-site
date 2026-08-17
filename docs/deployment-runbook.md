# Deployment Runbook

This is a handoff guide for the client-owned Netlify project. It describes actions to take in the Netlify UI; it does not contain credentials, values, or instructions to change live services from this repository.

## Ownership and contexts

- Keep the Netlify team, site ownership, billing, Identity administration, Forms notification recipients, Blobs access, analytics accounts, and domain registrar under client-approved ownership.
- Local work uses Node `22.19.0`, `npm ci`, and the repository quality commands. Local gates need no Netlify account or credentials.
- Deploy previews use the same static build and must retain their preview hostname. Do not activate the prepared canonical-host redirect for previews.
- Production is the intended Netlify site only. Record its deployed URL and smoke-test results in `docs/launch-gate-record.json` after each launch decision.

## Environment inventory

Only two optional public integration IDs are supported: `PUBLIC_GA4_ID` and `PUBLIC_CLARITY_ID`. Set each in the appropriate Netlify context only when it is approved, or record it as explicitly waived in the launch-gate record. Their absence disables that integration without breaking the site. Do not add SMS variables: SMS is disabled pending provider and cost approval.

Netlify provides deployment, Functions, Identity, Forms, and Blobs context through the platform. Do not add platform credentials, notification credentials, exported guest data, or local `.env` files to the repository. `.env.example` contains names only.

## Initial production setup

1. Connect the intended private repository and confirm build command `npm run build`, publish directory `dist`, and Functions directory `netlify/functions`.
2. Enable Identity, disable public registration, invite only approved owners, and assign every approved dashboard account the exact `owner` role.
3. Verify the unauthorised fallback from `/owner/dashboard` to `/owner` and separately verify the owner-role route. Function authorization remains required even when the edge route permits the page.
4. Enable Blobs. With an approved owner account, exercise settings read, save, conflict handling, snapshot creation, and restore; record the result.
5. Confirm Netlify detects the `availability-request` form. Configure the owner-approved email notification recipient in the Netlify UI, submit the approved production smoke request, and verify both the Forms record and email delivery without representing it as a reservation.
6. Configure optional approved analytics IDs in the correct context. Confirm analytics is absent when waived, and that public events never include form values or owner activity.

## Domain cutover and rollback

1. Verify the intended apex and `www` hostnames, DNS, TLS certificate, canonical metadata, sitemap, robots output, and response headers on the production deployment.
2. Only after both production hostnames are verified, activate the prepared `www`-to-apex redirect in `netlify.toml`, deploy through the approved release process, and re-run the production smoke tests.
3. If cutover fails, roll back to the last known-good Netlify deploy using the Netlify UI, then verify public pages, Forms, owner access, and headers again. Revert the redirect only when that is the documented cause; do not alter DNS or account configuration from this repository.

## Updates and troubleshooting

- For dependency updates, use a separate reviewed change: `npm ci`, all quality gates, a production build, and a deploy preview before any approved production release. Review production dependency audit results rather than suppressing them.
- For a failed build, confirm Node `22.19.0`, the locked install, build command, publish directory, and Functions directory.
- For owner access issues, check Identity invite status and the exact `owner` role, then test protected Functions; client-side visibility is not authorization evidence.
- For missing public settings, preserve repository defaults, check the Functions and Blobs health, and do not copy settings into a guest-data store.
- For Form notification issues, check the Netlify Forms record before the email configuration. A delivery issue must not be described as a confirmed reservation.
- For header, analytics, domain, or TLS failures, pause launch, record the failed smoke field, correct the platform configuration through the approved owner, and retest.
