# Arquitectura Completa del Sistema SaaS de Gestión de Restaurantes Multi-Sucursal

## Especificación Técnica para Implementación de Backend

**Versión:** 2.0
**Fecha:** Diciembre 2025
**Stack Tecnológico:**
- **Frontend Admin:** React 19 + TypeScript 5.9 + Zustand 5 (Dashboard)
- **Frontend Cliente:** React 19 + TypeScript 5.9 + Zustand 5 + PWA (pwaMenu "Sabor")
- **Backend:** FastAPI + PostgreSQL + WebSockets (Por implementar)
- **Pagos:** Mercado Pago Checkout Pro
- **Autenticación:** Google OAuth 2.0

---

## ÍNDICE

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura de Alto Nivel](#2-arquitectura-de-alto-nivel)
3. [Modelo de Datos Completo](#3-modelo-de-datos-completo)
4. [Componentes Frontend Existentes](#4-componentes-frontend-existentes)
5. [API REST Endpoints Requeridos](#5-api-rest-endpoints-requeridos)
6. [WebSockets y Sincronización en Tiempo Real](#6-websockets-y-sincronización-en-tiempo-real)
7. [Sistema de Autenticación y Autorización](#7-sistema-de-autenticación-y-autorización)
8. [Flujos de Operaciones Completos](#8-flujos-de-operaciones-completos)
9. [Integraciones Externas](#9-integraciones-externas)
10. [Seguridad y Validaciones](#10-seguridad-y-validaciones)
11. [Escalabilidad y Performance](#11-escalabilidad-y-performance)
12. [Migración de Datos Mock a Backend](#12-migración-de-datos-mock-a-backend)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 1.1 Descripción del Sistema

**Sabor** es un sistema SaaS completo para gestión de restaurantes multi-sucursal que consta de:

1. **Dashboard (Admin)** - Panel de administración web para configuración del restaurante
2. **pwaMenu (Cliente)** - PWA para comensales con carrito compartido y pagos
3. **Backend** - API REST + WebSockets para sincronización en tiempo real (Por implementar)

### 1.2 Problemas que Resuelve

```
┌─────────────────────────────────────────────────────────────┐
│ GESTIÓN MULTI-SUCURSAL                                      │
├─────────────────────────────────────────────────────────────┤
│ ✓ Carta personalizada por sucursal                         │
│ ✓ Precios diferentes por ubicación                         │
│ ✓ Gestión de mesas con workflow de 5 estados               │
│ ✓ Promociones temporales multi-sucursal                    │
│ ✓ Control de stock y disponibilidad                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ EXPERIENCIA DEL COMENSAL                                    │
├─────────────────────────────────────────────────────────────┤
│ ✓ Carrito compartido entre comensales de la mesa           │
│ ✓ División de cuenta (igual o por consumo)                 │
│ ✓ Pago con Mercado Pago desde el móvil                     │
│ ✓ Múltiples rondas de pedidos                              │
│ ✓ Autenticación opcional con Google OAuth                  │
│ ✓ PWA offline-first con i18n (es/en/pt)                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ OPERACIONES EN TIEMPO REAL (Requerido en Backend)          │
├─────────────────────────────────────────────────────────────┤
│ → Sincronización de carrito compartido entre dispositivos  │
│ → Notificaciones de pedidos a cocina                       │
│ → Estados de mesa actualizados en vivo                     │
│ → Disponibilidad de productos en tiempo real               │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Actores del Sistema

| Actor | Aplicación | Rol |
|-------|------------|-----|
| **Administrador** | Dashboard (Web) | Configurar restaurante, sucursales, categorías, productos, precios, promociones, mesas |
| **Comensal** | pwaMenu (PWA Móvil) | Escanear QR, ver menú, agregar al carrito, pagar con Mercado Pago |
| **Sistema de Pagos** | Mercado Pago API | Procesar pagos, devolver estados (approved/pending/rejected) |

**Nota:** El sistema actual NO incluye módulos para mozos ni cocina (estos son placeholders en Dashboard).

---

## 2. ARQUITECTURA DE ALTO NIVEL

### 2.1 Diagrama de Arquitectura

```
┌──────────────────────────────────────────────────────────────────────┐
│                         CAPA DE PRESENTACIÓN                         │
├────────────────────────────────┬─────────────────────────────────────┤
│      DASHBOARD (Admin)         │        pwaMenu (Cliente PWA)        │
│   React 19 + TypeScript 5.9    │    React 19 + TypeScript 5.9        │
│   Zustand 5 + localStorage     │    Zustand 5 + localStorage         │
│   React Router 7               │    i18next (es/en/pt)               │
│   Tailwind CSS 4               │    Tailwind CSS 4                   │
│   Lucide Icons                 │    Service Workers (PWA)            │
│   Port: 5177                   │    Port: 5176                       │
│                                │    Mercado Pago SDK                 │
│   11 Zustand Stores:           │    Google OAuth SDK                 │
│   • restaurantStore            │                                     │
│   • branchStore                │    2 Zustand Stores:                │
│   • categoryStore              │    • tableStore (modular)           │
│   • subcategoryStore           │    • authStore                      │
│   • productStore               │                                     │
│   • allergenStore              │    Custom Hooks:                    │
│   • promotionStore             │    • useOptimisticCart (React 19)   │
│   • promotionTypeStore         │    • useAsync                       │
│   • tableStore                 │    • useAutoCloseTimer              │
│   • orderHistoryStore          │    • useEscapeKey                   │
│   • toastStore                 │    • useDebounce                    │
│                                │    • useIsMounted                   │
│   Cascade Delete Service       │    • useModal                       │
│   usePagination Hook           │    • useOnlineStatus                │
│   useFocusTrap Hook            │    • useCloseTableFlow              │
│                                │    • useProductTranslation          │
└────────────────────────────────┴─────────────────────────────────────┘
                                 │
                        NGINX (Reverse Proxy)
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      CAPA DE APLICACIÓN (Backend)                    │
│                         FastAPI + Python 3.11+                       │
├──────────────────────────────────────────────────────────────────────┤
│  REST API                    │  WebSocket Server                     │
│  • /api/restaurants          │  • /ws/table/{table_id}               │
│  • /api/branches             │  • /ws/cart/{session_id}              │
│  • /api/categories           │  • Broadcast cart updates             │
│  • /api/subcategories        │  • Real-time sync                     │
│  • /api/products             │                                       │
│  • /api/allergens            │  Auth Middleware                      │
│  • /api/promotions           │  • JWT validation                     │
│  • /api/tables               │  • Google OAuth verify                │
│  • /api/orders               │  • Role-based access                  │
│  • /api/payments (MP)        │                                       │
│  • /auth/google              │  Rate Limiting                        │
│                              │  CORS Configuration                   │
│                              │  Request Validation (Pydantic)        │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         CAPA DE PERSISTENCIA                         │
│                         PostgreSQL 15+                               │
├──────────────────────────────────────────────────────────────────────┤
│  Tablas Principales:                                                 │
│  • restaurants               • branch_prices                         │
│  • branches                  • promotion_types                       │
│  • categories                • promotions                            │
│  • subcategories             • promotion_branches (M:N)              │
│  • products                  • promotion_items                       │
│  • allergens                 • restaurant_tables                     │
│  • product_allergens (M:N)   • order_history                         │
│                              • order_commands                        │
│  Extensiones:                • order_command_items                   │
│  • uuid-ossp                 • table_sessions                        │
│  • pg_trgm (búsqueda)        • session_diners                        │
│                              • session_cart_items                    │
│  Índices:                    • users (OAuth)                         │
│  • B-tree en FKs             • payment_transactions                  │
│  • GIN para búsqueda         │                                       │
│  • Partial para flags        │                                       │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       SERVICIOS EXTERNOS                             │
├──────────────────────────────────────────────────────────────────────┤
│  Google OAuth 2.0            │  Mercado Pago API                     │
│  • Sign in                   │  • Create preference                  │
│  • Token refresh             │  • Payment webhook                    │
│  • User info                 │  • Status notifications               │
└──────────────────────────────────────────────────────────────────────┘
```

### 2.2 Stack Tecnológico Completo

#### Frontend Dashboard (Admin)

```typescript
{
  "framework": "React 19",
  "language": "TypeScript 5.9 (strict mode)",
  "buildTool": "Vite 7",
  "styling": "Tailwind CSS 4",
  "stateManagement": "Zustand 5 (localStorage persist)",
  "routing": "React Router 7",
  "icons": "Lucide React",
  "validation": "Centralized utils/validation.ts",
  "stores": 11,
  "pages": 17,
  "customHooks": ["usePagination", "useFocusTrap", "useModal"],
  "patterns": ["Cascade Delete Service", "Dependency Injection", "Selector Pattern"]
}
```

#### Frontend pwaMenu (Cliente PWA)

```typescript
{
  "framework": "React 19",
  "language": "TypeScript 5.9 (strict mode)",
  "buildTool": "Vite 7",
  "styling": "Tailwind CSS 4",
  "stateManagement": "Zustand 5 (localStorage + sessionStorage)",
  "i18n": "i18next (es/en/pt)",
  "pwa": "vite-plugin-pwa + Workbox",
  "auth": "Google OAuth 2.0 (One Tap)",
  "payments": "Mercado Pago Checkout Pro",
  "stores": 2,
  "customHooks": [
    "useOptimisticCart (React 19)",
    "useAsync",
    "useAutoCloseTimer",
    "useEscapeKey",
    "useDebounce",
    "useIsMounted",
    "useModal",
    "useOnlineStatus",
    "useCloseTableFlow",
    "useProductTranslation"
  ],
  "react19Patterns": [
    "useActionState",
    "useOptimistic",
    "useTransition",
    "useId",
    "Document metadata in JSX"
  ],
  "securityPatterns": [
    "SSRF Prevention",
    "CSRF Protection",
    "Request Deduplication",
    "URL Sanitization"
  ]
}
```

#### Backend (Por Implementar)

```python
{
  "framework": "FastAPI",
  "language": "Python 3.11+",
  "orm": "SQLAlchemy 2.0 (async)",
  "database": "PostgreSQL 15+",
  "websockets": "FastAPI WebSockets + Redis Pub/Sub",
  "auth": "JWT + Google OAuth",
  "payments": "Mercado Pago SDK",
  "validation": "Pydantic V2",
  "migrations": "Alembic",
  "cache": "Redis",
  "taskQueue": "Celery (opcional para emails/notificaciones)",
  "testing": "pytest + httpx",
  "deployment": "Docker + Docker Compose"
}
```

---

## 3. MODELO DE DATOS COMPLETO

### 3.1 Diagrama Entidad-Relación

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         MODELO DE DATOS COMPLETO                        │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   restaurants   │  (1 por tenant SaaS)
├─────────────────┤
│ id (UUID PK)    │
│ name            │──────────────────────────────────────────────────┐
│ slug (UNIQUE)   │                                                  │
│ description     │                                                  │
│ theme_color     │  Default: #f97316 (orange)                      │
│ logo (URL)      │                                                  │
│ banner (URL)    │                                                  │
│ address         │                                                  │
│ phone           │                                                  │
│ email           │                                                  │
│ created_at      │                                                  │
│ updated_at      │                                                  │
└────────┬────────┘                                                  │
         │ 1:N                                                      │
         ▼                                                           │
┌─────────────────┐                                                  │
│    branches     │  (Sucursales)                                   │
├─────────────────┤                                                  │
│ id (UUID PK)    │◄─────────────────────────────────────────────────┘
│ restaurant_id FK│
│ name            │
│ address         │
│ phone           │
│ email           │
│ image (URL)     │
│ is_active       │
│ order (INT)     │  Display order
│ opening_time    │  HH:mm (Nuevo para Dashboard)
│ closing_time    │  HH:mm (Nuevo para Dashboard)
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ 1:N
         ├──────────────────────────────────────┐
         │                                      │
         ▼                                      ▼
┌─────────────────┐                  ┌─────────────────────────┐
│   categories    │                  │  restaurant_tables      │  (Mesas)
├─────────────────┤                  ├─────────────────────────┤
│ id (UUID PK)    │                  │ id (UUID PK)            │
│ branch_id FK    │                  │ branch_id FK            │
│ name            │                  │ number (INT)            │
│ icon            │                  │ capacity (INT)          │
│ image (URL)     │                  │ sector (VARCHAR)        │
│ order (INT)     │                  │ status (ENUM)           │ 5 estados
│ is_active       │                  │ order_time (TIME)       │ HH:mm
│ created_at      │                  │ close_time (TIME)       │ HH:mm
│ updated_at      │                  │ is_active               │
└────────┬────────┘                  │ created_at              │
         │ 1:N                       │ updated_at              │
         ▼                            └─────────┬───────────────┘
┌─────────────────┐                            │ 1:N
│  subcategories  │                            ▼
├─────────────────┤                  ┌─────────────────────────┐
│ id (UUID PK)    │                  │   order_history         │
│ category_id FK  │                  ├─────────────────────────┤
│ name            │                  │ id (UUID PK)            │
│ image (URL)     │                  │ branch_id FK            │
│ order (INT)     │                  │ table_id FK             │
│ is_active       │                  │ table_number            │
│ created_at      │                  │ created_at              │
│ updated_at      │                  └─────────────────────────┘
└────────┬────────┘
         │ 1:N
         ▼
┌──────────────────┐           ┌──────────────────────┐
│    products      │           │     allergens        │  (Global)
├──────────────────┤           ├──────────────────────┤
│ id (UUID PK)     │           │ id (UUID PK)         │
│ category_id FK   │           │ name (UNIQUE)        │
│ subcategory_id FK│           │ icon                 │
│ name             │           │ description          │
│ description      │           │ is_active            │
│ price (DECIMAL)  │───┐       │ created_at           │
│ use_branch_prices│   │       │ updated_at           │
│ image (URL)      │   │       └──────────┬───────────┘
│ featured         │   │                  │
│ popular          │   │                  │ M:N
│ badge            │   │                  ▼
│ is_active        │   │       ┌──────────────────────┐
│ stock (INT)      │   │       │  product_allergens   │ (Pivot)
│ created_at       │   │       ├──────────────────────┤
│ updated_at       │   │       │ product_id FK (PK)   │
└──────┬───────────┘   │       │ allergen_id FK (PK)  │
       │               │       └──────────────────────┘
       │ 1:N           │
       ▼               │
┌──────────────────┐   │       ┌──────────────────────┐
│  branch_prices   │◄──┘       │   promotion_types    │  (Global)
├──────────────────┤           ├──────────────────────┤
│ id (UUID PK)     │           │ id (UUID PK)         │
│ product_id FK    │           │ name (UNIQUE)        │
│ branch_id FK     │           │ description          │
│ price (DECIMAL)  │           │ icon                 │
│ is_active        │           │ is_active            │
└──────────────────┘           │ created_at           │
  UNIQUE(product,branch)       │ updated_at           │
                               └──────────┬───────────┘
                                          │ 1:N
                                          ▼
                               ┌──────────────────────┐
                               │    promotions        │
                               ├──────────────────────┤
                               │ id (UUID PK)         │
                               │ promotion_type_id FK │
                               │ name                 │
                               │ description          │
                               │ price (DECIMAL)      │
                               │ image (URL)          │
                               │ start_date (DATE)    │
                               │ end_date (DATE)      │
                               │ start_time (TIME)    │
                               │ end_time (TIME)      │
                               │ is_active            │
                               │ created_at           │
                               │ updated_at           │
                               └──────────┬───────────┘
                                          │
                       ┌──────────────────┴──────────────────┐
                       │ M:N                                 │ 1:N
                       ▼                                     ▼
            ┌──────────────────────┐           ┌──────────────────────┐
            │  promotion_branches  │ (Pivot)   │   promotion_items    │
            ├──────────────────────┤           ├──────────────────────┤
            │ promotion_id FK (PK) │           │ id (UUID PK)         │
            │ branch_id FK (PK)    │           │ promotion_id FK      │
            └──────────────────────┘           │ product_id FK        │
                                                │ quantity (INT)       │
                                                └──────────────────────┘
                                                  UNIQUE(promotion,product)

┌───────────────────────────────────────────────────────────────────┐
│              NUEVAS TABLAS PARA pwaMenu (Backend)                 │
└───────────────────────────────────────────────────────────────────┘

┌─────────────────┐              ┌─────────────────────────┐
│      users      │              │   table_sessions        │
├─────────────────┤              ├─────────────────────────┤
│ id (UUID PK)    │              │ id (UUID PK)            │
│ google_id       │──┐           │ table_id FK             │
│ email           │  │           │ branch_id FK            │
│ name            │  │           │ table_number (INT)      │
│ picture_url     │  │           │ status (ENUM)           │ active/closed
│ created_at      │  │           │ created_at              │
│ updated_at      │  │           │ expires_at              │ +8 hours
└─────────────────┘  │           │ closed_at               │
                     │           └─────────┬───────────────┘
                     │                     │ 1:N
                     │                     ▼
                     │           ┌─────────────────────────┐
                     └──────────►│   session_diners        │
                                 ├─────────────────────────┤
                                 │ id (UUID PK)            │
                                 │ session_id FK           │
                                 │ user_id FK (nullable)   │ Si OAuth
                                 │ name (VARCHAR)          │
                                 │ color (VARCHAR)         │ Hex color
                                 │ joined_at               │
                                 └─────────┬───────────────┘
                                           │ 1:N
                                           ▼
                                 ┌─────────────────────────┐
                                 │  session_cart_items     │
                                 ├─────────────────────────┤
                                 │ id (UUID PK)            │
                                 │ session_id FK           │
                                 │ diner_id FK             │
                                 │ product_id FK           │
                                 │ quantity (INT)          │
                                 │ notes (TEXT)            │
                                 │ added_at                │
                                 └─────────────────────────┘

┌─────────────────────────┐
│   order_commands        │  (Pedidos confirmados)
├─────────────────────────┤
│ id (UUID PK)            │
│ session_id FK           │
│ round_number (INT)      │  1, 2, 3...
│ status (ENUM)           │  pending/confirmed/preparing/ready
│ total (DECIMAL)         │
│ confirmed_at            │
│ created_at              │
└─────────┬───────────────┘
          │ 1:N
          ▼
┌─────────────────────────┐
│  order_command_items    │
├─────────────────────────┤
│ id (UUID PK)            │
│ command_id FK           │
│ diner_id FK             │
│ product_id FK           │
│ quantity (INT)          │
│ unit_price (DECIMAL)    │
│ notes (TEXT)            │
└─────────────────────────┘

┌─────────────────────────┐
│  payment_transactions   │
├─────────────────────────┤
│ id (UUID PK)            │
│ session_id FK           │
│ diner_id FK (nullable)  │  Si pago individual
│ mp_preference_id        │
│ mp_payment_id           │
│ amount (DECIMAL)        │
│ status (VARCHAR)        │  approved/pending/rejected
│ payment_method (VARCHAR)│
│ created_at              │
│ updated_at              │
└─────────────────────────┘
```

### 3.2 Enums y Tipos

```sql
-- Table Status (Dashboard)
CREATE TYPE table_status AS ENUM (
  'libre',
  'ocupada',
  'solicito_pedido',
  'pedido_cumplido',
  'cuenta_solicitada'
);

-- Session Status (pwaMenu)
CREATE TYPE session_status AS ENUM (
  'active',
  'closed'
);

-- Order Command Status (pwaMenu)
CREATE TYPE command_status AS ENUM (
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'delivered'
);

-- Payment Status (Mercado Pago)
CREATE TYPE payment_status AS ENUM (
  'approved',
  'pending',
  'rejected',
  'cancelled'
);
```

### 3.3 Relaciones y Cardinalidades

| Relación | Tipo | Tabla Pivot | Cascade Delete |
|----------|------|-------------|----------------|
| Restaurant → Branch | 1:N | - | CASCADE |
| Branch → Category | 1:N | - | CASCADE |
| Category → Subcategory | 1:N | - | CASCADE |
| Category → Product | 1:N | - | CASCADE |
| Subcategory → Product | 1:N | - | SET NULL |
| Product ↔ Allergen | M:N | `product_allergens` | CASCADE both |
| Product → BranchPrice | 1:N | - | CASCADE |
| Branch → BranchPrice | 1:N | - | CASCADE |
| PromotionType → Promotion | 1:N | - | CASCADE |
| Promotion ↔ Branch | M:N | `promotion_branches` | CASCADE both |
| Promotion → PromotionItem | 1:N | - | CASCADE |
| Product → PromotionItem | 1:N | - | CASCADE |
| Branch → RestaurantTable | 1:N | - | CASCADE |
| RestaurantTable → OrderHistory | 1:N | - | CASCADE |
| RestaurantTable → TableSession | 1:N | - | CASCADE |
| TableSession → SessionDiner | 1:N | - | CASCADE |
| TableSession → SessionCartItem | 1:N | - | CASCADE |
| TableSession → OrderCommand | 1:N | - | CASCADE |
| User → SessionDiner | 1:N | - | SET NULL |
| OrderCommand → OrderCommandItem | 1:N | - | CASCADE |
| TableSession → PaymentTransaction | 1:N | - | CASCADE |

---

## 4. COMPONENTES FRONTEND EXISTENTES

### 4.1 Dashboard - 11 Zustand Stores

| Store | Entidades | Persistencia | Funcionalidades Clave |
|-------|-----------|--------------|----------------------|
| `restaurantStore` | 1 restaurant | localStorage | CRUD restaurant settings |
| `branchStore` | 4 branches + selectedBranchId | localStorage | CRUD branches, branch selection |
| `categoryStore` | Categories | localStorage | CRUD, branch-scoped filtering |
| `subcategoryStore` | Subcategories | localStorage | CRUD, category-scoped |
| `productStore` | Products | localStorage | CRUD, allergen relations, branch prices |
| `allergenStore` | 12 allergens | localStorage | CRUD global allergens |
| `promotionStore` | Promotions | localStorage | CRUD, time-based validation |
| `promotionTypeStore` | 4 types | localStorage | CRUD promotion types |
| `tableStore` | 45 tables | localStorage | CRUD, 5-state workflow, archive |
| `orderHistoryStore` | Order history | localStorage | Archive management |
| `toastStore` | Notifications | NO persist | UI notifications (max 5) |

**Patrón Crítico (Dashboard):**
```typescript
// ✓ CORRECTO
const items = useStore(selectItems)
const addItem = useStore((s) => s.addItem)

// ✗ INCORRECTO - Causa re-renders infinitos
const { items } = useStore()
```

### 4.2 pwaMenu - 2 Zustand Stores

| Store | Estructura | Persistencia | Funcionalidades Clave |
|-------|------------|--------------|----------------------|
| `tableStore` | Modular (store.ts, selectors.ts, helpers.ts, types.ts) | localStorage (8h expiry) | joinTable, addToCart, submitOrder, closeTable, getPaymentShares, leaveTable |
| `authStore` | Single file | sessionStorage | Google OAuth, JWT tokens, mock mode |

**Patrón Crítico (pwaMenu):**
```typescript
// Para selectores que retornan objetos, usar useShallow
import { useShallow } from 'zustand/react/shallow'

const headerData = useTableStore(useShallow(selectHeaderData))
const cartData = useTableStore(useShallow(selectSharedCartData))

// Derivar datos con useMemo FUERA del selector
const filtered = useMemo(() =>
  items.filter(i => i.active),
  [items]
)
```

### 4.3 Dashboard - 17 Páginas

| Página | Ruta | Estado | Funcionalidad |
|--------|------|--------|---------------|
| Dashboard | `/` | ✅ | Selección de sucursal (obligatoria) |
| Restaurant | `/restaurant` | ✅ | Configuración global del restaurante |
| Branches | `/branches` | ✅ | CRUD sucursales con horarios |
| Tables | `/branches/tables` | ✅ | CRUD mesas, workflow 5 estados, archivado |
| Staff | `/branches/staff` | 🚧 | Placeholder |
| Orders | `/branches/orders` | 🚧 | Placeholder |
| Categories | `/categories` | ✅ | CRUD categorías (branch-scoped) |
| Subcategories | `/subcategories` | ✅ | CRUD subcategorías |
| Products | `/products` | ✅ | CRUD productos, precios por sucursal, alérgenos |
| Allergens | `/allergens` | ✅ | CRUD alérgenos globales |
| Prices | `/prices` | ✅ | Actualización masiva de precios |
| PromotionTypes | `/promotion-types` | ✅ | CRUD tipos de promoción |
| Promotions | `/promotions` | ✅ | CRUD promociones con horarios |
| Sales | `/statistics/sales` | 🚧 | Placeholder |
| History Branches | `/statistics/history/branches` | 🚧 | Placeholder |
| History Customers | `/statistics/history/customers` | 🚧 | Placeholder |
| Settings | `/settings` | ✅ | Import/Export JSON (5MB max) |

### 4.4 pwaMenu - 3 Páginas Principales

| Página | Ruta | Funcionalidad |
|--------|------|---------------|
| Home | `/` | Menú navegable, categorías → subcategorías → productos, carrito compartido, búsqueda |
| CloseTable | `/close` | División de cuenta (equal/by_consumption), solicitar cuenta, pago |
| PaymentResult | `/payment/success` | Procesar respuesta de Mercado Pago |

**Flujo Completo pwaMenu:**
```
QRSimulator → JoinTable (TableNumberStep → NameStep) → Home →
SharedCart → OrderSuccess → (Repetir) → CloseTable →
CloseStatusView → PaymentResult → PaidView → Dejar Mesa
```

---

## 5. API REST ENDPOINTS REQUERIDOS

### 5.1 Autenticación

```http
POST   /api/auth/google
  Body: { credential: string (JWT from Google) }
  Response: { access_token, refresh_token, user }

POST   /api/auth/refresh
  Body: { refresh_token }
  Response: { access_token }

GET    /api/auth/me
  Headers: Authorization: Bearer {token}
  Response: { user }
```

### 5.2 Restaurantes

```http
GET    /api/restaurants/{slug}
  Response: Restaurant

PATCH  /api/restaurants/{id}
  Body: RestaurantUpdateDTO
  Response: Restaurant
```

### 5.3 Sucursales

```http
GET    /api/branches
  Query: ?restaurant_id={id}
  Response: Branch[]

POST   /api/branches
  Body: BranchCreateDTO
  Response: Branch

PATCH  /api/branches/{id}
  Body: BranchUpdateDTO
  Response: Branch

DELETE /api/branches/{id}
  Response: { success, deletedCounts }
```

### 5.4 Categorías

```http
GET    /api/categories
  Query: ?branch_id={id}
  Response: Category[]

POST   /api/categories
  Body: CategoryCreateDTO
  Response: Category

PATCH  /api/categories/{id}
  Body: CategoryUpdateDTO
  Response: Category

DELETE /api/categories/{id}
  Response: { success, deletedCounts }
```

### 5.5 Subcategorías

```http
GET    /api/subcategories
  Query: ?category_id={id}
  Response: Subcategory[]

POST   /api/subcategories
  Body: SubcategoryCreateDTO
  Response: Subcategory

PATCH  /api/subcategories/{id}
  Body: SubcategoryUpdateDTO
  Response: Subcategory

DELETE /api/subcategories/{id}
  Response: { success, deletedCounts }
```

### 5.6 Productos

```http
GET    /api/products
  Query: ?category_id={id}&subcategory_id={id}&branch_id={id}&featured=true
  Response: Product[]

GET    /api/products/{id}
  Response: Product (include allergens, branch_prices)

POST   /api/products
  Body: ProductCreateDTO
  Response: Product

PATCH  /api/products/{id}
  Body: ProductUpdateDTO
  Response: Product

DELETE /api/products/{id}
  Response: { success }

PATCH  /api/products/{id}/stock
  Body: { stock: number }
  Response: Product
```

### 5.7 Alérgenos

```http
GET    /api/allergens
  Response: Allergen[]

POST   /api/allergens
  Body: AllergenCreateDTO
  Response: Allergen

PATCH  /api/allergens/{id}
  Body: AllergenUpdateDTO
  Response: Allergen

DELETE /api/allergens/{id}
  Response: { success }
```

### 5.8 Promociones

```http
GET    /api/promotions
  Query: ?branch_id={id}&is_active=true
  Response: Promotion[]

GET    /api/promotions/active
  Query: ?branch_id={id}
  Response: Promotion[] (filtered by current date/time)

POST   /api/promotions
  Body: PromotionCreateDTO
  Response: Promotion

PATCH  /api/promotions/{id}
  Body: PromotionUpdateDTO
  Response: Promotion

DELETE /api/promotions/{id}
  Response: { success }
```

### 5.9 Mesas

```http
GET    /api/tables
  Query: ?branch_id={id}&status={status}
  Response: RestaurantTable[]

POST   /api/tables
  Body: TableCreateDTO
  Response: RestaurantTable

PATCH  /api/tables/{id}
  Body: TableUpdateDTO
  Response: RestaurantTable

DELETE /api/tables/{id}
  Response: { success }

POST   /api/tables/{id}/archive
  Response: { table, orderHistory }
```

### 5.10 Sesiones de Mesa (pwaMenu)

```http
POST   /api/sessions/join
  Body: { table_number, branch_id, diner_name, user_id? }
  Response: { session, diner, token }

GET    /api/sessions/{id}
  Response: Session (include diners, cart_items)

POST   /api/sessions/{id}/leave
  Body: { diner_id }
  Response: { success }

GET    /api/sessions/{id}/cart
  Response: CartItem[]

POST   /api/sessions/{id}/cart
  Body: { diner_id, product_id, quantity, notes? }
  Response: CartItem
  Trigger: WebSocket broadcast

PATCH  /api/sessions/{id}/cart/{item_id}
  Body: { quantity }
  Response: CartItem
  Trigger: WebSocket broadcast

DELETE /api/sessions/{id}/cart/{item_id}
  Response: { success }
  Trigger: WebSocket broadcast
```

### 5.11 Pedidos (pwaMenu)

```http
POST   /api/sessions/{id}/orders
  Body: { cart_items }
  Response: OrderCommand
  Trigger: Clear cart, WebSocket notification

GET    /api/sessions/{id}/orders
  Response: OrderCommand[]

PATCH  /api/orders/{id}/status
  Body: { status }
  Response: OrderCommand
  Trigger: WebSocket notification
```

### 5.12 Pagos (Mercado Pago)

```http
POST   /api/payments/create-preference
  Body: { session_id, amount, diner_id?, split_method }
  Response: { preference_id, init_point, sandbox_init_point }

POST   /api/payments/webhook
  Body: Mercado Pago notification
  Response: { success }
  Trigger: Update transaction status, WebSocket notification

GET    /api/payments/transaction/{mp_payment_id}
  Response: PaymentTransaction
```

---

## 6. WEBSOCKETS Y SINCRONIZACIÓN EN TIEMPO REAL

### 6.1 Conexiones WebSocket

```typescript
// Cliente pwaMenu conecta por sesión
const ws = new WebSocket(`wss://api.sabor.com/ws/session/{session_id}?token={jwt}`)

// Eventos que disparan broadcasts:
- Comensal se une/sale de mesa
- Item agregado/modificado/eliminado del carrito
- Pedido confirmado
- Estado de pedido cambia (cocina)
- Pago procesado
```

### 6.2 Estructura de Mensajes WebSocket

```json
// Unirse a mesa
{
  "type": "diner_joined",
  "payload": {
    "session_id": "uuid",
    "diner": {
      "id": "uuid",
      "name": "Juan",
      "color": "#ff0000"
    }
  }
}

// Actualización de carrito
{
  "type": "cart_updated",
  "payload": {
    "session_id": "uuid",
    "action": "add" | "update" | "remove",
    "item": {
      "id": "uuid",
      "diner_id": "uuid",
      "product_id": "uuid",
      "quantity": 2,
      "notes": "Sin cebolla"
    }
  }
}

// Pedido confirmado
{
  "type": "order_submitted",
  "payload": {
    "session_id": "uuid",
    "command_id": "uuid",
    "round_number": 2,
    "total": 5600.00
  }
}

// Cambio de estado de pedido
{
  "type": "order_status_changed",
  "payload": {
    "command_id": "uuid",
    "status": "ready",
    "updated_at": "2025-12-27T18:30:00Z"
  }
}

// Pago procesado
{
  "type": "payment_processed",
  "payload": {
    "session_id": "uuid",
    "transaction_id": "uuid",
    "status": "approved",
    "amount": 5600.00
  }
}
```

### 6.3 Implementación Backend (Pseudocódigo FastAPI)

```python
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json

# Manager para gestionar conexiones activas
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        if session_id not in self.active_connections:
            self.active_connections[session_id] = set()
        self.active_connections[session_id].add(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket):
        self.active_connections[session_id].discard(websocket)
        if not self.active_connections[session_id]:
            del self.active_connections[session_id]

    async def broadcast(self, session_id: str, message: dict):
        if session_id in self.active_connections:
            dead_connections = set()
            for connection in self.active_connections[session_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.add(connection)

            # Cleanup dead connections
            for conn in dead_connections:
                self.disconnect(session_id, conn)

manager = ConnectionManager()

@app.websocket("/ws/session/{session_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str = Query(...)
):
    # Validate JWT token
    user = await verify_token(token)

    # Connect to session
    await manager.connect(session_id, websocket)

    try:
        while True:
            # Keep connection alive (heartbeat)
            data = await websocket.receive_text()
            # Process if needed
    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
        await manager.broadcast(session_id, {
            "type": "diner_left",
            "payload": {
                "session_id": session_id,
                "user_id": user.id
            }
        })
```

---

## 7. SISTEMA DE AUTENTICACIÓN Y AUTORIZACIÓN

### 7.1 Google OAuth 2.0 (Actual en pwaMenu)

```typescript
// Frontend: Google One Tap
<script src="https://accounts.google.com/gsi/client" async defer></script>

google.accounts.id.initialize({
  client_id: VITE_GOOGLE_CLIENT_ID,
  callback: handleCredentialResponse
})

function handleCredentialResponse(response) {
  // response.credential es el JWT de Google
  const jwt = response.credential

  // Enviar a backend
  fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: jwt })
  })
}
```

### 7.2 Backend: Validación Google JWT

```python
from google.oauth2 import id_token
from google.auth.transport import requests

async def verify_google_token(token: str):
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Verificar issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer')

        # Extraer info del usuario
        user_data = {
            'google_id': idinfo['sub'],
            'email': idinfo['email'],
            'name': idinfo.get('name'),
            'picture': idinfo.get('picture')
        }

        # Crear o actualizar usuario en DB
        user = await get_or_create_user(user_data)

        # Generar JWT propio
        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user
        }

    except ValueError as e:
        raise HTTPException(401, 'Invalid token')
```

### 7.3 JWT Tokens (Backend)

```python
from datetime import datetime, timedelta
from jose import JWTError, jwt

SECRET_KEY = "your-secret-key"  # En .env
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7

def create_access_token(user_id: str):
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        'sub': user_id,
        'exp': expire,
        'type': 'access'
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user_id: str):
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        'sub': user_id,
        'exp': expire,
        'type': 'refresh'
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('sub')
        if user_id is None or payload.get('type') != 'access':
            raise credentials_exception

        user = await get_user_by_id(user_id)
        if user is None:
            raise credentials_exception

        return user
    except JWTError:
        raise credentials_exception
```

### 7.4 Roles y Permisos

```python
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"          # Dashboard completo
    MANAGER = "manager"      # Solo su sucursal
    CUSTOMER = "customer"    # Solo pwaMenu

# Middleware de autorización
def require_role(allowed_roles: List[UserRole]):
    async def role_checker(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(403, 'Insufficient permissions')
        return user
    return role_checker

# Uso en endpoints
@app.get("/api/branches", dependencies=[Depends(require_role([UserRole.ADMIN, UserRole.MANAGER]))])
async def list_branches(user: User = Depends(get_current_user)):
    if user.role == UserRole.MANAGER:
        return await get_branches_by_manager(user.id)
    return await get_all_branches()
```

---

## 8. FLUJOS DE OPERACIONES COMPLETOS

### 8.1 Flujo: Comensal Realiza Pedido

```
┌─────────────────────────────────────────────────────────────────────┐
│ FLUJO COMPLETO: PEDIDO DE COMENSAL                                  │
└─────────────────────────────────────────────────────────────────────┘

1. ESCANEAR QR
   Cliente → Lee QR con: table_number, branch_id
   ↓

2. UNIRSE A MESA
   POST /api/sessions/join
   Body: { table_number: 5, branch_id: "uuid", diner_name: "Juan" }
   ↓
   Backend:
   - Busca o crea TableSession activa para esa mesa
   - Crea SessionDiner con color aleatorio
   - Retorna session_id, diner_id, token
   - Broadcast WebSocket: diner_joined
   ↓
   Frontend pwaMenu:
   - Guarda session en tableStore (localStorage, 8h expiry)
   - Conecta WebSocket a /ws/session/{session_id}?token={jwt}
   - Navega a Home (menú)
   ↓

3. NAVEGAR MENÚ
   GET /api/categories?branch_id={id}
   GET /api/subcategories?category_id={id}
   GET /api/products?category_id={id}&branch_id={id}
   ↓
   Frontend:
   - Muestra productos con precios correctos (branch_prices o base)
   - Alérgenos visibles
   - Búsqueda en cliente
   ↓

4. AGREGAR AL CARRITO
   Frontend:
   - addToCart() en tableStore
   - Optimistic update con useOptimisticCart (React 19)
   ↓
   POST /api/sessions/{session_id}/cart
   Body: {
     diner_id: "uuid",
     product_id: "uuid",
     quantity: 2,
     notes: "Sin cebolla"
   }
   ↓
   Backend:
   - Crea SessionCartItem
   - Broadcast WebSocket a todos los comensales de la mesa
   ↓
   Otros Comensales:
   - Reciben cart_updated via WebSocket
   - Actualizan su UI (ver items de otros)
   ↓

5. ENVIAR PEDIDO
   Frontend:
   - submitOrder() en tableStore
   - Muestra confirmación "¿Confirmar pedido?"
   ↓
   POST /api/sessions/{session_id}/orders
   Body: { cart_items: [...] }
   ↓
   Backend:
   - Crea OrderCommand con status=pending
   - Crea OrderCommandItems
   - Limpia SessionCartItems
   - Broadcast WebSocket: order_submitted
   - Notifica a Dashboard/Cocina (placeholder)
   ↓
   Frontend:
   - Limpia carrito local
   - Muestra OrderSuccess animation
   - Incrementa currentRound
   ↓

6. (REPETIR 3-5 para múltiples rondas)

7. SOLICITAR CUENTA
   Frontend CloseTable:
   - getPaymentShares() calcula división
   - Muestra resumen por comensal
   ↓
   POST /api/sessions/{session_id}/close
   Body: { split_method: "equal" | "by_consumption" }
   ↓
   Backend:
   - Actualiza Session.status = "closing"
   - Calcula shares
   - Broadcast WebSocket: close_requested
   ↓

8. PAGAR CON MERCADO PAGO
   Frontend CloseStatusView:
   - Usuario selecciona "Mercado Pago"
   ↓
   POST /api/payments/create-preference
   Body: {
     session_id: "uuid",
     amount: 5600.00,
     diner_id: "uuid" (si pago individual)
   }
   ↓
   Backend:
   - Crea preferencia en Mercado Pago
   - Guarda PaymentTransaction con status=pending
   - Retorna init_point URL
   ↓
   Frontend:
   - Redirect a Mercado Pago checkout
   ↓
   Usuario Paga en Mercado Pago
   ↓
   Mercado Pago:
   - Redirect a /payment/success?collection_id=xxx&status=approved
   ↓
   Frontend PaymentResult:
   - Parsea query params
   - Muestra estado (approved/pending/rejected)
   ↓
   (En paralelo) Mercado Pago Webhook:
   POST /api/payments/webhook
   Body: { payment_id, status, ... }
   ↓
   Backend:
   - Actualiza PaymentTransaction
   - Broadcast WebSocket: payment_processed
   - Si approved → Session.status = "closed"
   ↓

9. DEJAR MESA
   Frontend PaidView:
   - Usuario hace click en "Dejar mesa"
   ↓
   POST /api/sessions/{session_id}/leave
   Body: { diner_id: "uuid" }
   ↓
   Backend:
   - Marca SessionDiner como left_at
   - Si último comensal → Session.status = "closed"
   - Broadcast WebSocket: diner_left
   ↓
   Frontend:
   - leaveTable() en tableStore
   - Limpia localStorage
   - Desconecta WebSocket
   - Navega a QRSimulator
```

### 8.2 Flujo: Admin Gestiona Productos

```
┌─────────────────────────────────────────────────────────────────────┐
│ FLUJO: ADMINISTRADOR GESTIONA MENÚ                                  │
└─────────────────────────────────────────────────────────────────────┘

1. LOGIN (si se implementa autenticación para Dashboard)
   → Email/Password o Google OAuth
   → Obtiene JWT con role=admin
   ↓

2. SELECCIONAR SUCURSAL
   Dashboard → Página inicial
   → branchStore.setSelectedBranch(branch_id)
   → localStorage persiste selectedBranchId
   ↓

3. CREAR CATEGORÍA
   Dashboard → /categories
   POST /api/categories
   Body: {
     branch_id: "uuid",
     name: "Comidas",
     icon: "🍔",
     order: 1
   }
   ↓
   Backend:
   - Crea Category
   - Retorna Category
   ↓
   Frontend:
   - categoryStore.addCategory(newCategory)
   - localStorage actualizado
   ↓

4. CREAR SUBCATEGORÍA
   Dashboard → /subcategories
   POST /api/subcategories
   Body: {
     category_id: "uuid",
     name: "Hamburguesas",
     order: 1
   }
   ↓

5. CREAR PRODUCTO
   Dashboard → /products
   POST /api/products
   Body: {
     category_id: "uuid",
     subcategory_id: "uuid",
     name: "Hamburguesa Clásica",
     description: "...",
     price: 5000.00,
     use_branch_prices: false,
     allergen_ids: ["uuid1", "uuid2"],
     image: "https://...",
     featured: true
   }
   ↓
   Backend:
   - Crea Product
   - Crea relaciones en product_allergens
   - Retorna Product con allergens
   ↓
   Frontend:
   - productStore.addProduct(newProduct)
   ↓

6. CONFIGURAR PRECIOS POR SUCURSAL
   Dashboard → /products → Edit → "Usar precios por sucursal"
   PATCH /api/products/{id}
   Body: {
     use_branch_prices: true,
     branch_prices: [
       { branch_id: "branch-1", price: 5500, is_active: true },
       { branch_id: "branch-2", price: 5200, is_active: true },
       { branch_id: "branch-3", price: 0, is_active: false }
     ]
   }
   ↓
   Backend:
   - Actualiza Product.use_branch_prices = true
   - Elimina BranchPrices existentes
   - Crea nuevos BranchPrices
   ↓

7. CREAR PROMOCIÓN
   Dashboard → /promotions
   POST /api/promotions
   Body: {
     promotion_type_id: "uuid",
     name: "Combo Familiar",
     price: 8000.00,
     start_date: "2025-12-27",
     end_date: "2025-12-31",
     start_time: "17:00",
     end_time: "22:00",
     branch_ids: ["branch-1", "branch-2"],
     items: [
       { product_id: "uuid1", quantity: 2 },
       { product_id: "uuid2", quantity: 1 }
     ]
   }
   ↓
   Backend:
   - Crea Promotion
   - Crea relaciones en promotion_branches
   - Crea PromotionItems
   - Retorna Promotion completa
   ↓

8. GESTIONAR MESAS
   Dashboard → /branches/tables
   POST /api/tables
   Body: {
     branch_id: "uuid",
     number: 15,
     capacity: 4,
     sector: "Interior"
   }
   ↓

9. CAMBIAR ESTADO DE MESA
   PATCH /api/tables/{id}
   Body: {
     status: "solicito_pedido",
     order_time: "18:30"
   }
   ↓
   Backend:
   - Actualiza RestaurantTable
   - Valida reglas de transición (preservar order_time si viene de solicito_pedido)
   ↓

10. ARCHIVAR MESA
    POST /api/tables/{id}/archive
    ↓
    Backend:
    - Crea OrderHistory
    - Resetea RestaurantTable a status=libre, times=00:00
```

### 8.3 Flujo: Cascade Delete (Backend)

```python
@app.delete("/api/branches/{id}")
async def delete_branch(id: str, user: User = Depends(get_current_user)):
    """
    Cascade delete siguiendo el orden correcto:
    1. Limpia promociones (remove products/branches)
    2. Elimina productos de categorías de esta sucursal
    3. Elimina subcategorías
    4. Elimina categorías
    5. Elimina mesas
    6. Elimina historial de pedidos
    7. Elimina sucursal
    """

    # 1. Obtener categorías de esta sucursal
    categories = await db.query(Category).filter(Category.branch_id == id).all()
    category_ids = [c.id for c in categories]

    # 2. Obtener productos de esas categorías
    products = await db.query(Product).filter(Product.category_id.in_(category_ids)).all()
    product_ids = [p.id for p in products]

    # 3. Limpiar promociones que usan estos productos
    promotions = await db.query(Promotion).join(PromotionItem).filter(
        PromotionItem.product_id.in_(product_ids)
    ).all()

    for promo in promotions:
        # Eliminar items de productos afectados
        await db.query(PromotionItem).filter(
            PromotionItem.promotion_id == promo.id,
            PromotionItem.product_id.in_(product_ids)
        ).delete()

        # Si la promoción queda sin productos, eliminarla
        remaining_items = await db.query(PromotionItem).filter(
            PromotionItem.promotion_id == promo.id
        ).count()

        if remaining_items == 0:
            await db.delete(promo)

    # 4. Limpiar promociones que incluyen esta sucursal
    await db.query(PromotionBranch).filter(PromotionBranch.branch_id == id).delete()

    # 5. Eliminar productos (cascade eliminará branch_prices, product_allergens)
    await db.query(Product).filter(Product.category_id.in_(category_ids)).delete()

    # 6. Eliminar subcategorías
    await db.query(Subcategory).filter(Subcategory.category_id.in_(category_ids)).delete()

    # 7. Eliminar categorías
    await db.query(Category).filter(Category.branch_id == id).delete()

    # 8. Eliminar mesas
    await db.query(RestaurantTable).filter(RestaurantTable.branch_id == id).delete()

    # 9. Eliminar historial de pedidos
    await db.query(OrderHistory).filter(OrderHistory.branch_id == id).delete()

    # 10. Eliminar sucursal
    branch = await db.get(Branch, id)
    await db.delete(branch)
    await db.commit()

    return {
        "success": True,
        "deletedCounts": {
            "categories": len(categories),
            "products": len(products),
            "promotions": len([p for p in promotions if remaining_items == 0])
        }
    }
```

---

## 9. INTEGRACIONES EXTERNAS

### 9.1 Mercado Pago - Flujo Completo

```python
import mercadopago

# Inicializar SDK
sdk = mercadopago.SDK(MERCADO_PAGO_ACCESS_TOKEN)

@app.post("/api/payments/create-preference")
async def create_preference(request: PaymentRequest):
    """
    Crea preferencia de pago en Mercado Pago
    """

    # Calcular items del pedido
    session = await get_session(request.session_id)
    orders = await get_orders_by_session(request.session_id)

    total = sum(order.total for order in orders)

    # Crear preferencia
    preference_data = {
        "items": [
            {
                "title": f"Pedido Mesa {session.table_number}",
                "quantity": 1,
                "unit_price": float(total),
                "currency_id": "ARS"
            }
        ],
        "payer": {
            "email": request.diner_email or "guest@sabor.com"
        },
        "back_urls": {
            "success": f"{FRONTEND_URL}/payment/success",
            "failure": f"{FRONTEND_URL}/payment/failure",
            "pending": f"{FRONTEND_URL}/payment/pending"
        },
        "auto_return": "approved",
        "external_reference": str(request.session_id),
        "notification_url": f"{BACKEND_URL}/api/payments/webhook",
        "metadata": {
            "session_id": str(request.session_id),
            "diner_id": str(request.diner_id) if request.diner_id else None
        }
    }

    # Llamar a MP
    response = sdk.preference().create(preference_data)
    preference = response["response"]

    # Guardar transacción
    transaction = await create_transaction({
        "session_id": request.session_id,
        "diner_id": request.diner_id,
        "mp_preference_id": preference["id"],
        "amount": total,
        "status": "pending"
    })

    return {
        "preference_id": preference["id"],
        "init_point": preference["init_point"],
        "sandbox_init_point": preference["sandbox_init_point"]
    }

@app.post("/api/payments/webhook")
async def mercadopago_webhook(request: Request):
    """
    Webhook de Mercado Pago para notificaciones de pago
    """

    # Obtener datos
    data = await request.json()

    if data.get("type") == "payment":
        payment_id = data["data"]["id"]

        # Obtener info del pago
        payment_info = sdk.payment().get(payment_id)
        payment = payment_info["response"]

        # Actualizar transacción
        external_reference = payment.get("external_reference")
        session_id = payment["metadata"].get("session_id")

        transaction = await get_transaction_by_mp_payment_id(payment_id)

        if not transaction:
            transaction = await create_transaction({
                "mp_payment_id": payment_id,
                "session_id": session_id,
                "amount": payment["transaction_amount"],
                "status": payment["status"]
            })
        else:
            await update_transaction(transaction.id, {
                "status": payment["status"],
                "payment_method": payment["payment_method_id"]
            })

        # Broadcast via WebSocket
        await manager.broadcast(session_id, {
            "type": "payment_processed",
            "payload": {
                "session_id": session_id,
                "status": payment["status"],
                "amount": payment["transaction_amount"]
            }
        })

        # Si aprobado, cerrar sesión
        if payment["status"] == "approved":
            await close_session(session_id)

    return {"success": True}
```

### 9.2 Google OAuth - Backend Validation

```python
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

@app.post("/api/auth/google")
async def google_auth(request: GoogleAuthRequest):
    """
    Valida token de Google y crea/actualiza usuario
    """

    try:
        # Verificar token
        idinfo = id_token.verify_oauth2_token(
            request.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )

        # Validar issuer
        if idinfo['iss'] not in ['accounts.google.com', 'https://accounts.google.com']:
            raise ValueError('Invalid issuer')

        # Extraer datos
        google_id = idinfo['sub']
        email = idinfo['email']
        name = idinfo.get('name')
        picture = idinfo.get('picture')

        # Buscar o crear usuario
        user = await db.query(User).filter(User.google_id == google_id).first()

        if not user:
            user = User(
                google_id=google_id,
                email=email,
                name=name,
                picture_url=picture,
                role=UserRole.CUSTOMER
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Actualizar info
            user.email = email
            user.name = name
            user.picture_url = picture
            await db.commit()

        # Generar tokens propios
        access_token = create_access_token(str(user.id))
        refresh_token = create_refresh_token(str(user.id))

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "picture_url": user.picture_url
            }
        }

    except ValueError as e:
        raise HTTPException(401, f"Invalid token: {str(e)}")
```

---

## 10. SEGURIDAD Y VALIDACIONES

### 10.1 Validaciones de Entrada (Pydantic)

```python
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, time

class ProductCreateDTO(BaseModel):
    category_id: str
    subcategory_id: Optional[str] = None
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    price: float = Field(..., gt=0, le=9999999)
    use_branch_prices: bool = False
    image: Optional[str] = Field(None, max_length=500)
    allergen_ids: List[str] = []
    featured: bool = False
    popular: bool = False
    badge: Optional[str] = Field(None, max_length=50)
    stock: Optional[int] = Field(None, ge=0)

    @validator('image')
    def validate_image_url(cls, v):
        if v and not (v.startswith('http://') or v.startswith('https://')):
            raise ValueError('Image URL must start with http:// or https://')
        if v and ('javascript:' in v.lower() or 'data:' in v.lower()):
            raise ValueError('Invalid image URL protocol')
        return v

    @validator('price')
    def validate_price(cls, v):
        if not (0 < v <= 9999999):
            raise ValueError('Price must be between 0 and 9999999')
        return round(v, 2)

class PromotionCreateDTO(BaseModel):
    promotion_type_id: str
    name: str = Field(..., min_length=2, max_length=100)
    price: float = Field(..., gt=0)
    start_date: date
    end_date: date
    start_time: time = Field(default=time(0, 0))
    end_time: time = Field(default=time(23, 59))
    branch_ids: List[str] = Field(..., min_items=1)
    items: List[PromotionItemDTO] = Field(..., min_items=1)

    @validator('end_date')
    def validate_dates(cls, v, values):
        if 'start_date' in values and v < values['start_date']:
            raise ValueError('end_date must be >= start_date')
        return v

    @validator('end_time')
    def validate_times(cls, v, values):
        if 'start_date' in values and 'end_date' in values:
            if values['start_date'] == values['end_date']:
                if 'start_time' in values and v <= values['start_time']:
                    raise ValueError('end_time must be > start_time on same day')
        return v
```

### 10.2 Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Aplicar a endpoints críticos
@app.post("/api/sessions/join")
@limiter.limit("10/minute")
async def join_table(request: Request, data: JoinTableRequest):
    pass

@app.post("/api/payments/create-preference")
@limiter.limit("5/minute")
async def create_preference(request: Request, data: PaymentRequest):
    pass
```

### 10.3 CORS Configuration

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5176",  # pwaMenu dev
        "http://localhost:5177",  # Dashboard dev
        "https://sabor.com",      # pwaMenu prod
        "https://admin.sabor.com" # Dashboard prod
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 10.4 SQL Injection Prevention

```python
# ✓ CORRECTO: Usar ORM
products = await db.query(Product).filter(Product.name.like(f"%{search}%")).all()

# ✓ CORRECTO: Parameterized queries
result = await db.execute(
    text("SELECT * FROM products WHERE name LIKE :search"),
    {"search": f"%{search}%"}
)

# ✗ INCORRECTO: String concatenation
result = await db.execute(f"SELECT * FROM products WHERE name LIKE '%{search}%'")
```

### 10.5 Validación de Sesiones

```python
async def validate_session_access(session_id: str, user_id: str):
    """
    Valida que el usuario tiene acceso a la sesión
    """
    diner = await db.query(SessionDiner).filter(
        SessionDiner.session_id == session_id,
        SessionDiner.user_id == user_id
    ).first()

    if not diner:
        raise HTTPException(403, "Access denied to this session")

    session = await db.get(TableSession, session_id)

    if session.status == "closed":
        raise HTTPException(410, "Session is closed")

    if session.expires_at < datetime.utcnow():
        raise HTTPException(410, "Session expired")

    return session
```

---

## 11. ESCALABILIDAD Y PERFORMANCE

### 11.1 Cacheo con Redis

```python
import redis.asyncio as redis

redis_client = redis.from_url("redis://localhost:6379")

# Cache de productos (actualización frecuente)
async def get_products_by_category(category_id: str):
    cache_key = f"products:category:{category_id}"

    # Intentar cache
    cached = await redis_client.get(cache_key)
    if cached:
        return json.loads(cached)

    # Query DB
    products = await db.query(Product).filter(
        Product.category_id == category_id,
        Product.is_active == True
    ).all()

    # Guardar en cache (10 minutos)
    await redis_client.setex(
        cache_key,
        600,
        json.dumps([p.dict() for p in products])
    )

    return products

# Invalidar cache al actualizar producto
async def update_product(product_id: str, data: ProductUpdateDTO):
    product = await db.get(Product, product_id)
    # ... update product

    # Invalidar cache
    await redis_client.delete(f"products:category:{product.category_id}")
```

### 11.2 Paginación

```python
from fastapi import Query

@app.get("/api/products")
async def list_products(
    category_id: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100)
):
    query = db.query(Product)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    # Total count
    total = await query.count()

    # Paginated results
    offset = (page - 1) * page_size
    products = await query.offset(offset).limit(page_size).all()

    return {
        "items": products,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }
```

### 11.3 Índices de Base de Datos

```sql
-- Índices críticos para performance

-- Búsqueda de productos por sucursal
CREATE INDEX idx_products_category_active ON products(category_id, is_active);
CREATE INDEX idx_categories_branch_active ON categories(branch_id, is_active);

-- Búsqueda de texto
CREATE INDEX idx_products_name_gin ON products USING gin(to_tsvector('spanish', name));

-- Sesiones activas
CREATE INDEX idx_sessions_status_expires ON table_sessions(status, expires_at) WHERE status = 'active';

-- Cart items por sesión
CREATE INDEX idx_cart_items_session ON session_cart_items(session_id);

-- Pedidos por sesión
CREATE INDEX idx_orders_session_round ON order_commands(session_id, round_number);

-- Transacciones de pago
CREATE INDEX idx_payments_session_status ON payment_transactions(session_id, status);
```

### 11.4 Connection Pooling

```python
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# Engine con pool
engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

# Dependency para endpoints
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
```

---

## 12. MIGRACIÓN DE DATOS MOCK A BACKEND

### 12.1 Datos Mock Actuales

**Dashboard:**
```typescript
- 1 Restaurant (restaurant-1)
- 4 Branches (branch-1 a branch-4)
- 45 Tables (15+12+10+8 por sucursal)
- 12 Allergens predefinidos
- 4 Promotion Types predefinidos
- Múltiples Categories, Subcategories, Products por sucursal
```

**pwaMenu:**
```typescript
- Mock Restaurant data (from API call)
- Mock TableSession (localStorage, 8h expiry)
- Mock OrderRecords (array en tableStore)
- Mock Google Auth (MOCK_MODE enabled in dev)
```

### 12.2 Script de Migración (Seed Database)

```python
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

async def seed_database(db: AsyncSession):
    """
    Seed inicial de datos
    """

    # 1. Restaurant
    restaurant = Restaurant(
        id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
        name="Sabor",
        slug="sabor",
        description="Restaurante multi-sucursal",
        theme_color="#f97316",
        email="contact@sabor.com"
    )
    db.add(restaurant)

    # 2. Branches
    branches = [
        Branch(
            id=uuid.UUID(f"00000000-0000-0000-0000-00000000000{i}"),
            restaurant_id=restaurant.id,
            name=f"Sucursal {i}",
            address=f"Dirección {i}",
            order=i,
            opening_time="10:00",
            closing_time="23:00"
        )
        for i in range(1, 5)
    ]
    db.add_all(branches)

    # 3. Allergens
    allergens_data = [
        ("Gluten", "🌾"), ("Lacteos", "🥛"), ("Huevos", "🥚"),
        ("Pescado", "🐟"), ("Mariscos", "🦐"), ("Frutos Secos", "🥜"),
        ("Soja", "🫘"), ("Apio", "🥬"), ("Mostaza", "🟡"),
        ("Sesamo", "⚪"), ("Sulfitos", "🍷"), ("Altramuces", "🌱")
    ]
    allergens = [
        Allergen(name=name, icon=icon)
        for name, icon in allergens_data
    ]
    db.add_all(allergens)

    # 4. Promotion Types
    promo_types = [
        PromotionType(name="Happy Hour", icon="🍺"),
        PromotionType(name="Combo Familiar", icon="👨‍👩‍👧‍👦"),
        PromotionType(name="2x1", icon="🎉"),
        PromotionType(name="Descuento", icon="💰")
    ]
    db.add_all(promo_types)

    await db.commit()

    # 5. Categories, Subcategories, Products
    # (Similar structure for each branch)

    print("✅ Database seeded successfully")

# Ejecutar
if __name__ == "__main__":
    asyncio.run(seed_database(AsyncSessionLocal()))
```

### 12.3 Migración Frontend → Backend

```typescript
// Antes (Mock)
const products = useProductStore(selectProducts)

// Después (Backend)
const { data: products, isLoading } = useQuery({
  queryKey: ['products', categoryId],
  queryFn: () => api.get(`/products?category_id=${categoryId}`)
})

// Adapter para mantener compatibilidad
function adaptProductFromAPI(apiProduct: APIProduct): Product {
  return {
    id: apiProduct.id,
    name: apiProduct.name,
    price: apiProduct.price,
    allergen_ids: apiProduct.allergens.map(a => a.id),
    // ... resto de campos
  }
}
```

---

## RESUMEN PARA IMPLEMENTACIÓN DE BACKEND

### Prioridades de Desarrollo

```
FASE 1: API REST BÁSICA (2-3 semanas)
├── Setup FastAPI + PostgreSQL + Alembic
├── Modelos SQLAlchemy (ver sección 3)
├── Endpoints CRUD básicos (restaurants, branches, categories, products)
├── Autenticación JWT básica
└── Testing con pytest

FASE 2: pwaMenu BACKEND (2-3 semanas)
├── Table Sessions endpoints
├── Cart operations (add/update/delete)
├── Order submission
├── Google OAuth integration
└── Mercado Pago integration

FASE 3: WEBSOCKETS (1-2 semanas)
├── WebSocket server setup
├── Connection manager
├── Cart sync broadcast
├── Payment notifications
└── Testing real-time sync

FASE 4: PERFORMANCE Y SEGURIDAD (1-2 semanas)
├── Redis caching
├── Rate limiting
├── SQL injection prevention
├── Load testing
└── Deploy to production

FASE 5: FEATURES AVANZADAS (Opcional)
├── Módulo de Mozos
├── Módulo de Cocina
├── Estadísticas y reportes
└── Notificaciones push
```

### Endpoints Mínimos Viables (MVP)

```
✅ Críticos para pwaMenu:
POST   /api/sessions/join
POST   /api/sessions/{id}/cart
PATCH  /api/sessions/{id}/cart/{item_id}
DELETE /api/sessions/{id}/cart/{item_id}
POST   /api/sessions/{id}/orders
POST   /api/payments/create-preference
POST   /api/payments/webhook
WS     /ws/session/{session_id}

✅ Críticos para Dashboard:
GET/POST/PATCH/DELETE /api/branches
GET/POST/PATCH/DELETE /api/categories
GET/POST/PATCH/DELETE /api/products
GET/POST/PATCH/DELETE /api/promotions
GET/POST/PATCH/DELETE /api/tables
```

### Tecnologías Recomendadas

```python
# requirements.txt
fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
alembic==1.12.1
asyncpg==0.29.0
pydantic==2.5.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.6
mercadopago==2.2.1
google-auth==2.24.0
redis==5.0.1
slowapi==0.1.9
pytest==7.4.3
httpx==0.25.1
```

---

**FIN DE DOCUMENTO**

Este documento proporciona toda la información necesaria para implementar el backend completo del sistema SaaS de gestión de restaurantes multi-sucursal "Sabor".
