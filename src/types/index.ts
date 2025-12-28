// Restaurant types
export interface Restaurant {
  id: string
  name: string
  slug: string
  description: string
  logo?: string
  banner?: string
  theme_color: string
  address?: string
  phone?: string
  email?: string
  created_at?: string
  updated_at?: string
}

// Branch types (sucursales)
export interface Branch {
  id: string
  name: string
  restaurant_id: string
  address?: string
  phone?: string
  email?: string
  image?: string
  opening_time: string              // Horario de apertura (HH:mm)
  closing_time: string              // Horario de cierre (HH:mm)
  is_active?: boolean
  order: number
  created_at?: string
  updated_at?: string
}

export interface BranchFormData {
  name: string
  address?: string
  phone?: string
  email?: string
  image?: string
  opening_time: string              // HH:mm format
  closing_time: string              // HH:mm format
  is_active: boolean
  order: number
}

// Category types
export interface Category {
  id: string
  name: string
  icon?: string
  image?: string
  order: number
  branch_id: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Subcategory types
export interface Subcategory {
  id: string
  name: string
  category_id: string
  image?: string
  order: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Allergen types
export interface Allergen {
  id: string
  name: string
  icon?: string
  description?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface AllergenFormData {
  name: string
  icon?: string
  description?: string
  is_active: boolean
}

// Badge types (product insignias)
export interface ProductBadge {
  id: string
  name: string
  color: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface BadgeFormData {
  name: string
  color: string
  is_active: boolean
}

// Seal types (product seals/stamps for special characteristics like vegan, organic, etc.)
export interface ProductSeal {
  id: string
  name: string
  color: string
  icon?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface SealFormData {
  name: string
  color: string
  icon?: string
  is_active: boolean
}

// Branch price for products (per-branch pricing)
export interface BranchPrice {
  branch_id: string
  price: number
  is_active: boolean  // true = product is sold at this branch
}

// Product types
export interface Product {
  id: string
  name: string
  description: string
  price: number                    // Base price (used when use_branch_prices is false)
  branch_prices?: BranchPrice[]    // Per-branch pricing (optional, defaults to [])
  use_branch_prices: boolean       // Toggle for per-branch pricing mode
  image?: string                   // Optional image URL
  category_id: string
  subcategory_id: string
  featured: boolean
  popular: boolean
  badge?: string
  seal?: string
  allergen_ids?: string[]          // Optional, defaults to []
  is_active?: boolean
  stock?: number
  created_at?: string
  updated_at?: string
}

// Form types for CRUD operations
export interface CategoryFormData {
  name: string
  icon?: string
  image?: string
  order: number
  branch_id: string
  is_active: boolean
}

export interface SubcategoryFormData {
  name: string
  category_id: string
  image?: string
  order: number
  is_active: boolean
}

export interface ProductFormData {
  name: string
  description: string
  price: number                    // Base price
  branch_prices: BranchPrice[]     // Per-branch pricing
  use_branch_prices: boolean       // Toggle for per-branch pricing mode
  image?: string                   // Optional image URL
  category_id: string
  subcategory_id: string
  featured: boolean
  popular: boolean
  badge?: string
  seal?: string
  allergen_ids: string[]
  is_active: boolean
  stock?: number
}

export interface RestaurantFormData {
  name: string
  slug: string
  description: string
  logo?: string
  banner?: string
  theme_color: string
  address?: string
  phone?: string
  email?: string
}

// Table column definition for reusable table component
export interface TableColumn<T> {
  key: keyof T | string
  label: React.ReactNode
  render?: (item: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

// Toast notification
export interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  message: string
  duration?: number
}

// Promotion Type types
export interface PromotionType {
  id: string
  name: string
  description?: string
  icon?: string
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface PromotionTypeFormData {
  name: string
  description?: string
  icon?: string
  is_active: boolean
}

// Promotion types
export interface PromotionItem {
  product_id: string
  quantity: number
}

export interface Promotion {
  id: string
  name: string
  description?: string
  price: number
  image?: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  promotion_type_id: string
  branch_ids: string[]
  items: PromotionItem[]
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface PromotionFormData {
  name: string
  description?: string             // Optional, matches Promotion interface
  price: number
  image?: string                   // Optional, matches Promotion interface
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  promotion_type_id: string
  branch_ids: string[]
  items: PromotionItem[]
  is_active: boolean
}

// Table status for order tracking
export type TableStatus = 'libre' | 'solicito_pedido' | 'pedido_cumplido' | 'cuenta_solicitada' | 'ocupada'

// Table types (mesas)
export interface RestaurantTable {
  id: string
  branch_id: string
  number: number                   // Table number/identifier within branch
  capacity: number                 // Number of seats/diners
  sector: string                   // Location sector (e.g., "Interior", "Terraza", "VIP")
  status: TableStatus
  order_time: string               // Time of first order (HH:mm format), "00:00" when libre
  close_time: string               // Closing time (HH:mm format), "00:00" when libre
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface RestaurantTableFormData {
  branch_id: string
  number: number
  capacity: number
  sector: string
  status: TableStatus
  order_time: string               // HH:mm format
  close_time: string               // HH:mm format
  is_active: boolean
}

// Order command item (producto en una comanda)
export interface OrderCommandItem {
  product_id: string
  product_name: string             // Snapshot del nombre al momento del pedido
  quantity: number
  unit_price: number               // Precio unitario al momento del pedido
  notes?: string                   // Notas especiales (sin sal, bien cocido, etc.)
}

// Order command (comanda individual)
export interface OrderCommand {
  id: string
  order_history_id: string         // Referencia al historial de la mesa
  items: OrderCommandItem[]
  subtotal: number                 // Suma de (quantity * unit_price)
  created_at: string               // Timestamp de cuando se creo la comanda
  status: 'pendiente' | 'en_preparacion' | 'listo' | 'entregado'
}

// Order history record (registro historico por mesa/fecha)
export interface OrderHistory {
  id: string
  branch_id: string
  table_id: string
  table_number: number             // Snapshot del numero de mesa
  date: string                     // Fecha YYYY-MM-DD
  staff_id?: string                // ID del mozo que atendio (opcional por ahora)
  staff_name?: string              // Nombre del mozo (snapshot)
  commands: OrderCommand[]         // Lista de comandas de esta sesion
  order_time: string               // Hora del primer pedido (HH:mm)
  close_time: string | undefined   // Hora de cierre (HH:mm), undefined si aun abierta
  total: number                    // Suma de subtotales de todas las comandas
  status: 'abierta' | 'cerrada'    // Estado del registro
  created_at: string
  updated_at?: string
}
