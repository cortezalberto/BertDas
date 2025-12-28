# Modelos SQLAlchemy y Diseño PostgreSQL - Restaurant Dashboard

## Diagrama de Relaciones (ERD)

```
┌─────────────────┐
│   restaurants   │
├─────────────────┤
│ id (PK)         │
│ name            │
│ slug (UNIQUE)   │
│ description     │
│ theme_color     │
│ logo            │
│ banner          │
│ address         │
│ phone           │
│ email           │
│ created_at      │
│ updated_at      │
└────────┬────────┘
         │ 1:N
         ▼
┌─────────────────┐       ┌──────────────────────┐
│    branches     │       │   promotion_types    │
├─────────────────┤       ├──────────────────────┤
│ id (PK)         │       │ id (PK)              │
│ restaurant_id   │───┐   │ name                 │
│ name            │   │   │ description          │
│ address         │   │   │ icon                 │
│ phone           │   │   │ is_active            │
│ email           │   │   │ created_at           │
│ image           │   │   │ updated_at           │
│ is_active       │   │   └──────────┬───────────┘
│ order           │   │              │ 1:N
│ created_at      │   │              ▼
│ updated_at      │   │   ┌──────────────────────┐
└────────┬────────┘   │   │     promotions       │
         │ 1:N        │   ├──────────────────────┤
         ▼            │   │ id (PK)              │
┌─────────────────┐   │   │ promotion_type_id    │──► promotion_types
│   categories    │   │   │ name                 │
├─────────────────┤   │   │ description          │
│ id (PK)         │   │   │ price                │
│ branch_id (FK)  │───┘   │ image                │
│ name            │       │ start_date           │
│ icon            │       │ end_date             │
│ image           │       │ start_time           │
│ order           │       │ end_time             │
│ is_active       │       │ is_active            │
│ created_at      │       │ created_at           │
│ updated_at      │       │ updated_at           │
└────────┬────────┘       └──────────┬───────────┘
         │ 1:N                       │
         ▼                           │ M:N
┌─────────────────┐                  ▼
│  subcategories  │       ┌──────────────────────┐
├─────────────────┤       │  promotion_branches  │ (tabla pivot)
│ id (PK)         │       ├──────────────────────┤
│ category_id(FK) │       │ promotion_id (PK,FK) │──► promotions
│ name            │       │ branch_id (PK,FK)    │──► branches
│ image           │       └──────────────────────┘
│ order           │
│ is_active       │       ┌──────────────────────┐
│ created_at      │       │   promotion_items    │ (tabla pivot)
│ updated_at      │       ├──────────────────────┤
└────────┬────────┘       │ id (PK)              │
         │ 1:N            │ promotion_id (FK)    │──► promotions
         ▼                │ product_id (FK)      │──► products
┌─────────────────┐       │ quantity             │
│    products     │       └──────────────────────┘
├─────────────────┤
│ id (PK)         │◄──────────────────────────────┐
│ category_id(FK) │                               │
│ subcategory_id  │       ┌──────────────────────┐│
│ name            │       │  product_allergens   ││ (tabla pivot)
│ description     │       ├──────────────────────┤│
│ price           │       │ product_id (PK,FK)   │┘
│ use_branch_pric │       │ allergen_id (PK,FK)  │──► allergens
│ image           │       └──────────────────────┘
│ featured        │
│ popular         │       ┌──────────────────────┐
│ badge           │       │    branch_prices     │
│ is_active       │       ├──────────────────────┤
│ stock           │       │ id (PK)              │
│ created_at      │       │ product_id (FK)      │──► products
│ updated_at      │       │ branch_id (FK)       │──► branches
└─────────────────┘       │ price                │
                          │ is_active            │
┌─────────────────┐       └──────────────────────┘
│    allergens    │
├─────────────────┤
│ id (PK)         │
│ name            │
│ icon            │
│ description     │
│ is_active       │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

---

## 1. Modelos SQLAlchemy

```python
"""
Modelos SQLAlchemy para Restaurant Dashboard
Requiere: pip install sqlalchemy psycopg2-binary
"""

from datetime import datetime, date, time
from typing import List, Optional
from sqlalchemy import (
    create_engine,
    Column,
    String,
    Text,
    Integer,
    Float,
    Boolean,
    DateTime,
    Date,
    Time,
    ForeignKey,
    Table,
    UniqueConstraint,
    Index,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    Session,
)
from sqlalchemy.dialects.postgresql import UUID
import uuid


