# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Community members and organizations that need essential resources during a disruption.
- Donors, shops, warehouses, relief centers, and participating organizations that can list free or affordable supplies.
- Coordinators who review needs, evaluate resource recommendations, and oversee allocations.
- Warehouse providers who manage local inventory and pickup information.

## Product Purpose

Lifeline connects essential resources with people who need them during community disruptions. Success means people can find nearby supplies and submit needs while coordinators can review transparent matches and make accountable allocation decisions.

## Positioning

Lifeline combines free donations, affordable surplus, assistance requests, accessible inventory, and human-reviewed resource matching in one community coordination workspace.

## Operating Context

The product is demonstrated with fictional local listings, requests, providers, and incidents. A judge should be able to browse resources, submit a request or simulated order, review an allocation as a coordinator, trigger a disruption scenario, inspect the audit history, and restore the baseline demo.

## Capabilities and Constraints

- The current application is a React, TypeScript, and Vite web project with React Router and Lucide icons.
- Demo roles are a convenience and are not real authentication or authorization.
- Demo records and simulated workflows must be labeled clearly; no inventory, road conditions, or emergency information is live.
- Free requests and paid simulated orders are distinct. The app must not collect payment credentials or silently substitute a paid item for a free resource.
- Consequential allocations require an explicit coordinator decision and a reason. Recommendations alone do not reserve stock or fulfill requests.
- Inventory must respect reservations, expiry, and accessibility; allocations cannot exceed eligible stock.
- Demo state persists locally and can be reset to its consistent seed data.
- The proposed FastAPI and PostgreSQL integration is future work. API paths in documentation are contracts, not evidence of a running backend.

## Brand Commitments

The product name is Lifeline. Tagline: “Essential resources. Connected communities. Stronger recovery.” The primary alignment is UN Sustainable Development Goal 11, Sustainable Cities and Communities; the secondary alignment is SDG 13, Climate Action. The user specified a deep navy navigation, teal primary actions, an off-white content area, dark navy typography, amber pending states, and red only for urgent risks.

## Evidence on Hand

There are no supplied real-world partners, users, live inventory records, outcomes, or impact measurements. Product and incident records in the demo are fictional and must be identified as such. Do not claim lives saved, beneficiaries served, or donations delivered without evidence.

## Product Principles

- Show free and paid resources distinctly and explain prices before an order.
- Make shortages, stock reservations, expiry, and access constraints visible.
- Keep people in control of consequential allocation decisions.
- Record decisions and state changes so coordinators can review what happened.
- Make simulated data and capabilities easy to recognize.

## Accessibility & Inclusion

Navigation, forms, dialogs, status labels, and tables should be keyboard accessible and usable on desktop, tablet, and mobile. Never rely on color alone to communicate a status.
