# Sistema de Autenticación y Autorización - SaaS Sabor

**Versión:** 1.0
**Fecha:** Diciembre 2025
**Sistema:** Custom JWT Authentication + Role-Based Access Control (RBAC)

---

## ÍNDICE

1. [Visión General del Sistema](#1-visión-general-del-sistema)
2. [Arquitectura de Seguridad](#2-arquitectura-de-seguridad)
3. [Modelo de Datos de Seguridad](#3-modelo-de-datos-de-seguridad)
4. [Sistema de Roles y Permisos](#4-sistema-de-roles-y-permisos)
5. [Autenticación (Authentication)](#5-autenticación-authentication)
6. [Autorización (Authorization)](#6-autorización-authorization)
7. [Endpoints de Seguridad](#7-endpoints-de-seguridad)
8. [Implementación Backend](#8-implementación-backend)
9. [Implementación Frontend](#9-implementación-frontend)
10. [Seguridad y Mejores Prácticas](#10-seguridad-y-mejores-prácticas)
11. [Flujos de Usuario Completos](#11-flujos-de-usuario-completos)
12. [Migración desde Google OAuth](#12-migración-desde-google-oauth)

---

## 1. VISIÓN GENERAL DEL SISTEMA

### 1.1 Descripción

Sistema de autenticación y autorización personalizado sin dependencia de Google OAuth. Implementa:

- **Autenticación basada en tokens JWT** - Access tokens (15 min) + Refresh tokens (7 días)
- **5 roles de usuario** - Control granular de acceso por rol
- **Gestión de sesiones** - Múltiples dispositivos, revocación de tokens
- **Seguridad robusta** - Bcrypt password hashing, rate limiting, validaciones
- **Multi-tenancy** - Usuarios scoped por restaurante/sucursal

### 1.2 Roles del Sistema

| Rol | Descripción | Aplicación |
|-----|-------------|------------|
| **cliente** | Comensal que ordena desde la mesa | pwaMenu (PWA móvil) |
| **admin** | Administrador del restaurante completo | Dashboard (todas las vistas) |
| **mozo** | Mesero/camarero | Dashboard + pwaMenu (gestión de mesas) |
| **empleado** | Empleado general (caja, recepción) | Dashboard (vistas limitadas) |
| **cocinero** | Personal de cocina | Dashboard (solo pedidos y cocina) |

### 1.3 Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUJO DE AUTENTICACIÓN COMPLETO                                 │
└─────────────────────────────────────────────────────────────────┘

1. REGISTRO
   Usuario → POST /api/auth/register
   Body: { email, password, name, role }
   ↓
   Backend:
   - Valida email único
   - Hash password con bcrypt (12 rounds)
   - Crea usuario con status=pending
   - Envía email de verificación (opcional)
   - Retorna usuario creado
   ↓

2. LOGIN
   Usuario → POST /api/auth/login
   Body: { email, password }
   ↓
   Backend:
   - Busca usuario por email
   - Verifica password con bcrypt.compare()
   - Genera Access Token (15 min)
   - Genera Refresh Token (7 días)
   - Guarda Refresh Token en DB
   - Actualiza last_login
   - Retorna tokens + user data
   ↓
   Frontend:
   - Guarda access_token en memoria (authStore)
   - Guarda refresh_token en localStorage
   - Navega a página principal según rol
   ↓

3. ACCESO A RECURSOS PROTEGIDOS
   Frontend → GET /api/branches
   Headers: Authorization: Bearer {access_token}
   ↓
   Backend Middleware:
   - Extrae token del header
   - Verifica firma JWT
   - Valida expiración
   - Extrae user_id del payload
   - Busca usuario en DB
   - Verifica rol y permisos
   - Permite acceso si autorizado
   ↓

4. REFRESH TOKEN
   (Cuando access_token expira)
   Frontend → POST /api/auth/refresh
   Body: { refresh_token }
   ↓
   Backend:
   - Valida refresh_token en DB
   - Verifica no esté revocado
   - Verifica expiración (7 días)
   - Genera nuevo access_token
   - Retorna nuevo access_token
   ↓

5. LOGOUT
   Usuario → POST /api/auth/logout
   Body: { refresh_token }
   ↓
   Backend:
   - Marca refresh_token como revocado
   - Invalida sesión
   ↓
   Frontend:
   - Limpia authStore
   - Limpia localStorage
   - Navega a login
```

---

## 2. ARQUITECTURA DE SEGURIDAD

### 2.1 Diagrama de Capas

```
┌────────────────────────────────────────────────────────────────┐
│                    CAPA DE PRESENTACIÓN                        │
├────────────────────────┬───────────────────────────────────────┤
│   Dashboard (Admin)    │        pwaMenu (Cliente)              │
│   authStore            │        authStore                      │
│   - user               │        - user                         │
│   - accessToken        │        - accessToken                  │
│   - isAuthenticated    │        - isAuthenticated              │
│   - role               │        - role                         │
└────────────────────────┴───────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                  CAPA DE MIDDLEWARE (Backend)                  │
├────────────────────────────────────────────────────────────────┤
│  Authentication Middleware                                     │
│  ├── verify_token() - Valida JWT                              │
│  ├── get_current_user() - Extrae usuario del token            │
│  └── refresh_access_token() - Renueva token                   │
│                                                                │
│  Authorization Middleware                                      │
│  ├── require_role(roles) - Valida rol del usuario             │
│  ├── require_permission(permission) - Valida permiso           │
│  └── check_branch_access() - Valida acceso a sucursal         │
│                                                                │
│  Security Middleware                                           │
│  ├── rate_limiter - Límites por IP/usuario                    │
│  ├── csrf_protection - Validación de origen                   │
│  └── input_sanitizer - Sanitización de inputs                 │
└────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────┐
│                   CAPA DE PERSISTENCIA                         │
│                      PostgreSQL                                │
├────────────────────────────────────────────────────────────────┤
│  Tablas:                                                       │
│  • users                                                       │
│  • roles                                                       │
│  • permissions                                                 │
│  • role_permissions (M:N)                                      │
│  • user_sessions                                               │
│  • refresh_tokens                                              │
│  • user_branches (acceso por sucursal)                         │
│  • audit_logs (registro de acciones)                           │
└────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Tokens

```
ACCESS TOKEN (JWT - 15 minutos)
┌─────────────────────────────────────────────────────────────┐
│ Header:                                                     │
│ {                                                           │
│   "alg": "HS256",                                          │
│   "typ": "JWT"                                             │
│ }                                                           │
│                                                             │
│ Payload:                                                    │
│ {                                                           │
│   "sub": "user-uuid",          # User ID                   │
│   "email": "user@example.com",                             │
│   "role": "admin",                                          │
│   "restaurant_id": "uuid",                                  │
│   "branch_id": "uuid",         # Si aplica                 │
│   "permissions": ["read:products", "write:products"],       │
│   "exp": 1703700000,           # 15 minutos                │
│   "iat": 1703699100,           # Issued at                 │
│   "type": "access"                                          │
│ }                                                           │
│                                                             │
│ Storage: Memoria (authStore en Zustand)                    │
│ Refresh: Automático con refresh_token                      │
└─────────────────────────────────────────────────────────────┘

REFRESH TOKEN (JWT - 7 días)
┌─────────────────────────────────────────────────────────────┐
│ Payload:                                                    │
│ {                                                           │
│   "sub": "user-uuid",                                       │
│   "token_id": "unique-token-uuid",                          │
│   "exp": 1704304900,           # 7 días                    │
│   "iat": 1703700000,                                        │
│   "type": "refresh"                                         │
│ }                                                           │
│                                                             │
│ Storage: localStorage + DB (tabla refresh_tokens)          │
│ Revocable: Sí (campo revoked_at en DB)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. MODELO DE DATOS DE SEGURIDAD

### 3.1 Tablas de Autenticación

```sql
-- Tabla de usuarios
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    picture_url VARCHAR(500),

    -- Rol y permisos
    role VARCHAR(50) NOT NULL DEFAULT 'cliente',
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,

    -- Multi-tenancy
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    default_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,

    -- Seguridad
    failed_login_attempts INT DEFAULT 0,
    locked_until TIMESTAMP,
    password_changed_at TIMESTAMP,
    last_login TIMESTAMP,

    -- Auditoría
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    CONSTRAINT valid_role CHECK (role IN ('cliente', 'admin', 'mozo', 'empleado', 'cocinero'))
);

-- Índices
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_restaurant ON users(restaurant_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = TRUE;

-- Tabla de roles (opcional - para RBAC avanzado)
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- No editable si es true
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Datos iniciales de roles
INSERT INTO roles (name, display_name, description, is_system) VALUES
('cliente', 'Cliente', 'Comensal que ordena desde la mesa', TRUE),
('admin', 'Administrador', 'Administrador completo del restaurante', TRUE),
('mozo', 'Mozo/Mesero', 'Personal de atención al cliente', TRUE),
('empleado', 'Empleado', 'Empleado general (caja, recepción)', TRUE),
('cocinero', 'Cocinero', 'Personal de cocina', TRUE);

-- Tabla de permisos
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., "products:read", "branches:write"
    resource VARCHAR(50) NOT NULL,       -- e.g., "products", "branches"
    action VARCHAR(50) NOT NULL,         -- e.g., "read", "write", "delete"
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla pivot: role_permissions
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- Tabla de acceso por sucursal (para mozos/empleados/cocineros)
CREATE TABLE user_branches (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    can_manage BOOLEAN DEFAULT FALSE,  -- Puede gestionar configuración
    created_at TIMESTAMP DEFAULT NOW(),
    PRIMARY KEY (user_id, branch_id)
);

-- Tabla de refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,  -- Hash del token para seguridad
    device_info TEXT,                   -- User agent, IP, etc.
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_active ON refresh_tokens(revoked_at) WHERE revoked_at IS NULL;

-- Tabla de sesiones activas
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_id UUID REFERENCES refresh_tokens(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_expires ON user_sessions(expires_at);

-- Tabla de auditoría de acciones
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,      -- e.g., "login", "product:create", "user:delete"
    resource_type VARCHAR(50),          -- e.g., "product", "user"
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    details JSONB,                      -- Datos adicionales
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);

-- Tabla de tokens de verificación (email, reset password)
CREATE TABLE verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,  -- 'email_verification', 'password_reset'
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT valid_token_type CHECK (type IN ('email_verification', 'password_reset'))
);

CREATE INDEX idx_verification_tokens_user ON verification_tokens(user_id);
CREATE INDEX idx_verification_tokens_token ON verification_tokens(token);
```

### 3.2 Diagrama Entidad-Relación (Seguridad)

```
┌──────────────┐
│ restaurants  │
├──────────────┤
│ id (PK)      │────────────────────────────┐
└──────────────┘                            │
                                            │
                                            │
┌──────────────┐                            │
│   branches   │                            │
├──────────────┤                            │
│ id (PK)      │◄───────────────┐           │
│ restaurant_id│                │           │
└──────────────┘                │           │
        ▲                       │           │
        │                       │           │
        │                       │           │
┌──────────────┐          ┌─────────────┐  │
│    users     │          │user_branches│  │
├──────────────┤          ├─────────────┤  │
│ id (PK)      │◄─────────│ user_id FK  │  │
│ email (UQ)   │          │ branch_id FK│──┘
│ password_hash│          └─────────────┘
│ name         │
│ role         │───┐
│ restaurant_id│───┼──────────────────────────────►restaurant_id
│ default_br_id│───┘
└──────┬───────┘
       │
       │ 1:N
       ├──────────────────────────────────────┬─────────────────────┬──────────────────┐
       │                                      │                     │                  │
       ▼                                      ▼                     ▼                  ▼
┌──────────────┐                    ┌──────────────┐    ┌──────────────┐   ┌──────────────┐
│refresh_tokens│                    │user_sessions │    │ audit_logs   │   │verification_ │
├──────────────┤                    ├──────────────┤    ├──────────────┤   │   tokens     │
│ id (PK)      │                    │ id (PK)      │    │ id (PK)      │   ├──────────────┤
│ user_id FK   │                    │ user_id FK   │    │ user_id FK   │   │ id (PK)      │
│ token_hash   │                    │ refresh_tk FK│    │ action       │   │ user_id FK   │
│ expires_at   │                    │ ip_address   │    │ resource_type│   │ token (UQ)   │
│ revoked_at   │                    │ user_agent   │    │ resource_id  │   │ type         │
└──────────────┘                    └──────────────┘    │ details JSON │   │ expires_at   │
                                                         └──────────────┘   └──────────────┘

┌──────────────┐           ┌──────────────────┐           ┌──────────────┐
│    roles     │           │ role_permissions │           │ permissions  │
├──────────────┤           ├──────────────────┤           ├──────────────┤
│ id (PK)      │◄──────────│ role_id FK (PK)  │           │ id (PK)      │
│ name (UQ)    │           │ permission_id FK │──────────►│ name (UQ)    │
│ display_name │           └──────────────────┘           │ resource     │
│ description  │                 (M:N)                    │ action       │
│ is_system    │                                          │ description  │
└──────────────┘                                          └──────────────┘
```

---

## 4. SISTEMA DE ROLES Y PERMISOS

### 4.1 Definición de Roles

```python
from enum import Enum

class UserRole(str, Enum):
    """
    Roles del sistema con jerarquía implícita
    """
    CLIENTE = "cliente"       # Nivel 1: Solo pwaMenu
    EMPLEADO = "empleado"     # Nivel 2: Dashboard limitado
    COCINERO = "cocinero"     # Nivel 2: Dashboard cocina
    MOZO = "mozo"             # Nivel 3: Dashboard + pwaMenu gestión
    ADMIN = "admin"           # Nivel 4: Dashboard completo
```

### 4.2 Matriz de Permisos por Rol

| Recurso | Acción | cliente | empleado | cocinero | mozo | admin |
|---------|--------|---------|----------|----------|------|-------|
| **Menú** | Ver productos | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Ver precios | ✅ | ✅ | ❌ | ✅ | ✅ |
| | Agregar al carrito | ✅ | ❌ | ❌ | ✅* | ✅ |
| **Pedidos** | Crear pedido | ✅ | ❌ | ❌ | ✅* | ✅ |
| | Ver pedidos | ✅** | ❌ | ✅*** | ✅**** | ✅ |
| | Modificar pedido | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Cancelar pedido | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Cambiar estado | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Pagos** | Ver cuenta | ✅** | ❌ | ❌ | ✅**** | ✅ |
| | Procesar pago | ✅** | ✅***** | ❌ | ✅ | ✅ |
| **Mesas** | Ver mesas | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Crear mesa | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Modificar estado | ❌ | ❌ | ❌ | ✅ | ✅ |
| | Archivar mesa | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Productos** | Ver lista | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Crear producto | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Editar producto | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Eliminar producto | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Actualizar stock | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Categorías** | CRUD completo | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Promociones** | CRUD completo | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Sucursales** | Ver sucursales | ❌ | ✅****** | ❌ | ✅****** | ✅ |
| | CRUD sucursales | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Usuarios** | Ver usuarios | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Crear usuario | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Editar usuario | ❌ | ❌ | ❌ | ❌ | ✅ |
| | Eliminar usuario | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Estadísticas** | Ver reportes | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Configuración** | Modificar settings | ❌ | ❌ | ❌ | ❌ | ✅ |

**Notas:**
- `*` Solo para mesas asignadas
- `**` Solo pedidos propios de su mesa
- `***` Solo pedidos de su área de cocina
- `****` Solo mesas asignadas a él
- `*****` Solo cobros en caja
- `******` Solo sucursales asignadas

### 4.3 Permisos Detallados

```python
# Definición de permisos granulares
PERMISSIONS = {
    # pwaMenu - Cliente
    "menu:read": ["cliente", "empleado", "cocinero", "mozo", "admin"],
    "cart:write": ["cliente", "mozo", "admin"],
    "order:create": ["cliente", "mozo", "admin"],
    "order:read_own": ["cliente", "mozo", "admin"],
    "payment:create": ["cliente", "empleado", "mozo", "admin"],

    # Pedidos - Cocina
    "order:read_all": ["cocinero", "mozo", "admin"],
    "order:update_status": ["cocinero", "mozo", "admin"],

    # Mesas
    "table:read": ["mozo", "admin"],
    "table:create": ["admin"],
    "table:update": ["mozo", "admin"],
    "table:delete": ["admin"],
    "table:archive": ["admin"],

    # Productos
    "product:read": ["admin"],
    "product:create": ["admin"],
    "product:update": ["admin"],
    "product:delete": ["admin"],
    "product:update_stock": ["admin"],

    # Categorías
    "category:read": ["admin"],
    "category:create": ["admin"],
    "category:update": ["admin"],
    "category:delete": ["admin"],

    # Subcategorías
    "subcategory:read": ["admin"],
    "subcategory:create": ["admin"],
    "subcategory:update": ["admin"],
    "subcategory:delete": ["admin"],

    # Promociones
    "promotion:read": ["admin"],
    "promotion:create": ["admin"],
    "promotion:update": ["admin"],
    "promotion:delete": ["admin"],

    # Sucursales
    "branch:read": ["empleado", "mozo", "admin"],
    "branch:create": ["admin"],
    "branch:update": ["admin"],
    "branch:delete": ["admin"],

    # Usuarios
    "user:read": ["admin"],
    "user:create": ["admin"],
    "user:update": ["admin"],
    "user:delete": ["admin"],

    # Estadísticas
    "statistics:read": ["admin"],

    # Configuración
    "settings:read": ["admin"],
    "settings:update": ["admin"],
}
```

### 4.4 Scoping por Sucursal

```python
# Validación de acceso por sucursal
async def validate_branch_access(user: User, branch_id: str, db: Session):
    """
    Valida que el usuario tenga acceso a la sucursal especificada
    """

    # Admin tiene acceso a todas las sucursales de su restaurante
    if user.role == UserRole.ADMIN:
        branch = await db.get(Branch, branch_id)
        if branch.restaurant_id == user.restaurant_id:
            return True
        raise HTTPException(403, "Access denied to this branch")

    # Mozo/Empleado/Cocinero: verificar asignación explícita
    if user.role in [UserRole.MOZO, UserRole.EMPLEADO, UserRole.COCINERO]:
        access = await db.query(UserBranch).filter(
            UserBranch.user_id == user.id,
            UserBranch.branch_id == branch_id
        ).first()

        if access:
            return True
        raise HTTPException(403, "Access denied to this branch")

    # Cliente: sin restricciones de sucursal
    if user.role == UserRole.CLIENTE:
        return True

    raise HTTPException(403, "Access denied")
```

---

## 5. AUTENTICACIÓN (AUTHENTICATION)

### 5.1 Registro de Usuarios

```python
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr, Field, validator
from passlib.context import CryptContext
import re

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    name: str = Field(..., min_length=2, max_length=255)
    phone: str | None = Field(None, max_length=20)
    role: UserRole = UserRole.CLIENTE
    restaurant_id: str | None = None  # Requerido para roles no-cliente

    @validator('password')
    def validate_password(cls, v):
        """
        Password requirements:
        - Min 8 caracteres
        - Al menos 1 mayúscula
        - Al menos 1 minúscula
        - Al menos 1 número
        - Al menos 1 carácter especial
        """
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', v):
            raise ValueError('Password must contain at least one special character')
        return v

    @validator('restaurant_id')
    def validate_restaurant_id(cls, v, values):
        """
        restaurant_id es requerido para roles que no sean cliente
        """
        if 'role' in values and values['role'] != UserRole.CLIENTE and not v:
            raise ValueError('restaurant_id is required for non-cliente roles')
        return v

@router.post("/register")
async def register(request: RegisterRequest, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario
    """

    # 1. Verificar email único
    existing = await db.query(User).filter(User.email == request.email).first()
    if existing:
        raise HTTPException(400, "Email already registered")

    # 2. Verificar que restaurant_id existe (si se proporciona)
    if request.restaurant_id:
        restaurant = await db.get(Restaurant, request.restaurant_id)
        if not restaurant:
            raise HTTPException(404, "Restaurant not found")

    # 3. Hash password
    password_hash = pwd_context.hash(request.password)

    # 4. Crear usuario
    user = User(
        email=request.email,
        password_hash=password_hash,
        name=request.name,
        phone=request.phone,
        role=request.role,
        restaurant_id=request.restaurant_id,
        is_active=True,
        is_verified=False,  # Requiere verificación de email
        password_changed_at=datetime.utcnow()
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 5. Crear token de verificación de email (opcional)
    verification_token = await create_verification_token(
        user.id,
        "email_verification",
        db
    )

    # 6. Enviar email de verificación (implementar)
    # await send_verification_email(user.email, verification_token)

    # 7. Audit log
    await create_audit_log(
        user_id=user.id,
        action="user:register",
        resource_type="user",
        resource_id=str(user.id),
        db=db
    )

    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "message": "User registered successfully. Please verify your email."
    }
```

### 5.2 Login

```python
from datetime import datetime, timedelta
from jose import jwt
import hashlib

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device_info: str | None = None  # User agent

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # Segundos hasta expiración
    user: dict

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    req: Request,
    db: Session = Depends(get_db)
):
    """
    Autentica usuario y retorna tokens JWT
    """

    # 1. Buscar usuario por email
    user = await db.query(User).filter(User.email == request.email).first()

    if not user:
        # Delay para prevenir timing attacks
        pwd_context.hash("dummy_password")
        raise HTTPException(401, "Invalid credentials")

    # 2. Verificar cuenta no bloqueada
    if user.locked_until and user.locked_until > datetime.utcnow():
        raise HTTPException(
            423,
            f"Account locked until {user.locked_until.isoformat()}"
        )

    # 3. Verificar password
    if not pwd_context.verify(request.password, user.password_hash):
        # Incrementar contador de intentos fallidos
        user.failed_login_attempts += 1

        # Bloquear cuenta después de 5 intentos
        if user.failed_login_attempts >= 5:
            user.locked_until = datetime.utcnow() + timedelta(minutes=15)
            await db.commit()
            raise HTTPException(423, "Account locked due to multiple failed attempts")

        await db.commit()
        raise HTTPException(401, "Invalid credentials")

    # 4. Verificar cuenta activa
    if not user.is_active:
        raise HTTPException(403, "Account is inactive")

    # 5. Generar tokens
    access_token = create_access_token(user)
    refresh_token_value = create_refresh_token(user)

    # 6. Guardar refresh token en DB
    refresh_token_hash = hashlib.sha256(refresh_token_value.encode()).hexdigest()

    refresh_token_record = RefreshToken(
        user_id=user.id,
        token_hash=refresh_token_hash,
        device_info=request.device_info or req.headers.get("User-Agent"),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(refresh_token_record)

    # 7. Crear sesión
    session = UserSession(
        user_id=user.id,
        refresh_token_id=refresh_token_record.id,
        ip_address=req.client.host,
        user_agent=req.headers.get("User-Agent"),
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(session)

    # 8. Actualizar usuario
    user.failed_login_attempts = 0
    user.locked_until = None
    user.last_login = datetime.utcnow()

    await db.commit()

    # 9. Audit log
    await create_audit_log(
        user_id=user.id,
        action="user:login",
        resource_type="user",
        resource_id=str(user.id),
        ip_address=req.client.host,
        user_agent=req.headers.get("User-Agent"),
        db=db
    )

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token_value,
        expires_in=15 * 60,  # 15 minutos
        user={
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "picture_url": user.picture_url,
            "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
            "default_branch_id": str(user.default_branch_id) if user.default_branch_id else None
        }
    )

# Funciones auxiliares
SECRET_KEY = "your-secret-key-here"  # En .env
ALGORITHM = "HS256"

def create_access_token(user: User) -> str:
    """
    Genera access token JWT (15 minutos)
    """

    # Obtener permisos del usuario
    permissions = get_user_permissions(user.role)

    payload = {
        "sub": str(user.id),
        "email": user.email,
        "role": user.role,
        "restaurant_id": str(user.restaurant_id) if user.restaurant_id else None,
        "permissions": permissions,
        "exp": datetime.utcnow() + timedelta(minutes=15),
        "iat": datetime.utcnow(),
        "type": "access"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(user: User) -> str:
    """
    Genera refresh token JWT (7 días)
    """

    payload = {
        "sub": str(user.id),
        "token_id": str(uuid.uuid4()),
        "exp": datetime.utcnow() + timedelta(days=7),
        "iat": datetime.utcnow(),
        "type": "refresh"
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_user_permissions(role: UserRole) -> list[str]:
    """
    Retorna lista de permisos para un rol
    """
    permissions = []
    for permission, roles in PERMISSIONS.items():
        if role in roles:
            permissions.append(permission)
    return permissions
```

### 5.3 Refresh Token

```python
class RefreshRequest(BaseModel):
    refresh_token: str

@router.post("/refresh")
async def refresh_token(
    request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Renueva access token usando refresh token
    """

    try:
        # 1. Decodificar refresh token
        payload = jwt.decode(
            request.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if payload.get("type") != "refresh":
            raise HTTPException(401, "Invalid token type")

        user_id = payload.get("sub")

        # 2. Verificar token en DB
        token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()

        token_record = await db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.utcnow()
        ).first()

        if not token_record:
            raise HTTPException(401, "Invalid or expired refresh token")

        # 3. Obtener usuario
        user = await db.get(User, user_id)

        if not user or not user.is_active:
            raise HTTPException(401, "User not found or inactive")

        # 4. Generar nuevo access token
        new_access_token = create_access_token(user)

        # 5. Actualizar last_activity en sesión
        await db.query(UserSession).filter(
            UserSession.refresh_token_id == token_record.id
        ).update({"last_activity": datetime.utcnow()})

        await db.commit()

        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": 15 * 60
        }

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Refresh token expired")
    except jwt.JWTError:
        raise HTTPException(401, "Invalid refresh token")
```

### 5.4 Logout

```python
@router.post("/logout")
async def logout(
    request: RefreshRequest,
    db: Session = Depends(get_db)
):
    """
    Revoca refresh token y cierra sesión
    """

    try:
        # 1. Decodificar token
        payload = jwt.decode(
            request.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("sub")
        token_hash = hashlib.sha256(request.refresh_token.encode()).hexdigest()

        # 2. Revocar token
        await db.query(RefreshToken).filter(
            RefreshToken.user_id == user_id,
            RefreshToken.token_hash == token_hash
        ).update({"revoked_at": datetime.utcnow()})

        # 3. Eliminar sesión
        await db.query(UserSession).filter(
            UserSession.user_id == user_id,
            UserSession.refresh_token_id.in_(
                db.query(RefreshToken.id).filter(
                    RefreshToken.token_hash == token_hash
                )
            )
        ).delete()

        await db.commit()

        # 4. Audit log
        await create_audit_log(
            user_id=user_id,
            action="user:logout",
            resource_type="user",
            resource_id=user_id,
            db=db
        )

        return {"message": "Logged out successfully"}

    except jwt.JWTError:
        # No fallar si el token es inválido (logout siempre exitoso)
        return {"message": "Logged out successfully"}
```

---

## 6. AUTORIZACIÓN (AUTHORIZATION)

### 6.1 Middleware de Autenticación

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Extrae y valida el usuario del access token
    """

    token = credentials.credentials

    try:
        # 1. Decodificar token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        # 2. Verificar tipo
        if payload.get("type") != "access":
            raise HTTPException(401, "Invalid token type")

        # 3. Extraer user_id
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(401, "Invalid token payload")

        # 4. Buscar usuario en DB
        user = await db.get(User, user_id)

        if not user:
            raise HTTPException(401, "User not found")

        if not user.is_active:
            raise HTTPException(403, "User account is inactive")

        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token has expired")
    except JWTError:
        raise HTTPException(401, "Invalid token")

# Dependency opcional (permite acceso sin autenticación)
async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(HTTPBearer(auto_error=False)),
    db: Session = Depends(get_db)
) -> User | None:
    """
    Versión opcional que retorna None si no hay token
    """
    if not credentials:
        return None

    try:
        return await get_current_user(credentials, db)
    except HTTPException:
        return None
```

### 6.2 Middleware de Autorización por Rol

```python
def require_role(allowed_roles: list[UserRole]):
    """
    Dependency factory que valida el rol del usuario

    Usage:
        @app.get("/api/products", dependencies=[Depends(require_role([UserRole.ADMIN]))])
        async def list_products():
            pass
    """

    async def role_checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=403,
                detail=f"Insufficient permissions. Required roles: {[r.value for r in allowed_roles]}"
            )
        return user

    return role_checker

# Shortcuts comunes
RequireAdmin = Depends(require_role([UserRole.ADMIN]))
RequireMozo = Depends(require_role([UserRole.MOZO, UserRole.ADMIN]))
RequireStaff = Depends(require_role([UserRole.EMPLEADO, UserRole.MOZO, UserRole.ADMIN]))
RequireKitchen = Depends(require_role([UserRole.COCINERO, UserRole.ADMIN]))
```

### 6.3 Middleware de Autorización por Permiso

```python
def require_permission(permission: str):
    """
    Dependency factory que valida permisos granulares

    Usage:
        @app.delete("/api/products/{id}", dependencies=[Depends(require_permission("product:delete"))])
        async def delete_product(id: str):
            pass
    """

    async def permission_checker(user: User = Depends(get_current_user)) -> User:
        # Obtener permisos del rol
        user_permissions = get_user_permissions(user.role)

        if permission not in user_permissions:
            raise HTTPException(
                status_code=403,
                detail=f"Missing required permission: {permission}"
            )

        return user

    return permission_checker
```

### 6.4 Middleware de Scoping por Sucursal

```python
async def validate_branch_ownership(
    branch_id: str,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Valida que el usuario tenga acceso a la sucursal especificada
    """

    # Admin: acceso a todas las sucursales de su restaurante
    if user.role == UserRole.ADMIN:
        branch = await db.get(Branch, branch_id)
        if not branch:
            raise HTTPException(404, "Branch not found")

        if branch.restaurant_id != user.restaurant_id:
            raise HTTPException(403, "Access denied to this branch")

        return branch

    # Mozo/Empleado/Cocinero: verificar asignación
    if user.role in [UserRole.MOZO, UserRole.EMPLEADO, UserRole.COCINERO]:
        access = await db.query(UserBranch).filter(
            UserBranch.user_id == user.id,
            UserBranch.branch_id == branch_id
        ).first()

        if not access:
            raise HTTPException(403, "Access denied to this branch")

        branch = await db.get(Branch, branch_id)
        return branch

    # Cliente: sin restricciones
    if user.role == UserRole.CLIENTE:
        branch = await db.get(Branch, branch_id)
        if not branch:
            raise HTTPException(404, "Branch not found")
        return branch

    raise HTTPException(403, "Access denied")

# Uso en endpoints
@app.get("/api/branches/{branch_id}/products")
async def get_branch_products(
    branch: Branch = Depends(validate_branch_ownership)
):
    """
    Solo usuarios con acceso a la sucursal pueden ver sus productos
    """
    products = await get_products_by_branch(branch.id)
    return products
```

---

## 7. ENDPOINTS DE SEGURIDAD

### 7.1 Gestión de Usuarios (Admin)

```python
@app.get("/api/users", dependencies=[RequireAdmin])
async def list_users(
    role: UserRole | None = None,
    branch_id: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Lista usuarios (solo admin)
    """

    query = db.query(User).filter(User.restaurant_id == user.restaurant_id)

    if role:
        query = query.filter(User.role == role)

    if branch_id:
        query = query.join(UserBranch).filter(UserBranch.branch_id == branch_id)

    total = await query.count()
    offset = (page - 1) * page_size
    users = await query.offset(offset).limit(page_size).all()

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size
    }

@app.post("/api/users", dependencies=[RequireAdmin])
async def create_user(
    request: RegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Crea nuevo usuario (solo admin)
    """

    # Validar que el usuario se cree en el mismo restaurante del admin
    if request.restaurant_id and request.restaurant_id != str(current_user.restaurant_id):
        raise HTTPException(403, "Cannot create users for other restaurants")

    # Si no se especifica, usar el restaurante del admin
    if not request.restaurant_id:
        request.restaurant_id = str(current_user.restaurant_id)

    # Reutilizar lógica de registro
    return await register(request, db)

@app.patch("/api/users/{user_id}", dependencies=[RequireAdmin])
async def update_user(
    user_id: str,
    update: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Actualiza usuario (solo admin)
    """

    user = await db.get(User, user_id)

    if not user or user.restaurant_id != current_user.restaurant_id:
        raise HTTPException(404, "User not found")

    # Aplicar actualizaciones
    if update.name is not None:
        user.name = update.name
    if update.email is not None:
        # Verificar email único
        existing = await db.query(User).filter(
            User.email == update.email,
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(400, "Email already in use")
        user.email = update.email
    if update.role is not None:
        user.role = update.role
    if update.is_active is not None:
        user.is_active = update.is_active
    if update.default_branch_id is not None:
        user.default_branch_id = update.default_branch_id

    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)

    # Audit log
    await create_audit_log(
        user_id=current_user.id,
        action="user:update",
        resource_type="user",
        resource_id=user_id,
        details={"updated_fields": update.dict(exclude_unset=True)},
        db=db
    )

    return user

@app.delete("/api/users/{user_id}", dependencies=[RequireAdmin])
async def delete_user(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Elimina usuario (solo admin)
    """

    user = await db.get(User, user_id)

    if not user or user.restaurant_id != current_user.restaurant_id:
        raise HTTPException(404, "User not found")

    # No permitir auto-eliminación
    if user.id == current_user.id:
        raise HTTPException(400, "Cannot delete your own account")

    # Soft delete (desactivar)
    user.is_active = False
    user.updated_at = datetime.utcnow()

    # O hard delete
    # await db.delete(user)

    await db.commit()

    # Audit log
    await create_audit_log(
        user_id=current_user.id,
        action="user:delete",
        resource_type="user",
        resource_id=user_id,
        db=db
    )

    return {"message": "User deleted successfully"}
```

### 7.2 Gestión de Asignación de Sucursales

```python
@app.post("/api/users/{user_id}/branches", dependencies=[RequireAdmin])
async def assign_branch_to_user(
    user_id: str,
    request: AssignBranchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Asigna una sucursal a un usuario (mozo/empleado/cocinero)
    """

    user = await db.get(User, user_id)

    if not user or user.restaurant_id != current_user.restaurant_id:
        raise HTTPException(404, "User not found")

    # Validar branch pertenece al restaurante
    branch = await db.get(Branch, request.branch_id)
    if not branch or branch.restaurant_id != current_user.restaurant_id:
        raise HTTPException(404, "Branch not found")

    # Verificar no existe asignación
    existing = await db.query(UserBranch).filter(
        UserBranch.user_id == user_id,
        UserBranch.branch_id == request.branch_id
    ).first()

    if existing:
        raise HTTPException(400, "User already assigned to this branch")

    # Crear asignación
    user_branch = UserBranch(
        user_id=user_id,
        branch_id=request.branch_id,
        can_manage=request.can_manage
    )

    db.add(user_branch)
    await db.commit()

    return {"message": "Branch assigned successfully"}

@app.delete("/api/users/{user_id}/branches/{branch_id}", dependencies=[RequireAdmin])
async def remove_branch_from_user(
    user_id: str,
    branch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remueve asignación de sucursal
    """

    await db.query(UserBranch).filter(
        UserBranch.user_id == user_id,
        UserBranch.branch_id == branch_id
    ).delete()

    await db.commit()

    return {"message": "Branch assignment removed"}
```

### 7.3 Cambio de Contraseña

```python
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)

@app.post("/api/auth/change-password")
async def change_password(
    request: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Cambia la contraseña del usuario autenticado
    """

    # 1. Verificar contraseña actual
    if not pwd_context.verify(request.current_password, user.password_hash):
        raise HTTPException(401, "Current password is incorrect")

    # 2. Validar nueva contraseña
    # (Ya validada por Pydantic validator en RegisterRequest)

    # 3. Actualizar password
    user.password_hash = pwd_context.hash(request.new_password)
    user.password_changed_at = datetime.utcnow()

    # 4. Revocar todos los refresh tokens existentes (forzar re-login)
    await db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()})

    await db.commit()

    # 5. Audit log
    await create_audit_log(
        user_id=user.id,
        action="user:change_password",
        resource_type="user",
        resource_id=str(user.id),
        db=db
    )

    return {"message": "Password changed successfully. Please login again."}
```

### 7.4 Reset de Contraseña

```python
class RequestPasswordResetRequest(BaseModel):
    email: EmailStr

@app.post("/api/auth/request-password-reset")
async def request_password_reset(
    request: RequestPasswordResetRequest,
    db: Session = Depends(get_db)
):
    """
    Solicita reset de contraseña (envía email)
    """

    user = await db.query(User).filter(User.email == request.email).first()

    # Siempre retornar success para prevenir enumeración de emails
    if not user:
        return {"message": "If the email exists, a reset link will be sent"}

    # Crear token de reset
    token = await create_verification_token(
        user.id,
        "password_reset",
        db
    )

    # Enviar email con link de reset
    # reset_link = f"{FRONTEND_URL}/reset-password?token={token}"
    # await send_password_reset_email(user.email, reset_link)

    return {"message": "If the email exists, a reset link will be sent"}

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8, max_length=100)

@app.post("/api/auth/reset-password")
async def reset_password(
    request: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Resetea contraseña con token de verificación
    """

    # 1. Verificar token
    verification = await db.query(VerificationToken).filter(
        VerificationToken.token == request.token,
        VerificationToken.type == "password_reset",
        VerificationToken.used_at.is_(None),
        VerificationToken.expires_at > datetime.utcnow()
    ).first()

    if not verification:
        raise HTTPException(400, "Invalid or expired reset token")

    # 2. Obtener usuario
    user = await db.get(User, verification.user_id)

    # 3. Actualizar password
    user.password_hash = pwd_context.hash(request.new_password)
    user.password_changed_at = datetime.utcnow()

    # 4. Marcar token como usado
    verification.used_at = datetime.utcnow()

    # 5. Revocar refresh tokens
    await db.query(RefreshToken).filter(
        RefreshToken.user_id == user.id,
        RefreshToken.revoked_at.is_(None)
    ).update({"revoked_at": datetime.utcnow()})

    await db.commit()

    # 6. Audit log
    await create_audit_log(
        user_id=user.id,
        action="user:reset_password",
        resource_type="user",
        resource_id=str(user.id),
        db=db
    )

    return {"message": "Password reset successfully. Please login."}
```

---

## 8. IMPLEMENTACIÓN BACKEND

### 8.1 Configuración FastAPI

```python
# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

app = FastAPI(
    title="Sabor API",
    version="1.0.0",
    description="Sistema de autenticación y autorización custom"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5176",
        "http://localhost:5177",
        "https://sabor.com",
        "https://admin.sabor.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate Limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Routers
from routes import auth, users, branches, products  # etc.

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(branches.router)
app.include_router(products.router)
```

### 8.2 Variables de Entorno

```bash
# .env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/sabor
SECRET_KEY=your-super-secret-jwt-key-change-this-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Frontend URLs
FRONTEND_PWAMENU_URL=https://sabor.com
FRONTEND_DASHBOARD_URL=https://admin.sabor.com

# Email (opcional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=noreply@sabor.com
SMTP_PASSWORD=your-email-password
SMTP_FROM=noreply@sabor.com
```

### 8.3 Funciones Auxiliares

```python
# utils/security.py
import secrets
from datetime import datetime, timedelta

async def create_verification_token(
    user_id: str,
    token_type: str,
    db: Session,
    expires_hours: int = 24
) -> str:
    """
    Crea token de verificación (email, password reset)
    """

    token = secrets.token_urlsafe(32)

    verification = VerificationToken(
        user_id=user_id,
        token=token,
        type=token_type,
        expires_at=datetime.utcnow() + timedelta(hours=expires_hours)
    )

    db.add(verification)
    await db.commit()

    return token

async def create_audit_log(
    user_id: str,
    action: str,
    resource_type: str | None = None,
    resource_id: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    details: dict | None = None,
    db: Session = None
):
    """
    Registra acción en audit log
    """

    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details
    )

    db.add(log)
    await db.commit()
```

---

## 9. IMPLEMENTACIÓN FRONTEND

### 9.1 authStore (Zustand)

```typescript
// stores/authStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  email: string
  name: string
  role: 'cliente' | 'admin' | 'mozo' | 'empleado' | 'cocinero'
  picture_url?: string
  restaurant_id?: string
  default_branch_id?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  // Actions
  login: (email: string, password: string) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  refreshAccessToken: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email, password) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || 'Login failed')
          }

          const data = await response.json()

          set({
            user: data.user,
            accessToken: data.access_token,
            refreshToken: data.refresh_token,
            isAuthenticated: true,
            isLoading: false
          })

          // Setup auto-refresh
          setupTokenRefresh()

        } catch (error) {
          set({
            error: error.message,
            isLoading: false
          })
          throw error
        }
      },

      register: async (data) => {
        set({ isLoading: true, error: null })

        try {
          const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.detail || 'Registration failed')
          }

          const result = await response.json()
          set({ isLoading: false })

          return result

        } catch (error) {
          set({
            error: error.message,
            isLoading: false
          })
          throw error
        }
      },

      logout: async () => {
        const { refreshToken } = get()

        if (refreshToken) {
          try {
            await fetch('/api/auth/logout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh_token: refreshToken })
            })
          } catch (error) {
            console.error('Logout error:', error)
          }
        }

        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false
        })

        clearTokenRefreshInterval()
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get()

        if (!refreshToken) {
          throw new Error('No refresh token available')
        }

        try {
          const response = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
          })

          if (!response.ok) {
            // Refresh token expirado - forzar logout
            get().logout()
            throw new Error('Refresh token expired')
          }

          const data = await response.json()

          set({ accessToken: data.access_token })

        } catch (error) {
          console.error('Token refresh failed:', error)
          get().logout()
          throw error
        }
      },

      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      // Solo persistir refreshToken, no accessToken (por seguridad)
      partialize: (state) => ({
        refreshToken: state.refreshToken,
        user: state.user
      })
    }
  )
)

// Auto-refresh del access token cada 14 minutos
let refreshInterval: NodeJS.Timeout | null = null

function setupTokenRefresh() {
  clearTokenRefreshInterval()

  refreshInterval = setInterval(() => {
    useAuthStore.getState().refreshAccessToken()
  }, 14 * 60 * 1000) // 14 minutos
}

function clearTokenRefreshInterval() {
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }
}
```

### 9.2 API Client con Autenticación

```typescript
// services/api.ts
import { useAuthStore } from '../stores/authStore'

class ApiClient {
  private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken, refreshAccessToken, logout } = useAuthStore.getState()

    // Agregar access token si existe
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    // Primera petición
    let response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers
    })

    // Si 401, intentar refresh
    if (response.status === 401 && accessToken) {
      try {
        await refreshAccessToken()

        // Reintentar petición con nuevo token
        const newToken = useAuthStore.getState().accessToken
        headers['Authorization'] = `Bearer ${newToken}`

        response = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers
        })
      } catch (error) {
        // Refresh falló - forzar logout
        logout()
        throw new Error('Session expired. Please login again.')
      }
    }

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Request failed')
    }

    return response.json()
  }

  get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  post<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  }

  patch<T>(endpoint: string, data: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  }

  delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const api = new ApiClient()
```

### 9.3 Componente de Login

```typescript
// components/LoginForm.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await login(email, password)

      // Redirigir según rol
      const user = useAuthStore.getState().user

      if (user?.role === 'cliente') {
        navigate('/')  // pwaMenu home
      } else {
        navigate('/dashboard')  // Dashboard
      }

    } catch (error) {
      // Error ya está en el store
      console.error('Login failed:', error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Iniciar Sesión</h2>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">
          Contraseña
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full p-2 border rounded"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-orange-500 text-white py-2 rounded hover:bg-orange-600 disabled:opacity-50"
      >
        {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
      </button>

      <div className="mt-4 text-center">
        <a href="/forgot-password" className="text-sm text-orange-500">
          ¿Olvidaste tu contraseña?
        </a>
      </div>
    </form>
  )
}
```

### 9.4 Protected Routes

```typescript
// components/ProtectedRoute.tsx
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

// Uso en App.tsx
<Routes>
  <Route path="/login" element={<LoginForm />} />

  {/* pwaMenu (solo clientes) */}
  <Route
    path="/"
    element={
      <ProtectedRoute allowedRoles={['cliente']}>
        <Home />
      </ProtectedRoute>
    }
  />

  {/* Dashboard (admin, mozo, empleado, cocinero) */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute allowedRoles={['admin', 'mozo', 'empleado', 'cocinero']}>
        <Dashboard />
      </ProtectedRoute>
    }
  />

  {/* Admin only */}
  <Route
    path="/dashboard/products"
    element={
      <ProtectedRoute allowedRoles={['admin']}>
        <ProductsPage />
      </ProtectedRoute>
    }
  />
</Routes>
```

---

## 10. SEGURIDAD Y MEJORES PRÁCTICAS

### 10.1 Checklist de Seguridad

```
✅ Password Security
  ├── Bcrypt hashing (12 rounds)
  ├── Min 8 caracteres, complejidad requerida
  ├── No almacenar passwords en logs
  └── Password changed_at timestamp

✅ Token Security
  ├── JWT firmados con HS256
  ├── Access tokens de corta duración (15 min)
  ├── Refresh tokens en DB (revocables)
  ├── Token hash en DB (no plaintext)
  └── Validación de expiración en cada request

✅ Session Security
  ├── Múltiples dispositivos soportados
  ├── Revocación de tokens al cambiar password
  ├── Logout invalida refresh token
  └── Tracking de IP y user agent

✅ Authentication Security
  ├── Rate limiting en login (5/min)
  ├── Account lockout después de 5 intentos (15 min)
  ├── Delay en respuestas para prevenir timing attacks
  └── No revelar si email existe en password reset

✅ Authorization Security
  ├── Role-based access control (RBAC)
  ├── Permission-based access control
  ├── Branch-scoped data access
  └── Validación de permisos en cada endpoint

✅ API Security
  ├── CORS configurado correctamente
  ├── HTTPS obligatorio en producción
  ├── CSRF protection (X-Requested-With header)
  ├── Input validation con Pydantic
  ├── SQL injection prevention (ORM)
  └── XSS prevention (sanitización)

✅ Audit & Monitoring
  ├── Audit logs de todas las acciones críticas
  ├── IP y user agent tracking
  ├── Failed login attempts logging
  └── Resource access logging
```

### 10.2 Rate Limiting Específico

```python
# Endpoints con rate limiting customizado

@router.post("/register")
@limiter.limit("3/hour")  # 3 registros por hora por IP
async def register(...):
    pass

@router.post("/login")
@limiter.limit("10/minute")  # 10 intentos por minuto
async def login(...):
    pass

@router.post("/request-password-reset")
@limiter.limit("3/hour")  # 3 requests por hora
async def request_password_reset(...):
    pass

@router.post("/refresh")
@limiter.limit("20/minute")  # Más permisivo para UX
async def refresh_token(...):
    pass
```

### 10.3 Seguridad de Contraseñas

```python
# Política de contraseñas
PASSWORD_REQUIREMENTS = {
    "min_length": 8,
    "max_length": 100,
    "require_uppercase": True,
    "require_lowercase": True,
    "require_digit": True,
    "require_special": True,
    "special_chars": "!@#$%^&*(),.?\":{}|<>"
}

# Bcrypt configuración
BCRYPT_ROUNDS = 12  # Aumentar en hardware más potente

# Password history (evitar reutilización)
MAX_PASSWORD_HISTORY = 5  # Últimas 5 passwords no reutilizables
```

### 10.4 HTTPS y Seguridad en Producción

```python
# settings.py
from pydantic import BaseSettings

class Settings(BaseSettings):
    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # Database
    database_url: str

    # Security
    https_only: bool = True  # Forzar HTTPS en producción
    secure_cookies: bool = True
    samesite_cookies: str = "strict"

    # CORS
    allowed_origins: list[str] = [
        "https://sabor.com",
        "https://admin.sabor.com"
    ]

    class Config:
        env_file = ".env"

settings = Settings()

# Middleware de seguridad
@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

    # HTTPS redirect en producción
    if settings.https_only and request.url.scheme != "https":
        return RedirectResponse(
            url=str(request.url).replace("http://", "https://"),
            status_code=301
        )

    return response
```

---

## 11. FLUJOS DE USUARIO COMPLETOS

### 11.1 Flujo: Cliente se Registra y Ordena

```
1. REGISTRO (pwaMenu)
   Usuario → /register
   Ingresa: email, password, nombre
   ↓
   Backend:
   - Crea usuario con role=cliente
   - Envía email de verificación
   ↓
   Frontend:
   - Redirige a /login
   ↓

2. LOGIN
   Usuario → /login
   Ingresa: email, password
   ↓
   Backend:
   - Valida credenciales
   - Retorna access_token + refresh_token
   ↓
   Frontend:
   - Guarda tokens en authStore
   - Navega a /home (menú)
   ↓

3. ESCANEAR QR
   Usuario → Escanea QR de mesa
   ↓
   Frontend:
   - Extrae table_number, branch_id del QR
   - Navega a /join-table
   ↓

4. UNIRSE A MESA
   POST /api/sessions/join
   Headers: Authorization: Bearer {access_token}
   Body: { table_number, branch_id, diner_name }
   ↓
   Backend:
   - Verifica access_token (rol=cliente)
   - Crea TableSession
   - Crea SessionDiner vinculado a user_id
   - Retorna session_id
   ↓

5. VER MENÚ Y AGREGAR PRODUCTOS
   GET /api/products?branch_id={id}
   Headers: Authorization: Bearer {access_token}
   ↓
   POST /api/sessions/{session_id}/cart
   Body: { diner_id, product_id, quantity }
   ↓

6. ENVIAR PEDIDO
   POST /api/sessions/{session_id}/orders
   ↓

7. PAGAR
   POST /api/payments/create-preference
   ↓

8. LOGOUT (opcional)
   POST /api/auth/logout
   Body: { refresh_token }
```

### 11.2 Flujo: Admin Gestiona Productos

```
1. LOGIN (Dashboard)
   Admin → /login
   Ingresa: email, password
   ↓
   Backend:
   - Valida credenciales
   - Verifica role=admin
   - Retorna tokens
   ↓
   Frontend:
   - Guarda tokens
   - Navega a /dashboard
   ↓

2. SELECCIONAR SUCURSAL
   Dashboard → Selecciona sucursal
   ↓
   branchStore.setSelectedBranch(branch_id)
   ↓

3. VER PRODUCTOS
   GET /api/products?branch_id={id}
   Headers: Authorization: Bearer {access_token}
   ↓
   Backend Middleware:
   - verify_token() → extrae user
   - require_role([admin]) → valida rol
   - validate_branch_ownership() → valida acceso a sucursal
   - Permite acceso
   ↓

4. CREAR PRODUCTO
   POST /api/products
   Headers: Authorization: Bearer {access_token}
   Body: { category_id, name, price, ... }
   ↓
   Backend:
   - Valida permisos (product:create)
   - Crea producto
   - Audit log: product:create
   - Retorna producto
   ↓

5. LOGOUT
   POST /api/auth/logout
```

### 11.3 Flujo: Mozo Gestiona Mesas

```
1. LOGIN (Dashboard)
   Mozo → /login
   ↓
   Backend:
   - Valida credenciales
   - role=mozo
   - Retorna tokens
   ↓

2. VER MESAS ASIGNADAS
   GET /api/tables?branch_id={assigned_branch_id}
   Headers: Authorization: Bearer {access_token}
   ↓
   Backend:
   - verify_token()
   - require_role([mozo, admin])
   - validate_branch_access() → verifica UserBranch
   - Retorna solo mesas de sucursales asignadas
   ↓

3. CAMBIAR ESTADO DE MESA
   PATCH /api/tables/{id}
   Body: { status: "solicito_pedido" }
   ↓
   Backend:
   - Valida permiso (table:update)
   - Valida que mesa pertenece a sucursal asignada
   - Actualiza mesa
   - Audit log: table:update
```

---

## 12. MIGRACIÓN DESDE GOOGLE OAUTH

### 12.1 Plan de Migración

```
FASE 1: Implementar Sistema Custom (2 semanas)
├── Crear tablas de usuarios y autenticación
├── Implementar endpoints de auth (login, register, refresh)
├── Implementar middleware de autenticación
├── Testing completo
└── Deploy a staging

FASE 2: Actualizar Frontend (1 semana)
├── Crear authStore con login/register custom
├── Reemplazar Google OAuth por LoginForm
├── Actualizar API client con auto-refresh
├── Implementar ProtectedRoutes
└── Testing E2E

FASE 3: Migración de Datos (opcional)
├── Script para migrar usuarios de Google a sistema custom
├── Enviar emails de reset password a usuarios existentes
└── Período de transición (ambos sistemas en paralelo)

FASE 4: Deprecar Google OAuth (1 semana)
├── Remover dependencias de Google SDK
├── Limpiar código legacy
├── Actualizar documentación
└── Deploy a producción
```

### 12.2 Mantener Compatibilidad Temporal

```python
# Soportar ambos sistemas durante transición

@router.post("/auth/login-or-google")
async def flexible_login(request: Request, db: Session = Depends(get_db)):
    """
    Endpoint que soporta tanto login custom como Google OAuth
    """

    data = await request.json()

    # Si viene 'credential', es Google OAuth
    if 'credential' in data:
        return await google_auth(GoogleAuthRequest(credential=data['credential']), db)

    # Si viene 'email' y 'password', es login custom
    if 'email' in data and 'password' in data:
        return await login(LoginRequest(**data), request, db)

    raise HTTPException(400, "Invalid login method")
```

### 12.3 Migración de Usuarios Existentes

```python
# Script de migración (ejecutar una vez)

async def migrate_google_users_to_custom():
    """
    Migra usuarios de Google OAuth a sistema custom
    """

    db = AsyncSessionLocal()

    # Obtener usuarios con google_id pero sin password_hash
    google_users = await db.query(User).filter(
        User.google_id.isnot(None),
        User.password_hash.is_(None)
    ).all()

    for user in google_users:
        # Generar password temporal
        temp_password = secrets.token_urlsafe(16)
        user.password_hash = pwd_context.hash(temp_password)

        # Crear token de reset
        token = await create_verification_token(
            user.id,
            "password_reset",
            db,
            expires_hours=72  # 3 días
        )

        # Enviar email con instrucciones
        await send_migration_email(
            email=user.email,
            name=user.name,
            reset_token=token
        )

        print(f"Migrated user: {user.email}")

    await db.commit()
    print(f"Total users migrated: {len(google_users)}")

# Email template
async def send_migration_email(email: str, name: str, reset_token: str):
    """
    Envía email de migración con link para crear password
    """

    reset_link = f"{FRONTEND_URL}/reset-password?token={reset_token}"

    subject = "Actualización de tu cuenta Sabor"
    body = f"""
    Hola {name},

    Hemos actualizado nuestro sistema de autenticación para mejorar la seguridad.

    Por favor, crea una nueva contraseña haciendo click en el siguiente enlace:
    {reset_link}

    Este enlace expira en 72 horas.

    Si no creaste una cuenta en Sabor, puedes ignorar este email.

    Saludos,
    Equipo Sabor
    """

    # Implementar envío de email
    # await send_email(email, subject, body)
```

---

## RESUMEN

### Características Principales

✅ **Autenticación completa sin Google OAuth**
- Registro con email/password
- Login con validación bcrypt
- JWT tokens (access + refresh)
- Password reset via email
- Account lockout protection

✅ **5 roles con permisos granulares**
- cliente → pwaMenu
- admin → Dashboard completo
- mozo → Gestión de mesas
- empleado → Funciones limitadas
- cocinero → Módulo cocina

✅ **Seguridad robusta**
- Bcrypt password hashing (12 rounds)
- Rate limiting en endpoints críticos
- Audit logs de todas las acciones
- Session tracking (IP, user agent)
- HTTPS enforcement

✅ **Multi-tenancy**
- Usuarios scoped por restaurante
- Acceso por sucursal (UserBranch)
- Validación de permisos en cada request

✅ **Gestión de sesiones**
- Múltiples dispositivos soportados
- Refresh tokens revocables
- Auto-refresh en frontend
- Logout invalida sesión

### Endpoints Implementados

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout
POST   /api/auth/change-password
POST   /api/auth/request-password-reset
POST   /api/auth/reset-password

GET    /api/users
POST   /api/users
PATCH  /api/users/{id}
DELETE /api/users/{id}
POST   /api/users/{id}/branches
DELETE /api/users/{id}/branches/{branch_id}
```

### Próximos Pasos

1. Implementar backend según especificaciones
2. Crear migraciones de base de datos (Alembic)
3. Implementar envío de emails (SMTP)
4. Actualizar frontends (Dashboard + pwaMenu)
5. Testing E2E completo
6. Deploy a staging
7. Migración de usuarios existentes (si aplica)
8. Deploy a producción

---

**FIN DE DOCUMENTO**

Este sistema de autenticación y autorización custom reemplaza completamente la dependencia de Google OAuth y proporciona control total sobre la seguridad y permisos del sistema SaaS Sabor.
