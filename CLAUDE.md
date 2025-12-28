# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Restaurant Admin Dashboard ("Buen Sabor") for managing menu items with multi-branch support. Built with React 19, TypeScript, and Vite. The UI is in Spanish.

**Name:** Buen Sabor (formerly "barijho" in old references)

**Data Hierarchy:**
```
Restaurant (1) → Branch (N) → Category (N) → Subcategory (N) → Product (N)
                    ↑                                              ↓
              Promotion (M:N via branch_ids[])              Allergen (M:N)
                    ↓                                              ↓
            PromotionItem (N) → Product ←─────────────── BranchPrice (N)
```

**Branch Selection:** No branch is selected by default. Users must select a branch from the Dashboard to view/edit categories, subcategories, products, and prices.

## Commands

```bash
npm run dev       # Start dev server (port 5177)
npm run build     # Production build
npm run lint      # Run ESLint
npm run preview   # Preview production build
```

## Architecture

### Tech Stack
- React 19 + React Router 7 (nested routes under Layout)
- TypeScript 5.9 (strict mode)
- Zustand 5 for state management with localStorage persistence
- Tailwind CSS 4 for styling
- Lucide React for icons

### Directory Structure
- `src/components/layout/` - Layout (with skip links), Sidebar, PageContainer
- `src/components/ui/` - Reusable UI components (Button, Modal, HelpButton, ErrorBoundary, etc.)
- `src/pages/` - Page components for each route
- `src/stores/` - Zustand stores with persist middleware and selectors
- `src/types/index.ts` - Centralized TypeScript interfaces
- `src/hooks/` - Custom hooks (usePagination, useFocusTrap, useModal)
- `src/utils/` - Constants, validation, and logging utilities
- `src/services/` - Service layer with cascadeService for delete operations

### State Management Pattern
All Zustand stores use selectors for optimized re-renders. Never destructure from store calls:
```typescript
// Store definition with version for migrations
export const useStore = create<State>()(
  persist(
    (set, get) => ({ ... }),
    { name: STORAGE_KEYS.STORE_NAME, version: STORE_VERSIONS.STORE_NAME }
  )
)

// Selectors exported from store files
export const selectItems = (state: State) => state.items

// Usage in components (avoids unnecessary re-renders)
const items = useStore(selectItems)           // ✓ Use selectors
const addItem = useStore((s) => s.addItem)    // ✓ Use inline for actions
// const { items } = useStore()               // ✗ Never destructure
```

For derived/filtered data, use `useMemo` to avoid infinite loops:
```typescript
const filteredItems = useMemo(() =>
  items.filter(i => i.active),
  [items]
)
```

### Branch-Scoped Data
Categories, subcategories, and products are scoped by branch. Use `selectedBranchId` from branchStore:
```typescript
const selectedBranchId = useBranchStore(selectSelectedBranchId)
const selectedBranch = useBranchStore(selectBranchById(selectedBranchId))  // Pass null directly, not ''
const categories = useCategoryStore(selectCategories)

// Filter by branch in useMemo - use HOME_CATEGORY_NAME, never id '0'
const branchCategories = useMemo(() => {
  if (!selectedBranchId) return []
  return categories.filter(
    (c) => c.branch_id === selectedBranchId && c.name !== HOME_CATEGORY_NAME
  )
}, [categories, selectedBranchId])
```

**Important:** The `selectBranchById` selector accepts `string | null`. Pass `selectedBranchId` directly without fallback to empty string.

### Cascade Delete Service
All cascade delete operations are centralized in `src/services/cascadeService.ts` using dependency injection for testability. Use wrapper functions for convenience:

```typescript
import {
  deleteBranchWithCascade,
  deleteCategoryWithCascade,
  deleteSubcategoryWithCascade,
  deleteProductWithCascade,
  deleteAllergenWithCascade,
  deletePromotionTypeWithCascade
} from '../services/cascadeService'

// Usage in handleDelete callbacks:
const handleDelete = useCallback(() => {
  if (!selectedBranch) return

  const result = deleteBranchWithCascade(selectedBranch.id)

  if (!result.success) {
    toast.error(result.error || 'Error al eliminar')
    return
  }

  toast.success('Eliminado correctamente')
}, [selectedBranch])
```

