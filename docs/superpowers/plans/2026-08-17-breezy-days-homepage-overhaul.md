# Breezy Days Homepage Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Breezy Days homepage to match the approved desktop and mobile mock-ups, using the current authentic photography and a compact hero availability entry while preserving the complete inquiry and backend behavior.

**Architecture:** Keep the existing static Astro page, typed content, Netlify form, public-settings enhancement, and analytics contracts. Add a focused hero availability component plus a pure value-transfer helper, scope the new presentation to a `home-page` body class and `home.css`, and leave secondary/owner page styling untouched until Michael approves the homepage checkpoint.

**Tech Stack:** Astro 7, TypeScript 6, Vitest, Playwright, Astro Images, Fontsource variable Newsreader and Manrope, Netlify Forms.

**Spec:** `docs/superpowers/specs/2026-08-17-breezy-days-visual-redesign-design.md`

## Global Constraints

- The desktop and mobile mock-ups are the binding visual references.
- Use only authentic client-supplied photographs; the current `hero-deck.jpeg` is the first-checkpoint hero.
- Apply only truthful crop, exposure, color-balance, and contrast treatment.
- The conversion action is an owner-reviewed availability request, never an instant reservation.
- Keep every full-form field, validation rule, Netlify attribute, honeypot, acknowledgement, analytics boundary, and public-settings marker.
- Preserve WCAG 2.2 AA implementation targets, reduced-motion handling, keyboard focus, intrinsic image sizing, and no-JavaScript access to the full form.
- Use Node 22.19.0 for final verification; local Node 22.18.0 may emit an engine warning and is not the release gate.
- Do not create accounts, deploy, change DNS, notify the client, or publish anything.
- Homepage approval is required before this visual system is propagated to secondary pages.

---

### Task 1: Lock the new funnel order and availability-transfer behavior

**Files:**

- Modify: `src/content/site.test.ts`
- Modify: `src/tests/homepage.test.ts`
- Create: `src/lib/availabilityPrefill.test.ts`
- Create: `src/lib/availabilityPrefill.ts`
- Modify: `src/content/site.ts`

**Interfaces:**

- Consumes: the existing `siteContent.primaryAction` and full form fields named `arrival`, `departure`, and `guests`.
- Produces: `AVAILABILITY_DRAFT_FIELDS`, `AvailabilityDraftReader`, `AvailabilityDraftWriter`, and `copyAvailabilityDraft(reader, writer): readonly AvailabilityDraftField[]`.

- [ ] **Step 1: Write the failing decision-order and hero-entry tests**

Update the expected homepage sequence in `src/content/site.test.ts` to:

```ts
expect(siteContent.homepageSections).toEqual([
  "hero",
  "fit",
  "home",
  "location",
  "essentials",
  "reviews",
  "process",
  "availability",
  "faq",
  "final-action",
]);
```

Add homepage assertions that require a non-submitting hero entry and keep the full form later:

```ts
expect(html).toContain("data-availability-entry");
expect(html).toContain('id="hero-arrival"');
expect(html).toContain('id="hero-departure"');
expect(html).toContain('id="hero-guests"');
expect(html).toContain('href="#availability"');
expect(html.indexOf('id="process"')).toBeLessThan(html.indexOf('id="availability"'));
expect(html).not.toContain('class="mobile-booking-bar"');
```

- [ ] **Step 2: Write the failing pure transfer tests**

Create `src/lib/availabilityPrefill.test.ts` using `import.meta.glob` so the missing module is a controlled RED, then assert these literal outcomes:

```ts
const source = { arrival: "2035-06-10", departure: "2035-06-17", guests: "6" };
const written: Record<string, string> = {};
const copied = module.copyAvailabilityDraft(
  (field) => source[field],
  (field, value) => {
    written[field] = value;
  },
);

expect(copied).toEqual(["arrival", "departure", "guests"]);
expect(written).toEqual(source);
```

Add a second test where arrival and guests are blank and assert that only `departure` is written. Add a mutation guard proving `pets`, `name`, `email`, and `phone` are never read or written.

