# Pre-Launch Test Record

## Coding-stage record

This section records only local, measured coding-stage evidence. It does not prove a production deployment, delivery, account setup, approval, legal sufficiency, domain, TLS, or launch decision.

| Check                       | Measured result                                                                                                                         | Scope                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Node version                | `v22.19.0`                                                                                                                              | Local environment             |
| Locked install              | `npm ci` completed through the Node `22.19.0` npm CLI; production audit reported 0 vulnerabilities.                                     | Local dependencies            |
| Focused launch-gate tests   | 3 passed.                                                                                                                               | Fixture-based script behavior |
| Aggregate quality suite     | `npm run ci` passed: 122 unit, 28 integration, 13 checker, 8 browser, and 5 accessibility tests; Astro check reported 0 errors.         | Local automated coding gates  |
| Production build inspection | Static output contained public pages, owner shells, 404, `robots.txt`, sitemap, and optimized assets; built-link and CSP checks passed. | Generated `dist` output       |
| Launch readiness check      | Expected failure with 14 external gates: marketplace reverification, 4 owner approvals, 2 analytics-ID dispositions, and 7 smoke tests. | Client-owned launch evidence  |

## Production record

Do not complete this section from local work. Record the date, responsible owner, production URL, and observed result for each smoke-test field in `docs/launch-gate-record.json`; keep any supporting evidence in the client-owned operational system.

| Smoke-test field                  | Observed result | Evidence location |
| --------------------------------- | --------------- | ----------------- |
| Netlify deployment                | Not recorded    | Not recorded      |
| Identity invite-only owner role   | Not recorded    | Not recorded      |
| Blobs save, snapshot, and restore | Not recorded    | Not recorded      |
| Forms email notification delivery | Not recorded    | Not recorded      |
| Production response headers       | Not recorded    | Not recorded      |
| Analytics behavior or waiver      | Not recorded    | Not recorded      |
| Domain, TLS, and canonical host   | Not recorded    | Not recorded      |
