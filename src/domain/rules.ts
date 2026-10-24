import type { Allocation, DemoState, HelpRequest, HumanReview, Incident, ProductListing, ResourceMatch, Warehouse } from './models'

export const activeReservationCount = (state: DemoState, listingId: string) =>
  state.reservations.filter(item => item.listingId === listingId && item.status === 'Active').reduce((sum, item) => sum + item.quantity, 0)

export const warehouseBlocked = (state: DemoState, warehouseId: string) =>
  state.incidents.some(incident => incident.type === 'Flood' && incident.blockedWarehouseIds.includes(warehouseId))

const expired = (date?: string) => date ? new Date(date.length === 10 ? `${date}T23:59:59.999` : date).getTime() < Date.now() : false

export const availableStock = (state: DemoState, listing: ProductListing) => {
  const warehouse = state.warehouses.find(item => item.id === listing.warehouseId)
  if (listing.status !== 'Active' || !warehouse?.accessible || warehouseBlocked(state, listing.warehouseId)) return 0
  if (expired(listing.bestBefore)) return 0
  return Math.max(0, listing.quantity - activeReservationCount(state, listing.id))
}

export const unavailableStock = (state: DemoState, listing: ProductListing) => Math.max(0, listing.quantity - activeReservationCount(state, listing.id) - availableStock(state, listing))

export const warehouseInventory = (state: DemoState, warehouse: Warehouse) => {
  const listings = state.listings.filter(item => item.warehouseId === warehouse.id && item.status !== 'Removed')
  return listings.reduce((result, item) => ({
    available: result.available + availableStock(state, item),
    reserved: result.reserved + activeReservationCount(state, item.id),
    unavailable: result.unavailable + unavailableStock(state, item),
  }), { available: 0, reserved: 0, unavailable: 0 })
}

const resourceCompatible = (request: HelpRequest, listing: ProductListing) => {
  const words = (value: string) => value.toLowerCase().match(/[a-z]+/g)?.map(word => word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word) || []
  const requestedWords = words(request.resourceName)
  const productWords = words(listing.name)
  const overlap = requestedWords.filter(word => productWords.includes(word)).length
  return requestedWords.length > 0 && overlap / requestedWords.length >= 0.6
}

export const getRecommendation = (state: DemoState, request: HelpRequest): ResourceMatch => {
  const remaining = Math.max(0, request.quantity - request.allocatedQuantity)
  const serviceArea = request.location.split('·')[0].trim()
  const candidates = state.listings
    .filter(item => item.category === request.category && item.unit === request.unit && item.listingType === 'FREE' && availableStock(state, item) > 0 && resourceCompatible(request, item))
    .sort((a, b) => Number(state.warehouses.find(item => item.id === b.warehouseId)?.serviceAreas?.includes(serviceArea) || false) - Number(state.warehouses.find(item => item.id === a.warehouseId)?.serviceAreas?.includes(serviceArea) || false))
  let toFill = remaining
  const allocations: Allocation[] = []
  for (const listing of candidates) {
    if (toFill <= 0) break
    const quantity = Math.min(toFill, availableStock(state, listing))
    if (quantity > 0) allocations.push({ listingId: listing.id, quantity })
    toFill -= quantity
  }
  const availableQuantity = remaining - toFill
  const blocked = state.listings.some(item => item.category === request.category && item.unit === request.unit && item.listingType === 'FREE' && item.status === 'Active' && warehouseBlocked(state, item.warehouseId) && resourceCompatible(request, item))
  const hasExpired = state.listings.some(item => item.category === request.category && item.unit === request.unit && item.listingType === 'FREE' && expired(item.bestBefore) && resourceCompatible(request, item))
  const explanations = availableQuantity > 0
    ? [`${availableQuantity} ${request.unit} can be offered from active, unreserved, unexpired free stock that matches the requested item, category, and unit.`, 'A provider serving the request area is ranked first when available.', 'A coordinator must approve before any stock is reserved.']
    : ['No eligible free stock is currently available for this category.', ...(blocked ? ['Some matching stock is at a flood-blocked warehouse and is excluded.'] : []), ...(hasExpired ? ['Expired matching stock is excluded.'] : []), 'Paid listings are not substituted for this free assistance request.']
  if (availableQuantity > 0 && blocked) explanations.push('Other stock at a flood-blocked warehouse is excluded from this recommendation.')
  const alternatives = candidates.filter(item => !allocations.some(allocation => allocation.listingId === item.id)).map(item => item.id)
  return { id: `MATCH-${request.id}`, requestId: request.id, allocations, availableQuantity, shortage: Math.max(0, remaining - availableQuantity), explanations, alternatives }
}