- [ ] **Step 3: Run the focused tests and verify RED**

Run:

```powershell
npm run test:unit -- src/content/site.test.ts src/tests/homepage.test.ts src/lib/availabilityPrefill.test.ts
```

Expected: the order and hero-entry assertions fail against the current page, and the transfer test reports the missing module through the controlled module-presence assertion.

- [ ] **Step 4: Implement the pure transfer helper and new order**

Create `src/lib/availabilityPrefill.ts` with this public contract:

```ts
export const AVAILABILITY_DRAFT_FIELDS = ["arrival", "departure", "guests"] as const;
export type AvailabilityDraftField = (typeof AVAILABILITY_DRAFT_FIELDS)[number];
export type AvailabilityDraftReader = (field: AvailabilityDraftField) => string | null;
export type AvailabilityDraftWriter = (field: AvailabilityDraftField, value: string) => void;

export function copyAvailabilityDraft(
  read: AvailabilityDraftReader,
  write: AvailabilityDraftWriter,
): readonly AvailabilityDraftField[] {
  const copied: AvailabilityDraftField[] = [];
  for (const field of AVAILABILITY_DRAFT_FIELDS) {
    const value = read(field)?.trim();
    if (!value) continue;
    write(field, value);
    copied.push(field);
  }
  return copied;
}
```

Update `siteContent.homepageSections` to the tested sequence. Do not change `primaryAction.href`.

- [ ] **Step 5: Run helper and content tests GREEN**

Run:

```powershell
npm run test:unit -- src/content/site.test.ts src/lib/availabilityPrefill.test.ts
```

Expected: PASS. The homepage test remains RED until Tasks 2–3 add the new markup.

- [ ] **Step 6: Commit the behavior contract**

```powershell
git add src/content/site.ts src/content/site.test.ts src/lib/availabilityPrefill.ts src/lib/availabilityPrefill.test.ts src/tests/homepage.test.ts
git commit -m "test: define premium homepage funnel"
```

---

### Task 2: Establish the scoped visual foundation

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/layouts/BaseLayout.astro`
- Create: `src/styles/home.css`
- Modify: `src/pages/index.astro`
- Modify: `src/components/SiteHeader.astro`

**Interfaces:**

- Consumes: `BaseLayout` title, description, `noindex`, and structured data props.
- Produces: optional `bodyClass?: string`, a `home-page` root scope, Fontsource families `Newsreader Variable` and `Manrope Variable`, and the approved header hierarchy.

- [ ] **Step 1: Install the two self-hosted variable fonts**

Run:

```powershell
npm install @fontsource-variable/newsreader@5.3.0 @fontsource-variable/manrope@5.3.0
```

These packages are bundled locally; no external font request may appear in the production page.

- [ ] **Step 2: Add the layout body-class and font imports**

In `BaseLayout.astro`, add:

```ts
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/newsreader/wght.css";

interface Props {
  title: string;
  description: string;
  noindex?: boolean;
  structuredData?: Record<string, unknown>;
  bodyClass?: string;
}

const { title, description, noindex = false, structuredData, bodyClass } = Astro.props;
```

Render `<body class={bodyClass} ...>` and remove the obsolete Instrument Serif preload. Keep the existing local Instrument files and legacy faces for secondary pages during the checkpoint.

- [ ] **Step 3: Scope the homepage and import its stylesheet**

In `index.astro`, import `../styles/home.css` and pass `bodyClass="home-page"` to `BaseLayout`.

- [ ] **Step 4: Replace the header navigation hierarchy**

Render exactly these same-page links in `SiteHeader.astro`:

```astro
<nav class="main-nav" aria-label="Main navigation">
  <a href="#home">The Home</a>
  <a href="#reviews">Guest Reviews</a>
  <a href="#faq">FAQs</a>
