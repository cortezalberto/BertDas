# Conversión de TypeScript a Python

Archivo original: `src/types/index.ts`

## Código Python (usando dataclasses y typing)

```python
from dataclasses import dataclass, field
from typing import Optional, List, Any, Literal, Callable, TypeVar, Generic
from datetime import datetime
from enum import Enum


# ============================================
# Restaurant types
# ============================================

@dataclass
class Restaurant:
    id: str
    name: str
    slug: str
    description: str
    theme_color: str
    logo: Optional[str] = None
    banner: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class RestaurantFormData:
    name: str
    slug: str
    description: str
    theme_color: str
    logo: Optional[str] = None
    banner: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ============================================
# Branch types (sucursales)
# ============================================

@dataclass
class Branch:
    id: str
    name: str
    restaurant_id: str
    order: int
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class BranchFormData:
    name: str
    is_active: bool
    order: int
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None


# ============================================
# Category types
# ============================================

@dataclass
class Category:
    id: str
    name: str
    order: int
    branch_id: str
    icon: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class CategoryFormData:
    name: str
    order: int
    branch_id: str
    is_active: bool
    icon: Optional[str] = None
    image: Optional[str] = None


# ============================================
# Subcategory types
# ============================================

@dataclass
class Subcategory:
    id: str
    name: str
    category_id: str
    order: int
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class SubcategoryFormData:
    name: str
    category_id: str
    order: int
    is_active: bool
    image: Optional[str] = None


# ============================================
# Allergen types
# ============================================

@dataclass
class Allergen:
    id: str
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class AllergenFormData:
    name: str
    is_active: bool
    icon: Optional[str] = None
    description: Optional[str] = None


# ============================================
# Branch price for products (per-branch pricing)
# ============================================

@dataclass
class BranchPrice:
    """Precio por sucursal. is_active=True significa que el producto se vende en esta sucursal."""
    branch_id: str
    price: float
    is_active: bool


# ============================================
# Product types
# ============================================

@dataclass
class Product:
    id: str
    name: str
    description: str
    price: float                              # Precio base (usado cuando use_branch_prices es False)
    branch_prices: List[BranchPrice]          # Precios por sucursal
    use_branch_prices: bool                   # Toggle para modo de precios por sucursal
    category_id: str
    subcategory_id: str
    featured: bool
    popular: bool
    allergen_ids: List[str]
    image: Optional[str] = None               # URL de imagen opcional
    badge: Optional[str] = None
    is_active: Optional[bool] = None
    stock: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class ProductFormData:
    name: str
    description: str
    price: float                              # Precio base
    branch_prices: List[BranchPrice]          # Precios por sucursal
    use_branch_prices: bool                   # Toggle para modo de precios por sucursal
    category_id: str
    subcategory_id: str
    featured: bool
    popular: bool
    allergen_ids: List[str]
    is_active: bool
    image: Optional[str] = None               # URL de imagen opcional
    badge: Optional[str] = None
    stock: Optional[int] = None


# ============================================
# Dashboard statistics
# ============================================

@dataclass
class DashboardStats:
    total_products: int
    total_categories: int
    total_subcategories: int
    active_products: int
    featured_products: int
    popular_products: int


# ============================================
# Table column definition (generic)
# ============================================

T = TypeVar('T')

@dataclass
class TableColumn(Generic[T]):
    key: str
    label: Any                                # React.ReactNode equivalente
    render: Optional[Callable[[T], Any]] = None
    sortable: Optional[bool] = None
    width: Optional[str] = None


# ============================================
# Modal state
# ============================================

class ModalMode(str, Enum):
    CREATE = 'create'
    EDIT = 'edit'
    DELETE = 'delete'
    VIEW = 'view'


@dataclass
class ModalState:
    is_open: bool
    mode: ModalMode
    data: Optional[Any] = None


# ============================================
# Toast notification
# ============================================

class ToastType(str, Enum):
    SUCCESS = 'success'
    ERROR = 'error'
    WARNING = 'warning'
    INFO = 'info'


@dataclass
class Toast:
    id: str
    type: ToastType
    message: str
    duration: Optional[int] = None


# ============================================
# Promotion Type types
# ============================================

@dataclass
class PromotionType:
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PromotionTypeFormData:
    name: str
    is_active: bool
    description: Optional[str] = None
    icon: Optional[str] = None


# ============================================
# Promotion types
# ============================================

@dataclass
class PromotionItem:
    product_id: str
    quantity: int


@dataclass
class Promotion:
    id: str
    name: str
    price: float
    start_date: str                           # Formato: YYYY-MM-DD
    end_date: str                             # Formato: YYYY-MM-DD
    start_time: str                           # Formato: HH:mm (ej: "17:00")
    end_time: str                             # Formato: HH:mm (ej: "20:00")
    promotion_type_id: str
    branch_ids: List[str]
    items: List[PromotionItem]
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


@dataclass
class PromotionFormData:
    name: str
    price: float
    start_date: str
    end_date: str
    start_time: str
    end_time: str
    promotion_type_id: str
    branch_ids: List[str]
    items: List[PromotionItem]
    is_active: bool
    description: Optional[str] = None
    image: Optional[str] = None
```

## Alternativa con Pydantic (recomendado para APIs)

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Any, Literal, Callable, TypeVar, Generic
from enum import Enum


