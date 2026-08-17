# Breezy Days OBX Technical Design

## Architecture and page map

Breezy Days remains a static Astro site. The public page map is `/` (the conversion-focused home page), `/rental-information`, `/privacy`, `/thanks`, and `/404`. The owner surface is `/owner` for invite and login handling and `/owner/dashboard` for authenticated editing. Owner routes stay out of public navigation, analytics, search indexing, and the public sitemap.

Astro renders public pages with repository defaults at build time. Separate Netlify Functions provide anonymous sanitized settings reads and protected owner settings operations. No Astro server adapter is used: a static Astro build can coexist with standalone Netlify Functions, so adding an adapter would introduce server rendering that this architecture does not require.

## Data flow and sources of truth

`src/content/property.ts` is the only approved repository source for public property facts. Pages consume it directly; they do not restate factual values in page-local objects. `src/lib/ownerSettings.ts` is the only editable-settings contract and owns its schema version, field definitions, fallbacks, validation, and public projection. Repository defaults reference approved property facts where the same value is owner-editable. `src/lib/inquiry.ts` owns the minimum inquiry shape and analytics-safe validation categories, and delegates date validity/order behavior to `src/lib/dateRules.ts`.

Public HTML always contains usable repository defaults. A successful browser request may replace only marked, allow-listed public settings with the sanitized Function response. Missing, malformed, or unavailable settings leave those defaults unchanged. Inquiries post through the statically detectable Netlify Forms path; they do not enter the owner-settings store.

## Security boundaries

The browser is untrusted. Dashboard visibility and client-side validation are user experience controls, not authorization. Protected Functions must independently require a valid Netlify Identity user with the `owner` role, verify same-origin state-changing requests, validate the complete settings object, reject unknown fields, and read back saved data with strong consistency. Owner settings storage is restricted to the versioned allow-list and immutable prior-value snapshots. It must never contain inquiries, reservations, payment information, identity records, unrestricted HTML, or arbitrary page content.

The public settings Function returns only the approved projection plus `updatedAt`; schema and operational/private fields remain server-side. Public error responses and validation categories are fixed and non-sensitive. Inquiry failures never echo submitted names, contact details, dates, or message text.

## Approval and integration gates

The eight dashboard fields are provisional. Coding them does not constitute owner approval. Launch remains blocked until the owner explicitly approves or narrows the field list, field meanings, public destinations, fallbacks, and help text; any change must update the shared contract and its tests before the dashboard or Functions change.

SMS is disabled. Although the source material requests a text alert, no SMS provider, credentials, cost, consent flow, or sending code may be added until those items are approved. Netlify Forms email notification is the intended durable baseline.

Analytics accepts only fixed event names and non-personal categories. It must never receive inquiry field values, contact information, requested dates, message text, owner settings, Identity data, or owner/admin activity. Session recording and analytics do not run on owner routes.

## Environment inventory

Task 1 requires no environment variables. Later deployment may use `PUBLIC_GA4_ID` and `PUBLIC_CLARITY_ID`; both are optional public identifiers, and absence must disable the corresponding integration without breaking the site. Netlify supplies deployment, Identity, Forms, Functions, and Blobs context through its platform configuration rather than repository secrets. No SMS environment variables exist while SMS is gated. `.env` files and live credentials must not be committed.

## Failure and fallback behavior

- A public-settings timeout, non-success response, malformed body, invalid schema, or storage outage preserves the approved repository defaults and a functional no-JavaScript page.
- Missing optional analytics identifiers disables analytics; it does not block forms or rendering.
- An invalid inquiry returns fixed field/category pairs, keeps submitted values out of analytics and error payloads, and does not create a reservation.
- An expired or unauthorized owner session blocks every protected read or write server-side and directs the owner to authenticate again.
- A rejected settings write leaves the prior live value unchanged. Successful future writes must snapshot the prior valid value before replacement and verify the saved value through a strongly consistent readback.
- Email notification configuration or delivery failure must not be represented as a confirmed reservation. The Netlify Forms submission record is the durable inquiry path; notification troubleshooting remains an operational concern.
