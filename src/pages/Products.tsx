import { useState, useMemo, useCallback, useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, Filter, Star, TrendingUp } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { PageContainer } from '../components/layout'
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Select,
  Textarea,
  ImageUpload,
  Toggle,
  ConfirmDialog,
  Badge,
  AllergenSelect,
  Pagination,
  BranchPriceInput,
  HelpButton,
} from '../components/ui'
import { usePagination } from '../hooks/usePagination'
import { useCategoryStore, selectCategories } from '../stores/categoryStore'
import { useSubcategoryStore, selectSubcategories } from '../stores/subcategoryStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { useAllergenStore, selectAllergens } from '../stores/allergenStore'
import { useBadgeStore, selectBadges } from '../stores/badgeStore'
import { useSealStore, selectSeals } from '../stores/sealStore'
import { cascadeDeleteProduct } from '../services/cascadeService'
import {
  useBranchStore,
  selectSelectedBranchId,
  selectBranchById,
} from '../stores/branchStore'
import { toast } from '../stores/toastStore'
import { validateProduct } from '../utils/validation'
import { handleError } from '../utils/logger'
import { HOME_CATEGORY_NAME, formatPrice } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Product, ProductFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'
import type { BranchPriceErrors } from '../utils/validation'

const initialFormData: ProductFormData = {
  name: '',
  description: '',
  price: 0,
  branch_prices: [],
  use_branch_prices: false,
  image: '',
  category_id: '',
  subcategory_id: '',
  featured: false,
  popular: false,
  badge: '',
  seal: '',
  allergen_ids: [],
  is_active: true,
  stock: undefined,
}

