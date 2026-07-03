# The Foodiedex — Design System v2 (flows, tokens, interaction spec)

_Design authored and implemented in-house (Claude Design unavailable). Evolves the
existing brand — it does not replace it. Everything below is expressed in the two
moods already in `app/listTheme.ts`: **Daylight** (cream) and **Supper** (deep
green), and reuses the established type system (Instrument Serif display / DM Sans
body / DM Mono numerals)._

## Design principles carried forward (unchanged)
- **One brand, two moods.** Every surface renders in both; colour comes only from
  `listTokens[mode]`, never hardcoded. New surfaces added here are no exception.
- **Serif is quiet.** Instrument Serif at weight 400, for names and headlines only.
- **Pills for selection, soft rectangles for actions.** Radius 12–16 on buttons and
  cards; 999 only on filters/toggles/status.
- **Glass only on heroes.** Marketing/auth keep the terracotta+amber radial glow;
  the app chrome stays solid.
- **Motion is quiet.** Fade-up on enter; the signature **accent glow** marks any
  value that just auto-filled. Nothing bounces.

## New tokens (added to `ListTokens`, both moods, + `CSS_VAR_MAP`)
| Token | `--css` | Daylight | Supper | Purpose |
|-------|---------|----------|--------|---------|
| `glow` | `--glow` | `rgba(181,83,47,.32)` | `rgba(217,145,63,.42)` | The "just auto-filled" halo — a stronger `ring`, used as a `box-shadow` on filled fields and resolving cards. |
| `skeleton` | `--skeleton` | `rgba(120,110,95,.14)` | `rgba(239,228,210,.08)` | Neutral base for loading skeletons (search results, resolving onboarding cards). |

Both are warm/neutral so they read as the same table in either mood. Everything
else reuses existing tokens (`accent`, `searchBg`, `border`, `cardBg`, `muted`, …).

---

## Flow 1 — First-run onboarding (P0) → _implemented_
**Goal:** zero → a living list in under a minute.

- **Trigger:** an Owner opens a list with **0 places** (not the filtered-empty or
  viewer states, which keep the plain empty card).
- **Composition:** a warm serif welcome ("Let's set your table."), one primary
  **search field** (Flow 2's `PlaceSearch`), and 2–3 **city starter packs**
  ("Ottawa classics", "Toronto icons", "Montreal essentials") as pill chips.
- **The "alive" moment:** tapping a search result **or** a starter-pack place adds
  it **immediately** — no form. Each pending place shows a `skeleton` card that,
  as enrichment resolves, fills with its **photo** and cuisine and settles with a
  one-shot `glow`. Starter packs seed several at once, sequentially (respecting the
  ~1/sec geocode limit), so the grid visibly comes to life.
- **Exit:** once ≥1 place exists the onboarding is replaced by the normal list.
- **Mobile:** search and packs stack full-width; resolving cards are a single
  column. **Both moods** inherit from tokens automatically.
- **Micro-interactions:** card `skeleton` → cross-fade to photo (200ms) → `glow`
  ring (fades over 2.2s, same timing as the form glow).

## Flow 2 — "Add a place", search-first (P0) → _implemented_
**Goal:** the enrichment magic leads, the form follows.

- **Composition:** `RestaurantFormDialog` gains a **search accelerator at the very
  top** — a prominent search field ("Search for a place to autofill…"). The full
  manual form stays below as the **fallback** (never removed).
- **Live results:** debounced (350ms) query → `/api/search-place` → up to 6 rows,
  each with an initial thumb, **name** (serif), **address** (muted), and a cuisine
  chip. While loading, three `skeleton` rows. Empty query hides the panel; a
  no-match query shows a quiet "nothing found — just type below."
- **Tap → seed → glow:** selecting a result fills name, address (+ coords),
  cuisine, place types, and website **immediately** (each ringed with `glow`), then
  runs the **existing** lookup+scrape chain (`handlePlaceLookup`) so photo,
  reservation link, dietary, phone, price, and Michelin flow in — every filled
  field glows as it lands. The user confirms with the existing Save button
  ("one-tap confirm").
- **Interaction spec (the glow):** on any programmatic fill, the field key is added
  to a highlight set → `box-shadow: 0 0 0 3px var(--glow)` with a 0.5s ease-in, held
  ~2.2s, then cleared on a timer (existing `markFilled`/`glowSx`). Applies to text
  fields, the image preview, and checkbox groups (place types).
- **Keyboard/a11y:** results are a `listbox`; ↑/↓ move, Enter selects, Esc closes;
  each row ≥44px. The input has an `aria-label` and the panel `role="listbox"`.

## Flow 3 — "Your taste in food" recap (P1) → _spec (plumbing ready: `foodStats.ts`)_
- **In-app view** at `/stats`: an editorial page built from `computeFoodStats` —
  a serif hero number ("**47 spots. 12 cuisines. 4 cities.**"), a cuisine bar list,
  price-tier row, been-vs-want split, most-visited leaderboard, Michelin/Bib count,
  and a mini map of everywhere. Both moods.
- **Share card:** a branded, exportable card (canvas/SVG → PNG) in **square** and
  **story** sizes, using the Supper palette + amber glow by default. One tap to
  download/share. This is the growth artifact.
- **Entry:** a "Your taste in food" item in the account menu.

## Flow 4 — Filtering & saved views (P1) → _spec (plumbing ready: URL filter state)_
- **Calm the row:** collapse the many filter chips into a single **Filters** button
  that opens a **sheet** (bottom sheet on mobile, popover on desktop) grouping
  cuisine/cost/rating/type/diet/menu with counts; the status pills + sort stay
  inline. An active-filter count badges the button.
- **Saved views:** because filters already live in the URL, a view is just a named
  querystring. Add a `list_views` table (RLS, owner-scoped) and a "Save this view"
  affordance → named, pinnable, shareable ("Date-night $$$ Italian"). Views render
  as pills above the grid.

## Flow 5 — Map, elevated (P2) → _substantially implemented_
- **Done:** marker **clustering** (`leaflet.markercluster`) and **two-way
  hover/selection sync** between the side list and the pins, with the hovered
  restaurant's pins enlarged + `accent`-ringed and its row auto-scrolled into view.
- **Next:** a "near me" control (`navigator.geolocation` recenter) and a richer
  **card peek** on pin tap (photo + rating + reserve) in place of the default popup.

---

## Build status
- **Implemented now:** Flow 2 (search-first add) and Flow 1 (onboarding), plus the
  shared `PlaceSearch` component and the new tokens. Flow 5 landed earlier.
- **Spec'd, plumbing ready:** Flow 3 (recap → `foodStats`) and Flow 4 (saved views
  → URL filter state), ready to build against these comps/specs.
