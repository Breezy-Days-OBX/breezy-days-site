# Breezy Days OBX Visual Redesign

**Date:** August 17, 2026

**Status:** Awaiting Michael's approval
**Scope:** A comprehensive visual and conversion-flow redesign of the existing Astro website. Preserve the completed backend, validation, security, owner settings, analytics boundaries, and Netlify integration.

## Problem and outcome

The current build is technically complete but visually unacceptable. It uses hard square geometry, a dense qualification form immediately below the hero, narrow typography, dark image treatment, and generic block-based composition. It does not faithfully carry forward the approved desktop and mobile mock-ups.

The redesign must make Breezy Days feel like a warm, refined, family-focused Outer Banks home while keeping the conversion action honest: visitors submit an availability request, not a reservation. The approved mock-ups are the binding visual references. Competitive research informs details but does not override them.

The first checkpoint is a finished homepage at desktop and mobile widths. The visual system is applied to secondary public pages and the owner surface only after the homepage passes side-by-side review.

## Source hierarchy

When sources conflict, use this order:

1. Approved Breezy Days desktop and mobile mock-ups.
2. Authentic client-supplied property and destination photographs.
3. Approved property facts and review evidence already represented in the typed content layer.
4. Conversion lessons from current category leaders.
5. Existing implementation, only where it does not conflict with items 1–4.

The phrase “does not have to look exactly like the mock-up” permits responsive adaptation and evidence-backed usability improvements. It does not authorize a new visual direction.

## Competitive research that survives review

Current official sites were reviewed on August 17, 2026:

- Airbnb uses a compact rounded destination/date/guest search, soft image geometry, generous whitespace, and brief proof labels: https://www.airbnb.com/
- Vrbo combines a full-width lifestyle image, prominent serif headline, and one rounded search control: https://www.vrbo.com/
- Hilton Grand Vacations uses immersive media, restrained headline copy, and a limited number of initial actions: https://www.hiltongrandvacations.com/en
- Inspirato uses full-bleed photography, elegant display typography, sparse copy, and one pill-shaped action: https://www.inspirato.com/
- Twiddy uses a large visual story alongside a rounded search card and local family-vacation language: https://www.twiddy.com/
- Surf or Sound uses a destination-led hero and compact date or property search: https://www.surforsound.com/
- Marriott Vacation Club is a clean but more corporate reference: https://www.marriottvacationclubs.com/ownership/vacation-club-brands/marriott-vacation-club.html
- Club Wyndham is a negative reference for dense navigation and block-heavy corporate composition: https://clubwyndham.wyndhamdestinations.com/

These are observed patterns, not proof of conversion causality. The redesign must not claim that rounded corners, a particular layout, or any other isolated choice will create a specific booking lift.

## Photography decision

Use the photographs currently available. They are approved source material for this stage, but they are a known quality constraint.

- Do not use stock or generated imagery to represent the property.
- Do not treat the aspirational mock-up hero as an authentic property photograph unless the owner supplies and approves that exact image.
- Use the current deck/ocean view as the hero for the first homepage checkpoint because it most closely matches the mock-up composition. Do not substitute another hero before the side-by-side review; if that crop fails review, test the pool image first and an exterior image second.
- Use the pool, kitchen, living room, bedroom, sunset, beach, and exterior photos as supporting assets.
- Do not upscale the 576×427 aerial photograph into a full-width hero.
- Apply only truthful crop, exposure, color-balance, and contrast treatment. Do not add or remove property features.
- Use Astro image optimization, responsive source sizes, and deliberate focal positions.

The client presentation must state that the design has used the strongest available images. Request the full-resolution originals used in the Airbnb and Vrbo listings first; recommend professional hospitality photography only if those originals still do not provide strong hero and gallery coverage.

## Visual direction

### Character

Warm coastal hospitality with refined editorial restraint. The memorable device is a cinematic property image with a softly floating availability bar, supported by generous negative space and tactile rounded surfaces. The page should feel composed by a hospitality designer, not assembled from generic landing-page blocks.

### Typography