**Wrapper functions** (convenience, auto-inject stores):
- `deleteBranchWithCascade(id)` - Deletes promotions → products → subcategories → categories → tables → orderHistory → branch
- `deleteCategoryWithCascade(id)` - Deletes products → subcategories → category (cleans promotions first)
- `deleteSubcategoryWithCascade(id)` - Deletes products → subcategory (cleans promotions first)
- `deleteProductWithCascade(id)` - Cleans product from promotions → deletes product
- `deleteAllergenWithCascade(id)` - Cleans allergen from products → deletes allergen
- `deleteBadgeWithCascade(id)` - Removes badge references from products → deletes badge
- `deleteSealWithCascade(id)` - Removes seal references from products → deletes seal
- `deletePromotionTypeWithCascade(id)` - Deletes related promotions → deletes type

**Core functions** (for testing with injected stores):
- `cascadeDeleteBranch(id, stores)` - accepts store actions as parameter
- `cascadeDeleteCategory(id, stores)` - etc.

All functions return `CascadeDeleteResult`:
```typescript
interface CascadeDeleteResult {
  success: boolean
  deletedCounts: { categories?: number; products?: number; ... }
  error?: string
}
```

### Code Splitting
All pages use React.lazy() for code splitting. See `App.tsx`:
```typescript
import { lazy, Suspense } from 'react'

const DashboardPage = lazy(() => import('./pages/Dashboard'))
// ... all 17 pages

// In routes:
<Suspense fallback={<PageLoader />}>
  <Route path="/" element={<DashboardPage />} />
</Suspense>
```

### Constants and Configuration
All magic strings and configuration live in `src/utils/constants.ts`:
- `HOME_CATEGORY_NAME` - Special category name filter ('Home')
- `STORAGE_KEYS` - localStorage persistence keys (branches, categories, subcategories, products, allergens, promotion-types, promotions, restaurant)
- `STORE_VERSIONS` - For Zustand persist migrations (increment when changing data structure)
- `VALIDATION_LIMITS` - Centralized validation limits (MIN_NAME_LENGTH, MAX_NAME_LENGTH, MAX_DESCRIPTION_LENGTH, MAX_PRICE, MAX_TOASTS, etc.)
- `LOCALE` - Currency (ARS) and language (es-AR)
- `PATTERNS` - Validation regex patterns
- `generateId()` - Centralized UUID generator using `crypto.randomUUID()`
- `formatPrice(price)` - Centralized price formatter with edge case handling

### Validation
Centralized validation in `src/utils/validation.ts`. Always use these validators instead of inline validation:
```typescript
const { isValid, errors } = validateCategory(formData)
// errors is typed as ValidationErrors<CategoryFormData>

// In state declaration:
const [errors, setErrors] = useState<ValidationErrors<CategoryFormData>>({})
```

**Number validation helpers** (exported from validation.ts):
```typescript
import { isValidNumber, isPositiveNumber, isNonNegativeNumber } from '../utils/validation'

// isValidNumber(value) - true if finite, non-NaN number
// isPositiveNumber(value) - true if > 0
// isNonNegativeNumber(value) - true if >= 0

// Usage in custom validation:
if (!isPositiveNumber(data.price)) {
  errors.price = 'El precio debe ser mayor a 0'
}
```

### Error Handling
Use `handleError()` from `src/utils/logger.ts` in catch blocks:
```typescript
catch (error) {
  const message = handleError(error, 'ComponentName.functionName')
  toast.error(message)
}
```

### Routing
Routes nested under Layout component (includes skip link for accessibility):
- `/` - Dashboard (branch selection)
- `/restaurant` - Restaurant settings
- **Gestión > Sucursales:**
  - `/branches` - Branch management (CRUD)
  - `/branches/tables` - Tables management (full CRUD with status workflow)
  - `/branches/staff` - Staff management (placeholder)
  - `/branches/orders` - Orders management (placeholder)
- **Gestión > Productos:**
  - `/categories` - Category management (branch-scoped)
  - `/subcategories` - Subcategory management (branch-scoped)
  - `/products` - Product/Platos management (branch-scoped)
  - `/allergens` - Allergen management (global)
  - `/badges` - Badge/Insignia management (global)
  - `/seals` - Seal/Sellos management (global)
- **Marketing:**
  - `/prices` - Price management (branch-scoped, bulk updates)
  - `/promotion-types` - Promotion types management (global)
  - `/promotions` - Promotions management (multi-branch)
