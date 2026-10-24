# Lifeline design system

This is the visual and interaction contract for the current React demo. The source of truth is `src/styles.css`, shared layout in `src/App.tsx`, and shared screen helpers in `src/screens.tsx`. Keep this page aligned with the shipped UI; it does not describe planned backend features.

## Visual tokens

- **Type:** Manrope, then the system sans-serif stack. Use the existing compact hierarchy: page titles 25–31px, section headings about 13–17px, body and control copy mostly 11–12px. Use tabular numerals for quantities and totals.
- **Core colors:** navy `#132d36` / `#1b3a43`, ink `#19313a`, muted text `#60747a`, white paper `#fff`, and canvas `#f4f7f6`.
- **Borders and accents:** line `#dce6e4`, soft line `#eaf0ef`; teal action `#117d78`, dark teal `#0c625f`, pale teal `#e8f5f2`.
- **Status colors:** green `#25714e` / `#e8f5ed` for positive states, amber `#8b5b0a` / `#fff4dd` for review or caution, and red `#a93835` / `#fcecea` for urgent or blocked states. Neutral badges use gray-green. The focus ring is teal `#1d9690`.
- **Shape and spacing:** panels and cards use thin borders, white surfaces, and roughly 9–11px radii. Controls are compact, generally 36–37px tall; use the existing spacing and component classes rather than introducing a second scale.

## Layout and responsive behavior

Desktop uses a fixed 254px navy sidebar, a 62px sticky white top bar, and a centered content area capped at 1600px. At 1100px the sidebar narrows to 226px. At 900px and below, the sidebar is replaced by a horizontally scrollable mobile navigation and the top bar remains sticky. At 680px and below, content gutters tighten, multi-column panels and forms stack, metric cards become two columns, and side-by-side warehouse and review layouts stack. Tables stay in horizontal scroll containers; keep their `.table-scroll` wrapper.

## Component conventions

Use `PageTitle` for a screen heading, description, and optional action; `DemoStrip` for screen-level demo context; `Badge` for concise status text; `Empty` for no-results states; and `.panel` / `.section-head` for grouped content. Buttons use `.button` with `--primary`, `--secondary`, `--ghost`, or `--danger` variants and `--sm` for compact actions. Prefer these existing patterns and modifier classes to one-off visual treatments. Lucide icons accompany text and should not replace action or status wording.

## Status and demo labeling

Status is written in the badge or nearby copy; color only reinforces the words. Keep free donations and paid surplus visibly distinct, and show the paid unit price and order total before an order is placed. Every screen has a `DemoStrip`; the top bar also identifies simulated data, while the footer states that this is a local prototype with no live emergency data. On narrow phones the top-bar label compacts to a dot, so preserve the screen-level strip and its explicit text. Treat records, locations, inventory, access, verification, and incident effects as fictional and browser-local.

## Accessibility and human decisions

- Keep the skip link, named navigation landmarks, visible `:focus-visible` outlines, labeled native form controls, and screen-reader-only labels where a visible label is not suitable. Interactive controls must remain keyboard usable.
- Give updates a status or alert role where appropriate. Keep status meaning in text, not color alone, and keep tables scrollable rather than hiding columns on small screens.
- Honor `prefers-reduced-motion`; existing hover transitions are deliberately brief.
- The role selector is a walkthrough aid, not authentication or authorization. Recommendations are informational: a coordinator must record an explicit decision and reason before an allocation reserves stock. Keep free assistance separate from paid orders; never silently substitute a paid item. Orders and pickup actions are simulated; no payment, live fulfillment, or real-world delivery is connected.
