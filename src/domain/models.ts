export type Role = 'Taker' | 'Giver' | 'Coordinator' | 'Warehouse Provider'
export type ResourceCategory = 'Water' | 'Food' | 'Hygiene' | 'Medical' | 'Emergency essentials'
export type ListingType = 'FREE' | 'PAID'
export type ListingStatus = 'Active' | 'Paused' | 'Removed'
export type RequestStatus = 'Submitted' | 'Under Review' | 'Partially Allocated' | 'Approved' | 'Fulfillment in Progress' | 'Fulfilled' | 'Rejected' | 'Escalated'
export type Urgency = 'Routine' | 'High' | 'Critical'
export type ReservationStatus = 'Active' | 'Fulfilled' | 'Released'

export interface Organization { id: string; name: string; type: string }
export interface User { id: string; name: string; role: Role; organizationId: string }
export interface Warehouse {
  id: string; name: string; address: string; city: string; hours: string
  accessNotes: string; serviceAreas: string[]; verified: boolean; accessible: boolean
  latitude?: number; longitude?: number
}
export interface ProductListing {
  id: string; name: string; description: string; category: ResourceCategory
  listingType: ListingType; quantity: number; unit: string; priceInr: number
  bestBefore?: string; providerId: string; warehouseId: string
  status: ListingStatus; createdAt: string
}
export interface HelpRequest {
  id: string; requester: string; category: ResourceCategory; resourceName: string
  quantity: number; unit: string; urgency: Urgency; location: string
  createdAt: string; status: RequestStatus; notes: string; allocatedQuantity: number
}
export interface Order {
  id: string; listingId: string; listingName: string; quantity: number; unit: string
  unitPriceInr: number; totalInr: number; buyer: string; pickupLocation: string
  status: 'Awaiting pickup' | 'Ready for pickup' | 'Collected' | 'Cancelled'; createdAt: string
}
export interface Delivery { id: string; orderId?: string; requestId: string; warehouseId: string; quantity: number; unit: string; status: 'Preparing' | 'Dispatched' | 'In Transit' | 'Delivered' | 'Failed'; updatedAt: string }
export interface StockReservation {
  id: string; listingId: string; requestId: string; quantity: number
  status: ReservationStatus; createdAt: string
}
export interface Allocation { listingId: string; quantity: number }
export interface ResourceMatch {
  id: string; requestId: string; allocations: Allocation[]; availableQuantity: number
  shortage: number; explanations: string[]; alternatives: string[]
}
export interface HumanReview {
  id: string; requestId: string; proposedAllocations: Allocation[]; finalAllocations: Allocation[]
  decision: 'Approved' | 'Rejected' | 'Escalated'; coordinator: string
  reason: string; createdAt: string
}
export interface AuditEvent { id: string; action: string; actor: string; detail: string; createdAt: string }
export interface Incident { id: string; type: 'Flood' | 'Heatwave'; label: string; activatedAt: string; blockedWarehouseIds: string[]; createdRequestIds: string[] }

export interface DemoState {
  role: Role; currentUser: User; organizations: Organization[]; warehouses: Warehouse[]
  listings: ProductListing[]; requests: HelpRequest[]; orders: Order[]; deliveries: Delivery[]
  reservations: StockReservation[]; reviews: HumanReview[]; audit: AuditEvent[]
  incidents: Incident[]
}