- **Estadísticas:**
  - `/statistics/sales` - Sales statistics (placeholder)
  - `/statistics/history/branches` - Order history by branch (placeholder)
  - `/statistics/history/customers` - Order history by customer (placeholder)
- `/settings` - App settings

### Sidebar Navigation Structure
The sidebar uses a hierarchical collapsible navigation defined in `src/components/layout/Sidebar.tsx`:
```
Dashboard
Restaurante
▸ Gestión (collapsible group)
  ▸ Sucursales (collapsible subgroup)
    - Todas → /branches
    - Mesas → /branches/tables
    - Personal → /branches/staff
    - Pedidos → /branches/orders
  ▸ Productos (collapsible subgroup)
    - Categorías → /categories
    - Subcategorías → /subcategories
    - Platos → /products
    - Alérgenos → /allergens
    - Insignia → /badges
    - Sellos → /seals
▸ Marketing (collapsible group)
  - Precios → /prices
  - Tipos de Promo → /promotion-types
  - Promociones → /promotions
▸ Estadísticas (collapsible group)
  - Ventas → /statistics/sales
  ▸ Historial (collapsible subgroup)
    - Sucursales → /statistics/history/branches
    - Clientes → /statistics/history/customers
Configuración (bottom)
```

Groups auto-expand when navigating to a child route. State is managed with `openGroups: Record<string, boolean>`.

### Type System
Types centralized in `src/types/index.ts`. Data models (Restaurant, Branch, Category, Product, Allergen, PromotionType, Promotion) are separate from form data types (RestaurantFormData, etc.).

### Per-Branch Pricing
Products support per-branch pricing with the `BranchPrice` type:
```typescript
interface BranchPrice {
  branch_id: string
  price: number
  is_active: boolean  // false = product not sold at this branch
}

interface Product {
  price: number                   // Base price (used when use_branch_prices is false)
  branch_prices?: BranchPrice[]   // Per-branch pricing (optional, defaults to [])
  use_branch_prices: boolean      // Toggle for per-branch mode
  allergen_ids?: string[]         // Optional, defaults to []
  // ...other fields
}
```

Use `BranchPriceInput` component for the UI. Validation returns both `errors` and `branchPriceErrors`:
```typescript
const validation = validateProduct(formData)
if (!validation.isValid) {
  setErrors(validation.errors)
  setBranchPriceErrors(validation.branchPriceErrors)  // Record<branch_id, string>
  return
}
```

**Important:** Always use null-safe access for arrays that may be undefined:
```typescript
// branch_prices
const branchPrices = item.branch_prices ?? []
if (!item.use_branch_prices || branchPrices.length === 0) {
  // Show base price
}

// allergen_ids in store operations
allergen_ids: (prod.allergen_ids ?? []).filter((id) => id !== allergenId)
```

### Master-Detail Relationships
Products have a many-to-many relationship with Allergens via `allergen_ids: string[]`. Use the `AllergenSelect` component for multi-select in forms:
```typescript
<AllergenSelect
  label="Alergenos"
  value={formData.allergen_ids}
  onChange={(ids) => setFormData(prev => ({ ...prev, allergen_ids: ids }))}
/>
```

### Promotions System
Promotions are combos of products with time-based scheduling. Use `ProductSelect` for products, `BranchCheckboxes` for branches:
```typescript
interface Promotion {
  id: string
  name: string
  price: number
  start_date: string        // YYYY-MM-DD
  end_date: string          // YYYY-MM-DD
  start_time: string        // HH:mm (e.g., "17:00")
  end_time: string          // HH:mm (e.g., "20:00")
  promotion_type_id: string // Reference to PromotionType
  branch_ids: string[]      // Explicit list of branch IDs
  items: PromotionItem[]    // Products in the combo
  is_active: boolean
}

// Validation with context:
const validation = validatePromotion(formData, { isEditing: !!selectedPromotion })
```

**Promotion Validation Rules:**
- New promotions: `start_date` and `start_time` must be in the future
- Editing: start date/time validation is skipped (allows editing past promotions)
- `end_date` must be >= `start_date`
- Cannot activate a promotion with `end_date` in the past
- Same-day promotions: `end_time` must be > `start_time`

Note: `branch_ids` always contains explicit IDs. All branches selected by default when creating.

