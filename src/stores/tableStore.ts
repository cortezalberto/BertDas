import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RestaurantTable, RestaurantTableFormData } from '../types'
import { STORAGE_KEYS, STORE_VERSIONS, TABLE_DEFAULT_TIME } from '../utils/constants'

interface TableState {
  tables: RestaurantTable[]
  // Actions
  setTables: (tables: RestaurantTable[]) => void
  addTable: (data: RestaurantTableFormData) => RestaurantTable
  updateTable: (id: string, data: Partial<RestaurantTableFormData>) => void
  deleteTable: (id: string) => void
  deleteByBranch: (branchId: string) => void
  getByBranch: (branchId: string) => RestaurantTable[]
  getNextTableNumber: (branchId: string) => number
}

const generateId = () => crypto.randomUUID()

// Initial mock tables for demo
// Time rules by status:
// - libre: order_time=00:00, close_time=00:00
// - ocupada: order_time=00:00, close_time=00:00
// - solicito_pedido: order_time=HH:mm (hora del pedido), close_time=00:00
// - pedido_cumplido: order_time=HH:mm (mantiene hora del pedido), close_time=00:00
// - cuenta_solicitada: order_time=HH:mm, close_time=HH:mm (close >= order)
// Helper to generate tables for a branch
const generateBranchTables = (
  branchId: string,
  startId: number,
  count: number,
  sectors: string[]
): RestaurantTable[] => {
  const statuses: Array<{ status: RestaurantTable['status']; order: string; close: string }> = [
    { status: 'libre', order: TABLE_DEFAULT_TIME, close: TABLE_DEFAULT_TIME },
    { status: 'ocupada', order: TABLE_DEFAULT_TIME, close: TABLE_DEFAULT_TIME },
    { status: 'solicito_pedido', order: '12:30', close: TABLE_DEFAULT_TIME },
    { status: 'pedido_cumplido', order: '11:45', close: TABLE_DEFAULT_TIME },
    { status: 'cuenta_solicitada', order: '10:00', close: '12:30' },
  ]

  return Array.from({ length: count }, (_, i) => {
    const statusData = statuses[i % statuses.length]
    return {
      id: `table-${startId + i}`,
      branch_id: branchId,
      number: i + 1,
      capacity: [2, 4, 4, 6, 8][i % 5],
      sector: sectors[i % sectors.length],
      status: statusData.status,
      order_time: statusData.order,
      close_time: statusData.close,
      is_active: i % 10 !== 9, // 1 de cada 10 inactiva
      created_at: new Date().toISOString(),
    }
  })
}

const initialTables: RestaurantTable[] = [
  // Branch 1 - Centro: 15 mesas
  ...generateBranchTables('branch-1', 1, 15, ['Interior', 'Terraza', 'VIP', 'Barra']),
  // Branch 2 - Norte: 12 mesas
  ...generateBranchTables('branch-2', 20, 12, ['Interior', 'Jardin', 'Salon Principal']),
  // Branch 3 - Sur: 10 mesas
  ...generateBranchTables('branch-3', 40, 10, ['Interior', 'Terraza', 'VIP']),
  // Branch 4 - Oeste: 8 mesas
  ...generateBranchTables('branch-4', 60, 8, ['Interior', 'Barra', 'Salon Principal']),
]

export const useTableStore = create<TableState>()(
  persist(
    (set, get) => ({
      tables: initialTables,

      setTables: (tables) => set({ tables }),

      addTable: (data) => {
        const newTable: RestaurantTable = {
          id: generateId(),
          ...data,
          is_active: data.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set((state) => ({ tables: [...state.tables, newTable] }))
        return newTable
      },

      updateTable: (id, data) =>
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id
              ? { ...table, ...data, updated_at: new Date().toISOString() }
              : table
          ),
        })),

      deleteTable: (id) =>
        set((state) => ({
          tables: state.tables.filter((table) => table.id !== id),
        })),

      deleteByBranch: (branchId) =>
        set((state) => ({
          tables: state.tables.filter((table) => table.branch_id !== branchId),
        })),

      getByBranch: (branchId) => {
        return get().tables.filter((table) => table.branch_id === branchId)
      },

      getNextTableNumber: (branchId) => {
        const branchTables = get().tables.filter((t) => t.branch_id === branchId)
        if (branchTables.length === 0) return 1
        const maxNumber = Math.max(...branchTables.map((t) => t.number))
        return maxNumber + 1
      },
    }),
    {
      name: STORAGE_KEYS.TABLES,
      version: STORE_VERSIONS.TABLES,
      migrate: (persistedState, version) => {
        const persisted = persistedState as { tables: RestaurantTable[] }

        // Ensure tables array exists - return new object, don't mutate
        if (!Array.isArray(persisted.tables)) {
          return { tables: initialTables }
        }

        let tables = persisted.tables

        // v2: Add order_time and close_time fields
        if (version < 2) {
          tables = tables.map((table) => ({
            ...table,
            order_time: table.order_time ?? TABLE_DEFAULT_TIME,
            close_time: table.close_time ?? TABLE_DEFAULT_TIME,
          }))
        }

        // v3/v4/v5/v6: Update time rules based on status
        // - libre/ocupada: both times = 00:00
        // - solicito_pedido/pedido_cumplido: order_time = value, close_time = 00:00
        // - cuenta_solicitada: both times have values
        if (version < 6) {
          // Use a fixed fallback time for migration to ensure consistency
          const MIGRATION_FALLBACK_TIME = '12:00'

          tables = tables.map((table) => {
            if (table.status === 'libre' || table.status === 'ocupada') {
              return {
                ...table,
                order_time: TABLE_DEFAULT_TIME,
                close_time: TABLE_DEFAULT_TIME,
              }
            }
            if (table.status === 'solicito_pedido' || table.status === 'pedido_cumplido') {
              return {
                ...table,
                // Keep existing order_time or use fixed fallback time for consistency
                order_time: table.order_time && table.order_time !== TABLE_DEFAULT_TIME
                  ? table.order_time
                  : MIGRATION_FALLBACK_TIME,
                close_time: TABLE_DEFAULT_TIME,
              }
            }
            return table
          })
        }

        return { tables }
      },
    }
  )
)

// Selectors
export const selectTables = (state: TableState) => state.tables
