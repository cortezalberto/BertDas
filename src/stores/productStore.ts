import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product, ProductFormData } from '../types'
import { STORAGE_KEYS, STORE_VERSIONS } from '../utils/constants'

interface ProductState {
  products: Product[]
  // Actions
  setProducts: (products: Product[]) => void
  addProduct: (data: ProductFormData) => Product
  updateProduct: (id: string, data: Partial<ProductFormData>) => void
  deleteProduct: (id: string) => void
  getByCategory: (categoryId: string) => Product[]
  getBySubcategory: (subcategoryId: string) => Product[]
  deleteByCategory: (categoryId: string) => void
  deleteBySubcategory: (subcategoryId: string) => void
  deleteByCategories: (categoryIds: string[]) => void
  removeAllergenFromProducts: (allergenId: string) => void
  removeBadgeFromProducts: (badgeName: string) => void
  removeSealFromProducts: (sealName: string) => void
  // Cascade cleanup for branch deletion
  removeBranchFromProductPrices: (branchId: string) => void
}

const generateId = () => crypto.randomUUID()

// Helper to create product with default branch pricing fields
const createProduct = (product: Omit<Product, 'branch_prices' | 'use_branch_prices'>): Product => ({
  ...product,
  branch_prices: [],
  use_branch_prices: false,
})

