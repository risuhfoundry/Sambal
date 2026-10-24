import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import { createSeedState } from '../data/seed'
import type { DemoState, Role } from '../domain/models'

const STORAGE_KEY = 'lifeline-demo-state-v2'

function readInitialState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<DemoState>
      const baseline = createSeedState()
      if (!Array.isArray(parsed.warehouses) || !Array.isArray(parsed.listings) || !Array.isArray(parsed.requests)) throw new Error('Saved demo data is incomplete.')
      const warehouses = baseline.warehouses.map(warehouse => {
        const savedWarehouse = parsed.warehouses?.find(item => item.id === warehouse.id)
        return { ...warehouse, ...savedWarehouse, city: warehouse.city, serviceAreas: savedWarehouse?.serviceAreas || warehouse.serviceAreas }
      })
      return { ...baseline, ...parsed, currentUser: { ...baseline.currentUser, ...parsed.currentUser }, warehouses }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY)
  }
  return createSeedState()
}

interface DemoContextValue { state: DemoState; setState: Dispatch<SetStateAction<DemoState>>; setRole: (role: Role) => void; reset: () => void }
const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoStore({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(readInitialState)
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }, [state])
  const setRole = (role: Role) => setState(current => ({ ...current, role, currentUser: { ...current.currentUser, role } }))
  const reset = () => setState(createSeedState())
  return <DemoContext.Provider value={{ state, setState, setRole, reset }}>{children}</DemoContext.Provider>
}

export function useDemo() {
  const value = useContext(DemoContext)
  if (!value) throw new Error('useDemo must be used inside DemoStore.')
  return value
}
