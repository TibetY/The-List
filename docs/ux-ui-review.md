# The Foodiedex — UX/UI & Feature Review + Build Prompts

_Contract design review. Scope: the shipped web app on branch `claude/website-ux-ui-review-whdd6w`._

---

## 0. What this product is (in one line)

A **shared restaurant journal** — a warm, editorial "little black book" where a
person (or a small group with Owner/Editor/Viewer roles) curates places they've
been and want to try, enriched automatically from the web, viewable as tiles, a
list, or a map, and shareable via read-only public links that anyone can fork.

Stack: Remix 2 (Vite, Netlify Functions) · Supabase (auth + Postgres w/ RLS +
storage) · MUI 6 + Emotion + Tailwind on a hand-built token system · Leaflet ·
i18next (EN/FR) · Cheerio for server-side enrichment.

---

## 1. Verdict

This is **well above the median seed-stage product**. The visual system is a
real point of view, not a Bootstrap template, and the auto-enrichment engine is
a genuine moat. The gap to "FAANG-grade, category-defining" is not polish — it's
**that the product is a filing cabinet, not yet a habit or a network.** Three
things stand between it and breakout: (a) a first-run that produces value in <60
seconds, (b) an "add" flow that feels like magic instead of a form, and (c) a
social/discovery loop that turns private journals into growth.

---

## 2. What is genuinely strong — protect these

1. **The brand & token architecture.** `listTheme.ts` is the single source of
   truth: one brand, two moods — "Daylight" (cream) and "Supper" (deep green) —
   with terracotta/amber accents, driving **both** the MUI theme and generated
   CSS variables (`brandCssVars()`), so the CSS and component layers can't drift.
   Instrument Serif (display, always weight 400 — never bolded), DM Sans (body),
   DM Mono (prices). This is disciplined, editorial, and unusual in a good way.
2. **Auto-enrichment.** Blur the name+address → OpenStreetMap lookup → discovered
   website → Cheerio scrape → photo, cuisine, reservation link, socials, price,
   Michelin/Bib, dietary, place type — with a **glow animation on exactly the
   fields that just filled**. That "it read my mind" moment is the product's soul.
3. **Accessibility is not an afterthought.** Visually-hidden H1, `aria-pressed`
   on toggles, keyboard-operable non-button rows, ≥44px primary tap targets,
   `@media (hover:none)` fallbacks so touch users still see row actions.
4. **Thoughtful state handling.** Undo on delete (full-row snapshot restore),
   Retry on failure, graceful "saved but couldn't geocode" warning, honest empty
   states that differ for filtered-vs-truly-empty and editor-vs-viewer.
5. **Sharing that respects trust.** RLS-backed roles, read-only public links with
   optional expiry, and fork-to-your-account — the growth primitive already exists.

**Design principle for everything below: do not restyle what already works.
Extend the existing token system and the existing services/RLS layer. New
surfaces must read as the same table, end to end.**

---

## 3. UX/UI issues & opportunities — prioritized

### P0 — First-run creates nothing (highest drop-off risk)
A brand-new account lands on an **empty dashboard** with a single "Add your first
restaurant" button. The only path forward is a large modal that assumes the user
already knows a name and address to type. There is no seeded example, no import,
no "add three places you love and watch them come alive." Investors will see
signups; the funnel will leak at the empty state. **This is the #1 fix.**

### P0 — "Add" is a form, not a search
The magic (enrichment) is **reactive** — it fires on field blur, _after_ the user
has already typed a name and address into a 20+ field modal. The world-class
pattern is the inverse: **a single search box → live results with photo, address,
cuisine → tap one → the card is 90% pre-filled → confirm.** The scraping/lookup
backend to power this already exists; it's wired to the wrong front door. Turning
`RestaurantFormDialog` from "fill this out" into "search and confirm" is the
single highest-leverage UI change in the app.

### P1 — No sense of self / no payoff for journaling
Users log places, ratings, visit counts, cuisines, cities, price tiers, Michelin
— and the app gives **none of it back**. There's no stats view, no "your taste in
food," no "2026 in restaurants." This is the retention _and_ growth flywheel a
journal is begging for: a beautiful, shareable recap is both a reason to keep
logging and a viral artifact.

### P1 — The social graph is a dead end
Sharing is link-only. There's no following, no public profile, no "what your
friends just added," no activity. For a network-effect play with investor
backing, the product needs a lightweight **discovery/activity layer** — even just
"people you share lists with added 4 places this week."

### P1 — Filter bar overflows; views aren't saveable
The dashboard control row can carry status pills + cuisine + cost + rating +
place + diet + menu + sort + reverse + clear simultaneously, wrapping badly on
smaller widths. Filters live in React state, not the URL, so a curated view can't
be **linked, bookmarked, or saved** ("Date-night $$$ Italian, been, top-rated").
Saved/named views would make power users sticky and are trivially shareable.

### P2 — Map view is functional but flat
Custom-styled Leaflet, no marker clustering, the side list doesn't sync
hover/selection with the pins, and there's no "near me / around here." For a
map-first use case (deciding where to eat _now_), this is underpowered.