export function ProductsPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Productos')

  const navigate = useNavigate()

  const categories = useCategoryStore(selectCategories)
  const subcategories = useSubcategoryStore(selectSubcategories)
  const getByCategory = useSubcategoryStore((s) => s.getByCategory)
  const products = useProductStore(selectProducts)
  const addProduct = useProductStore((s) => s.addProduct)
  const updateProduct = useProductStore((s) => s.updateProduct)
  const allergens = useAllergenStore(selectAllergens)
  const badges = useBadgeStore(selectBadges)
  const seals = useSealStore(selectSeals)

  const selectedBranchId = useBranchStore(selectSelectedBranchId)
  const selectedBranch = useBranchStore(selectBranchById(selectedBranchId))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState<ProductFormData>(initialFormData)
  const [branchPriceErrors, setBranchPriceErrors] = useState<BranchPriceErrors>({})
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterSubcategory, setFilterSubcategory] = useState<string>('')

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<ProductFormData>, formDataSubmit: FormData): Promise<FormState<ProductFormData>> => {
      // Extract simple fields from FormData
      const data: ProductFormData = {
        name: formDataSubmit.get('name') as string,
        description: formDataSubmit.get('description') as string,
        price: parseFloat(formDataSubmit.get('price') as string) || 0,
        image: formDataSubmit.get('image') as string,
        category_id: formDataSubmit.get('category_id') as string,
        subcategory_id: formDataSubmit.get('subcategory_id') as string,
        badge: formDataSubmit.get('badge') as string,
        seal: formDataSubmit.get('seal') as string,
        featured: formDataSubmit.get('featured') === 'on',
        popular: formDataSubmit.get('popular') === 'on',
        is_active: formDataSubmit.get('is_active') === 'on',
        stock: formDataSubmit.get('stock') ? parseInt(formDataSubmit.get('stock') as string, 10) : undefined,
        // Complex fields from component state (not FormData)
        allergen_ids: formData.allergen_ids,
        branch_prices: formData.branch_prices,
        use_branch_prices: formData.use_branch_prices,
      }

      const validation = validateProduct(data)
      if (!validation.isValid) {
        setBranchPriceErrors(validation.branchPriceErrors)
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (selectedProduct) {
          updateProduct(selectedProduct.id, data)
          toast.success('Producto actualizado correctamente')
        } else {
          addProduct(data)
          toast.success('Producto creado correctamente')
        }
        return { isSuccess: true }
      } catch (error) {
        const message = handleError(error, 'ProductsPage.submitAction')
        toast.error(`Error al guardar el producto: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [selectedProduct, updateProduct, addProduct, formData.allergen_ids, formData.branch_prices, formData.use_branch_prices]
  )

  const [state, formAction, isPending] = useActionState<FormState<ProductFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // Close modal on success
  if (state.isSuccess && isModalOpen) {
    setIsModalOpen(false)
    setSelectedProduct(null)
    setFormData(initialFormData)
    setBranchPriceErrors({})
  }

  // Filtrar categorias por sucursal seleccionada
  const branchCategories = useMemo(() => {
    if (!selectedBranchId) return []
    return categories.filter(
      (c) => c.branch_id === selectedBranchId && c.name !== HOME_CATEGORY_NAME
    )
  }, [categories, selectedBranchId])

  // Obtener IDs de categorias de esta sucursal
  const branchCategoryIds = useMemo(
    () => new Set(branchCategories.map((c) => c.id)),
    [branchCategories]
  )

  // Filter categories (Home categories already filtered by name in branchCategories)
  const selectableCategories = useMemo(
    () => branchCategories,
    [branchCategories]
  )

  const categoryOptions = useMemo(
    () => selectableCategories.map((c) => ({ value: c.id, label: c.name })),
    [selectableCategories]
  )

  // Create allergen lookup map for performance
  const allergenMap = useMemo(
    () => new Map(allergens.map((a) => [a.id, a])),
    [allergens]
  )

  // Get subcategories for selected category in form
  const formSubcategoryOptions = useMemo(() => {
    if (!formData.category_id) return []
    return getByCategory(formData.category_id).map((s) => ({
      value: s.id,
      label: s.name,
    }))
  }, [formData.category_id, getByCategory])

  // Get subcategories for filter
  const filterSubcategoryOptions = useMemo(() => {
    if (!filterCategory) return []
    return getByCategory(filterCategory).map((s) => ({
      value: s.id,
      label: s.name,
    }))
  }, [filterCategory, getByCategory])

  const filteredProducts = useMemo(() => {
    // Filtrar por sucursal primero
    let result = products.filter((p) => branchCategoryIds.has(p.category_id))
    if (filterCategory) {
      result = result.filter((p) => p.category_id === filterCategory)
    }
    if (filterSubcategory) {
      result = result.filter((p) => p.subcategory_id === filterSubcategory)
    }
    return result.sort((a, b) => a.name.localeCompare(b.name))
  }, [products, branchCategoryIds, filterCategory, filterSubcategory])

  const {
    paginatedItems: paginatedProducts,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(filteredProducts)

  // Productos de la sucursal (para conteo en titulo)
  const branchProducts = useMemo(
    () => products.filter((p) => branchCategoryIds.has(p.category_id)),
    [products, branchCategoryIds]
  )

  const getCategoryName = useCallback((categoryId: string): string => {
    return categories.find((c) => c.id === categoryId)?.name || 'Sin categoria'
  }, [categories])

  const getSubcategoryName = useCallback((subcategoryId: string): string => {
    return subcategories.find((s) => s.id === subcategoryId)?.name || 'Sin subcategoria'
  }, [subcategories])

  const openCreateModal = useCallback(() => {
    if (!selectedBranchId) {
      toast.error('Selecciona una sucursal primero')
      return
    }
    if (selectableCategories.length === 0) {
      toast.error('No hay categorias en esta sucursal. Crea una primero.')
      return
    }
    setSelectedProduct(null)
    const categoryId = filterCategory || selectableCategories[0]?.id || ''
    const subcats = getByCategory(categoryId)
    setFormData({
      ...initialFormData,
      category_id: categoryId,
      subcategory_id: filterSubcategory || subcats[0]?.id || '',
    })
    setBranchPriceErrors({})
    setIsModalOpen(true)
  }, [selectedBranchId, selectableCategories, filterCategory, filterSubcategory, getByCategory])

  const openEditModal = useCallback((product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      description: product.description,
      price: product.price,
      branch_prices: product.branch_prices || [],
      use_branch_prices: product.use_branch_prices || false,
      image: product.image,
      category_id: product.category_id,
      subcategory_id: product.subcategory_id,
      featured: product.featured,
      popular: product.popular,
      badge: product.badge || '',
      seal: product.seal || '',
      allergen_ids: product.allergen_ids || [],
      is_active: product.is_active ?? true,
      stock: product.stock,
    })
    setBranchPriceErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((product: Product) => {
    setSelectedProduct(product)
    setIsDeleteOpen(true)
  }, [])


  const handleDelete = useCallback(() => {
    if (!selectedProduct) return

    try {
      const result = cascadeDeleteProduct(selectedProduct.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar el producto')
        setIsDeleteOpen(false)
        return
      }

      toast.success('Producto eliminado correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'ProductsPage.handleDelete')
      toast.error(`Error al eliminar el producto: ${message}`)
    }
  }, [selectedProduct])

  const handleCategoryChange = (categoryId: string) => {
    const subcats = getByCategory(categoryId)
    setFormData((prev) => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: subcats[0]?.id || '',
    }))
  }

  const columns: TableColumn<Product>[] = useMemo(() => [
    {
      key: 'image',
      label: 'Imagen',
      width: 'w-20',
      render: (item: Product) =>
        item.image ? (
          <img
            src={item.image}
            alt={`Imagen de ${item.name}`}
            className="w-12 h-12 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-600"
            aria-label="Sin imagen"
          >
            -
          </div>
        ),
    },
    {
      key: 'name',
      label: 'Producto',
      render: (item) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{item.name}</span>
            {item.featured && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" aria-label="Destacado" />}
            {item.popular && <TrendingUp className="w-4 h-4 text-green-500" aria-label="Popular" />}
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">
            {item.description}
          </p>
        </div>
      ),
    },
    {
      key: 'price',
      label: 'Precio',
      width: 'w-36',
      render: (item) => {
        const branchPrices = item.branch_prices ?? []
        // If not using branch prices or no branch prices set, show base price
        if (!item.use_branch_prices || branchPrices.length === 0) {
          return (
            <span className="font-medium text-orange-500">
              {formatPrice(item.price)}
            </span>
          )
        }

        // Get active branch prices
        const activePrices = branchPrices
          .filter((bp) => bp.is_active)
          .map((bp) => bp.price)

        if (activePrices.length === 0) {
          return <span className="text-zinc-500">-</span>
        }

        const minPrice = Math.min(...activePrices)
        const maxPrice = Math.max(...activePrices)

        // If all prices are the same, show single price
        if (minPrice === maxPrice) {
          return (
            <span className="font-medium text-orange-500">
              {formatPrice(minPrice)}
            </span>
          )
        }

        // Show price range
        return (
          <div className="space-y-0.5">
            <span className="font-medium text-orange-500">
              {formatPrice(minPrice)} - {formatPrice(maxPrice)}
            </span>
            <div className="text-xs text-zinc-500">
              {activePrices.length} sucursales
            </div>
          </div>
        )
      },
    },
    {
      key: 'category_id',
      label: 'Categoria',
      render: (item) => (
        <div className="space-y-1">
          <Badge variant="info">{getCategoryName(item.category_id)}</Badge>
          <div className="text-xs text-zinc-500">
            {getSubcategoryName(item.subcategory_id)}
          </div>
        </div>
      ),
    },
    {
      key: 'allergen_ids',
      label: 'Alergenos',
      width: 'w-32',
      render: (item) => {
        const productAllergens = (item.allergen_ids || [])
          .map((id) => allergenMap.get(id))
          .filter(Boolean)
        if (productAllergens.length === 0) {
          return <span className="text-zinc-600">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1" title={productAllergens.map((a) => a?.name).join(', ')}>
            {productAllergens.slice(0, 3).map((allergen) => (
              <span
                key={allergen?.id}
                className="text-lg"
                aria-label={allergen?.name}
              >
                {allergen?.icon}
              </span>
            ))}
            {productAllergens.length > 3 && (
              <span className="text-xs text-zinc-500">+{productAllergens.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'badge',
      label: 'Badge',
      width: 'w-24',
      render: (item) =>
        item.badge ? (
          <Badge variant="warning">{item.badge}</Badge>
        ) : (
          <span className="text-zinc-600">-</span>
        ),
    },
    {
      key: 'is_active',
      label: 'Estado',
      width: 'w-24',
      render: (item) =>
        item.is_active !== false ? (
          <Badge variant="success">
            <span className="sr-only">Estado:</span> Activo
          </Badge>
        ) : (
          <Badge variant="danger">
            <span className="sr-only">Estado:</span> Inactivo
          </Badge>
        ),
    },
    {
      key: 'actions',
      label: 'Acciones',
      width: 'w-28',
      render: (item) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openEditModal(item)
            }}
            aria-label={`Editar ${item.name}`}
          >
            <Pencil className="w-4 h-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openDeleteDialog(item)
            }}
            className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
            aria-label={`Eliminar ${item.name}`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      ),
    },
  ], [allergenMap, openEditModal, openDeleteDialog, getCategoryName, getSubcategoryName])

  // Si no hay sucursal seleccionada, mostrar mensaje
  if (!selectedBranchId) {
    return (
      <PageContainer
        title="Productos"
        description="Selecciona una sucursal para ver sus productos"
        helpContent={helpContent.products}
      >
        <Card className="text-center py-12">
          <p className="text-zinc-500 mb-4">
            Selecciona una sucursal desde el Dashboard para ver sus productos
          </p>
          <Button onClick={() => navigate('/')}>Ir al Dashboard</Button>
        </Card>
      </PageContainer>
    )
  }

  return (
    <>
      {/* REACT 19 IMPROVEMENT: Document metadata */}
      <title>{selectedBranch ? `Productos - ${selectedBranch.name}` : 'Productos - Dashboard'}</title>
      <meta name="description" content={`${branchProducts.length} productos en ${selectedBranch?.name || 'la sucursal'}`} />

      <PageContainer
        title={`Productos - ${selectedBranch?.name || ''}`}
        description={`${branchProducts.length} productos en ${selectedBranch?.name || 'la sucursal'}`}
        helpContent={helpContent.products}
        actions={
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Producto
          </Button>
        }
      >
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-zinc-500" aria-hidden="true" />
          <Select
            options={[
              { value: '', label: 'Todas las categorias' },
              ...categoryOptions,
            ]}
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value)
              setFilterSubcategory('')
            }}
            className="w-48"
            aria-label="Filtrar por categoria"
          />
          {filterCategory && (
            <Select
              options={[
                { value: '', label: 'Todas las subcategorias' },
                ...filterSubcategoryOptions,
              ]}
              value={filterSubcategory}
              onChange={(e) => setFilterSubcategory(e.target.value)}
              className="w-48"
              aria-label="Filtrar por subcategoria"
            />
          )}
          {(filterCategory || filterSubcategory) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilterCategory('')
                setFilterSubcategory('')
              }}
            >
              Limpiar filtros
            </Button>
          )}
          <div className="ml-auto text-sm text-zinc-500">
            {filteredProducts.length} de {branchProducts.length} productos
          </div>
        </div>
      </Card>

      <Card padding="none">
        <Table
          data={paginatedProducts}
          columns={columns}
          emptyMessage="No hay productos. Crea uno para comenzar."
          ariaLabel="Lista de productos"
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="product-form" isLoading={isPending}>
              {selectedProduct ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="product-form" action={formAction} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Producto"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar un producto:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Categoria y Subcategoria:</strong> Ubicacion del producto en el menu.
                    </li>
                    <li>
                      <strong>Nombre:</strong> Nombre del producto (ej: Hamburguesa Clasica). Es obligatorio.
                    </li>
                    <li>
                      <strong>Descripcion:</strong> Detalle del producto que veran los clientes.
                    </li>
                    <li>
                      <strong>Precio:</strong> Precio base o precios diferenciados por sucursal.
                    </li>
                    <li>
                      <strong>Badge:</strong> Etiqueta especial como "NUEVO", "VEGANO", "PROMO".
                    </li>
                    <li>
                      <strong>Imagen:</strong> Foto del producto para el menu.
                    </li>
                    <li>
                      <strong>Alergenos:</strong> Selecciona los alergenos que contiene el producto.
                    </li>
                    <li>
                      <strong>Destacado/Popular:</strong> Marca productos especiales que apareceran resaltados.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Una buena descripcion y foto aumentan las ventas. Incluye ingredientes principales y tamano de la porcion.
                    </p>
                  </div>
                </div>
              }
            />
            <span className="text-sm text-zinc-400">Ayuda sobre el formulario</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Categoria"
              name="category_id"
              options={categoryOptions}
              value={formData.category_id}
              onChange={(e) => handleCategoryChange(e.target.value)}
              placeholder="Selecciona una categoria"
              error={state.errors?.category_id}
            />

            <Select
              label="Subcategoria"
              name="subcategory_id"
              options={formSubcategoryOptions}
              value={formData.subcategory_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, subcategory_id: e.target.value }))
              }
              placeholder="Selecciona una subcategoria"
              error={state.errors?.subcategory_id}
              disabled={!formData.category_id}
            />
          </div>

          <Input
            label="Nombre"
            name="name"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Hamburguesa Clasica"
            error={state.errors?.name}
          />

          <Textarea
            label="Descripcion"
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion del producto..."
            error={state.errors?.description}
            rows={2}
          />

          <input type="hidden" name="price" value={formData.price} />
          <BranchPriceInput
            label="Precio"
            defaultPrice={formData.price}
            branchPrices={formData.branch_prices}
            useBranchPrices={formData.use_branch_prices}
            onDefaultPriceChange={(price) =>
              setFormData((prev) => ({ ...prev, price }))
            }
            onBranchPricesChange={(branch_prices) =>
              setFormData((prev) => ({ ...prev, branch_prices }))
            }
            onUseBranchPricesChange={(use_branch_prices) =>
              setFormData((prev) => ({ ...prev, use_branch_prices }))
            }
            error={state.errors?.price || state.errors?.branch_prices}
            priceErrors={branchPriceErrors}
          />

          <input type="hidden" name="image" value={formData.image} />
          <ImageUpload
            label="Imagen"
            value={formData.image}
            onChange={(url) =>
              setFormData((prev) => ({ ...prev, image: url }))
            }
          />

          <AllergenSelect
            label="Alergenos"
            value={formData.allergen_ids}
            onChange={(allergenIds) =>
              setFormData((prev) => ({ ...prev, allergen_ids: allergenIds }))
            }
          />

          <Select
            label="Insignia"
            name="badge"
            placeholder="Sin insignia"
            value={formData.badge}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, badge: e.target.value }))
            }
            error={state.errors?.badge}
            options={badges
              .filter((b) => b.is_active)
              .map((badge) => ({
                value: badge.name,
                label: badge.name,
              }))}
          />

          <Select
            label="Sello"
            name="seal"
            placeholder="Sin sello"
            value={formData.seal}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, seal: e.target.value }))
            }
            error={state.errors?.seal}
            options={seals
              .filter((s) => s.is_active)
              .map((seal) => ({
                value: seal.name,
                label: seal.icon ? `${seal.icon} ${seal.name}` : seal.name,
              }))}
          />

          {formData.stock !== undefined && (
            <Input
              label="Stock (opcional)"
              name="stock"
              type="number"
              value={formData.stock || ''}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  stock: e.target.value ? parseInt(e.target.value, 10) : undefined,
                }))
              }
              min={0}
            />
          )}

          <div className="flex gap-6">
            <Toggle
              label="Destacado"
              name="featured"
              checked={formData.featured}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, featured: e.target.checked }))
              }
            />

            <Toggle
              label="Popular"
              name="popular"
              checked={formData.popular}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, popular: e.target.checked }))
              }
            />

            <Toggle
              label="Activo"
              name="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
              }
            />
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Producto"
        message={`¿Estas seguro de eliminar "${selectedProduct?.name}"?`}
        confirmLabel="Eliminar"
      />
      </PageContainer>
    </>
  )
}

export default ProductsPage
