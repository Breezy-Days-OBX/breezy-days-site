# Breezy Days OBX Coding Completion Plan

**Spec:** Signed Website & Channel Rework agreement, approved Property Information Master Sheet v1.0, August 10 website strategy decision record, and the controlling master roadmap.

**Coding boundary:** Complete the local, launch-ready codebase. Do not create client accounts, enable paid services, publish, push, change DNS, send live notifications, or invent owner/legal decisions. Account setup, provider configuration, owner approval, live content reverification, and launch remain explicit external gates.

## Global Constraints

- Preserve the approved editorial beach-house visual direction while optimizing the page for a single qualified request-to-book conversion.
- The dominant public action is exactly **Check availability**. Contact and marketplace links are secondary. A submitted request is never described as a reservation or guaranteed price.
- Public facts must come from the approved Property Information Master Sheet. Marketplace ratings, counts, excerpts, and links remain behind the existing launch reverification gate.
- Public defaults must render without JavaScript. Owner settings may replace only allow-listed public values after a successful sanitized read; endpoint or JavaScript failure must leave a usable, stable page.
- The owner settings object is small and infrequently edited. It must never store guest inquiries, reservations, payment data, Identity records, or unrestricted page content.
- Every owner write requires an authenticated Identity user with the `owner` role, same-origin verification, server validation, a strongly consistent readback, and an immutable snapshot. Hiding browser controls is not authorization.
- The coded dashboard field list is a conservative provisional contract derived from approved facts and the confirmed annual-pricing use case. It must remain easy to narrow before launch and is not owner-approved merely because it is implemented.
- Inquiry collection is limited to arrival, departure, guest count, pet count, name, email, phone, an optional short message, and explicit request-not-reservation/privacy acknowledgements. Never collect card data, IDs, documents, or agreement text.
- Analytics events may include only fixed event names and non-personal categories. Form values, contact details, dates, message text, and owner/admin activity must never be sent to analytics or session recording.
- SMS is disabled until a provider and costs are approved. Email through Netlify Forms remains the durable notification path.
- Owner/admin routes must be absent from public navigation, sitemap, analytics, and search indexing.
- Use strict TypeScript, test-first implementation, accessible interaction states, reduced-motion support, responsive images, and WCAG 2.2 AA implementation targets without making legal-compliance claims.
- The site stays static-first. Netlify Functions own server behavior. Astro's Netlify adapter is intentionally omitted because the current official Astro deployment guidance requires no adapter for a static Astro site using separate Netlify Functions; this documented spike supersedes the roadmap's provisional adapter assumption.

## Shared Interfaces and Ownership

- `src/content/property.ts` is the typed repository source for approved public facts.
- `src/lib/ownerSettings.ts` owns the owner field contract, defaults, validation, public projection, and snapshot-safe shape.
- `src/lib/inquiry.ts` owns inquiry validation and analytics-safe error categories.
- `netlify/functions/_shared/settingsService.ts` owns storage/auth/origin orchestration behind injected interfaces so behavior is unit-testable without a Netlify account.
- `src/lib/analytics.ts` is the only browser analytics event surface.
- `netlify.toml` is the authoritative deployment, function, redirect, and security-header configuration.

## Task 1: Approved content and domain contracts

Create the typed data foundation before changing pages or functions.

**Files:**

- Create `src/content/property.ts` with all public facts used by the site: identity/contact, 10-guest capacity, 4 bedrooms, 7 beds and room-by-room layout, 2 full plus 1 half indoor bathrooms, elevated-stair access, parking for 4, supplied/not-supplied amenities, April 15–October 15 pool season, $250 pool heat with 48-hour notice, year-round 7-person hot tub, up to 2 pets, $150 pet fee, check-in/out, age/rules/safety, request-to-book handoff, $1,000 initial deposit, balance 45 days before check-in, accepted methods, travel-insurance/weather language, and approved owner story.
- Create `src/lib/ownerSettings.ts` with schema version `1` and exactly these provisional editable fields: `startingWeeklyRateUsd` (nullable integer, $500–$50,000), `minimumStayNights` (nullable integer, 1–30), `pricingNote` (plain text, 1–160 chars), `poolHeatFeeUsd` (integer, $0–$2,000), `petFeeUsd` (integer, $0–$1,000), `maxPets` (integer, 0–4), `poolOpenMonthDay` and `poolCloseMonthDay` (valid `MM-DD`). Include name, purpose, type, allowed format/range, public destination, fallback, and owner help text for every field.
- Defaults must use only approved facts: nullable pricing/minimum stay, pricing note `Rates vary by dates and are confirmed in your personalized quote.`, pool heat `250`, pet fee `150`, max pets `2`, pool dates `04-15` and `10-15`.
- Validation rejects unknown keys, unsafe markup, non-integers, out-of-range values, invalid dates, wrong schema versions, and malformed timestamps. Public projection exposes only the approved public settings and `updatedAt`.
- Create `src/lib/inquiry.ts` for the minimum inquiry contract. Validate future arrival, departure after arrival, 1–10 guests, 0–2 pets, names 2–80 chars, RFC-compatible practical email, phone 7–20 dialable chars, optional message up to 500 chars, and both acknowledgements. Return fixed analytics-safe error categories without echoing submitted values.
- Preserve or adapt `src/lib/dateRules.ts` as the single date-order implementation; do not duplicate it.
- Add `docs/technical-design.md` documenting the page map, data flow, security boundaries, static-site/Functions adapter ruling, provisional dashboard approval gate, SMS gate, analytics privacy boundary, environment inventory, and failure/fallback behavior.