</nav>
```

Keep the wordmark, main availability action, analytics event, and owner-route exclusion intact.

- [ ] **Step 5: Create the exact homepage design tokens**

Start `home.css` with a scoped token system and base rules:

```css
.home-page {
  --home-canvas: #f7f4ee;
  --home-paper: #fff;
  --home-ink: #181a18;
  --home-forest: #496453;
  --home-forest-hover: #385043;
  --home-sand: #ddd5c8;
  --home-muted: #686c67;
  --home-gold: #d69a39;
  --home-display: "Newsreader Variable", Georgia, serif;
  --home-body: "Manrope Variable", "Segoe UI", sans-serif;
  --home-shell: min(1344px, calc(100vw - 96px));
  background: var(--home-canvas);
  color: var(--home-ink);
  font-family: var(--home-body);
}

.home-page :where(h1, h2, blockquote, .wordmark) {
  font-family: var(--home-display);
}

.home-page :where(.button, input, select, textarea) {
  border-radius: 12px;
}
```

Add the sticky 92 px white desktop header, 1.95rem wordmark, natural-case 0.9rem navigation, 12 px rounded dark action, visible focus state, and 70 px mobile header. Hide only the middle navigation below 900 px.

- [ ] **Step 6: Verify foundation without changing secondary page behavior**

Run:

```powershell
npm run check
npm run test:unit -- src/tests/ownerPages.test.ts src/tests/publicPages.test.ts
```

Expected: 0 Astro diagnostics and both focused suites PASS.

- [ ] **Step 7: Commit the visual foundation**

```powershell
git add package.json package-lock.json src/layouts/BaseLayout.astro src/pages/index.astro src/components/SiteHeader.astro src/styles/home.css
git commit -m "feat: establish Breezy Days visual system"
```

---

### Task 3: Build the cinematic hero and compact availability card

**Files:**

- Create: `src/components/HeroAvailability.astro`
- Modify: `src/pages/index.astro`
- Modify: `src/styles/home.css`
- Modify: `e2e/public.spec.ts`

**Interfaces:**

- Consumes: `copyAvailabilityDraft`, `property.fit.maximumOvernightGuests`, `siteContent.booking.disclaimer`, and the full form named `availability-request`.
- Produces: `[data-availability-entry]`, source controls `hero-arrival`, `hero-departure`, `hero-guests`, and an anchor fallback to `#availability`.

- [ ] **Step 1: Add the failing browser transfer test**

Add a Playwright test that fills the hero controls, clicks its `Check availability` link, and asserts the real full form received the literal values and scrolled into view:

```ts
test("hero availability carries dates and guests into the owner-reviewed request", async ({
  page,
}) => {
  await page.goto("/");
  const entry = page.locator("[data-availability-entry]");
  await entry.locator("#hero-arrival").fill("2035-06-10");
  await entry.locator("#hero-departure").fill("2035-06-17");
  await entry.locator("#hero-guests").fill("6");
  await entry.getByRole("link", { name: "Check availability" }).click();

  const request = page.locator('.availability-form[name="availability-request"]');
  await expect(request.locator("#arrival")).toHaveValue("2035-06-10");
  await expect(request.locator("#departure")).toHaveValue("2035-06-17");
  await expect(request.locator("#guests")).toHaveValue("6");
  await expect(request).toBeInViewport();
});
```

Replace the old fixed mobile booking-bar test with one asserting that the rounded hero entry is visible at 390×844 and no `.mobile-booking-bar` exists.

- [ ] **Step 2: Run the new browser test and verify RED**

Run:

```powershell
npm run build
npx playwright test e2e/public.spec.ts --grep "hero availability|rounded hero entry"
```

Expected: FAIL because the hero entry does not exist.

- [ ] **Step 3: Build `HeroAvailability.astro`**

Render a semantic non-submitting group with three controls and one fallback link:

