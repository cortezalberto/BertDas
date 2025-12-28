# Dashboard - Buen Sabor

Panel de administración para gestión de restaurantes multi-sucursal con gestión completa de menú, productos, precios, promociones y mesas.

## Descripción

**Buen Sabor Dashboard** es un sistema de administración para restaurantes con soporte multi-sucursal. Permite gestionar categorías de menú, productos, precios por sucursal, alérgenos, promociones con horarios, y flujo completo de mesas con 5 estados.

## Características Principales

### Gestión de Restaurante
- **Configuración Global** - Nombre, logo, banner, tema de color
- **Multi-Sucursal** - Gestión de hasta 4 sucursales
- **Información de Contacto** - Dirección, teléfono, email

### Gestión de Productos
- **Categorías** - Organización por sucursal
- **Subcategorías** - Anidadas bajo categorías
- **Productos** - CRUD completo con imágenes
- **Precios por Sucursal** - Precio base o precio específico por sucursal
- **Alérgenos** - 12 alérgenos predefinidos (Gluten, Lacteos, etc.)
- **Insignias/Badges** - 4 insignias predefinidas (Nuevo, Popular, Chef's Choice, Especial del Día) con color personalizable
- **Sellos** - 6 sellos predefinidos (Vegano, Vegetariano, Sin Gluten, Orgánico, Sin Lactosa, Bajo en Sodio) con emoji e icono
- **Destacados** - Marcadores visuales para productos

### Marketing
- **Gestión de Precios** - Actualización masiva de precios
- **Tipos de Promoción** - 4 tipos: Happy Hour, Combo Familiar, 2x1, Descuento
- **Promociones** - Combos con programación de fechas y horarios
- **Multi-Sucursal** - Promociones aplicables a múltiples sucursales

### Gestión de Mesas
- **CRUD Completo** - Crear, editar, eliminar mesas
- **Flujo de 5 Estados** - libre → ocupada → solicito_pedido → pedido_cumplido → cuenta_solicitada
- **Sistema de Tiempos** - Tracking de hora de pedido y hora de cierre
- **Archivado** - Conversión a historial de pedidos

### Estadísticas (Placeholders)
- **Ventas** - Análisis de ventas (pendiente)
- **Historial por Sucursal** - Pedidos por sucursal (pendiente)
- **Historial por Cliente** - Pedidos por cliente (pendiente)

## Instalación

```bash
# Clonar repositorio
git clone <repo-url>
cd Dashboard

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## Comandos

```bash
npm run dev      # Servidor de desarrollo (puerto 5177)
npm run build    # Build de producción
npm run preview  # Preview del build
npm run lint     # Ejecutar ESLint
```

## Arquitectura

### Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| React | 19 | UI Framework |
| TypeScript | 5.9 | Tipado estático |
| Vite | 7 | Build tool |
| Tailwind CSS | 4 | Estilos |
| Zustand | 5 | State management |
| React Router | 7 | Routing |
| Lucide React | - | Iconos |

### Estructura de Carpetas

```
src/
├── pages/                    # 19 páginas routed
│   ├── Dashboard.tsx        # Selección de sucursal
│   ├── Restaurant.tsx       # Configuración de restaurante
│   ├── Branches.tsx         # Gestión de sucursales
│   ├── Tables.tsx           # Gestión de mesas con workflow
│   ├── Categories.tsx       # Categorías (scoped por sucursal)
│   ├── Subcategories.tsx    # Subcategorías (scoped)
│   ├── Products.tsx         # Productos (scoped)
│   ├── Allergens.tsx        # Alérgenos globales
│   ├── Badges.tsx           # Insignias globales
│   ├── Seals.tsx            # Sellos globales (vegan, gluten-free, etc.)
│   ├── Prices.tsx           # Gestión de precios
│   ├── PromotionTypes.tsx   # Tipos de promoción
│   ├── Promotions.tsx       # Promociones con horarios
│   ├── Settings.tsx         # Configuración e importación
│   └── [placeholders]       # Staff, Orders, Statistics
├── components/
│   ├── layout/              # Layout, Sidebar, PageContainer
│   └── ui/                  # Componentes UI reutilizables
├── stores/                  # 13 Zustand stores con persist
├── services/                # Cascade delete service
├── hooks/                   # usePagination, useFocusTrap
├── types/                   # TypeScript interfaces
└── utils/                   # Constants, validation, logger
```

## Jerarquía de Datos

```
Restaurant (1)
  └── Branch (N)
       ├── Category (N)
       │    └── Subcategory (N)
       │         └── Product (N)
       │              ├── Allergen (M:N via allergen_ids[])
       │              └── BranchPrice (N)
       ├── Promotion (M:N via branch_ids[])
       │    ├── PromotionType (1)
       │    └── PromotionItem (N) → Product
       ├── RestaurantTable (N)
       └── OrderHistory (N)
```

## Estado (Zustand)

### 13 Stores con Persistencia

Todos los stores usan **localStorage** con versionado para migraciones.

| Store | Datos | Persistencia |
|-------|-------|--------------|
| `restaurantStore` | 1 restaurante | localStorage |
| `branchStore` | 4 sucursales + selectedBranchId | localStorage |
| `categoryStore` | Categorías por sucursal | localStorage |
| `subcategoryStore` | Subcategorías por categoría | localStorage |
| `productStore` | Productos con relaciones | localStorage |
| `allergenStore` | 12 alérgenos globales | localStorage |
| `badgeStore` | 4 insignias predefinidas | localStorage |
| `sealStore` | 6 sellos predefinidos | localStorage |
| `promotionStore` | Promociones con horarios | localStorage |
| `promotionTypeStore` | 4 tipos de promoción | localStorage |
| `tableStore` | 45 mesas con workflow | localStorage |
| `orderHistoryStore` | Historial de pedidos | localStorage |
| `toastStore` | Notificaciones UI | No persistido |

### Patrón de Selectores

**Crítico para evitar re-renders innecesarios:**

```typescript
// ✓ CORRECTO: Usar selectores
const items = useStore(selectItems)
const addItem = useStore((s) => s.addItem)

// ✗ INCORRECTO: Nunca destructurar
const { items } = useStore()

// Para datos derivados: siempre useMemo
const filtered = useMemo(() =>
  items.filter(i => i.active),
  [items]
)
```

### Datos Scoped por Sucursal

Categorías, subcategorías y productos se filtran por `selectedBranchId`:

```typescript
const selectedBranchId = useBranchStore(selectSelectedBranchId)
const categories = useCategoryStore(selectCategories)

const branchCategories = useMemo(() => {
  if (!selectedBranchId) return []
  return categories.filter(c =>
    c.branch_id === selectedBranchId &&
    c.name !== 'Home'  // HOME_CATEGORY_NAME
  )
}, [categories, selectedBranchId])
```

## Servicios

### Cascade Delete Service

Servicio centralizado para eliminaciones en cascada con **Dependency Injection**.

**Funciones Wrapper (convenientes):**
```typescript
import {
  deleteBranchWithCascade,
  deleteCategoryWithCascade,
  deleteSubcategoryWithCascade,
  deleteProductWithCascade,
  deleteAllergenWithCascade,
  deletePromotionTypeWithCascade
} from '../services/cascadeService'

const result = deleteBranchWithCascade(branchId)
if (!result.success) {
  toast.error(result.error || 'Error al eliminar')
} else {
  toast.success('Eliminado correctamente')
}
```

**Resultado:**
```typescript
interface CascadeDeleteResult {
  success: boolean
  deletedCounts: {
    categories?: number
    products?: number
    subcategories?: number
    // ... otros
  }
  error?: string
}
```

**Orden de Cascada (Branch):**
1. Limpia promociones (remove products/branches)
2. Elimina productos
3. Elimina subcategorías
4. Elimina categorías
5. Elimina mesas
6. Elimina historial de pedidos
7. Elimina sucursal

## Componentes UI

### Componentes de Formulario

| Componente | Descripción |
|------------|-------------|
| `Input` | Text input con manejo de errores, IDs auto-generados |
| `Select` | Dropdown con opciones |
| `Textarea` | Multi-línea |
| `Toggle` | Switch boolean |
| `ImageUpload` | URL input con preview y sanitización |
| `AllergenSelect` | Multi-select de alérgenos |
| `BranchCheckboxes` | Selección multi-sucursal |
| `BranchPriceInput` | Editor de precios por sucursal |
| `ProductSelect` | Selector de productos con cantidades |

### Componentes de Display

| Componente | Descripción |
|------------|-------------|
| `Card` | Contenedor de contenido |
| `Badge` | Indicadores de estado (3 variantes) |
| `Table` | Tabla con navegación por teclado |
| `Pagination` | Navegación de páginas con stats |
| `Toast` | Sistema de notificaciones (máx 5) |

### Componentes de Dialog

| Componente | Descripción |
|------------|-------------|
| `Modal` | Modal con focus trap y soporte anidado |
| `ConfirmDialog` | Confirmación Sí/No |
| `HelpButton` | Ayuda contextual con modal |

## Características Clave

### Sistema de Precios por Sucursal

Los productos soportan dos modos de precio:

**Modo 1: Precio Base**
```typescript
{
  price: 5000,
  use_branch_prices: false
}
```

**Modo 2: Precio por Sucursal**
```typescript
{
  price: 5000,  // Precio base (fallback)
  use_branch_prices: true,
  branch_prices: [
    { branch_id: 'branch-1', price: 5500, is_active: true },
    { branch_id: 'branch-2', price: 5200, is_active: true },
    { branch_id: 'branch-3', price: 0, is_active: false }
  ]
}
```

### Sistema de Mesas

**5 Estados del Workflow:**

| Estado | Color | order_time | close_time | Descripción |
|--------|-------|------------|------------|-------------|
| `libre` | Verde | 00:00 | 00:00 | Disponible |
| `ocupada` | Rojo | 00:00 | 00:00 | Ocupada, sin pedido |
| `solicito_pedido` | Amarillo | HH:mm | 00:00 | Pedido solicitado |
| `pedido_cumplido` | Azul | HH:mm | 00:00 | Pedido entregado |
| `cuenta_solicitada` | Púrpura | HH:mm | HH:mm | Cuenta solicitada |

**Reglas de Transición:**
- `solicito_pedido`: Establece `order_time` a hora actual
- `pedido_cumplido`: **PRESERVA** `order_time` del estado anterior
- `cuenta_solicitada`: Preserva `order_time`, establece `close_time`
- Volver a `libre`: Resetea ambos tiempos a 00:00

**Función de Archivo:**
- Crea registro en `OrderHistory`
- Resetea mesa a estado `libre`
- Solo disponible para estado `cuenta_solicitada`

### Sistema de Promociones

Promociones son combos de productos con programación temporal:

```typescript
interface Promotion {
  name: string
  price: number
  start_date: string     // YYYY-MM-DD
  end_date: string       // YYYY-MM-DD
  start_time: string     // HH:mm
  end_time: string       // HH:mm
  promotion_type_id: string
  branch_ids: string[]   // Explícito, no "todas"
  items: PromotionItem[] // Productos + cantidades
}
```

**Reglas de Validación:**
- Nuevas promociones: `start_date` + `start_time` deben ser futuro
- Editando: permite editar promociones pasadas
- `end_date` ≥ `start_date`
- Mismo día: `end_time` > `start_time`
- No activar promoción con `end_date` pasado

## Rutas

### Estructura de Navegación

```
/ - Dashboard (selección de sucursal)
/restaurant - Configuración de restaurante
/branches - Gestión de sucursales
  /branches/tables - Gestión de mesas
  /branches/staff - Personal (placeholder)
  /branches/orders - Pedidos (placeholder)
/categories - Categorías
/subcategories - Subcategorías
/products - Productos
/allergens - Alérgenos
/badges - Insignias
/prices - Precios
/promotion-types - Tipos de promoción
/promotions - Promociones
/statistics/sales - Ventas (placeholder)
/statistics/history/branches - Historial por sucursal (placeholder)
/statistics/history/customers - Historial por cliente (placeholder)
/settings - Configuración
```

## Validación

### Límites Centralizados

```typescript
const VALIDATION_LIMITS = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_ADDRESS_LENGTH: 200,
  MAX_PRICE: 9999999,
  MAX_ORDER: 9999,
  MAX_TOASTS: 5,
  MAX_IMPORT_FILE_SIZE: 5 * 1024 * 1024  // 5MB
}
```

### Helpers de Validación

```typescript
import {
  isValidNumber,
  isPositiveNumber,
  isNonNegativeNumber
} from '../utils/validation'

