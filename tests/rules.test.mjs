import assert from 'node:assert/strict'
import test from 'node:test'
import { createSeedState } from '../src/data/seed.ts'
import { activeReservationCount, activeReviews, applyHumanDecision, availableStock, fulfillRequestAllocation, getRecommendation, makeIncident, pendingRequests, placePaidOrder, releaseRequestAllocation, stockTotals, unavailableStock, warehouseInventory } from '../src/domain/rules.ts'

test('reserved inventory is excluded from available stock', () => {
  const state = createSeedState()
  assert.equal(activeReservationCount(state, 'L-102'), 8)
  assert.equal(availableStock(state, state.listings.find(item => item.id === 'L-102')), 18)
})

test('expired products cannot be recommended or counted as accessible inventory', () => {
  const state = createSeedState()
  const expired = state.listings.find(item => item.id === 'L-111')
  assert.equal(availableStock(state, expired), 0)
  assert.equal(unavailableStock(state, expired), 10)
  const request = { ...state.requests[0], resourceName: 'Bottled water', unit: 'bottles', quantity: 2 }
  const match = getRecommendation(state, request)
  assert.equal(match.availableQuantity, 0)
  assert.ok(match.explanations.some(line => line.includes('Expired')))
})

test('paid order totals use a price snapshot and decrement stock once', () => {
  const state = createSeedState()
  const next = placePaidOrder(state, 'L-104', 3, '2026-10-23T10:00:00.000Z')
  assert.equal(next.orders[0].unitPriceInr, 85)
  assert.equal(next.orders[0].totalInr, 255)
  assert.equal(next.listings.find(item => item.id === 'L-104').quantity, 35)
  assert.equal(state.listings.find(item => item.id === 'L-104').quantity, 38)
})

test('paid checkout rejects overselling and non-paid products', () => {
  const state = createSeedState()
  assert.throws(() => placePaidOrder(state, 'L-104', 39), /Only 38/)
  assert.throws(() => placePaidOrder(state, 'L-101', 1), /no longer available/)
  assert.throws(() => placePaidOrder(state, 'L-104', 1.5), /positive whole number/)
})

test('recommendations use eligible free stock of matching category and unit only', () => {
  const state = createSeedState()
  const match = getRecommendation(state, { ...state.requests.find(item => item.id === 'REQ-2401'), quantity: 500 })
  assert.equal(match.availableQuantity, 360)
  assert.equal(match.shortage, 140)
  assert.ok(match.allocations.every(allocation => ['L-101', 'L-113'].includes(allocation.listingId)))
  assert.equal(match.allocations.some(allocation => allocation.listingId === 'L-111'), false)
})

test('coordinator approval rejects otherwise free stock with a different unit', () => {
  const state = createSeedState()
  state.listings = state.listings.map(item => item.id === 'L-101' ? { ...item, unit: 'gallons' } : item)
  assert.throws(() => applyHumanDecision(state, 'REQ-2401', 'Approved', 'Check unit safeguards.', [{ listingId: 'L-101', quantity: 10 }]), /category and unit/)
})

test('human approval clamps allocation to request and inventory, reserves it, and records a reason', () => {
  const state = createSeedState()
  const next = applyHumanDecision(state, 'REQ-2401', 'Approved', 'Highest urgency; nearby stock verified.', [{ listingId: 'L-101', quantity: 999 }], '2026-10-23T10:05:00.000Z')
  assert.equal(next.requests.find(item => item.id === 'REQ-2401').allocatedQuantity, 60)
  assert.equal(next.requests.find(item => item.id === 'REQ-2401').status, 'Approved')
  assert.equal(next.reservations.at(-1).quantity, 60)
  assert.equal(availableStock(next, next.listings.find(item => item.id === 'L-101')), 180)
  assert.equal(next.reviews[0].reason, 'Highest urgency; nearby stock verified.')
  assert.equal(next.audit[0].action, 'Allocation approved')
  assert.throws(() => applyHumanDecision(next, 'REQ-2401', 'Approved', 'Try to allocate it again.', [{ listingId: 'L-101', quantity: 1 }]), /no units remain eligible/)
})