```astro
<div class="hero-availability" data-availability-entry aria-labelledby="availability-entry-title">
  <p id="availability-entry-title" class="hero-availability-title">
    Check whether your dates are available
  </p>
  <div class="hero-availability-fields">
    <label for="hero-arrival"><span>Arrival</span><input id="hero-arrival" type="date" /></label>
    <label for="hero-departure"
      ><span>Departure</span><input id="hero-departure" type="date" /></label
    >
    <label for="hero-guests"
      ><span>Guests</span><input
        id="hero-guests"
        type="number"
        min="1"
        max={maximumGuests}
        inputmode="numeric"
        placeholder="Add guests"
      /></label
    >
  </div>
  <a
    class="button hero-availability-action"
    href="#availability"
    data-prefill-availability
    data-analytics-event="primary_request_click"
    data-analytics-category="hero">Check availability</a
  >
  <p class="hero-availability-note">
    Checking these dates starts a request. The owner confirms availability and total price.
  </p>
</div>
```

The component script sets today/departure minimums using `dateRules`, copies only the three allowed values into the full form through `copyAvailabilityDraft`, and then calls `request.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" })`. The link remains a working `#availability` fallback without JavaScript.

- [ ] **Step 4: Recompose the hero markup**

Keep the current optimized `heroDeck` image, but change the hero to:

- eyebrow: `One Outer Banks home · One clear family week`
- one H1 with the approved headline
- one short supporting paragraph
- gated proof only when `publishProof` is true
- fallback fact line `10 guests · 4 bedrooms · Private pool + hot tub` when proof is absent
- `HeroAvailability` overlapping the lower hero edge

Remove the old hero button row, scroll cue, immediate full-form section, and fixed mobile booking bar.

- [ ] **Step 5: Implement exact desktop and mobile hero composition**

In `home.css` set:

- desktop hero height: `min(850px, calc(100svh - 92px))`, minimum 720 px
- hero image: full cover, `object-position: 50% 48%`
- localized left/bottom gradient; no uniform wash
- desktop H1: `clamp(4.8rem, 6.1vw, 6.5rem)`, line-height `0.93`, max width 780 px
- hero copy left offset aligned to the 1344 px shell and bottom clearance for the overlapping card
- availability card: white, 18 px radius, warm shadow, four-column field/action layout, max width 1210 px
- mobile hero: minimum 780 px below the 70 px header, H1 `clamp(3.25rem, 14.2vw, 4.1rem)`, card 14 px radius, stacked action, compact three-column fields, no page-bottom fixed control
- proof-absent layout must not leave an empty visual hole

- [ ] **Step 6: Run focused unit and browser tests GREEN**

Run:

```powershell
npm run test:unit -- src/tests/homepage.test.ts src/lib/availabilityPrefill.test.ts
npm run build
npx playwright test e2e/public.spec.ts --grep "hero availability|rounded hero entry"
```

Expected: PASS.

- [ ] **Step 7: Commit the hero checkpoint**

```powershell
git add src/components/HeroAvailability.astro src/pages/index.astro src/styles/home.css e2e/public.spec.ts
git commit -m "feat: add cinematic availability hero"
```

---

### Task 4: Recompose the property story as an editorial journey

**Files:**

- Modify: `src/pages/index.astro`
- Modify: `src/styles/home.css`
- Modify: `src/tests/homepage.test.ts`

**Interfaces:**

- Consumes: the existing six optimized images, typed `property`, `publicFacts`, and public-settings markers.
- Produces: rounded fit strip, asymmetric gallery, location story, and practical-stay section in the approved order.

- [ ] **Step 1: Add failing semantic structure assertions**

Require these durable landmarks without testing styling text:

```ts
expect(html).toContain('class="fit-strip"');
expect(html).toContain('class="editorial-gallery"');
expect(html).toContain('class="location-story"');
expect(html).toContain('class="stay-details-panel"');
expect(html).toContain('data-gallery-feature="living"');
expect(html).toContain('data-gallery-feature="pool"');
```

Keep the existing fact, alt-text, public-settings, proof-gate, and funnel-order assertions.

- [ ] **Step 2: Run homepage test and verify RED**

Run:

```powershell
npm run test:unit -- src/tests/homepage.test.ts
```

Expected: FAIL on the new landmark classes.

- [ ] **Step 3: Rebuild the fit strip**

Immediately after the hero, render a warm-canvas strip with five concise items: up to 10 guests, 4 bedrooms/7 beds, private pool and hot tub, up to 2 pets, and the full-flight stair disclosure. Use rounded 18 px containment with separators, not five detached cards.