// isValidNumber(value) - finito, no NaN
// isPositiveNumber(value) - > 0
// isNonNegativeNumber(value) - >= 0
```

### Validación de Números

```typescript
// ✓ CORRECTO
onChange={(e) => {
  const value = e.target.value.trim()
  const parsed = value === '' ? 0 : Number(value)
  setPrice(isNaN(parsed) ? 0 : Math.max(0, parsed))
}}

// ✗ INCORRECTO
onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
```

## Seguridad

### Sanitización de URLs

```typescript
// ImageUpload bloquea protocolos peligrosos
// Solo permite http:// y https://
const sanitized = sanitizeImageUrl(inputUrl)
```

### Validación de Importación

```typescript
// Límite de 5MB
// Solo archivos .json
// Validación profunda de estructura
const validateImportData = (data: unknown) => {
  // Valida estructura completa antes de importar
}
```

### Mensajes de Error Seguros

```typescript
// handleError() en logger.ts
// Mapea errores internos a mensajes user-friendly
// No expone detalles de implementación
```

## Migración de Stores

Al modificar estructura de datos:

```typescript
persist(
  (set, get) => ({ ... }),
  {
    name: 'products-storage',
    version: 5,  // Incrementar
    migrate: (persistedState, version) => {
      let products = persistedState.products

      // Validar
      if (!Array.isArray(products)) {
        return { products: initialProducts }
      }

      // Migrar versión 4 → 5
      if (version < 5) {
        products = products.map(p => ({
          ...p,
          newField: p.newField ?? defaultValue
        }))
      }

      // Retornar nuevo objeto (inmutable)
      return { products }
    }
  }
)
```

## Accesibilidad

- **Focus trap** en modales via `useFocusTrap`
- **Skip links** en Layout para navegación por teclado
- **aria-labels** en botones de solo icono
- **Screen reader text** en componentes Badge
- **Navegación por teclado** en tablas (Enter/Space)
- **Loading states** con `role="status"` y texto sr-only
- **Toast notifications** con `role="alert"` y `aria-live`
- **Form inputs** con IDs únicos via `useId()`
- **HelpButton** contextual en cada página

## Sistema de Ayuda

Cada página incluye un botón de ayuda rojo centrado:

```typescript
<PageContainer
  title="Productos"
  description="Gestiona el menú"
  helpContent={helpContent.products}