test('partial allocation preserves the shortage and cannot reuse its reservation', () => {
  let state = createSeedState()
  state.requests = state.requests.map(item => item.id === 'REQ-2401' ? { ...item, quantity: 300 } : item)
  state = makeIncident(state, 'Flood', '2026-10-23T10:10:00.000Z')
  const request = state.requests.find(item => item.id === 'REQ-2401')
  const recommendation = getRecommendation(state, request)
  assert.equal(recommendation.availableQuantity, 240)
  assert.equal(recommendation.shortage, 60)
  const next = applyHumanDecision(state, request.id, 'Approved', 'Only accessible water is approved; escalate the remaining 60 litres.', recommendation.allocations, '2026-10-23T10:11:00.000Z')
  const updated = next.requests.find(item => item.id === request.id)
  assert.equal(updated.status, 'Partially Allocated')
  assert.equal(updated.allocatedQuantity, 240)
  assert.equal(getRecommendation(next, updated).shortage, 60)
  assert.equal(warehouseInventory(next, next.warehouses.find(item => item.id === 'WH-02')).available, 0)
  assert.throws(() => applyHumanDecision(next, request.id, 'Approved', 'Duplicate allocation attempt.', [{ listingId: 'L-101', quantity: 60 }]), /no units remain eligible/)
})

test('pickup fulfillment consumes reserved stock, records delivery, and completes the request', () => {
  const state = createSeedState()
  const approved = applyHumanDecision(state, 'REQ-2401', 'Approved', 'Recipient pickup is arranged.', [{ listingId: 'L-101', quantity: 60 }], '2026-10-23T10:20:00.000Z')
  const next = fulfillRequestAllocation(approved, 'REQ-2401', 'Recipient collected the water at the depot.', '2026-10-23T11:00:00.000Z')
  assert.equal(next.listings.find(item => item.id === 'L-101').quantity, 180)
  assert.equal(activeReservationCount(next, 'L-101'), 0)
  assert.equal(next.reservations.find(item => item.requestId === 'REQ-2401').status, 'Fulfilled')
  assert.equal(next.deliveries[0].quantity, 60)
  assert.equal(next.deliveries[0].status, 'Delivered')
  assert.equal(next.requests.find(item => item.id === 'REQ-2401').status, 'Fulfilled')
  assert.equal(pendingRequests(next).some(item => item.id === 'REQ-2401'), false)
  assert.equal(next.audit[0].action, 'Allocation fulfilled after pickup')
})

test('partial pickup remains in review for the unmet request quantity', () => {
  let state = createSeedState()
  state.requests = state.requests.map(item => item.id === 'REQ-2401' ? { ...item, quantity: 300 } : item)
  state = makeIncident(state, 'Flood', '2026-10-23T10:10:00.000Z')
  const request = state.requests.find(item => item.id === 'REQ-2401')
  const recommendation = getRecommendation(state, request)
  const approved = applyHumanDecision(state, request.id, 'Approved', 'Approve only accessible water; review the remaining shortage.', recommendation.allocations, '2026-10-23T10:11:00.000Z')
  const next = fulfillRequestAllocation(approved, request.id, 'Recipient collected the available water.', '2026-10-23T11:00:00.000Z')
  const updated = next.requests.find(item => item.id === request.id)
  assert.equal(updated.status, 'Fulfillment in Progress')
  assert.equal(updated.allocatedQuantity, 240)
  assert.equal(getRecommendation(next, updated).shortage, 60)
  assert.ok(activeReviews(next).some(item => item.id === request.id))
  assert.equal(next.deliveries[0].quantity, 240)
})

test('escalating a partially fulfilled request keeps its unmet balance in the review queue', () => {
  let state = createSeedState()
  state.requests = state.requests.map(item => item.id === 'REQ-2401' ? { ...item, quantity: 300 } : item)
  state = makeIncident(state, 'Flood', '2026-10-23T10:10:00.000Z')
  const request = state.requests.find(item => item.id === 'REQ-2401')
  const approved = applyHumanDecision(state, request.id, 'Approved', 'Approve only the accessible stock.', getRecommendation(state, request).allocations)
  const fulfilled = fulfillRequestAllocation(approved, request.id, 'Recipient collected the available water.')
  const escalated = applyHumanDecision(fulfilled, request.id, 'Escalated', 'Request help sourcing the remaining 60 litres.', [])
  assert.equal(escalated.requests.find(item => item.id === request.id).status, 'Escalated')
  assert.ok(activeReviews(escalated).some(item => item.id === request.id))
  assert.equal(getRecommendation(escalated, escalated.requests.find(item => item.id === request.id)).shortage, 60)
})