export const pendingRequests = (state: DemoState) => state.requests.filter(request =>
  ['Submitted', 'Under Review', 'Partially Allocated', 'Fulfillment in Progress', 'Escalated'].includes(request.status),
)

export const activeReviews = (state: DemoState) => pendingRequests(state)
    .filter(request => (['Partially Allocated', 'Fulfillment in Progress', 'Escalated'].includes(request.status) && request.allocatedQuantity < request.quantity)
      || (['Submitted', 'Under Review'].includes(request.status) && !state.reviews.some(review => review.requestId === request.id)))

export const applyHumanDecision = (
  state: DemoState,
  requestId: string,
  decision: 'Approved' | 'Rejected' | 'Escalated',
  reason: string,
  requestedAllocations: Allocation[],
  now = new Date().toISOString(),
): DemoState => {
  const request = state.requests.find(item => item.id === requestId)
  if (!request) throw new Error('Request not found.')
  if (!reason.trim()) throw new Error('Add a reason so the decision is recorded.')
  if (decision === 'Approved' && requestedAllocations.length === 0) throw new Error('There is no eligible stock in this allocation. Choose another action.')

  const finalAllocations: Allocation[] = []
  let next = { ...state, listings: [...state.listings], reservations: [...state.reservations], requests: [...state.requests], reviews: [...state.reviews], audit: [...state.audit] }
  if (decision === 'Approved') {
    for (const allocation of requestedAllocations) {
      if (!Number.isInteger(allocation.quantity) || allocation.quantity < 0) throw new Error('Allocation quantities must be positive whole numbers.')
      const listing = next.listings.find(item => item.id === allocation.listingId)
      if (!listing || listing.category !== request.category || listing.unit !== request.unit || listing.listingType !== 'FREE') throw new Error('Allocations must use free stock matching the request category and unit.')
      const approvedQuantity = Math.min(Math.floor(allocation.quantity), availableStock(next, listing), Math.max(0, request.quantity - request.allocatedQuantity - finalAllocations.reduce((sum, item) => sum + item.quantity, 0)))
      if (approvedQuantity <= 0) continue
      finalAllocations.push({ listingId: listing.id, quantity: approvedQuantity })
      next.reservations.push({ id: `RSV-${crypto.randomUUID().slice(0, 8)}`, listingId: listing.id, requestId, quantity: approvedQuantity, status: 'Active', createdAt: now })
    }
    if (!finalAllocations.length) throw new Error('Stock changed and no units remain eligible. Refresh the recommendation.')
  }
  const releasedQuantity = decision === 'Rejected'
    ? next.reservations.filter(item => item.requestId === requestId && item.status === 'Active').reduce((sum, item) => sum + item.quantity, 0)
    : 0
  if (releasedQuantity > 0) {
    next.reservations = next.reservations.map(item => item.requestId === requestId && item.status === 'Active' ? { ...item, status: 'Released' } : item)
  }
  const allocated = request.allocatedQuantity - releasedQuantity + finalAllocations.reduce((sum, item) => sum + item.quantity, 0)
  const fulfilled = next.reservations.filter(item => item.requestId === requestId && item.status === 'Fulfilled').reduce((sum, item) => sum + item.quantity, 0)
  const status = decision === 'Rejected' ? 'Rejected'
    : decision === 'Escalated' ? 'Escalated'
      : fulfilled >= request.quantity ? 'Fulfilled'
        : fulfilled > 0 && allocated >= request.quantity ? 'Fulfillment in Progress'
          : allocated >= request.quantity ? 'Approved'
            : 'Partially Allocated'
  next.requests = next.requests.map(item => item.id === requestId ? { ...item, allocatedQuantity: allocated, status } : item)
  const review: HumanReview = { id: `REV-${crypto.randomUUID().slice(0, 8)}`, requestId, proposedAllocations: requestedAllocations, finalAllocations, decision, coordinator: state.currentUser.name, reason: reason.trim(), createdAt: now }
  next.reviews.push(review)
  next.audit.unshift({ id: `AUD-${crypto.randomUUID().slice(0, 8)}`, action: `Allocation ${decision.toLowerCase()}`, actor: state.currentUser.name, detail: `${requestId} · ${reason.trim()}${decision === 'Approved' ? ` · ${finalAllocations.reduce((sum, item) => sum + item.quantity, 0)} ${request.unit} allocated` : ''}${releasedQuantity ? ` · ${releasedQuantity} ${request.unit} reserved stock released` : ''}`, createdAt: now })
  return next
}