- Display, hero, major section headings, quotations, and wordmark: self-hosted **Newsreader**, weights 500 and 600.
- Body, navigation, labels, buttons, and form controls: self-hosted **Manrope**, weights 400, 500, 600, and 700.
- Desktop hero headline: approximately 76–92 px depending on viewport, line-height 0.96–1.0, with a controlled maximum width matching the desktop mock-up.
- Mobile hero headline: approximately 50–58 px, line-height about 0.95, with deliberate line breaks matching the mobile mock-up.
- Uppercase text is reserved for short eyebrows and small proof labels. Paragraphs, navigation, buttons, and form guidance use natural capitalization.

### Color

- Warm canvas: `#F7F4EE`
- Paper white: `#FFFFFF`
- Deep ink: `#181A18`
- Forest action: `#496453`
- Forest hover: `#385043`
- Sand line: `#DDD5C8`
- Muted copy: `#686C67`
- Review gold: `#D69A39`

Hero text remains white over a localized left-to-right/bottom gradient. Do not apply a uniform dark wash over the complete photograph.

### Geometry and depth

- Primary and secondary buttons: 10–12 px radius.
- Compact form fields and grouped controls: 10–12 px radius.
- Floating availability bar: 18 px radius on desktop and 14 px on mobile.
- Image cards and major panels: 18–24 px radius.
- Pills and small tags may use a full radius.
- Use subtle warm shadows, not heavy gray drop shadows.
- No key conversion control, content card, or image panel may default to a zero radius. Square geometry is allowed only for deliberate editorial rules, tables, and full-bleed section boundaries.

## Homepage experience

### Header

- White header, approximately 88–94 px tall on desktop.
- Wordmark on the left, three or four plain-language navigation links on the right, and a dark rounded **Check availability** button.
- Desktop navigation follows the mock-up hierarchy: The Home, Guest Reviews, FAQs, and the action.
- Mobile shows the wordmark and action without an unnecessary hamburger menu for same-page navigation.
- The header remains sticky, but it must feel light and must not crowd the hero.

### Hero

- Use the authentic deck/ocean-view photograph with a carefully chosen focal crop.
- Keep the image bright enough to feel aspirational. Apply a gradient only where needed for legibility.
- Eyebrow: “One Outer Banks home · One clear family week.”
- Headline: “Make room for the week everyone remembers.”
- Supporting copy remains short and family-focused.
- Verified ratings or review excerpts appear as a compact proof band only when the existing launch-reverification gate permits them. The page must remain visually balanced when proof is absent.
- The desktop hero fills most of the first viewport. The mobile hero follows the existing mobile mock-up and allows enough height for the proof block without compressing the photograph.

### Compact availability bar

- Float the bar across the lower hero edge on desktop.
- Fields: arrival, departure, and guests; one dominant **Check availability** button.
- Do not place name, email, phone, pets, message, or acknowledgements in this bar.
- The bar does not submit a reservation. With JavaScript, it transfers the selected values to the full request form and scrolls to it. Without JavaScript, the action links directly to the full form.
- On mobile, the bar becomes a rounded card near the bottom of the hero, matching the approved mobile mock-up. A small sentence explains that dates begin a request and the owner confirms price and availability.

### Content order

1. Hero and compact availability bar.
2. Short “is this a fit?” strip with guest capacity, bedrooms, pool/hot tub, pets, and stair-access disclosure.
3. Property story and strongest visual gallery.
4. Sleeping arrangement and practical stay details.
5. Pool, hot tub, beach proximity, kitchen, and family-use amenities.
6. Owner story and authentic proof.
7. Clear three-step direct-request process.
8. Full availability request form.
9. FAQ and final availability action.
10. Restrained footer with policies and marketplace links.

The content should alternate between full-width imagery, offset editorial compositions, and rounded cards. Avoid repeated equal-sized box grids.

### Gallery

- Use an asymmetric editorial gallery rather than identical tiles.
- Lead with the strongest landscape photographs and use portrait or detail photographs as supporting crops.
- Every photograph has an honest caption or alt description.
- Include an accessible way to view the complete set without turning the homepage into a wall of images.