**TDD:** Add focused unit tests first, run them red, implement, then run them green. Cover every validation boundary and public-projection exclusion.

**Acceptance:** All domain tests pass; every value above is represented once in a typed source; no unapproved price/minimum-stay value or private data is invented.

## Task 2: Secure owner-settings Functions and recoverable storage

Implement Netlify server behavior through small tested services.

**Files:**

- Add current compatible `@netlify/functions`, `@netlify/blobs`, and `@netlify/identity` dependencies.
- Create `netlify/functions/_shared/settingsService.ts` with injected identity, origin-check, clock/ID, and blob-store interfaces.
- Create `netlify/functions/public-settings.ts` for anonymous `GET` only. It reads with strong consistency, validates stored data, returns the sanitized public projection, and falls back to repository defaults with a non-sensitive `source: "default"` marker if storage is empty, malformed, or unavailable.
- Create `netlify/functions/owner-settings.ts`: authenticated owner-role `GET` and same-origin authenticated owner-role `PUT`; every valid save writes an immutable `snapshots/<ISO timestamp>-<id>.json` copy of the prior live value when one exists, writes `current.json`, performs a strongly consistent readback, and returns the validated saved object.
- Create `netlify/functions/settings-snapshots.ts`: authenticated owner-role `GET` lists snapshot metadata newest first without exposing arbitrary blob contents.
- Create `netlify/functions/restore-settings.ts`: same-origin authenticated owner-role `POST` accepts only a returned snapshot key, validates it belongs to `snapshots/`, validates its contents, snapshots the current live value, restores the selected value to `current.json`, strongly reads back, and returns the restored object.
- Return JSON with stable, non-sensitive errors and correct `405`, `400`, `401`, `403`, and `503` statuses. Set `Cache-Control: no-store` for protected responses and safe short public caching for public settings.

**TDD:** Write integration-style handler tests first using in-memory injected stores. Prove anonymous protected reads/writes fail, non-owner writes fail, cross-origin writes fail, unknown/malformed fields fail, valid values persist, public output is sanitized, storage failure falls back publicly, every save is snapshot-recoverable, invalid snapshot keys fail, and restore works.

**Acceptance:** All function tests pass without Netlify credentials; production wrappers use current Netlify APIs (`getUser`, `verifyRequestOrigin`, strong-consistency Blobs); no guest or identity data enters Blobs.

## Task 3: Complete the public conversion experience

Replace prototype placeholders with the approved public experience while retaining the established design language.

**Files:**

- Refactor `src/pages/index.astro` and focused components to use `property.ts` and repository settings defaults.
- Keep one dominant **Check availability** path. Hero, early fit qualification, purposeful gallery, essentials, sleeping layout/accessibility, owner story, verified proof, direct-booking process, privacy-appropriate location, FAQ, and final action must use approved facts and plain-language objections.
- Upgrade `AvailabilityForm.astro` to the exact inquiry contract, with logical grouping, autocomplete/input modes, accessible inline/summary errors, pending/duplicate-submit state, honeypot, and explicit acknowledgements. Keep Netlify's statically detectable form markup and `/thanks` action.
- Add progressive public-settings enhancement that updates only marked text nodes, announces no routine change, causes no layout shift, and leaves defaults intact on any failure.
- Create `src/lib/analytics.ts` and fixed events for `primary_request_click`, `form_start`, `form_validation_error`, `form_submit`, `form_success`, and approved marketplace outbound clicks. Never include field values or run on owner routes; load GA4/Clarity only when public environment IDs exist.
- Complete `src/pages/thanks.astro`, `src/pages/privacy.astro`, add `src/pages/rental-information.astro`, and add `src/pages/404.astro`. Policy pages must distinguish owner-approved factual process from legal advice/terms still requiring owner approval.
- Complete canonical/social metadata, accurate VacationRental structured data, favicon/app icons, `robots.txt`, and a public-only `sitemap.xml`.
- Update header/footer/mobile action and CSS for keyboard focus, validation/pending/success/failure states, mobile/desktop extremes, reduced motion, and purposeful responsive images with explicit sizes and useful alt text.