### Tables Management
Tables have a 5-state workflow with specific time rules. Store is in `src/stores/tableStore.ts`, page in `src/pages/Tables.tsx`:
```typescript
type TableStatus = 'libre' | 'ocupada' | 'solicito_pedido' | 'pedido_cumplido' | 'cuenta_solicitada'

interface RestaurantTable {
  id: string
  branch_id: string
  number: number
  capacity: number
  sector: string
  status: TableStatus
  order_time: string  // HH:mm format
  close_time: string  // HH:mm format
  is_active: boolean
}
```

**Visual Grid UI:** Tables are displayed as a responsive grid of colored cards (8 columns on xl screens, scrollable container). Each card shows table number, status with color coding, capacity, and order time. Status colors:
- `libre` → green
- `ocupada` → red
- `solicito_pedido` → yellow
- `pedido_cumplido` → blue
- `cuenta_solicitada` → purple
- inactive → gray

**Time Rules by Status:**
| Status | order_time | close_time |
|--------|------------|------------|
| libre | 00:00 | 00:00 |
| ocupada | 00:00 | 00:00 |
| solicito_pedido | HH:mm (hora del pedido) | 00:00 |
| pedido_cumplido | HH:mm (mantiene hora del pedido) | 00:00 |
| cuenta_solicitada | HH:mm | HH:mm (close >= order) |

**Status Transitions:**
- When changing to `solicito_pedido`: set `order_time` to current time if coming from libre/ocupada
- When changing to `pedido_cumplido`: **preserve** `order_time` from previous state (never reset)
- When changing to `cuenta_solicitada`: preserve `order_time`, set `close_time` to current time
- When changing to `libre` or `ocupada`: reset both times to 00:00

**Archive Feature:**
Tables in `cuenta_solicitada` status show an archive button that:
1. Creates an `OrderHistory` record with branch_id, table_id, table_number
2. Resets table to `libre` status with both times at 00:00
```typescript
const handleArchive = useCallback((table: RestaurantTable) => {
  createOrderHistory({
    branch_id: table.branch_id,
    table_id: table.id,
    table_number: table.number,
  })
  updateTable(table.id, {
    status: 'libre',
    order_time: TABLE_DEFAULT_TIME,
    close_time: TABLE_DEFAULT_TIME,
  })
}, [createOrderHistory, updateTable])
```

**Sorting:** Tables are sorted by status priority (most urgent first), then by table number within each status group:
1. `cuenta_solicitada` (need to close)
2. `solicito_pedido` (waiting for order)
3. `pedido_cumplido` (order delivered)
4. `ocupada` (seated, no activity)
5. `libre` (available)

**Filter Behavior:**
- Branch filter defaults to first branch (no "all branches" option)
- Status filter shows all statuses by default

### Styling
- Dark theme with zinc backgrounds (bg-zinc-950)
- Orange-500 as primary accent color
- Custom animations in index.css (fade-in, zoom-in-95, slide-in-from-right)

### Help System
Each page includes a centered red help button (`HelpButton`) that opens a modal with detailed page functionality:
```typescript
import { helpContent } from '../utils/helpContent'

<PageContainer
  title="Productos"
  description="..."
  helpContent={helpContent.products}  // ReactNode with Spanish help text
>
```

Help content is centralized in `src/utils/helpContent.tsx` with entries for: dashboard, restaurant, branches, categories, subcategories, products, prices, allergens, promotionTypes, promotions, settings.

**Form Modal Help:** Each create/edit modal includes a small HelpButton (`size="sm"`) at the top of the form that explains all fields:
```typescript
<Modal isOpen={isModalOpen} onClose={...} title="..." footer={...}>
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-2">
      <HelpButton
        title="Formulario de Categoria"
        size="sm"
        content={
          <div className="space-y-3">
            <p><strong>Completa los siguientes campos</strong>...</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Nombre:</strong> ...</li>
            </ul>
            <div className="bg-zinc-800 p-3 rounded-lg mt-3">
              <p className="text-orange-400 font-medium text-sm">Consejo:</p>
              <p className="text-sm mt-1">...</p>
            </div>
          </div>
        }
      />
      <span className="text-sm text-zinc-400">Ayuda sobre el formulario</span>
    </div>
    {/* Form fields */}
  </div>
</Modal>
```

