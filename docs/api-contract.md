# Proposed API contract

These routes prepare the frontend for a future FastAPI service. No server is included and none of these endpoints is currently implemented. The example base URL is `http://localhost:8000/api/v1`.

| Area | Method | Path |
| --- | --- | --- |
| Authentication | POST | `/auth/register` |
| Authentication | POST | `/auth/login` |
| Authentication | GET | `/auth/me` |
| Listings | GET | `/listings` |
| Listings | POST | `/listings` |
| Listings | GET | `/listings/{id}` |
| Listings | PATCH | `/listings/{id}` |
| Listings | DELETE | `/listings/{id}` |
| Warehouses | GET | `/warehouses` |
| Warehouses | GET | `/warehouses/nearby` |
| Warehouses | GET | `/warehouses/{id}/inventory` |
| Requests | GET | `/requests` |
| Requests | POST | `/requests` |
| Requests | GET | `/requests/mine` |
| Orders | GET | `/orders` |
| Orders | POST | `/orders` |
| Orders | GET | `/orders/{id}` |
| Orders | GET | `/orders/mine` |
| Inventory | GET | `/inventory` |
| Matching and reviews | GET | `/matching/recommendations` |
| Matching and reviews | POST | `/reviews` |
| Audit | GET | `/audit-events` |
| Deliveries | GET | `/deliveries` |
| Analytics | GET | `/analytics/overview` |
| Analytics | GET | `/analytics/resources` |

Before connecting the UI, define request and response schemas from the server's OpenAPI document. Allocation approval should use a database transaction that rechecks listing status, expiry, access, and unreserved quantity before reserving stock. The server must record the coordinator, reason, final allocation, request, and timestamp. API errors must be shown to the user; they must never fall back silently to demo state.