class Base(DeclarativeBase):
    pass


# ============================================
# Tablas de asociación (Many-to-Many)
# ============================================

# Productos <-> Alérgenos (M:N)
product_allergens = Table(
    "product_allergens",
    Base.metadata,
    Column("product_id", UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("allergen_id", UUID(as_uuid=True), ForeignKey("allergens.id", ondelete="CASCADE"), primary_key=True),
)

# Promociones <-> Sucursales (M:N)
promotion_branches = Table(
    "promotion_branches",
    Base.metadata,
    Column("promotion_id", UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="CASCADE"), primary_key=True),
    Column("branch_id", UUID(as_uuid=True), ForeignKey("branches.id", ondelete="CASCADE"), primary_key=True),
)


# ============================================
# Restaurant
# ============================================

class Restaurant(Base):
    __tablename__ = "restaurants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    theme_color: Mapped[str] = mapped_column(String(20), nullable=False, default="#f97316")
    logo: Mapped[Optional[str]] = mapped_column(String(500))
    banner: Mapped[Optional[str]] = mapped_column(String(500))
    address: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    branches: Mapped[List["Branch"]] = relationship(back_populates="restaurant", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Restaurant(id={self.id}, name='{self.name}')>"


# ============================================
# Branch (Sucursal)
# ============================================

class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    restaurant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("restaurants.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    address: Mapped[Optional[str]] = mapped_column(String(200))
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    email: Mapped[Optional[str]] = mapped_column(String(100))
    image: Mapped[Optional[str]] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    restaurant: Mapped["Restaurant"] = relationship(back_populates="branches")
    categories: Mapped[List["Category"]] = relationship(back_populates="branch", cascade="all, delete-orphan")
    branch_prices: Mapped[List["BranchPrice"]] = relationship(back_populates="branch", cascade="all, delete-orphan")
    promotions: Mapped[List["Promotion"]] = relationship(secondary=promotion_branches, back_populates="branches")

    # Índices
    __table_args__ = (
        Index("idx_branches_restaurant", "restaurant_id"),
        Index("idx_branches_order", "order"),
    )

    def __repr__(self) -> str:
        return f"<Branch(id={self.id}, name='{self.name}')>"


# ============================================
# Category (Categoría)
# ============================================

class Category(Base):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    icon: Mapped[Optional[str]] = mapped_column(String(50))
    image: Mapped[Optional[str]] = mapped_column(String(500))
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    branch: Mapped["Branch"] = relationship(back_populates="categories")
    subcategories: Mapped[List["Subcategory"]] = relationship(back_populates="category", cascade="all, delete-orphan")
    products: Mapped[List["Product"]] = relationship(back_populates="category", cascade="all, delete-orphan")

    # Índices
    __table_args__ = (
        Index("idx_categories_branch", "branch_id"),
        Index("idx_categories_order", "order"),
    )

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name='{self.name}')>"


# ============================================
# Subcategory (Subcategoría)
# ============================================

class Subcategory(Base):
    __tablename__ = "subcategories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String(500))
    order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    category: Mapped["Category"] = relationship(back_populates="subcategories")
    products: Mapped[List["Product"]] = relationship(back_populates="subcategory")

    # Índices
    __table_args__ = (
        Index("idx_subcategories_category", "category_id"),
        Index("idx_subcategories_order", "order"),
    )

    def __repr__(self) -> str:
        return f"<Subcategory(id={self.id}, name='{self.name}')>"


# ============================================
# Allergen (Alérgeno)
# ============================================

class Allergen(Base):
    __tablename__ = "allergens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    icon: Mapped[Optional[str]] = mapped_column(String(50))
    description: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    products: Mapped[List["Product"]] = relationship(secondary=product_allergens, back_populates="allergens")

    def __repr__(self) -> str:
        return f"<Allergen(id={self.id}, name='{self.name}')>"


# ============================================
# Product (Producto)
# ============================================

class Product(Base):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    category_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)
    subcategory_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("subcategories.id", ondelete="SET NULL"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    price: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)  # Precio base
    use_branch_prices: Mapped[bool] = mapped_column(Boolean, default=False)  # Toggle para precios por sucursal
    image: Mapped[Optional[str]] = mapped_column(String(500))
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    popular: Mapped[bool] = mapped_column(Boolean, default=False)
    badge: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    stock: Mapped[Optional[int]] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    category: Mapped["Category"] = relationship(back_populates="products")
    subcategory: Mapped[Optional["Subcategory"]] = relationship(back_populates="products")
    allergens: Mapped[List["Allergen"]] = relationship(secondary=product_allergens, back_populates="products")
    branch_prices: Mapped[List["BranchPrice"]] = relationship(back_populates="product", cascade="all, delete-orphan")
    promotion_items: Mapped[List["PromotionItem"]] = relationship(back_populates="product", cascade="all, delete-orphan")

    # Índices
    __table_args__ = (
        Index("idx_products_category", "category_id"),
        Index("idx_products_subcategory", "subcategory_id"),
        Index("idx_products_featured", "featured"),
        Index("idx_products_popular", "popular"),
        Index("idx_products_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name='{self.name}', price={self.price})>"


# ============================================
# BranchPrice (Precio por Sucursal)
# ============================================

class BranchPrice(Base):
    __tablename__ = "branch_prices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("branches.id", ondelete="CASCADE"), nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)  # Si el producto se vende en esta sucursal

    # Relaciones
    product: Mapped["Product"] = relationship(back_populates="branch_prices")
    branch: Mapped["Branch"] = relationship(back_populates="branch_prices")

    # Restricción única: un producto solo puede tener un precio por sucursal
    __table_args__ = (
        UniqueConstraint("product_id", "branch_id", name="uq_product_branch_price"),
        Index("idx_branch_prices_product", "product_id"),
        Index("idx_branch_prices_branch", "branch_id"),
    )

    def __repr__(self) -> str:
        return f"<BranchPrice(product_id={self.product_id}, branch_id={self.branch_id}, price={self.price})>"


# ============================================
# PromotionType (Tipo de Promoción)
# ============================================

class PromotionType(Base):
    __tablename__ = "promotion_types"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    icon: Mapped[Optional[str]] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    promotions: Mapped[List["Promotion"]] = relationship(back_populates="promotion_type", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<PromotionType(id={self.id}, name='{self.name}')>"


# ============================================
# Promotion (Promoción)
# ============================================

class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promotion_type_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("promotion_types.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    image: Mapped[Optional[str]] = mapped_column(String(500))
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(0, 0))
    end_time: Mapped[time] = mapped_column(Time, nullable=False, default=time(23, 59))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relaciones
    promotion_type: Mapped["PromotionType"] = relationship(back_populates="promotions")
    branches: Mapped[List["Branch"]] = relationship(secondary=promotion_branches, back_populates="promotions")
    items: Mapped[List["PromotionItem"]] = relationship(back_populates="promotion", cascade="all, delete-orphan")

    # Índices
    __table_args__ = (
        Index("idx_promotions_type", "promotion_type_id"),
        Index("idx_promotions_dates", "start_date", "end_date"),
        Index("idx_promotions_active", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Promotion(id={self.id}, name='{self.name}', price={self.price})>"


# ============================================
# PromotionItem (Producto en Promoción)
# ============================================

class PromotionItem(Base):
    __tablename__ = "promotion_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    promotion_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("promotions.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)

    # Relaciones
    promotion: Mapped["Promotion"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="promotion_items")

    # Restricción única: un producto solo puede aparecer una vez por promoción
    __table_args__ = (
        UniqueConstraint("promotion_id", "product_id", name="uq_promotion_product"),
        Index("idx_promotion_items_promotion", "promotion_id"),
        Index("idx_promotion_items_product", "product_id"),
    )

    def __repr__(self) -> str:
        return f"<PromotionItem(promotion_id={self.promotion_id}, product_id={self.product_id}, quantity={self.quantity})>"


# ============================================
# Función para crear todas las tablas
# ============================================

def create_database(database_url: str):
    """Crea todas las tablas en la base de datos."""
    engine = create_engine(database_url, echo=True)
    Base.metadata.create_all(engine)
    return engine


# Ejemplo de uso:
# engine = create_database("postgresql://user:password@localhost:5432/restaurant_db")
```

---

## 2. Script SQL para PostgreSQL

```sql
-- ============================================
-- Script de creación de tablas PostgreSQL
-- Restaurant Dashboard
-- ============================================

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Tabla: restaurants
-- ============================================
CREATE TABLE restaurants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    theme_color VARCHAR(20) NOT NULL DEFAULT '#f97316',
    logo VARCHAR(500),
    banner VARCHAR(500),
    address VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_restaurants_slug ON restaurants(slug);

-- ============================================
-- Tabla: branches (sucursales)
-- ============================================
CREATE TABLE branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(200),
    phone VARCHAR(50),
    email VARCHAR(100),
    image VARCHAR(500),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    "order" INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_branches_restaurant ON branches(restaurant_id);
CREATE INDEX idx_branches_order ON branches("order");
CREATE INDEX idx_branches_active ON branches(is_active);

-- ============================================
-- Tabla: categories (categorías)
-- ============================================
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    image VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_categories_branch ON categories(branch_id);
CREATE INDEX idx_categories_order ON categories("order");
CREATE INDEX idx_categories_active ON categories(is_active);

-- ============================================
-- Tabla: subcategories (subcategorías)
-- ============================================
CREATE TABLE subcategories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    image VARCHAR(500),
    "order" INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_subcategories_category ON subcategories(category_id);
CREATE INDEX idx_subcategories_order ON subcategories("order");
CREATE INDEX idx_subcategories_active ON subcategories(is_active);

-- ============================================
-- Tabla: allergens (alérgenos)
-- ============================================
CREATE TABLE allergens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    icon VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_allergens_active ON allergens(is_active);

-- ============================================
-- Tabla: products (productos)
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    subcategory_id UUID REFERENCES subcategories(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    use_branch_prices BOOLEAN NOT NULL DEFAULT FALSE,
    image VARCHAR(500),
    featured BOOLEAN NOT NULL DEFAULT FALSE,
    popular BOOLEAN NOT NULL DEFAULT FALSE,
    badge VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    stock INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_subcategory ON products(subcategory_id);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = TRUE;
CREATE INDEX idx_products_popular ON products(popular) WHERE popular = TRUE;
CREATE INDEX idx_products_active ON products(is_active);

-- ============================================
-- Tabla: product_allergens (M:N productos-alérgenos)
-- ============================================
CREATE TABLE product_allergens (
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    allergen_id UUID NOT NULL REFERENCES allergens(id) ON DELETE CASCADE,
    PRIMARY KEY (product_id, allergen_id)
);

CREATE INDEX idx_product_allergens_product ON product_allergens(product_id);
CREATE INDEX idx_product_allergens_allergen ON product_allergens(allergen_id);

-- ============================================
-- Tabla: branch_prices (precios por sucursal)
-- ============================================
CREATE TABLE branch_prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_product_branch_price UNIQUE (product_id, branch_id)
);

CREATE INDEX idx_branch_prices_product ON branch_prices(product_id);
CREATE INDEX idx_branch_prices_branch ON branch_prices(branch_id);

-- ============================================
-- Tabla: promotion_types (tipos de promoción)
-- ============================================
CREATE TABLE promotion_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_promotion_types_active ON promotion_types(is_active);

-- ============================================
-- Tabla: promotions (promociones)
-- ============================================
CREATE TABLE promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_type_id UUID NOT NULL REFERENCES promotion_types(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    start_time TIME NOT NULL DEFAULT '00:00:00',
    end_time TIME NOT NULL DEFAULT '23:59:00',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_promotion_dates CHECK (end_date >= start_date)
);

CREATE INDEX idx_promotions_type ON promotions(promotion_type_id);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);
CREATE INDEX idx_promotions_active ON promotions(is_active);

-- ============================================
-- Tabla: promotion_branches (M:N promociones-sucursales)
-- ============================================
CREATE TABLE promotion_branches (
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    PRIMARY KEY (promotion_id, branch_id)
);

CREATE INDEX idx_promotion_branches_promotion ON promotion_branches(promotion_id);
CREATE INDEX idx_promotion_branches_branch ON promotion_branches(branch_id);

-- ============================================
-- Tabla: promotion_items (productos en promoción)
-- ============================================
CREATE TABLE promotion_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    promotion_id UUID NOT NULL REFERENCES promotions(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT uq_promotion_product UNIQUE (promotion_id, product_id),
    CONSTRAINT chk_quantity_positive CHECK (quantity > 0)
);

CREATE INDEX idx_promotion_items_promotion ON promotion_items(promotion_id);
CREATE INDEX idx_promotion_items_product ON promotion_items(product_id);

-- ============================================
-- Función para actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
CREATE TRIGGER update_restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON subcategories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_allergens_updated_at BEFORE UPDATE ON allergens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotion_types_updated_at BEFORE UPDATE ON promotion_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_promotions_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Datos iniciales de alérgenos
-- ============================================
INSERT INTO allergens (name, icon, description) VALUES
    ('Gluten', '🌾', 'Cereales que contienen gluten'),
    ('Lacteos', '🥛', 'Leche y productos lácteos'),
    ('Huevos', '🥚', 'Huevos y derivados'),
    ('Pescado', '🐟', 'Pescado y productos de pescado'),
    ('Mariscos', '🦐', 'Crustáceos y moluscos'),
    ('Frutos Secos', '🥜', 'Nueces, almendras, avellanas, etc.'),
    ('Soja', '🫘', 'Soja y productos de soja'),
    ('Apio', '🥬', 'Apio y productos derivados'),
    ('Mostaza', '🟡', 'Mostaza y productos derivados'),
    ('Sesamo', '⚪', 'Semillas de sésamo'),
    ('Sulfitos', '🍷', 'Dióxido de azufre y sulfitos'),
    ('Altramuces', '🌱', 'Altramuces y productos derivados');

-- ============================================
-- Datos iniciales de tipos de promoción
-- ============================================
INSERT INTO promotion_types (name, icon, description) VALUES
    ('Happy Hour', '🍺', 'Descuentos en horarios específicos'),
    ('Combo Familiar', '👨‍👩‍👧‍👦', 'Combos para familias'),
    ('2x1', '🎉', 'Paga uno y lleva dos'),
    ('Descuento', '💰', 'Porcentaje de descuento');
```

---

## 3. Resumen de Relaciones

| Relación | Tipo | Tabla Pivot | Descripción |
|----------|------|-------------|-------------|
| Restaurant → Branch | 1:N | - | Un restaurante tiene muchas sucursales |
| Branch → Category | 1:N | - | Una sucursal tiene muchas categorías |
| Category → Subcategory | 1:N | - | Una categoría tiene muchas subcategorías |
| Category → Product | 1:N | - | Una categoría tiene muchos productos |
| Subcategory → Product | 1:N | - | Una subcategoría tiene muchos productos |
| Product ↔ Allergen | M:N | `product_allergens` | Productos pueden tener múltiples alérgenos |
| Product → BranchPrice | 1:N | - | Un producto puede tener precios por sucursal |
| Branch → BranchPrice | 1:N | - | Una sucursal tiene precios de productos |
| PromotionType → Promotion | 1:N | - | Un tipo tiene muchas promociones |
| Promotion ↔ Branch | M:N | `promotion_branches` | Promociones aplican en múltiples sucursales |
| Promotion → PromotionItem | 1:N | - | Una promoción tiene múltiples productos |
| Product → PromotionItem | 1:N | - | Un producto puede estar en múltiples promociones |

---

## 4. Consultas SQL Útiles

```sql
-- Obtener productos con sus alérgenos
SELECT p.*, array_agg(a.name) as allergens
FROM products p
LEFT JOIN product_allergens pa ON p.id = pa.product_id
LEFT JOIN allergens a ON pa.allergen_id = a.id
WHERE p.category_id = 'uuid-categoria'
GROUP BY p.id;

-- Obtener precio de producto por sucursal
SELECT
    p.id,
    p.name,
    p.price as base_price,
    bp.price as branch_price,
    b.name as branch_name
FROM products p
LEFT JOIN branch_prices bp ON p.id = bp.product_id
LEFT JOIN branches b ON bp.branch_id = b.id
WHERE p.use_branch_prices = TRUE;

-- Promociones activas con sus productos
SELECT
    pr.*,
    pt.name as tipo,
    array_agg(DISTINCT b.name) as sucursales,
    json_agg(json_build_object('producto', prod.name, 'cantidad', pi.quantity)) as items
FROM promotions pr
JOIN promotion_types pt ON pr.promotion_type_id = pt.id
JOIN promotion_branches pb ON pr.id = pb.promotion_id
JOIN branches b ON pb.branch_id = b.id
JOIN promotion_items pi ON pr.id = pi.promotion_id
JOIN products prod ON pi.product_id = prod.id
WHERE pr.is_active = TRUE
  AND CURRENT_DATE BETWEEN pr.start_date AND pr.end_date
  AND CURRENT_TIME BETWEEN pr.start_time AND pr.end_time
GROUP BY pr.id, pt.name;

-- Estadísticas del dashboard
SELECT
    COUNT(*) as total_products,
    COUNT(*) FILTER (WHERE is_active = TRUE) as active_products,
    COUNT(*) FILTER (WHERE featured = TRUE) as featured_products,
    COUNT(*) FILTER (WHERE popular = TRUE) as popular_products
FROM products
WHERE category_id IN (
    SELECT id FROM categories WHERE branch_id = 'uuid-sucursal'
);
```