### Accessibility
- Modal component includes focus trap via `useFocusTrap` hook (uses AbortController for cleanup)
- Skip link in Layout for keyboard navigation
- aria-labels on icon-only buttons (use proper Spanish accents: "página", "notificación")
- Screen reader text (`sr-only`) in Badge components for status context
- Table component supports keyboard navigation (Enter/Space) for clickable rows; has default `ariaLabel="Tabla de datos"`
- Button component has `aria-busy` and sr-only "Cargando" text when `isLoading=true`
- Loading states include `role="status"` and sr-only text
- Icons use `aria-hidden="true"` when decorative, `aria-label` when meaningful
- HelpButton provides contextual help for each page
- Toast notifications use `role="alert"` and `aria-live` (assertive for errors, polite for others); ToastItem is memoized
- Form inputs use `useId()` hook for unique IDs (never hardcode IDs)
- Input component automatically links errors via `aria-describedby`

### Store Migrations
When modifying data structure, increment version in `STORE_VERSIONS` and add migrate function. **Always use immutable patterns** (never mutate persisted state directly):
```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: STORAGE_KEYS.PRODUCTS,
    version: STORE_VERSIONS.PRODUCTS,
    migrate: (persistedState, version) => {
      const persisted = persistedState as { products: Product[] }

      // Use local variables, never mutate persisted directly
      let products = persisted.products

      // Validate array exists
      if (!Array.isArray(products)) {
        return { products: initialProducts }
      }

      // Non-destructive merge: only add missing initial items
      if (version < 4) {
        const existingIds = new Set(products.map(p => p.id))
        const missing = initialProducts.filter(p => !existingIds.has(p.id))
        products = [...products, ...missing]
      }

      // Add new fields with defaults
      if (version < 5) {
        products = products.map(p => ({
          ...p,
          newField: p.newField ?? defaultValue,
        }))
      }

      // Return new object, don't mutate original
      return { products }
    },
  }
)
```

### Toast Notifications
Use the `toast` helper from `src/stores/toastStore.ts`:
```typescript
import { toast } from '../stores/toastStore'

toast.success('Operacion exitosa')
toast.error('Error al guardar')
toast.warning('Advertencia')
toast.info('Informacion')
```
**Limits:** Maximum 5 toasts displayed simultaneously to prevent memory issues. Oldest toast is removed when limit is reached.

### Pagination
All listing pages use the `usePagination` hook with 10 items per page:
```typescript
import { usePagination } from '../hooks/usePagination'
import { Pagination } from '../components/ui'

const {
  paginatedItems,
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  setCurrentPage,
} = usePagination(sortedItems)

// In JSX:
<Table data={paginatedItems} columns={columns} ... />
<Pagination
  currentPage={currentPage}
  totalPages={totalPages}
  totalItems={totalItems}
  itemsPerPage={itemsPerPage}
  onPageChange={setCurrentPage}
/>
```
The hook auto-resets to page 1 when `currentPage > totalPages` (e.g., after filtering reduces items). Uses `useLayoutEffect` with a ref flag to prevent infinite loops.

### Price Formatting
Use the centralized `formatPrice` function from `src/utils/constants.ts`:
```typescript
import { formatPrice } from '../utils/constants'

// Usage: {formatPrice(item.price)} → "$ 5.000,00"
// Handles edge cases like NaN and Infinity
```

### Event Listener Pattern in Modals
When registering event listeners in useEffect that depend on callback props, use `useRef` and update in a separate effect to avoid setting refs during render:
```typescript
// Use ref to avoid re-registering listeners when onClose changes
const onCloseRef = useRef(onClose)

// Update ref in effect (NOT during render - causes linter error)
useEffect(() => {
  onCloseRef.current = onClose
}, [onClose])

useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onCloseRef.current()
  }

  if (isOpen) {
    document.addEventListener('keydown', handleEscape)
  }

  return () => {
    document.removeEventListener('keydown', handleEscape)
  }
}, [isOpen])  // Only depend on isOpen, not onClose
```

### Nested Modals
The Modal component tracks open modal count via `document.body.dataset.modalCount`. This ensures:
- Body overflow is only restored when the **last** modal closes
- Nested modals (e.g., confirm dialog inside edit modal) work correctly
- No scroll restoration bugs when closing inner modals

## Mock Data Structure

All stores contain consistent mock data for development. Key relationships:
- **Restaurant**: Single restaurant with `id: 'restaurant-1'`
- **Branches**: 4 branches (`branch-1` to `branch-4`) all linked to `restaurant_id: 'restaurant-1'`
- **Tables**: 45 tables generated via `generateBranchTables()` helper (branch-1: 15, branch-2: 12, branch-3: 10, branch-4: 8) with cycling statuses and sectors
- **Products**: IDs are simple strings (`'1'` to `'14'` for branch-1 products)
- **Promotions**: Reference products by their actual IDs (e.g., `product_id: '3'` for Hamburguesa Clasica)

