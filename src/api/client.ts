import type { ApiEnvelope } from './types'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1').replace(/\/$/, '')

/** Proposed routes only. They are not evidence that a FastAPI service exists. */
export const apiRoutes = {
  auth: { register: '/auth/register', login: '/auth/login', me: '/auth/me' },
  listings: '/listings',
  warehouses: '/warehouses',
  nearbyWarehouses: '/warehouses/nearby',
  requests: '/requests',
  myRequests: '/requests/mine',
  orders: '/orders',
  myOrders: '/orders/mine',
  inventory: '/inventory',
  recommendations: '/matching/recommendations',
  reviews: '/reviews',
  auditEvents: '/audit-events',
  deliveries: '/deliveries',
  overviewAnalytics: '/analytics/overview',
  resourceAnalytics: '/analytics/resources',
} as const

export class ApiContractUnavailableError extends Error {
  constructor(operation: string) {
    super(`${operation} is waiting for the FastAPI service and its confirmed OpenAPI contract. The current app is running from local demo state.`)
    this.name = 'ApiContractUnavailableError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } })
  let envelope: ApiEnvelope<T>
  try { envelope = await response.json() as ApiEnvelope<T> }
  catch { throw new Error(`The API returned an unreadable response (${response.status}).`) }
  if (!response.ok || envelope.error) throw new Error(envelope.error?.message || envelope.message || `Request failed with status ${response.status}.`)
  return envelope.data
}

/** A centralized fetch boundary for a future typed API adapter. This is not used in mock mode. */
export const api = {
  baseUrl: API_BASE_URL,
  routes: apiRoutes,
  call<T>(path: string, init?: RequestInit): Promise<T> { return request<T>(path, init) },
}