export const fulfillRequestAllocation = (state: DemoState, requestId: string, reason: string, now = new Date().toISOString()): DemoState => {
  const request = state.requests.find(item => item.id === requestId)
  if (!request) throw new Error('Request not found.')
  if (!reason.trim()) throw new Error('Add a fulfillment note before confirming pickup.')
  const active = state.reservations.filter(item => item.requestId === requestId && item.status === 'Active')
  if (!active.length) throw new Error('There is no active allocation waiting for pickup.')
  for (const reservation of active) {
    const listing = state.listings.find(item => item.id === reservation.listingId)
    const warehouse = listing && state.warehouses.find(item => item.id === listing.warehouseId)
    if (!listing || listing.status !== 'Active' || expired(listing.bestBefore)) throw new Error('A reserved listing is no longer active or in date. Release the allocation and review the request again.')
    if (!warehouse?.accessible || warehouseBlocked(state, listing.warehouseId)) throw new Error(`${warehouse?.name || 'The pickup location'} is inaccessible. Release the allocation and review alternatives.`)
    if (listing.quantity < reservation.quantity) throw new Error('Reserved stock no longer matches inventory. Refresh the request before confirming pickup.')
  }
  const byListing = new Map<string, number>()
  for (const reservation of active) byListing.set(reservation.listingId, (byListing.get(reservation.listingId) || 0) + reservation.quantity)
  const fulfilledReservations = state.reservations.map(item => item.requestId === requestId && item.status === 'Active' ? { ...item, status: 'Fulfilled' as const } : item)
  const deliveries = active.map(reservation => {
    const listing = state.listings.find(item => item.id === reservation.listingId)!
    return { id: `DLV-${crypto.randomUUID().slice(0, 8)}`, requestId, warehouseId: listing.warehouseId, quantity: reservation.quantity, unit: request.unit, status: 'Delivered' as const, updatedAt: now }
  })
  const fulfilledQuantity = fulfilledReservations.filter(item => item.requestId === requestId && item.status === 'Fulfilled').reduce((sum, item) => sum + item.quantity, 0)
  const status = fulfilledQuantity >= request.quantity ? 'Fulfilled' : 'Fulfillment in Progress'
  const fulfilledNow = active.reduce((sum, item) => sum + item.quantity, 0)
  return {
    ...state,
    listings: state.listings.map(item => byListing.has(item.id) ? { ...item, quantity: item.quantity - byListing.get(item.id)! } : item),
    reservations: fulfilledReservations,
    deliveries: [...deliveries, ...state.deliveries],
    requests: state.requests.map(item => item.id === requestId ? { ...item, status } : item),
    audit: [{ id: `AUD-${crypto.randomUUID().slice(0, 8)}`, action: 'Allocation fulfilled after pickup', actor: state.currentUser.name, detail: `${requestId} · ${fulfilledNow} ${request.unit} confirmed · ${reason.trim()}`, createdAt: now }, ...state.audit],
  }
}

export const releaseRequestAllocation = (state: DemoState, requestId: string, reason: string, now = new Date().toISOString()): DemoState => {
  const request = state.requests.find(item => item.id === requestId)
  if (!request) throw new Error('Request not found.')
  if (!reason.trim()) throw new Error('Add a reason before releasing reserved stock.')
  const active = state.reservations.filter(item => item.requestId === requestId && item.status === 'Active')
  if (!active.length) throw new Error('There is no active allocation to release.')
  const releasedQuantity = active.reduce((sum, item) => sum + item.quantity, 0)
  const fulfilledQuantity = state.reservations.filter(item => item.requestId === requestId && item.status === 'Fulfilled').reduce((sum, item) => sum + item.quantity, 0)
  const allocatedQuantity = Math.max(fulfilledQuantity, request.allocatedQuantity - releasedQuantity)
  const status = fulfilledQuantity >= request.quantity ? 'Fulfilled' : 'Partially Allocated'
  return {
    ...state,
    reservations: state.reservations.map(item => item.requestId === requestId && item.status === 'Active' ? { ...item, status: 'Released' } : item),
    requests: state.requests.map(item => item.id === requestId ? { ...item, allocatedQuantity, status } : item),
    audit: [{ id: `AUD-${crypto.randomUUID().slice(0, 8)}`, action: 'Allocation released', actor: state.currentUser.name, detail: `${requestId} · ${releasedQuantity} ${request.unit} returned to available stock · ${reason.trim()}`, createdAt: now }, ...state.audit],
  }
}

