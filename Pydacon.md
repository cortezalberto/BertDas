# Modelos Pydantic - Restaurant Dashboard

Modelos de datos para API backend usando Pydantic.

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Any
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
    opening_time: str = Field(description="Horario de apertura (HH:mm)", default="09:00")
    closing_time: str = Field(description="Horario de cierre (HH:mm)", default="23:00")
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
    opening_time: str = Field(description="Horario de apertura (HH:mm)", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    closing_time: str = Field(description="Horario de cierre (HH:mm)", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
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


# ============================================
# Table types (mesas)
# ============================================

class TableStatus(str, Enum):
    LIBRE = 'libre'
    SOLICITO_PEDIDO = 'solicito_pedido'
    PEDIDO_CUMPLIDO = 'pedido_cumplido'
    CUENTA_SOLICITADA = 'cuenta_solicitada'
    OCUPADA = 'ocupada'


class RestaurantTable(BaseModel):
    """
    Mesa de restaurante vinculada a una sucursal para gestionar ordenes y pedidos.

    Reglas de tiempo por estado:
    - libre: order_time=00:00, close_time=00:00
    - ocupada: order_time=00:00, close_time=00:00
    - solicito_pedido: order_time=HH:mm (hora del pedido), close_time=00:00
    - pedido_cumplido: order_time=00:00, close_time=00:00
    - cuenta_solicitada: order_time=HH:mm, close_time=HH:mm (close_time >= order_time)
    """
    id: str
    branch_id: str
    number: int = Field(description="Numero identificador de mesa dentro de la sucursal")
    capacity: int = Field(description="Cantidad maxima de comensales", ge=1, le=50)
    sector: str = Field(description="Sector de ubicacion (ej: Interior, Terraza, VIP, Barra)")
    status: TableStatus = Field(description="Estado actual de la mesa para seguimiento de pedidos")
    order_time: str = Field(description="Hora del primer pedido (HH:mm), '00:00' excepto en solicito_pedido y cuenta_solicitada", default="00:00")
    close_time: str = Field(description="Hora de cierre (HH:mm), solo tiene valor en cuenta_solicitada", default="00:00")
    is_active: Optional[bool] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class RestaurantTableFormData(BaseModel):
    branch_id: str
    number: int = Field(ge=1)
    capacity: int = Field(ge=1, le=50)
    sector: str
    status: TableStatus
    order_time: str = Field(description="Hora del primer pedido (HH:mm)", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    close_time: str = Field(description="Hora de cierre (HH:mm)", pattern=r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$")
    is_active: bool


# ============================================
# Order History types (historial de ventas)
# ============================================

class CommandStatus(str, Enum):
    PENDIENTE = 'pendiente'
    EN_PREPARACION = 'en_preparacion'
    LISTO = 'listo'
    ENTREGADO = 'entregado'


class OrderHistoryStatus(str, Enum):
    ABIERTA = 'abierta'
    CERRADA = 'cerrada'


class OrderCommandItem(BaseModel):
    """Producto en una comanda."""
    product_id: str
    product_name: str = Field(description="Snapshot del nombre al momento del pedido")
    quantity: int = Field(ge=1)
    unit_price: float = Field(description="Precio unitario al momento del pedido", ge=0)
    notes: Optional[str] = Field(description="Notas especiales (sin sal, bien cocido, etc.)", default=None)


class OrderCommand(BaseModel):
    """Comanda individual con lista de productos."""
    id: str
    order_history_id: str = Field(description="Referencia al historial de la mesa")
    items: List[OrderCommandItem]
    subtotal: float = Field(description="Suma de (quantity * unit_price)", ge=0)
    created_at: str
    status: CommandStatus = Field(default=CommandStatus.PENDIENTE)


class OrderHistory(BaseModel):
    """
    Registro historico de ventas por mesa/fecha.
    Una mesa puede tener multiples comandas durante una sesion (mientras esta ocupada).
    """
    id: str
    branch_id: str
    table_id: str
    table_number: int = Field(description="Snapshot del numero de mesa")
    date: str = Field(description="Fecha YYYY-MM-DD")
    staff_id: Optional[str] = Field(description="ID del mozo que atendio", default=None)
    staff_name: Optional[str] = Field(description="Nombre del mozo (snapshot)", default=None)
    commands: List[OrderCommand] = Field(description="Lista de comandas de esta sesion", default=[])
    order_time: str = Field(description="Hora del primer pedido (HH:mm)")
    close_time: Optional[str] = Field(description="Hora de cierre (HH:mm), null si aun abierta", default=None)
    total: float = Field(description="Suma de subtotales de todas las comandas", ge=0, default=0)
    status: OrderHistoryStatus = Field(default=OrderHistoryStatus.ABIERTA)
    created_at: str
    updated_at: Optional[str] = None


class OrderCommandFormData(BaseModel):
    """Datos para crear una nueva comanda."""
    items: List[OrderCommandItem]
    notes: Optional[str] = None
```
