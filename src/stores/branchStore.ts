import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Branch, BranchFormData } from '../types'
import { STORAGE_KEYS, STORE_VERSIONS, BRANCH_DEFAULT_OPENING_TIME, BRANCH_DEFAULT_CLOSING_TIME } from '../utils/constants'

interface BranchState {
  branches: Branch[]
  selectedBranchId: string | null
  // Actions
  setBranches: (branches: Branch[]) => void
  addBranch: (data: BranchFormData & { restaurant_id: string }) => Branch
  updateBranch: (id: string, data: Partial<BranchFormData>) => void
  deleteBranch: (id: string) => void
  selectBranch: (id: string | null) => void
  getByRestaurant: (restaurantId: string) => Branch[]
}

const generateId = () => crypto.randomUUID()

// Mock data: 4 sucursales de Buen Sabor
const initialBranches: Branch[] = [
  {
    id: 'branch-1',
    name: 'Buen Sabor Centro',
    restaurant_id: 'restaurant-1',
    address: 'Av. Corrientes 1234, CABA',
    phone: '+54 11 1234-5678',
    email: 'centro@buensabor.com',
    image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    opening_time: '08:00',
    closing_time: '00:00',
    is_active: true,
    order: 1,
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-2',
    name: 'Buen Sabor Norte',
    restaurant_id: 'restaurant-1',
    address: 'Av. Cabildo 2345, CABA',
    phone: '+54 11 2345-6789',
    email: 'norte@buensabor.com',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=300&fit=crop',
    opening_time: '09:00',
    closing_time: '23:00',
    is_active: true,
    order: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-3',
    name: 'Buen Sabor Sur',
    restaurant_id: 'restaurant-1',
    address: 'Av. Caseros 3456, CABA',
    phone: '+54 11 3456-7890',
    email: 'sur@buensabor.com',
    image: 'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=300&fit=crop',
    opening_time: '10:00',
    closing_time: '22:00',
    is_active: true,
    order: 3,
    created_at: new Date().toISOString(),
  },
  {
    id: 'branch-4',
    name: 'Buen Sabor Este',
    restaurant_id: 'restaurant-1',
    address: 'Av. Santa Fe 4567, CABA',
    phone: '+54 11 4567-8901',
    email: 'este@buensabor.com',
    image: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=400&h=300&fit=crop',
    opening_time: '11:00',
    closing_time: '23:30',
    is_active: true,
    order: 4,
    created_at: new Date().toISOString(),
  },
]

export const useBranchStore = create<BranchState>()(
  persist(
    (set, get) => ({
      branches: initialBranches,
      selectedBranchId: null,

      setBranches: (branches) => set({ branches }),

      addBranch: (data) => {
        const branches = get().branches
        const orders = branches.map((b) => b.order).filter((o) => typeof o === 'number' && !isNaN(o))
        const maxOrder = orders.length > 0 ? Math.max(...orders) : 0
        const newBranch: Branch = {
          id: generateId(),
          ...data,
          order: data.order ?? maxOrder + 1,
          is_active: data.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set({ branches: [...branches, newBranch] })
        return newBranch
      },

      updateBranch: (id, data) =>
        set((state) => ({
          branches: state.branches.map((branch) =>
            branch.id === id
              ? { ...branch, ...data, updated_at: new Date().toISOString() }
              : branch
          ),
        })),

      deleteBranch: (id) =>
        set((state) => ({
          branches: state.branches.filter((branch) => branch.id !== id),
          selectedBranchId: state.selectedBranchId === id ? null : state.selectedBranchId,
        })),

      selectBranch: (id) => set({ selectedBranchId: id }),

      getByRestaurant: (restaurantId) => {
        return get()
          .branches.filter((b) => b.restaurant_id === restaurantId)
          .sort((a, b) => a.order - b.order)
      },
    }),
    {
      name: STORAGE_KEYS.BRANCHES,
      version: STORE_VERSIONS.BRANCHES,
      migrate: (persistedState, version) => {
        const persisted = persistedState as { branches: Branch[]; selectedBranchId: string | null }

        // Ensure branches array exists - return new object, don't mutate
        if (!Array.isArray(persisted.branches)) {
          return {
            branches: initialBranches,
            selectedBranchId: null,
          }
        }

        let branches = persisted.branches
        let selectedBranchId = persisted.selectedBranchId

        // Version 2: Merge with initial branches (non-destructive)
        if (version < 2) {
          const existingIds = new Set(branches.map(b => b.id))
          const missingBranches = initialBranches.filter(b => !existingIds.has(b.id))
          branches = [...branches, ...missingBranches]
          selectedBranchId = null
        }

        // Version 3: Reset selectedBranchId to null (no default selection)
        if (version < 3) {
          selectedBranchId = null
        }

        // Version 4: Add opening_time and closing_time fields
        if (version < 4) {
          branches = branches.map((branch) => ({
            ...branch,
            opening_time: branch.opening_time ?? BRANCH_DEFAULT_OPENING_TIME,
            closing_time: branch.closing_time ?? BRANCH_DEFAULT_CLOSING_TIME,
          }))
        }

        return { branches, selectedBranchId }
      },
    }
  )
)

// Selectors
export const selectBranches = (state: BranchState) => state.branches
export const selectSelectedBranchId = (state: BranchState) => state.selectedBranchId
export const selectBranchById = (id: string | null) => (state: BranchState) =>
  id ? state.branches.find((b) => b.id === id) : undefined