### Full availability request

- Preserve every required field, validation rule, Netlify Forms attribute, honeypot, acknowledgement, and analytics boundary.
- Move the form deeper into the page after desire, fit, proof, and process have been established.
- Use a calm rounded panel, generous spacing, natural-case labels, and progressive grouping.
- Keep the existing no-reservation and privacy language, but reduce visual noise by placing guidance beside the field or decision it explains.
- Preserve keyboard behavior, focus visibility, inline errors, summary errors, pending state, and duplicate-submit protection.

## Secondary pages and owner surface

After the homepage checkpoint is approved:

- Rental information, privacy, thank-you, and 404 pages inherit the same typography, color, radius, spacing, header, buttons, and footer.
- Secondary pages remain quieter than the homepage and use one strong image or editorial heading rather than multiple decorative sections.
- Owner login and dashboard retain all authorization and storage behavior. Their visual treatment becomes softer and more legible, but public-brand polish must not weaken clear administrative states.
- No owner route enters public navigation, analytics, sitemap, or search indexing.

## Responsive behavior

Primary visual review sizes:

- Desktop reference: 1536×1024.
- Laptop: 1280×800.
- Mobile reference: 390×844.
- Narrow mobile: 320×700.

The desktop and mobile mock-ups are separate composition references, not a requirement to scale one layout mechanically. Mobile preserves the same hierarchy, photography, typography, proof, and rounded availability card while simplifying navigation and reducing decorative spacing.

## Accessibility and performance

- Maintain the existing WCAG 2.2 AA implementation target without making a legal-compliance claim.
- Text contrast is checked against the actual hero crop and gradient at every target viewport.
- Interactive targets remain at least the existing verified target size.
- Motion is subtle, CSS-first, and disabled under reduced-motion preferences.
- Self-host fonts and preload only the faces needed above the fold.
- Use responsive AVIF/WebP output where supported and preserve explicit intrinsic dimensions to prevent layout shift.
- The hero must not depend on JavaScript to render or remain legible.

## Verification and approval gates

### Homepage visual gate

- Capture desktop and mobile screenshots at the reference dimensions.
- Compare them side by side with the approved mock-ups.
- Check the live page manually for crop quality, typography, spacing, radii, shadows, header balance, form hierarchy, and visual warmth.
- Michael approves the homepage before the visual system is propagated to secondary pages.

### Automated and functional gates

- Add stable Playwright screenshot coverage for the homepage at desktop and mobile dimensions after fonts and images are deterministic.
- Keep all existing unit, integration, build, link, security, accessibility, and end-to-end checks green.
- Add focused tests for compact-bar value transfer, no-JavaScript fallback, and the continued static detection of the full Netlify form.
- Verify that no Netlify Function, authorization rule, owner-settings schema, analytics payload, or content-source contract changed accidentally.

## Implementation boundary

The redesign may refactor `src/pages/index.astro`, `src/styles/global.css`, `src/components/SiteHeader.astro`, `src/components/SiteFooter.astro`, and `src/components/AvailabilityForm.astro`, and may add focused presentation components such as a compact availability bar and gallery. It must not redesign the data model or backend merely to support styling.

No GitHub account, Netlify account, deployment, paid service, DNS change, live notification, or public launch is part of this redesign stage.

## Acceptance criteria

- The desktop and mobile homepage visibly follow their approved mock-ups.
- The page no longer reads as a collection of square blocks.
- The first viewport is photo-led, emotionally clear, and visually premium within the limits of the supplied photography.
- The compact availability entry contains only dates, guests, and one action.
- The complete inquiry form remains functional but no longer dominates the opening experience.
- Authentic property facts, proof gates, request-not-reservation language, accessibility, and backend behavior remain intact.
- Michael approves the homepage screenshots before the remaining pages are restyled.
- The client presentation identifies photography as the remaining visual ceiling, requests the full-resolution marketplace originals first, and recommends a professional shoot only if those originals still leave important hero or gallery gaps.