- [ ] **Step 4: Rebuild the gallery and property story**

Use `livingDining` as the large lead image, `privatePool` and `bedroom` as stacked supporting images, and `kitchen` as a wide lower image. Apply 20–24 px image radii, honest captions, `overflow: clip`, subtle image-hover scale only when motion is allowed, and these desktop proportions:

```css
.home-page .editorial-gallery {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  grid-template-rows: 300px 300px;
  gap: 18px;
}

.home-page [data-gallery-feature="living"] {
  grid-row: 1 / 3;
}
.home-page .gallery-kitchen {
  grid-column: 1 / -1;
  min-height: 380px;
}
```

- [ ] **Step 5: Move and restyle the location story**

Place `location` after the gallery and before practical details. Keep the aerial image constrained to its intrinsic quality in a rounded 22 px panel; do not stretch it into a hero. Pair it with the location heading, privacy language, beach/pier proximity, and one inline availability link.

- [ ] **Step 6: Rebuild practical stay details**

Use a deep-forest rounded 24 px section with a readable two-column desktop layout. Preserve every sleeping row, provided/not-provided item, pool dates, pool heat fee, pet fee, and allow-listed `data-public-setting` markers. Use natural-case labels and rounded translucent sub-panels rather than square rules.

- [ ] **Step 7: Run homepage and content tests GREEN**

Run:

```powershell
npm run test:unit -- src/tests/homepage.test.ts src/content/property.test.ts src/content/propertyPresentation.test.ts
```

Expected: PASS.

- [ ] **Step 8: Commit the editorial property journey**

```powershell
git add src/pages/index.astro src/styles/home.css src/tests/homepage.test.ts
git commit -m "feat: reshape the Breezy Days property story"
```

---

### Task 5: Refine proof, process, full inquiry, FAQ, and closing action

**Files:**

- Modify: `src/pages/index.astro`
- Modify: `src/components/AvailabilityForm.astro`
- Modify: `src/components/MarketplaceProof.astro`
- Modify: `src/components/SiteFooter.astro`
- Modify: `src/styles/home.css`

**Interfaces:**

- Consumes: the existing gated marketplace presentation, owner story, full form controller, Netlify form, public settings, and footer links.
- Produces: a premium lower-page conversion sequence with no behavior-contract changes.

- [ ] **Step 1: Preserve the proof gate while improving the empty state**

Keep `MarketplaceProof` absent when permission/reverification fails. In that state, render the approved owner story as an offset editorial quote beside a small `Why this home` label; do not fabricate review stars, counts, or quotes. When proof is permitted, present the real quote and rating panel in rounded containers using the existing shared proof contract and analytics links.

- [ ] **Step 2: Restyle the three-step request process**

Keep the existing three exact steps and request-not-reservation explanation. Present them as one rounded paper panel with three horizontal rows on desktop and stacked rows on mobile. Preserve pricing guidance, minimum stay, and `pricingNote` public-settings markers in a soft sand inset.

- [ ] **Step 3: Move and frame the complete form**

Render the `availability` section after `process`. Keep `AvailabilityForm.astro` field names and script unchanged. In `home.css` override its presentation under `.home-page`:

- 24 px white panel radius and warm shadow
- 12 px form controls
- natural-case labels; uppercase reserved for fieldset legends only
- two-column introduction/form desktop layout and single-column mobile layout
- 14–18 px gaps and more whitespace around acknowledgements
- clear rust error color, 3 px focus ring, disabled/pending state, and 44 px minimum targets

Do not remove or rename any Netlify, error-summary, pending, honeypot, public-settings, acknowledgement, or analytics attribute.

- [ ] **Step 4: Refine FAQ and final action**

Use a quiet two-column FAQ with rounded open panels and 44 px summaries. Follow it with a deep-ink closing panel using one heading, one short request clarification, and one rounded availability button.

- [ ] **Step 5: Refine the footer without changing its information architecture**