**TDD:** Add page/content/analytics tests first and verify red. Test required approved facts, page map, one dominant CTA, no prototype labels, no index leakage, static form detection, analytics privacy, and default fallback markers.

**Acceptance:** Production build emits homepage, thank-you, privacy, rental information, and custom 404; public pages contain approved facts and no unresolved prototype copy; form behavior is accessible and makes the non-reservation status unmistakable.

## Task 4: Invite-only owner login and limited dashboard

Build the owner experience without weakening server authorization.

**Files:**

- Create public `src/pages/owner/index.astro` for login, invite/recovery callback handling, and clear success/error states using `@netlify/identity`.
- Create gated `src/pages/owner/dashboard.astro` with the exact field contract from Task 1, fallback/help text, current values, last-saved display, save/pending/success/validation/auth/service states, snapshot list, confirmed restore action, and logout.
- Put reusable browser logic in focused modules under `src/lib/owner/`; map form fields to validated JSON without accepting extra keys.
- Add `noindex,nofollow`, exclude both pages from analytics/session recording, and never include the dashboard in public navigation or sitemap.
- Treat client checks as UX only. All reads/writes still rely on Task 2 server enforcement.

**TDD:** Test owner form serialization, field/error mapping, callback state handling, endpoint status handling, restore confirmation behavior, and static noindex/analytics exclusions before implementation.

**Acceptance:** The dashboard is usable with mocked endpoints locally, exposes only the allow-listed fields, and clearly recovers from expired auth, validation errors, endpoint failure, and failed saves; server tests remain green.

## Task 5: Netlify configuration, security, CI, and automated QA

Make the repository reproducible and enforce launch-grade quality gates.

**Files:**

- Add `.nvmrc` pinned to `22.19.0`, `.env.example` with names only, `netlify.toml`, and a complete private-project `README.md`.
- Configure Netlify build/functions, static form handling, browser-side owner visibility gating with independently authorized owner Functions, a checker that prohibits `/owner/dashboard*` edge redirects, canonical host redirects ready for later activation, and security headers: CSP matched to actual integrations, HSTS for production, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, frame protection, and no-store/noindex owner responses where supported.
- Add Prettier, ESLint with Astro/TypeScript support, Playwright, and axe accessibility testing. Add scripts for format check, lint, strict type check, unit/integration tests, e2e, accessibility, internal links/assets, secret patterns, dependency audit, production build, and aggregate CI.
- Add Playwright tests for public navigation, date/form validation, success page, owner login shell, protected endpoint behavior that can run locally, 404, responsive sticky action, keyboard-visible focus, and no critical/serious axe findings on required public pages.
- Add a build-output internal-link/asset checker and repository secret-pattern checker with tests.
- Add GitHub Actions for pull-request/push checks and Netlify Deploy Preview compatibility without storing secrets. Keep live analytics/Identity/Blobs/notifications optional so CI works without client accounts.

**TDD:** For new checkers and browser behavior, demonstrate a failing focused test/check before implementation, then green. Do not weaken assertions to make the suite pass.

**Acceptance:** A clean local install can run formatting, lint, check, unit/integration, build, e2e, accessibility, link/asset, secret, and production dependency gates; owner/admin routes remain unindexed and server-protected.

## Task 6: Runbooks, launch gates, and coding-completion audit

Finish the operational artifacts that make the code usable by someone other than its author.

**Files:**

- Create `docs/owner-runbook.md` for login, permitted edits, save/restore, inquiry review, authoritative Airbnb/Vrbo availability check, quote/agreement/payment handoff, and logout.
- Create `docs/deployment-runbook.md` for account ownership, environment-variable inventory, local/preview/production contexts, Identity invite-only and owner-role setup, Forms email notification, Blobs, analytics, domain cutover, rollback, dependency updates, and troubleshooting—without secrets or live account mutation.
- Create `docs/launch-checklist.md`, `docs/pre-launch-test-record.md`, `docs/decision-log.md`, `docs/security.md`, and `docs/measurement-guide.md` with 60–90 day observed-value logging and explicit non-included ongoing management.
- Expand `scripts/check-launch-readiness.mjs` so launch is blocked until marketplace proof is reverified, owner dashboard fields/policies/retention/SMS choice are approved, required environment IDs are configured or explicitly waived, and production smoke-test fields are recorded. Normal CI/build must still pass while the separate launch gate truthfully fails.
- Add tests for the launch gate's pass/fail conditions using fixtures or injected inputs; do not make the real repository launch-ready by inventing approvals.
- Run the complete clean-install-equivalent quality suite, inspect the production output, and update the pre-launch record with measured coding-stage results only.

**TDD:** Add launch-gate tests first and capture the expected red state before implementation; make fixture cases green while leaving the real launch check blocked for honest external reasons.

**Acceptance:** Documentation covers setup through rollback; all coding-stage gates pass; the launch gate lists only genuine external decisions/configuration/reverification work; no account, live service, notification, publish, push, or DNS change occurs.
