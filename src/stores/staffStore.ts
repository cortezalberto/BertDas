import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Staff, CreateStaffData, UpdateStaffData } from '../types/staff'

interface StaffState {
  staff: Staff[]
  addStaff: (data: CreateStaffData) => Staff
  updateStaff: (id: string, data: UpdateStaffData) => void
  deleteStaff: (id: string) => void
  getStaffById: (id: string) => Staff | undefined
  getStaffByBranch: (branchId: string) => Staff[]
  deleteStaffByBranch: (branchId: string) => void
}

// Helper function to get role ID by name (will be called from component after roles are loaded)
// This is a placeholder - actual role IDs will be fetched from roleStore
const SAMPLE_STAFF: Omit<Staff, 'id' | 'created_at' | 'updated_at' | 'role_id'>[] = [
  // Buen Sabor Centro (branch-1)
  {
    branch_id: 'branch-1',
    first_name: 'Carlos',
    last_name: 'Martínez',
    email: 'carlos.martinez@buensabor.com',
    phone: '+54 9 11 3456-7890',
    dni: '34567890',
    hire_date: '2023-01-15',
    is_active: true,
  },
  {
    branch_id: 'branch-1',
    first_name: 'María',
    last_name: 'González',
    email: 'maria.gonzalez@buensabor.com',
    phone: '+54 9 11 4567-8901',
    dni: '35678901',
    hire_date: '2023-02-20',
    is_active: true,
  },
  {
    branch_id: 'branch-1',
    first_name: 'Roberto',
    last_name: 'Fernández',
    email: 'roberto.fernandez@buensabor.com',
    phone: '+54 9 11 5678-9012',
    dni: '36789012',
    hire_date: '2023-03-10',
    is_active: true,
  },
  {
    branch_id: 'branch-1',
    first_name: 'Ana',
    last_name: 'López',
    email: 'ana.lopez@buensabor.com',
    phone: '+54 9 11 6789-0123',
    dni: '37890123',
    hire_date: '2023-04-05',
    is_active: false,
  },
  // Buen Sabor Norte (branch-2)
  {
    branch_id: 'branch-2',
    first_name: 'Jorge',
    last_name: 'Rodríguez',
    email: 'jorge.rodriguez@buensabor.com',
    phone: '+54 9 11 7890-1234',
    dni: '38901234',
    hire_date: '2023-02-01',
    is_active: true,
  },
  {
    branch_id: 'branch-2',
    first_name: 'Laura',
    last_name: 'Sánchez',
    email: 'laura.sanchez@buensabor.com',
    phone: '+54 9 11 8901-2345',
    dni: '39012345',
    hire_date: '2023-03-15',
    is_active: true,
  },
  {
    branch_id: 'branch-2',
    first_name: 'Diego',
    last_name: 'Pérez',
    email: 'diego.perez@buensabor.com',
    phone: '+54 9 11 9012-3456',
    dni: '40123456',
    hire_date: '2023-04-20',
    is_active: true,
  },
  {
    branch_id: 'branch-2',
    first_name: 'Sofía',
    last_name: 'Torres',
    email: 'sofia.torres@buensabor.com',
    phone: '+54 9 11 0123-4567',
    dni: '41234567',
    hire_date: '2023-05-10',
    is_active: true,
  },
  // Buen Sabor Sur (branch-3)
  {
    branch_id: 'branch-3',
    first_name: 'Martín',
    last_name: 'Ramírez',
    email: 'martin.ramirez@buensabor.com',
    phone: '+54 9 11 1234-5678',
    dni: '42345678',
    hire_date: '2023-01-25',
    is_active: true,
  },
  {
    branch_id: 'branch-3',
    first_name: 'Valentina',
    last_name: 'Flores',
    email: 'valentina.flores@buensabor.com',
    phone: '+54 9 11 2345-6789',
    dni: '43456789',
    hire_date: '2023-03-05',
    is_active: true,
  },
  {
    branch_id: 'branch-3',
    first_name: 'Andrés',
    last_name: 'Castro',
    email: 'andres.castro@buensabor.com',
    phone: '+54 9 11 3456-7890',
    dni: '44567890',
    hire_date: '2023-04-15',
    is_active: true,
  },
  {
    branch_id: 'branch-3',
    first_name: 'Carolina',
    last_name: 'Morales',
    email: 'carolina.morales@buensabor.com',
    phone: '+54 9 11 4567-8901',
    dni: '45678901',
    hire_date: '2023-05-20',
    is_active: true,
  },
]

// Initialize sample staff with random roles
function initializeSampleStaff(): Staff[] {
  const now = new Date().toISOString()
  const roleNames = ['Cocinero', 'Mozo', 'Administrativo', 'Gerente']

  return SAMPLE_STAFF.map((staffMember, index) => ({
    ...staffMember,
    id: crypto.randomUUID(),
    // Assign roles in rotation: Gerente, Cocinero, Mozo, Administrativo, Cocinero, Mozo, etc.
    // This ensures each branch has a variety of roles
    role_id: `role-${roleNames[index % roleNames.length]}`, // Temporary placeholder
    created_at: now,
    updated_at: now,
  }))
}

export const useStaffStore = create<StaffState>()(
  persist(
    (set, get) => ({
      staff: import.meta.env.DEV ? initializeSampleStaff() : [],

      addStaff: (data) => {
        const now = new Date().toISOString()
        const newStaff: Staff = {
          ...data,
          id: crypto.randomUUID(),
          created_at: now,
          updated_at: now,
        }
        set((state) => ({
          staff: [...state.staff, newStaff],
        }))
        return newStaff
      },

      updateStaff: (id, data) => {
        set((state) => ({
          staff: state.staff.map((s) =>
            s.id === id
              ? { ...s, ...data, updated_at: new Date().toISOString() }
              : s
          ),
        }))
      },

      deleteStaff: (id) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.id !== id),
        }))
      },

      getStaffById: (id) => {
        return get().staff.find((s) => s.id === id)
      },

      getStaffByBranch: (branchId) => {
        return get().staff.filter((s) => s.branch_id === branchId)
      },

      deleteStaffByBranch: (branchId) => {
        set((state) => ({
          staff: state.staff.filter((s) => s.branch_id !== branchId),
        }))
      },
    }),
    {
      name: 'staff-storage',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        // Type guard: Validate persisted state structure
        if (!persistedState || typeof persistedState !== 'object') {
          return { staff: initializeSampleStaff() }
        }

        const state = persistedState as { staff?: unknown }

        // Version 2: Initialize sample staff if empty
        if (version < 2) {
          if (!Array.isArray(state.staff) || state.staff.length === 0) {
            return { staff: initializeSampleStaff() }
          }
        }

        return persistedState as StaffState
      },
    }
  )
)

// Selectors
export const selectStaff = (state: StaffState) => state.staff
export const selectStaffByBranch = (branchId: string) => (state: StaffState) =>
  state.staff.filter((s) => s.branch_id === branchId)
export const selectActiveStaffByBranch = (branchId: string) => (state: StaffState) =>
  state.staff.filter((s) => s.branch_id === branchId && s.is_active)
export const selectStaffById = (id: string) => (state: StaffState) =>
  state.staff.find((s) => s.id === id)