>
```

Formularios incluyen ayuda pequeña explicando campos:

```typescript
<HelpButton
  title="Formulario de Categoría"
  size="sm"
  content={
    <div>
      <p><strong>Completa los siguientes campos</strong></p>
      <ul>
        <li><strong>Nombre:</strong> ...</li>
        <li><strong>Orden:</strong> ...</li>
      </ul>
    </div>
  }
/>
```

## Paginación

Todas las páginas de listado usan `usePagination`:

```typescript
const {
  paginatedItems,
  currentPage,
  totalPages,
  setCurrentPage
} = usePagination(sortedItems)
```

- 10 items por página
- Auto-reset a página 1 cuando se reduce contenido
- Usa `useLayoutEffect` para evitar loops infinitos

## Convenciones

### Código
- TypeScript strict mode
- Comentarios en inglés
- UI en español
- Imports relativos (sin aliases)
- Variables no usadas con prefijo `_`

### Estilos
- Tema oscuro con zinc
- Orange-500 como color primario
- Animaciones custom en index.css

### Constantes
```typescript
import {
  HOME_CATEGORY_NAME,
  STORAGE_KEYS,
  STORE_VERSIONS,
  VALIDATION_LIMITS,
  generateId,
  formatPrice
} from '../utils/constants'
```

### Logging
```typescript
import { handleError } from '../utils/logger'

try {
  // ...
} catch (error) {
  const message = handleError(error, 'Component.function')
  toast.error(message)
}
```

## Estado Actual

- ✅ Todos los datos son client-side con mock data
- ✅ 12 stores con persistencia localStorage
- ✅ 18 páginas (3 placeholders)
- ✅ Sistema de mesas completo con workflow
- ✅ Cascade delete service completo
- ✅ Precios por sucursal
- ✅ Promociones con horarios
- ❌ Sin integración backend (listo para API client)
- ❌ Páginas de estadísticas pendientes
- ❌ Páginas de Personal y Pedidos pendientes

## Datos Mock

- **Restaurant**: `restaurant-1`
- **Branches**: 4 sucursales (`branch-1` a `branch-4`)
- **Tables**: 45 mesas generadas (15 + 12 + 10 + 8 por sucursal)
- **Products**: IDs simples ('1' a '14')
- **Allergens**: 12 predefinidos
- **Badges**: 4 predefinidos (Nuevo, Popular, Chef's Choice, Especial del Día)
- **Promotion Types**: 4 predefinidos

## Licencia

Privado - Todos los derechos reservados