Retain all property, explore, email, rental-information, privacy, and booking-clarification content. Apply the homepage font system, softer separators, and one rounded top boundary; do not add owner access.

- [ ] **Step 6: Run all public functional tests**

Run:

```powershell
npm run test:unit -- src/tests/homepage.test.ts src/tests/publicPages.test.ts src/lib/availabilityFormController.test.ts src/components/MarketplaceProof.test.ts
npm run build
npx playwright test e2e/public.spec.ts
```

Expected: PASS, including date-error focus, real form submission, unknown route, hero prefill, and keyboard focus.

- [ ] **Step 7: Commit the lower funnel**

```powershell
git add src/pages/index.astro src/components/AvailabilityForm.astro src/components/MarketplaceProof.astro src/components/SiteFooter.astro src/styles/home.css
git commit -m "feat: polish the availability request journey"
```

---

### Task 6: Responsive fidelity and full verification checkpoint

**Files:**

- Modify: `src/styles/home.css`
- Create: `artifacts/homepage-redesign/desktop-1536x1024.png`
- Create: `artifacts/homepage-redesign/laptop-1280x800.png`
- Create: `artifacts/homepage-redesign/mobile-390x844.png`
- Create: `artifacts/homepage-redesign/mobile-320x700.png`

**Interfaces:**

- Consumes: the completed homepage, approved mock-ups, deterministic local fonts/images, and existing test suites.
- Produces: four review screenshots and an evidence-backed homepage approval checkpoint.

- [ ] **Step 1: Verify the four viewport compositions manually**

Inspect at exactly 1536×1024, 1280×800, 390×844, and 320×700. Correct:

- header height and balance
- hero crop and localized gradient
- headline wrapping and no text collision
- visible rounded availability entry
- no horizontal overflow
- editorial gallery ordering and crop quality
- full-form label/control alignment
- sticky header anchor offsets
- proof-absent balance
- footer and final action spacing

- [ ] **Step 2: Capture the four screenshots**

Use Playwright against the built local site and save full-page screenshots under `artifacts/homepage-redesign/` with the exact filenames listed above. Do not create a snapshot baseline until Michael approves these images.

- [ ] **Step 3: Compare desktop and mobile side by side with the approved mock-ups**

The checkpoint passes only when the implementation clearly carries forward:

- warm, photo-led first viewport
- Newsreader/Manrope typography hierarchy
- rounded white availability surface overlapping the hero
- restrained copy and single dominant action
- bright, honest photography
- soft radius/shadow system instead of square blocks

- [ ] **Step 4: Run formatting and static verification**

Run:

```powershell
npm run format
npm run format:check
npm run lint
npm run check
```

Expected: no formatting drift, lint errors, Astro errors, warnings, or hints.

- [ ] **Step 5: Run the complete local quality suite under Node 22.19.0**

Run the repository `npm run ci` script using a Node 22.19.0 executable. Expected gates:

- unit tests PASS
- Netlify integration tests PASS
- checker tests PASS
- Astro build PASS
- built-link and CSP checks PASS
- public end-to-end tests PASS
- accessibility and forced target-size tests PASS
- secret scan PASS
- production dependency audit PASS

The separate `npm run check:launch` must remain blocked only by the known external account, proof, approval, configuration, and production-smoke items.

- [ ] **Step 6: Inspect production output**

Confirm:

- no request to Google Fonts or another font CDN
- hero and gallery images have responsive optimized sources and intrinsic dimensions
- full Netlify form is present in built HTML
- pending marketplace proof remains absent
- owner routes remain absent from public navigation and sitemap
- no source map, environment file, credential, or personal form value is published

- [ ] **Step 7: Commit the verified homepage checkpoint**

```powershell
git add src/styles/home.css artifacts/homepage-redesign
git commit -m "test: verify Breezy Days homepage redesign"
```

- [ ] **Step 8: Present the inline result to Michael**

Show the desktop and mobile screenshots directly in chat, summarize what changed in five concise bullets, state the photography limitation, and ask for homepage approval. Do not ask Michael to open this plan or the design spec.