// Initial mock products with allergen_ids - Branch 1 (Buen Sabor Centro)
const initialProducts: Product[] = [
  createProduct({
    id: '1',
    name: 'Tofu Frito',
    description: 'Cebolla con queso fundido',
    price: 12.5,
    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-5',
    featured: true,
    popular: true,
    badge: 'TEX MEX',
    allergen_ids: ['alg-7', 'alg-2'],
    is_active: true,
  }),
  createProduct({
    id: '2',
    name: 'Risotto de Hongos',
    description: 'Parmesano con hierbas frescas',
    price: 18.0,
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-2',
    featured: true,
    popular: true,
    allergen_ids: ['alg-2'],
    is_active: true,
  }),
  createProduct({
    id: '3',
    name: 'Hamburguesa Clasica',
    description: 'Medallon de carne con salsa especial',
    price: 15.0,
    image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-1',
    featured: true,
    popular: true,
    allergen_ids: ['alg-1', 'alg-3', 'alg-10'],
    is_active: true,
  }),
  createProduct({
    id: '4',
    name: 'Bowl Veggie',
    description: 'Vegetales frescos y quinoa',
    price: 14.0,
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-3',
    featured: false,
    popular: true,
    badge: 'VEGANO',
    allergen_ids: [],
    is_active: true,
  }),
  createProduct({
    id: '5',
    name: 'Salmon a la Parrilla',
    description: 'Con salsa de limon y manteca',
    price: 24.0,
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-4',
    featured: true,
    popular: false,
    allergen_ids: ['alg-4', 'alg-2'],
    is_active: true,
  }),
  createProduct({
    id: '6',
    name: 'Pasta Carbonara',
    description: 'Pasta cremosa con panceta',
    price: 16.0,
    image: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-2',
    featured: false,
    popular: true,
    allergen_ids: ['alg-1', 'alg-2', 'alg-3'],
    is_active: true,
  }),
  createProduct({
    id: '7',
    name: 'Cerveza Artesanal',
    description: 'Seleccion de IPA local',
    price: 7.0,
    image: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400&h=400&fit=crop',
    category_id: 'b1-cat-2',
    subcategory_id: 'sub-6',
    featured: false,
    popular: true,
    allergen_ids: ['alg-1'],
    is_active: true,
  }),
  createProduct({
    id: '8',
    name: 'Limonada Fresca',
    description: 'Casera con menta',
    price: 5.0,
    image: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=400&h=400&fit=crop',
    category_id: 'b1-cat-2',
    subcategory_id: 'sub-8',
    featured: false,
    popular: true,
    allergen_ids: [],
    is_active: true,
  }),
  createProduct({
    id: '9',
    name: 'Torta de Chocolate',
    description: 'Chocolate negro intenso',
    price: 9.0,
    image: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=400&h=400&fit=crop',
    category_id: 'b1-cat-3',
    subcategory_id: 'sub-10',
    featured: true,
    popular: true,
    allergen_ids: ['alg-1', 'alg-2', 'alg-3'],
    is_active: true,
  }),
  createProduct({
    id: '10',
    name: 'Helado',
    description: 'Seleccion de tres bochas',
    price: 7.0,
    image: 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400&h=400&fit=crop',
    category_id: 'b1-cat-3',
    subcategory_id: 'sub-11',
    featured: false,
    popular: true,
    allergen_ids: ['alg-2'],
    is_active: true,
  }),
  createProduct({
    id: '11',
    name: 'Hamburguesa BBQ',
    description: 'Con bacon y salsa barbacoa',
    price: 17.0,
    image: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400&h=400&fit=crop',
    category_id: 'b1-cat-1',
    subcategory_id: 'sub-1',
    featured: false,
    popular: true,
    badge: 'BBQ',
    allergen_ids: ['alg-1', 'alg-3', 'alg-9'],
    is_active: true,
  }),
  createProduct({
    id: '12',
    name: 'Mojito Clasico',
    description: 'Ron, menta, lima y soda',
    price: 10.0,
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop',
    category_id: 'b1-cat-2',
    subcategory_id: 'sub-7',
    featured: true,
    popular: true,
    allergen_ids: ['alg-11'],
    is_active: true,
  }),
  createProduct({
    id: '13',
    name: 'Vino Tinto Reserva',
    description: 'Malbec argentino',
    price: 15.0,
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400&h=400&fit=crop',
    category_id: 'b1-cat-2',
    subcategory_id: 'sub-9',
    featured: false,
    popular: false,
    allergen_ids: ['alg-11'],
    is_active: true,
  }),
  createProduct({
    id: '14',
    name: 'Ensalada de Frutas',
    description: 'Frutas frescas de estacion',
    price: 8.0,
    image: 'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?w=400&h=400&fit=crop',
    category_id: 'b1-cat-3',
    subcategory_id: 'sub-12',
    featured: false,
    popular: true,
    badge: 'SALUDABLE',
    allergen_ids: [],
    is_active: true,
  }),
  // Branch 2 - Buen Sabor Norte
  createProduct({
    id: 'b2-prod-1',
    name: 'Pizza Margherita',
    description: 'Tomate, mozzarella y albahaca',
    price: 14.0,
    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=400&fit=crop',
    category_id: 'b2-cat-1',
    subcategory_id: 'b2-sub-1',
    featured: true,
    popular: true,
    allergen_ids: ['alg-1', 'alg-2'],
    is_active: true,
  }),
  createProduct({
    id: 'b2-prod-2',
    name: 'Empanada de Carne',
    description: 'Carne cortada a cuchillo',
    price: 3.5,
    image: 'https://images.unsplash.com/photo-1604467794349-0b74285de7e7?w=400&h=400&fit=crop',
    category_id: 'b2-cat-1',
    subcategory_id: 'b2-sub-2',
    featured: false,
    popular: true,
    allergen_ids: ['alg-1'],
    is_active: true,
  }),
  createProduct({
    id: 'b2-prod-3',
    name: 'Licuado de Banana',
    description: 'Con leche y miel',
    price: 6.0,
    image: 'https://images.unsplash.com/photo-1553530666-ba11a90c6f0d?w=400&h=400&fit=crop',
    category_id: 'b2-cat-2',
    subcategory_id: 'b2-sub-3',
    featured: false,
    popular: true,
    allergen_ids: ['alg-2'],
    is_active: true,
  }),
  // Branch 3 - Buen Sabor Sur
  createProduct({
    id: 'b3-prod-1',
    name: 'Asado Completo',
    description: 'Vacio, chorizo y morcilla',
    price: 28.0,
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=400&fit=crop',
    category_id: 'b3-cat-1',
    subcategory_id: 'b3-sub-1',
    featured: true,
    popular: true,
    allergen_ids: [],
    is_active: true,
  }),
  createProduct({
    id: 'b3-prod-2',
    name: 'Entraña a la Brasa',
    description: 'Con chimichurri casero',
    price: 22.0,
    image: 'https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=400&fit=crop',
    category_id: 'b3-cat-1',
    subcategory_id: 'b3-sub-1',
    featured: true,
    popular: true,
    allergen_ids: [],
    is_active: true,
  }),
  // Branch 4 - Buen Sabor Este
  createProduct({
    id: 'b4-prod-1',
    name: 'Sushi Variado',
    description: 'Seleccion de 12 piezas',
    price: 26.0,
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400&h=400&fit=crop',
    category_id: 'b4-cat-1',
    subcategory_id: 'b4-sub-1',
    featured: true,
    popular: true,
    allergen_ids: ['alg-4', 'alg-7', 'alg-10'],
    is_active: true,
  }),
  createProduct({
    id: 'b4-prod-2',
    name: 'Ramen Tonkotsu',
    description: 'Caldo de cerdo con huevo',
    price: 18.0,
    image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop',
    category_id: 'b4-cat-1',
    subcategory_id: 'b4-sub-2',
    featured: true,
    popular: true,
    allergen_ids: ['alg-1', 'alg-3', 'alg-7'],
    is_active: true,
  }),
  createProduct({
    id: 'b4-prod-3',
    name: 'Sake Premium',
    description: 'Sake japones servido frio',
    price: 12.0,
    image: 'https://images.unsplash.com/photo-1516100882582-96c3a05fe590?w=400&h=400&fit=crop',
    category_id: 'b4-cat-2',
    subcategory_id: 'b4-sub-3',
    featured: false,
    popular: true,
    allergen_ids: [],
    is_active: true,
  }),
  createProduct({
    id: 'b4-prod-4',
    name: 'Mochi Helado',
    description: 'Variedad de sabores',
    price: 8.0,
    image: 'https://images.unsplash.com/photo-1631206753348-db44968fd440?w=400&h=400&fit=crop',
    category_id: 'b4-cat-3',
    subcategory_id: 'b4-sub-4',
    featured: false,
    popular: true,
    allergen_ids: ['alg-2'],
    is_active: true,
  }),
]

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: initialProducts,

      setProducts: (products) => set({ products }),

      addProduct: (data) => {
        const newProduct: Product = {
          id: generateId(),
          ...data,
          allergen_ids: data.allergen_ids ?? [],
          branch_prices: data.branch_prices ?? [],
          use_branch_prices: data.use_branch_prices ?? false,
          is_active: data.is_active ?? true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        set((state) => ({ products: [...state.products, newProduct] }))
        return newProduct
      },

      updateProduct: (id, data) =>
        set((state) => ({
          products: state.products.map((prod) =>
            prod.id === id
              ? { ...prod, ...data, updated_at: new Date().toISOString() }
              : prod
          ),
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((prod) => prod.id !== id),
        })),

      getByCategory: (categoryId) => {
        return get().products.filter((p) => p.category_id === categoryId)
      },

      getBySubcategory: (subcategoryId) => {
        return get().products.filter((p) => p.subcategory_id === subcategoryId)
      },

      deleteByCategory: (categoryId) =>
        set((state) => ({
          products: state.products.filter(
            (prod) => prod.category_id !== categoryId
          ),
        })),

      deleteBySubcategory: (subcategoryId) =>
        set((state) => ({
          products: state.products.filter(
            (prod) => prod.subcategory_id !== subcategoryId
          ),
        })),

      deleteByCategories: (categoryIds) => {
        const categoryIdSet = new Set(categoryIds)
        set((state) => ({
          products: state.products.filter(
            (prod) => !categoryIdSet.has(prod.category_id)
          ),
        }))
      },

      removeAllergenFromProducts: (allergenId) =>
        set((state) => ({
          products: state.products.map((prod) => ({
            ...prod,
            allergen_ids: (prod.allergen_ids ?? []).filter((id) => id !== allergenId),
          })),
        })),

      removeBadgeFromProducts: (badgeName) =>
        set((state) => ({
          products: state.products.map((prod) => ({
            ...prod,
            badge: prod.badge === badgeName ? '' : prod.badge,
          })),
        })),

      removeSealFromProducts: (sealName) =>
        set((state) => ({
          products: state.products.map((prod) => ({
            ...prod,
            seal: prod.seal === sealName ? '' : prod.seal,
          })),
        })),

      removeBranchFromProductPrices: (branchId) =>
        set((state) => ({
          products: state.products.map((prod) => ({
            ...prod,
            branch_prices: (prod.branch_prices ?? []).filter(
              (bp) => bp.branch_id !== branchId
            ),
          })),
        })),
    }),
    {
      name: STORAGE_KEYS.PRODUCTS,
      version: STORE_VERSIONS.PRODUCTS,
      migrate: (persistedState, version) => {
        const persisted = persistedState as { products: Product[] }

        // Ensure products array exists - return new object, don't mutate
        if (!Array.isArray(persisted.products)) {
          return { products: initialProducts }
        }

        let products = persisted.products

        // Version 4: Merge user products with initial products (non-destructive)
        if (version < 4) {
          const existingIds = new Set(products.map(p => p.id))
          const missingInitialProducts = initialProducts.filter(p => !existingIds.has(p.id))
          products = [...products, ...missingInitialProducts]
        }

        // Version 5: Add branch_prices and use_branch_prices fields
        if (version < 5) {
          products = products.map(p => ({
            ...p,
            branch_prices: p.branch_prices ?? [],
            use_branch_prices: p.use_branch_prices ?? false,
          }))
        }

        return { products }
      },
    }
  )
)

// Selectors
export const selectProducts = (state: ProductState) => state.products