When adding mock data, ensure:
1. Foreign keys match existing entities (e.g., `restaurant_id` matches the actual restaurant)
2. Product IDs in promotions reference existing products from productStore
3. Dates are set to the future for active promotions

## Security Patterns

### File Import Security
`Settings.tsx` validates imported JSON files:
```typescript
// Maximum file size (5MB) to prevent DoS
const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024

// Validate file type and size before processing
if (file.size > MAX_IMPORT_FILE_SIZE) {
  toast.error('Archivo muy grande. El tamaño máximo es 5MB.')
  return
}
if (!file.name.endsWith('.json')) {
  toast.error('Solo se permiten archivos .json')
  return
}

// Deep structure validation before importing
const validateImportData = (data: unknown) => {
  // Validates restaurant has name/slug
  // Validates categories have id/name/branch_id
  // Validates subcategories have id/name/category_id
  // Validates products have id/name/category_id
}
```

### URL Sanitization
`ImageUpload` component validates URLs to prevent XSS:
```typescript
// Only http:// and https:// protocols allowed
// Blocks javascript:, data:, and other dangerous protocols
const sanitized = sanitizeImageUrl(inputUrl)
if (!sanitized) {
  setUrlError('URL invalida. Usa una URL http:// o https://')
  return
}
```

### Validation Consistency
All validators in `validation.ts` use:
- `MIN_NAME_LENGTH = 2`, `MAX_NAME_LENGTH = 100` for name fields
- `MAX_DESCRIPTION_LENGTH = 500`, `MAX_ADDRESS_LENGTH = 200` for text fields
- `isValidPhone()` for phone validation (accepts formats like +54 11 1234-5678)
- Local timezone helpers (`getLocalDateString`, `getLocalTimeString`) for date/time comparisons
- Trimmed input before validation
- Prices must be > 0 and finite (`Number.isFinite()` check)
- Order fields have max limit of 9999

### Number Input Handling
Always use safe parsing for number inputs to handle edge cases:
```typescript
// WRONG: parseFloat can return incorrect values
onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}

// CORRECT: Handle empty strings and validate
onChange={(e) => {
  const value = e.target.value.trim()
  const parsed = value === '' ? 0 : Number(value)
  setPrice(isNaN(parsed) ? 0 : Math.max(0, parsed))
}}

// For parseInt, always specify radix 10
parseInt(e.target.value, 10) || 0
```

### Error Message Security
`handleError()` in `logger.ts` returns user-friendly messages that don't expose internal details:
```typescript
// Internal: "TypeError: Cannot read property 'x' of undefined"
// User sees: "Ocurrió un error. Intenta nuevamente."

// Errors are classified and mapped to safe messages:
// - network errors → "Error de conexión. Verifica tu internet."
// - validation errors → "Los datos ingresados no son válidos."
// - 404 errors → "El recurso solicitado no existe."
// - auth errors → "No tienes permisos para esta acción."
```

## Current State

- All data is client-side with mock data in stores (4 branches with categories/products)
- No backend integration - `src/services/` is ready for API client
- Uses `crypto.randomUUID()` for ID generation
- ErrorBoundary wraps the entire app in App.tsx
- 12 predefined allergens (Gluten, Lacteos, Huevos, Pescado, Mariscos, Frutos Secos, Soja, Apio, Mostaza, Sesamo, Sulfitos, Altramuces)
- 4 predefined badges (Nuevo, Popular, Recomendado, Especial del Chef)
- 6 predefined seals (Vegano, Vegetariano, Sin Gluten, Orgánico, Sin Lactosa, Bajo en Sodio)
- 4 predefined promotion types (Happy Hour, Combo Familiar, 2x1, Descuento)
- Tables page fully implemented with status workflow and archive feature
- Staff and Orders pages are placeholder stubs under `/branches/*`
- Statistics pages (Sales, History by Branch/Customer) are placeholders
- Store versions: BRANCHES=4, CATEGORIES=3, SUBCATEGORIES=3, PRODUCTS=5, ALLERGENS=2, BADGES=1, SEALS=1, PROMOTIONS=3, PROMOTION_TYPES=2, TABLES=6, ORDER_HISTORY=1