test('rejecting or releasing an allocation frees reserved stock and records the reason', () => {
  const state = createSeedState()
  const approved = applyHumanDecision(state, 'REQ-2401', 'Approved', 'Hold this stock while confirming pickup.', [{ listingId: 'L-101', quantity: 20 }])
  const rejected = applyHumanDecision(approved, 'REQ-2401', 'Rejected', 'The recipient withdrew the request.', [])
  assert.equal(activeReservationCount(rejected, 'L-101'), activeReservationCount(state, 'L-101'))
  assert.equal(rejected.requests.find(item => item.id === 'REQ-2401').allocatedQuantity, 0)
  assert.equal(rejected.requests.find(item => item.id === 'REQ-2401').status, 'Rejected')
  assert.equal(rejected.reservations.find(item => item.requestId === 'REQ-2401').status, 'Released')

  const reserved = applyHumanDecision(state, 'REQ-2401', 'Approved', 'Pickup is pending.', [{ listingId: 'L-101', quantity: 15 }])
  const released = releaseRequestAllocation(reserved, 'REQ-2401', 'The pickup point is temporarily closed.')
  assert.equal(activeReservationCount(released, 'L-101'), activeReservationCount(state, 'L-101'))
  assert.equal(released.requests.find(item => item.id === 'REQ-2401').allocatedQuantity, 0)
  assert.equal(released.requests.find(item => item.id === 'REQ-2401').status, 'Partially Allocated')
  assert.equal(released.audit[0].action, 'Allocation released')
})

test('a flood-blocked reserved pickup cannot be fulfilled, but its stock can be released', () => {
  const state = createSeedState()
  const approved = applyHumanDecision(state, 'REQ-2401', 'Approved', 'Reserve water at East Junction.', [{ listingId: 'L-113', quantity: 10 }])
  const flood = makeIncident(approved, 'Flood')
  assert.throws(() => fulfillRequestAllocation(flood, 'REQ-2401', 'Attempt pickup.'), /inaccessible/)
  const released = releaseRequestAllocation(flood, 'REQ-2401', 'Flood blocks access to the pickup location.')
  assert.equal(activeReservationCount(released, 'L-113'), 0)
  assert.equal(availableStock(released, released.listings.find(item => item.id === 'L-113')), 0)
})

test('flood and heatwave scenarios change access and demand; reset data is consistent', () => {
  const baseline = createSeedState()
  const flood = makeIncident(baseline, 'Flood', '2026-10-23T10:12:00.000Z')
  assert.equal(availableStock(flood, flood.listings.find(item => item.id === 'L-113')), 0)
  assert.equal(stockTotals(flood).free, stockTotals(baseline).free - 120)
  const heat = makeIncident(baseline, 'Heatwave', '2026-10-23T10:13:00.000Z')
  assert.equal(heat.incidents.length, 1)
  assert.equal(pendingRequests(heat).filter(item => item.notes.includes('heatwave')).length, 2)
  const waterDemand = pendingRequests(heat).filter(item => item.category === 'Water' && item.unit === 'litres').reduce((sum, item) => sum + item.quantity - item.allocatedQuantity, 0)
  const waterStock = heat.listings.filter(item => item.category === 'Water' && item.unit === 'litres' && item.listingType === 'FREE').reduce((sum, item) => sum + availableStock(heat, item), 0)
  assert.equal(Math.max(0, waterDemand - waterStock), 100)
  const reset = createSeedState()
  assert.equal(reset.incidents.length, 0)
  assert.equal(reset.orders.length, 0)
  assert.equal(reset.deliveries.length, 0)
  assert.equal(reset.reviews.length, 0)
  assert.equal(reset.requests.length, 10)
  assert.equal(reset.listings.length, 13)
})