### P2 — Ratings & notes are single-dimensional
One 0.5-precision star and a free-text note. Foodies think in dimensions
(food/vibe/service/value) and in **dishes** ("get the uni pasta"). Optional
structured facets + dish tags would deepen the data and the differentiation.

### P2 — Landing page is static; loading is text, not skeletons
The hero's sample cards are decorative; there's no interactive/live demo and no
real social proof. In-app loading ("Loading map…", spinners) would feel more
premium as branded skeletons.

### P3 — Positioning/naming drift
Repo is "The-List", the product renders as **"The Foodiedex"**, the hero says
"little black book," the User-Agent says "TheFoodiedex". Pick one name and one
sentence and make everything agree.

---

## 4. Feature gaps worth a roadmap slot
- **Import** (paste a list, Google Maps saved places, a screenshot → OCR).
- **PWA / installable + camera-first "add at the table"** capture.
- **Reservation depth** — track intent, remind, add to calendar (today it's a
  link-out only).
- **Notifications / digests** — "your list got 3 new places," weekly digest.
- **Collections/tags beyond lists** — cross-list themes ("date night," "brunch").

---
---

# PROMPT 1 — for **Claude Design**

> Paste into Claude Design. This is a visual + interaction brief. It intentionally
> constrains you to the existing brand so output reads as the same product.

---

**Role & goal.** You are the lead product designer for **The Foodiedex**, a
shared restaurant journal. Redesign the highest-leverage flows below into an
_absolutely unique, modern, seamless_ experience that would make a jaded investor
lean in. Do **not** invent a new brand — evolve the one that exists.