# ============================================
# Restaurant types
# ============================================

class Restaurant(BaseModel):
    id: str
    name: str
    slug: str
    description: str
    theme_color: str
    logo: Optional[str] = None
    banner: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RestaurantFormData(BaseModel):
    name: str
    slug: str
    description: str
    theme_color: str
    logo: Optional[str] = None
    banner: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


# ============================================
# Branch types (sucursales)
# ============================================

class Branch(BaseModel):
    id: str
    name: str
    restaurant_id: str
    order: int
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class BranchFormData(BaseModel):
    name: str
    is_active: bool
    order: int
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None


# ============================================
# Category types
# ============================================

class Category(BaseModel):
    id: str
    name: str
    order: int
    branch_id: str
    icon: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class CategoryFormData(BaseModel):
    name: str
    order: int
    branch_id: str
    is_active: bool
    icon: Optional[str] = None
    image: Optional[str] = None


# ============================================
# Subcategory types
# ============================================

class Subcategory(BaseModel):
    id: str
    name: str
    category_id: str
    order: int
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class SubcategoryFormData(BaseModel):
    name: str
    category_id: str
    order: int
    is_active: bool
    image: Optional[str] = None


# ============================================
# Allergen types
# ============================================

class Allergen(BaseModel):
    id: str
    name: str
    icon: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class AllergenFormData(BaseModel):
    name: str
    is_active: bool
    icon: Optional[str] = None
    description: Optional[str] = None


# ============================================
# Branch price for products
# ============================================

class BranchPrice(BaseModel):
    """Precio por sucursal. is_active=True significa que el producto se vende en esta sucursal."""
    branch_id: str
    price: float
    is_active: bool


# ============================================
# Product types
# ============================================

class Product(BaseModel):
    id: str
    name: str
    description: str
    price: float = Field(description="Precio base (usado cuando use_branch_prices es False)")
    branch_prices: List[BranchPrice] = Field(description="Precios por sucursal")
    use_branch_prices: bool = Field(description="Toggle para modo de precios por sucursal")
    category_id: str
    subcategory_id: str
    featured: bool
    popular: bool
    allergen_ids: List[str]
    image: Optional[str] = None
    badge: Optional[str] = None
    is_active: Optional[bool] = None
    stock: Optional[int] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class ProductFormData(BaseModel):
    name: str
    description: str
    price: float
    branch_prices: List[BranchPrice]
    use_branch_prices: bool
    category_id: str
    subcategory_id: str
    featured: bool
    popular: bool
    allergen_ids: List[str]
    is_active: bool
    image: Optional[str] = None
    badge: Optional[str] = None
    stock: Optional[int] = None


# ============================================
# Dashboard statistics
# ============================================

class DashboardStats(BaseModel):
    total_products: int
    total_categories: int
    total_subcategories: int
    active_products: int
    featured_products: int
    popular_products: int


# ============================================
# Modal state
# ============================================

class ModalMode(str, Enum):
    CREATE = 'create'
    EDIT = 'edit'
    DELETE = 'delete'
    VIEW = 'view'


class ModalState(BaseModel):
    is_open: bool
    mode: ModalMode
    data: Optional[Any] = None


# ============================================
# Toast notification
# ============================================

class ToastType(str, Enum):
    SUCCESS = 'success'
    ERROR = 'error'
    WARNING = 'warning'
    INFO = 'info'


class Toast(BaseModel):
    id: str
    type: ToastType
    message: str
    duration: Optional[int] = None


# ============================================
# Promotion Type types
# ============================================

class PromotionType(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PromotionTypeFormData(BaseModel):
    name: str
    is_active: bool
    description: Optional[str] = None
    icon: Optional[str] = None


# ============================================
# Promotion types
# ============================================

class PromotionItem(BaseModel):
    product_id: str
    quantity: int


class Promotion(BaseModel):
    id: str
    name: str
    price: float
    start_date: str = Field(description="Formato: YYYY-MM-DD")
    end_date: str = Field(description="Formato: YYYY-MM-DD")
    start_time: str = Field(description="Formato: HH:mm (ej: 17:00)")
    end_time: str = Field(description="Formato: HH:mm (ej: 20:00)")
    promotion_type_id: str
    branch_ids: List[str]
    items: List[PromotionItem]
    description: Optional[str] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class PromotionFormData(BaseModel):
    name: str
    price: float
    start_date: str
    end_date: str
    start_time: str
    end_time: str
    promotion_type_id: str
    branch_ids: List[str]
    items: List[PromotionItem]
    is_active: bool
    description: Optional[str] = None
    image: Optional[str] = None
```

## Resumen de conversiones

| TypeScript | Python (dataclass) | Python (Pydantic) |
|------------|-------------------|-------------------|
| `string` | `str` | `str` |
| `number` | `int` o `float` | `int` o `float` |
| `boolean` | `bool` | `bool` |
| `T[]` / `Array<T>` | `List[T]` | `List[T]` |
| `T \| undefined` / `T?` | `Optional[T]` | `Optional[T]` |
| `'a' \| 'b' \| 'c'` (union literal) | `Literal['a', 'b', 'c']` o `Enum` | `Literal[...]` o `Enum` |
| `interface` | `@dataclass` | `class(BaseModel)` |
| `unknown` | `Any` | `Any` |