export const stockTotals = (state: DemoState) => state.listings.reduce((totals, listing) => {
  totals.available += availableStock(state, listing)
  totals.free += listing.listingType === 'FREE' ? availableStock(state, listing) : 0
  totals.paid += listing.listingType === 'PAID' ? availableStock(state, listing) : 0
  return totals
}, { available: 0, free: 0, paid: 0 })

export const placePaidOrder = (state: DemoState, listingId: string, quantity: number, now = new Date().toISOString()): DemoState => {
  const listing = state.listings.find(item => item.id === listingId)
  if (!listing || listing.status !== 'Active' || listing.listingType !== 'PAID') throw new Error('This paid listing is no longer available.')
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Order quantity must be a positive whole number.')
  if (quantity > availableStock(state, listing)) throw new Error(`Only ${availableStock(state, listing)} ${listing.unit} are currently available.`)
  const warehouse = state.warehouses.find(item => item.id === listing.warehouseId)
  const totalInr = quantity * listing.priceInr
  const order = {
    id: `ORD-${crypto.randomUUID().slice(0, 8)}`, listingId, listingName: listing.name,
    quantity, unit: listing.unit, unitPriceInr: listing.priceInr, totalInr,
    buyer: state.currentUser.name,
    pickupLocation: `${warehouse?.name || 'Provider location'} · ${warehouse?.address || ''}`,
    status: 'Awaiting pickup' as const, createdAt: now,
  }
  return {
    ...state,
    listings: state.listings.map(item => item.id === listingId ? { ...item, quantity: item.quantity - quantity } : item),
    orders: [order, ...state.orders],
    audit: [{ id: `AUD-${crypto.randomUUID().slice(0, 8)}`, action: 'Simulated paid order placed', actor: state.currentUser.name, detail: `${order.id} · ${quantity} ${listing.unit} · INR ${totalInr} · price fixed at INR ${listing.priceInr} per ${listing.unit}`, createdAt: now }, ...state.audit],
  }
}

export const makeIncident = (state: DemoState, type: Incident['type'], now = new Date().toISOString()): DemoState => {
  if (state.incidents.some(item => item.type === type)) throw new Error(`${type} scenario is already active.`)
  let next = { ...state, incidents: [...state.incidents], requests: [...state.requests], audit: [...state.audit] }
  const incident: Incident = type === 'Flood'
    ? { id: `INC-${crypto.randomUUID().slice(0, 8)}`, type, label: 'Flood: East Junction Hub access blocked', activatedAt: now, blockedWarehouseIds: ['WH-02'], createdRequestIds: [] }
    : { id: `INC-${crypto.randomUUID().slice(0, 8)}`, type, label: 'Heatwave: drinking-water demand increased', activatedAt: now, blockedWarehouseIds: [], createdRequestIds: [`REQ-H${Date.now().toString().slice(-5)}-1`, `REQ-H${Date.now().toString().slice(-5)}-2`] }
  if (type === 'Heatwave') {
    const [firstId, secondId] = incident.createdRequestIds
    next.requests.unshift(
      { id: firstId, requester: 'North Ridge cooling point', category: 'Water', resourceName: 'Drinking water', quantity: 240, unit: 'litres', urgency: 'Critical', location: 'North Ridge', createdAt: now, status: 'Under Review', notes: 'Simulated heatwave demand increase. Coordinator review required.', allocatedQuantity: 0 },
      { id: secondId, requester: 'East Junction community tent', category: 'Water', resourceName: 'Drinking water', quantity: 160, unit: 'litres', urgency: 'High', location: 'East Junction', createdAt: now, status: 'Under Review', notes: 'Simulated heatwave demand increase. Coordinator review required.', allocatedQuantity: 0 },
    )
  }
  next.incidents.push(incident)
  next.audit.unshift({ id: `AUD-${crypto.randomUUID().slice(0, 8)}`, action: 'Scenario activated', actor: state.currentUser.name, detail: `${incident.label} · simulated only`, createdAt: now })
  return next
}

