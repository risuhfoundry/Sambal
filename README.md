# Lifeline

**Essential resources. Connected communities. Stronger recovery.**

Lifeline is a responsive community resilience prototype for coordinating free donations, affordable surplus, assistance requests, warehouses, and human-reviewed allocations during disruptions. It aligns with UN Sustainable Development Goal 11 (Sustainable Cities and Communities) and SDG 13 (Climate Action).

## Run locally

Prerequisites: Node.js 22 or newer and npm.

```powershell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). This project configures Vite on port 3000; it prints its selected URL if that port is busy.

Useful commands:

```powershell
npm test
npm run build
npm run preview
```

The test command uses Node 22's experimental built-in TypeScript type stripping to run the domain rule tests without an extra test framework.

## Walk through the demo

- Start at **Overview**. All metrics are derived from the current browser state.
- Switch the demo role in the top bar: **Taker**, **Giver**, **Coordinator**, or **Warehouse Provider**. This is a presentation shortcut, not authentication or authorization.
- **Find resources** distinguishes free donations from priced surplus. Submit a free assistance request or place a simulated paid order. Paid orders show their total before placement, save the unit-price snapshot, and reduce stock. No payment details are requested.
- **Manage listings** lets a giver publish, edit, pause, reactivate, and remove listings. Reserved stock cannot be silently removed or reduced below its reserved quantity.
- **Coordinator review** shows rule-based free-resource suggestions, available and reserved quantities, exclusions, shortages, alternatives, and a reason field. Approving creates reservations; it does not mark the request fulfilled. In **Assistance Requests**, confirm a simulated pickup or release a reservation with a note; this updates stock, delivery history, request status, and audit history. Rejecting a partially allocated request releases its outstanding reservation.
- **Resilience simulator** activates Flood or Heatwave scenarios. Flood makes East Junction inventory unavailable; Heatwave adds water demand while leaving stock unchanged. Both effects are simulated and require coordinator action.
- **Activity & audit log** records actions and coordinator decisions. **Settings & demo reset** restores the original seed data, including requests, orders, scenarios, reviews, and audit history.

Suggested judging sequence: browse a free water listing and submit a request; open Coordinator review and approve a partial or full allocation with a reason; inspect the reservation and audit record, then confirm a simulated pickup in Assistance Requests; place a small paid order and verify its exact total; activate Heatwave or Flood and review the shortage/access change; reset from Settings.

## Features

- Ten responsive navigation areas: Overview, Find Resources, Assistance Requests, My Orders, Manage Listings, Warehouses, Coordinator Review, Resilience Simulator, Activity & Audit Log, and Settings & Demo Reset.
- Thirteen fictional listings, ten baseline assistance requests, and five fictional pickup centers.
- Search and filters for category, free or paid type, and maximum price; sort by price or available quantity.
- Browser-local persistence via `localStorage`; no account or network connection is required for the demo.
- Inventory rules exclude active reservations, expired stock, paused or removed listings, inaccessible warehouses, and flood-blocked inventory.
- A baseline reset restores all domain records consistently.
- Keyboard focus indicators, labeled form controls, responsive tables and mobile navigation, status text that does not rely on color alone, and reduced-motion support.

## Demo limitations

All organizations, people, requests, listings, inventory, warehouse locations, and incident effects are fictional. Stock availability, addresses, road access, verification, and pickup are not live. Simulated paid orders do not process payments. The role selector is not real authentication. The browser-local store does not synchronize between devices, and this prototype is not an emergency response service. No impact metrics such as lives saved or people served are claimed.

The warehouse experience is a searchable, filterable list with inventory details. An interactive map and live geolocation are not implemented.

## Architecture

- `src/domain/models.ts` — typed domain entities and workflow states.
- `src/data/seed.ts` — consistent fictional baseline data.
- `src/domain/rules.ts` — stock eligibility, transparent recommendations, coordinator decisions, paid orders, incident activation, and dashboard totals.
- `src/state/DemoStore.tsx` — React state, localStorage persistence, demo role changes, and reset.
- `src/screens.tsx` — responsive application screens and end-to-end demo journeys.
- `src/App.tsx` and `src/styles.css` — routes, navigation, layout, design tokens, and responsive states.
- `src/api/client.ts` and `docs/api-contract.md` — centralized future HTTP boundary and proposed FastAPI contracts.

The mock store is the current implementation. No FastAPI service, PostgreSQL database, real login, live inventory feed, or delivery integration is included.

## FastAPI and PostgreSQL integration plan

Copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL` to the future service base (default example: `http://localhost:8000/api/v1`). Do not put secrets in a `VITE_` variable; Vite exposes those values to the browser. The frontend remains in mock mode until an API adapter is implemented against the supplied OpenAPI schema. Proposed endpoint paths are listed in [docs/api-contract.md](docs/api-contract.md); they are not running endpoints.

Suggested next integration steps: implement FastAPI endpoints and PostgreSQL models from that contract; add actual authentication and server-side role authorization; add transactional stock reservations with concurrency protection; then implement a typed API adapter and switchable mock/API service interface. Preserve explicit human approval and the existing stock invariants on the server.

## Environment variables

`.env.example` contains only non-secret local configuration. Leave the demo in mock mode for a standalone walkthrough.
