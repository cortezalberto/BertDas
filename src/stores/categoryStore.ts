import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Category, CategoryFormData } from '../types'
import { STORAGE_KEYS, STORE_VERSIONS } from '../utils/constants'

interface CategoryState {
  categories: Category[]
  // Actions
  setCategories: (categories: Category[]) => void
  addCategory: (data: CategoryFormData) => Category
  updateCategory: (id: string, data: Partial<CategoryFormData>) => void
  deleteCategory: (id: string) => void
  reorderCategories: (categories: Category[]) => void
  getByBranch: (branchId: string) => Category[]
  deleteByBranch: (branchId: string) => void
}

const generateId = () => crypto.randomUUID()

// Initial mock categories - con branch_id para cada sucursal
const initialCategories: Category[] = [
  // Branch 1 - Buen Sabor Centro (completo)
  { id: 'b1-home', name: 'Home', order: 0, is_active: true, branch_id: 'branch-1' },
  {
    id: 'b1-cat-1',
    name: 'Comidas',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    order: 1,
    is_active: true,
    branch_id: 'branch-1',
  },
  {
    id: 'b1-cat-2',
    name: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
    order: 2,
    is_active: true,
    branch_id: 'branch-1',
  },
  {
    id: 'b1-cat-3',
    name: 'Postres',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    order: 3,
    is_active: true,
    branch_id: 'branch-1',
  },
  // Branch 2 - Buen Sabor Norte
  { id: 'b2-home', name: 'Home', order: 0, is_active: true, branch_id: 'branch-2' },
  {
    id: 'b2-cat-1',
    name: 'Comidas',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    order: 1,
    is_active: true,
    branch_id: 'branch-2',
  },
  {
    id: 'b2-cat-2',
    name: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
    order: 2,
    is_active: true,
    branch_id: 'branch-2',
  },
  // Branch 3 - Buen Sabor Sur
  { id: 'b3-home', name: 'Home', order: 0, is_active: true, branch_id: 'branch-3' },
  {
    id: 'b3-cat-1',
    name: 'Comidas',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    order: 1,
    is_active: true,
    branch_id: 'branch-3',
  },
  // Branch 4 - Buen Sabor Este (completo)
  { id: 'b4-home', name: 'Home', order: 0, is_active: true, branch_id: 'branch-4' },
  {
    id: 'b4-cat-1',
    name: 'Comidas',
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=400&fit=crop',
    order: 1,
    is_active: true,
    branch_id: 'branch-4',
  },
  {
    id: 'b4-cat-2',
    name: 'Bebidas',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
    order: 2,
    is_active: true,
    branch_id: 'branch-4',
  },
  {
    id: 'b4-cat-3',
    name: 'Postres',
    image: 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=400&fit=crop',
    order: 3,
    is_active: true,
    branch_id: 'branch-4',
  },
]

export const useCategoryStore = create<CategoryState>()(
  persist(
    (set, get) => ({
      categories: initialCategories,

      setCategories: (categories) => set({ categories }),

      addCategory: (data) => {
        const categories = get().categories
        // Filtrar por branch para calcular orden
        const branchCategories = categories.filter((c) => c.branch_id === data.branch_id)
        const orders = branchCategories.map((c) => c.order).filter((o) => typeof o === 'number' && !isNaN(o))
        const maxOrder = orders.length > 0 ? Math.max(...orders) : 0
        const newCategory: Category = {
          id: generateId(),
          ...data,
          order: data.order ?? maxOrder + 1,
          is_active: data.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set({ categories: [...categories, newCategory] })
        return newCategory
      },

      updateCategory: (id, data) =>
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id
              ? { ...cat, ...data, updated_at: new Date().toISOString() }
              : cat
          ),
        })),

      deleteCategory: (id) =>
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
        })),

      reorderCategories: (categories) => {
        // Validate that categories array is valid before setting
        if (!Array.isArray(categories)) {
          console.warn('reorderCategories: Invalid categories array')
          return
        }
        set({ categories })
      },

      getByBranch: (branchId) => {
        return get()
          .categories.filter((c) => c.branch_id === branchId)
          .sort((a, b) => a.order - b.order)
      },

      deleteByBranch: (branchId) =>
        set((state) => ({
          categories: state.categories.filter((cat) => cat.branch_id !== branchId),
        })),
    }),
    {
      name: STORAGE_KEYS.CATEGORIES,
      version: STORE_VERSIONS.CATEGORIES,
      migrate: (persistedState, version) => {
        const persisted = persistedState as { categories: Category[] }

        // Validate array exists - return new object, don't mutate
        if (!Array.isArray(persisted.categories)) {
          return { categories: initialCategories }
        }

        let categories = persisted.categories

        // Version 3: Non-destructive merge - only add missing initial categories
        if (version < 3) {
          const existingIds = new Set(categories.map(c => c.id))
          const missingCategories = initialCategories.filter(c => !existingIds.has(c.id))
          categories = [...categories, ...missingCategories]
        }

        return { categories }
      },
    }
  )
)

// Selectors
export const selectCategories = (state: CategoryState) => state.categories
