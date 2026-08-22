# Security Guide

## Boundaries

- The browser is untrusted. Protected Functions independently require an authenticated Netlify Identity user with the exact `owner` role, enforce same-origin state-changing requests, validate the complete settings object, and use strongly consistent Blobs readback.
- Owner settings are an allow-listed, versioned contract with recovery snapshots. They must never contain inquiries, reservations, payment data, Identity records, arbitrary page content, or unrestricted HTML.
- The owner dashboard is not part of the public site experience: its static shell stays hidden until browser Identity confirms the exact `owner` role, and it is excluded from public navigation, sitemap, and analytics with no-store/noindex protections. Keep the route free of Netlify edge redirects to avoid browser/edge session loops. Client-side redirects and visible controls are usability aids; protected Functions remain the authorization boundary.
- The availability form is a Netlify Forms request. It does not collect card data, create a reservation, or guarantee price or availability.

## Data and analytics

Only the inquiry fields shown in the form are collected for the request process. Custom analytics uses fixed event names and non-personal categories only; it must not receive names, contact details, dates, message text, owner settings, Identity data, or owner activity. Analytics and session tools do not run on owner routes.

Retention and deletion periods remain owner-approval and applicable-requirements questions. The coded privacy notice is not legal advice or a substitute for a final approved policy.

## Deployment controls

`netlify.toml` sets a restrictive same-origin CSP with only the optional GA4 and Clarity endpoints, frame denial, HSTS, strict referrer and permissions policies, and MIME sniffing protection. Its `script-src 'unsafe-inline'` permits inline script blocks generally in this static deployment; JSON-LD is the known required inline block, but CSP does not limit that source expression to JSON-LD. The policy does not permit `unsafe-eval`, inline event handlers through `script-src-attr 'none'`, remote styles, or generic third-party script hosts. Moving to hashes or nonces needs a separately designed static-build or response-layer change.

Keep secrets out of the repository. Do not commit `.env` files, live identifiers beyond intentionally public analytics IDs, credentials, exported client data, Netlify state, or build artifacts. Run `npm run check:secrets` before release and keep platform credentials in the client-owned provider.

## Incident response

Pause launch or remove the affected release from production through the approved Netlify owner if an access, data, form, header, analytics, domain, or TLS issue appears. Preserve relevant platform evidence, avoid copying inquiry data into new systems, and verify the rollback or fix with the production smoke checklist before resuming.
