# Launch Checklist

Use this checklist at release time. `npm run check:launch` is intentionally separate from normal CI because it verifies client-owned decisions, configuration, and live observations that local code cannot prove.

## Coding-stage completion

- [ ] Use Node `22.19.0` and run `npm ci`.
- [ ] Run `npm run ci` and inspect the production build output.
- [ ] Run `npm run check:launch`; a failure is expected until the external items below are complete.
- [ ] Review `docs/pre-launch-test-record.md` and replace only coding-stage results with measured command output.

## Decisions and approvals

- [ ] Reverify the marketplace rating, count, quote excerpt and source, quote permission, and Airbnb/Vrbo links on launch day. Clear the reverification flag only after the complete proof is recorded with that launch date.
- [ ] Explicitly approve or narrow the eight dashboard fields, meanings, public destinations, fallbacks, and help text.
- [ ] Approve public policy and inquiry-retention decisions; obtain appropriate advice where needed rather than treating the repository as legal approval.
- [ ] Make and approve the SMS choice. SMS remains disabled unless provider, cost, consent, and implementation decisions are separately approved.
- [ ] For each optional public analytics ID, record `configured` or `waived` in `docs/launch-gate-record.json`.

## Production smoke test

- [ ] Record a passing Netlify deployment.
- [ ] Confirm invite-only Identity and an exact `owner` role on an approved account.
- [ ] Confirm Blobs read, save, snapshot, and restore behavior.
- [ ] Confirm the `availability-request` Forms record and owner-approved email notification delivery.
- [ ] Inspect the production response headers and owner no-store/noindex behavior.
- [ ] Confirm approved analytics behavior or the waived state; do not send personal or owner data.
- [ ] Confirm domain, TLS, canonical host, canonical metadata, sitemap, robots, and only then the `www` redirect.
- [ ] Update every passing production-smoke field with the complete evidence object defined in `docs/pre-launch-test-record.md`, then run `npm run check:launch` again.

## Release and rollback readiness

- [ ] Identify the last known-good Netlify deploy before the release.
- [ ] Keep the deployment owner available for the smoke test and rollback decision.
- [ ] If any smoke test fails, pause launch, record the failure, and roll back through Netlify if needed; do not claim launch readiness.