**Brand system (honor exactly — this is the whole identity, don't fight it):**
- **One brand, two moods.** "Daylight" — cream page `#EFE7D8`, panels `#FBF7F0`,
  cards `#FFFFFF`, ink `#2B2420`, terracotta accent `#B5532F`. "Supper" — near-
  black-green page `#0E150D`, panels `#15201B`, cards `#1C2A23`, ink `#EFE7D6`,
  amber accent `#D9913F`. Design **every screen in both moods.**
- **Type.** Display = **Instrument Serif**, always regular weight (never bold the
  serif — that's a brand rule). Body/UI = **DM Sans**. Numerals/prices = **DM
  Mono**. Editorial, warm, magazine-like — not techy.
- **Shape & motion.** Buttons are soft rectangles (radius 12–16); **pills are
  reserved for selection controls** (filters, view toggles, status). Glassmorphism
  is allowed only on the marketing/auth "hero" surfaces (terracotta+amber radial
  glow on the Supper base). Motion is quiet and confident: gentle fade-up on
  enter, a signature **accent glow** on any field/value that auto-fills.
- **Voice.** Warm, human, a little literary. "Every good meal, worth
  remembering." "A shared table for a few good friends." Never corporate.

**Design these five, in priority order. For each: full layouts (desktop +
mobile), both moods, empty/loading/populated states, and the key micro-
interactions annotated.**

1. **First-run onboarding (P0).** A signed-in user with zero places must reach a
   populated, delightful list in **under 60 seconds**. Design the moment: a warm
   welcome, then a fast way to seed 3–5 places (search-and-tap, "starter packs" by
   city/vibe, or import). Show the list _coming to life_ — cards filling with
   photos as they resolve. Design the celebratory "your list is alive" state.

2. **"Add a place" reimagined as search-first (P0).** Replace the fill-out form
   with a **command-style search → live results (photo, name, cuisine, city, price)
   → tap → a nearly-complete card to confirm.** The confirm view shows enriched
   fields with the signature glow and a one-tap "looks right, save." Manual entry
   is the fallback, not the default. Design the search empty state, the results,
   the confirm card, and the graceful "we couldn't find it, add by hand" path.

3. **"Your taste in food" — a personal recap (P1).** A beautiful, **shareable**
   stats surface built from real data (cuisines, cities, price tiers, most-visited,
   Michelin count, been-vs-want ratio, a map of everywhere). Design the in-app
   view **and** the exportable share card (square + story sizes), branded, in both
   moods. This is a growth artifact — make people _want_ to post it.

4. **Dashboard filtering & saved views (P1).** Rework the overflowing filter row
   into something calm and scalable (progressive disclosure / a filter sheet), and
   design **named, saveable, shareable views** ("Date-night $$$ Italian"). Show how
   an active view is expressed and how a user creates/renames/pins one.

5. **Map view, elevated (P2).** Clustered pins, hover/selection synced between the
   side list and the map, a "near me" affordance, and a card peek on pin tap —
   styled in the brand's map palette for both moods.

**Deliverables:** high-fidelity mockups for each flow (both moods), an annotated
interaction spec for the search-first add and the auto-fill glow, and any **new
tokens** you introduce (named to fit `listTheme.ts`, e.g. `--glow`, `--skeleton`),
so engineering can drop them straight into the existing system. Reuse existing
tokens everywhere possible; call out anything genuinely new.

**Bar:** if a screen could belong to any other restaurant app, it's wrong. Every
surface must feel like _this_ table — warm, editorial, unmistakable.

---
---

# PROMPT 2 — for **Claude Code**

> Paste into Claude Code, working in this repo. Technical feature implementation.
> Respect the existing architecture; do not rewrite what works.

---

**Context.** This is **The Foodiedex**: Remix 2 (Vite → Netlify Functions),
Supabase (auth + Postgres with **row-level security** + storage), MUI 6 + Emotion
on a hand-built token system (`app/listTheme.ts` → `makeListTheme()` +
`brandCssVars()`), Leaflet, and i18next (EN/FR). Data access is layered:
`app/services/*.server.ts` (server, RLS-scoped) and `*.client.ts` (browser).
Enrichment endpoints already exist: `app/routes/api.lookup-place` (OSM Nominatim),
`api.scrape-website` (Cheerio + SSRF guard), `api.geocode`.

**Non-negotiable house rules:**
- **Never hardcode colors/spacing.** Use `listTokens`/`makeListTheme` tokens; if
  you need a new one, add it to `ListTokens`, both `light` and `dark`, and (if it
  needs a CSS var) `CSS_VAR_MAP` — so MUI and CSS stay generated from one source.
- **Every user-facing string goes through i18next** and must be added to **both**
  `app/locales/en/common.json` and `app/locales/fr/common.json`.
- **All data access respects RLS and the Owner/Editor/Viewer role model.** New
  tables get RLS policies in `supabase/schema.sql`; the script must stay
  idempotent/re-runnable. Follow the existing `services` split (server vs client).
- **SSR-safety:** anything touching `window` (Leaflet, localStorage) stays
  client-only, matching the existing `import.meta.env.SSR` / mount-guard patterns.
- Keep accessibility parity with the current code (aria-pressed, labels, ≥44px
  targets, keyboard handlers). Run `npm run lint` and `npm run typecheck` clean.
- Do **not** create a PR unless asked. Commit to the working branch with clear
  messages.

**Build these, in order. Ship each as an independent, reviewable change.**

### 1. Search-first "Add a place" (P0 — highest leverage)
Add a new **place-search endpoint** `app/routes/api.search-place` that queries OSM
Nominatim (reuse the User-Agent, timeout, and never-throw pattern from
`api.lookup-place`) and returns ranked candidates `{ name, address, lat, lng,
category, website? }`. In `RestaurantFormDialog`, add a **search field at the top**:
debounced query → results list (name, address, cuisine/category) → selecting one
**pre-fills the form and runs the existing `applyLookup`/`runScrape` chain**, so
photo/reservation/socials resolve with the current glow. Keep the full manual form
as a "enter manually" fallback. Preserve all existing validation and save logic.

### 2. First-run onboarding (P0)
Detect the zero-places state for an Owner and render a dedicated onboarding
surface (new component, e.g. `app/components/Onboarding.tsx`) instead of the plain
empty card. Provide (a) the search-first add from #1, and (b) **1–2 "starter pack"
seeds** — small curated arrays of `{ name, address }` that fan out through the
existing lookup+geocode pipeline to create real, enriched rows. Show per-item
progress as cards resolve. Gate it so it only appears until the list has ≥1 place.

### 3. "Your taste in food" recap (P1)
New route `app/routes/stats` (loader pulls the user's restaurants via the existing
server service, RLS-scoped). Compute, in a pure util (`app/utils/foodStats.ts`,
unit-testable): cuisine breakdown, city breakdown, price-tier distribution,
been/want split, most-visited, Michelin/Bib counts, total spots. Render with the
brand tokens in **both moods**. Add a **share-card export** (render a branded
`<canvas>` or SVG → PNG download) sized for social. Link it from the dashboard
account menu. All labels i18n'd.

### 4. Saved views (P1)
Persist filter/sort state to the **URL** first (searchParams: cuisine, cost,
rating, place, diet, menu, sort, reversed, status, q) so any view is linkable and
back/forward works. Then add **named saved views**: new `list_views` table (RLS:
owner-scoped) with `{ id, list_id, user_id, name, params jsonb }`, a
`services/views.{server,client}.ts` pair, and dashboard UI to save / pick / rename
/ delete a view. A saved view is just a stored querystring.

### 5. Map enhancements (P2)
In `RestaurantMap`, add **marker clustering** (Leaflet cluster approach compatible
with the lazy client-only import) and **two-way hover/selection sync** between the
side list and the pins (lift a `hoveredId`/`selectedId` into the dashboard).
Optional: a "near me" control using `navigator.geolocation` to recenter. Keep it
SSR-safe and styled with the existing map tokens.

**For each feature:** update `schema.sql` (idempotent, with RLS) when adding
tables, add EN+FR strings, keep the token discipline, and leave lint+typecheck
green. Prefer small PR-sized commits over one large change.

---

## 5. Suggested sequencing
Ship **Prompt 2 #1 (search-first add)** and **#2 (onboarding)** first — together
they fix the activation funnel and let the enrichment moat do the talking. Then
**#3 (recap)** for the growth loop, **#4 (saved views)** for power-user retention,
**#5 (map)** to round out the core use case. Run Prompt 1 (Design) in parallel so
engineering builds against real comps, not guesses.
