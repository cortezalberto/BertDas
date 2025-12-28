import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { PageContainer } from '../components/layout'
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  ImageUpload,
  Toggle,
  ConfirmDialog,
  Badge,
  Pagination,
  HelpButton,
} from '../components/ui'
import { usePagination } from '../hooks/usePagination'
import {
  useCategoryStore,
  selectCategories,
} from '../stores/categoryStore'
import {
  useBranchStore,
  selectSelectedBranchId,
  selectBranchById,
} from '../stores/branchStore'
import { useSubcategoryStore } from '../stores/subcategoryStore'
import { cascadeDeleteCategory } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validateCategory, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import { HOME_CATEGORY_NAME } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Category, CategoryFormData, TableColumn } from '../types'

const initialFormData: CategoryFormData = {
  name: '',
  icon: '',
  image: '',
  order: 0,
  branch_id: '',
  is_active: true,
}

export function CategoriesPage() {
  const navigate = useNavigate()
  const categories = useCategoryStore(selectCategories)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const updateCategory = useCategoryStore((s) => s.updateCategory)

  const selectedBranchId = useBranchStore(selectSelectedBranchId)
  const selectedBranch = useBranchStore(selectBranchById(selectedBranchId))

  const getByCategory = useSubcategoryStore((s) => s.getByCategory)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [formData, setFormData] = useState<CategoryFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<CategoryFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtrar categorías por sucursal seleccionada
  const branchCategories = useMemo(() => {
    if (!selectedBranchId) return []
    return categories.filter(
      (c) => c.branch_id === selectedBranchId && c.name !== HOME_CATEGORY_NAME
    )
  }, [categories, selectedBranchId])

  const sortedCategories = useMemo(
    () => [...branchCategories].sort((a, b) => a.order - b.order),
    [branchCategories]
  )

  const {
    paginatedItems: paginatedCategories,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedCategories)

  const openCreateModal = useCallback(() => {
    if (!selectedBranchId) {
      toast.error('Selecciona una sucursal primero')
      return
    }
    setSelectedCategory(null)
    const orders = branchCategories.map((c) => c.order).filter((o) => typeof o === 'number' && !isNaN(o))
    setFormData({
      ...initialFormData,
      branch_id: selectedBranchId,
      order: (orders.length > 0 ? Math.max(...orders) : 0) + 1,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [branchCategories, selectedBranchId])

  const openEditModal = useCallback(
    (category: Category) => {
      setSelectedCategory(category)
      setFormData({
        name: category.name,
        icon: category.icon || '',
        image: category.image || '',
        order: category.order,
        branch_id: category.branch_id,
        is_active: category.is_active ?? true,
      })
      setErrors({})
      setIsModalOpen(true)
    },
    []
  )

  const openDeleteDialog = useCallback((category: Category) => {
    setSelectedCategory(category)
    setIsDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const validation = validateCategory(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedCategory) {
        updateCategory(selectedCategory.id, formData)
        toast.success('Categoria actualizada correctamente')
      } else {
        addCategory(formData)
        toast.success('Categoria creada correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'CategoriesPage.handleSubmit')
      toast.error(`Error al guardar la categoria: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedCategory, updateCategory, addCategory])

  const handleDelete = useCallback(() => {
    if (!selectedCategory) return

    try {
      const result = cascadeDeleteCategory(selectedCategory.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar la categoria')
        setIsDeleteOpen(false)
        return
      }

      toast.success('Categoria eliminada correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'CategoriesPage.handleDelete')
      toast.error(`Error al eliminar la categoria: ${message}`)
    }
  }, [selectedCategory])

  const columns: TableColumn<Category>[] = useMemo(
    () => [
      {
        key: 'order',
        label: '',
        width: 'w-10',
        render: () => (
          <GripVertical
            className="w-4 h-4 text-zinc-600 cursor-grab"
            aria-hidden="true"
          />
        ),
      },
      {
        key: 'image',
        label: 'Imagen',
        width: 'w-20',
        render: (item) =>
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
        label: 'Nombre',
        render: (item) => <span className="font-medium">{item.name}</span>,
      },
      {
        key: 'orderDisplay',
        label: 'Orden',
        width: 'w-20',
        render: (item) => item.order,
      },
      {
        key: 'is_active',
        label: 'Estado',
        width: 'w-24',
        render: (item) =>
          item.is_active !== false ? (
            <Badge variant="success">
              <span className="sr-only">Estado:</span> Activa
            </Badge>
          ) : (
            <Badge variant="danger">
              <span className="sr-only">Estado:</span> Inactiva
            </Badge>
          ),
      },
      {
        key: 'subcategories',
        label: 'Subcategorias',
        width: 'w-32',
        render: (item) => {
          const count = getByCategory(item.id).length
          return <span className="text-zinc-500">{count} subcategorias</span>
        },
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
    ],
    [getByCategory, openEditModal, openDeleteDialog]
  )

  // Si no hay sucursal seleccionada, mostrar mensaje
  if (!selectedBranchId) {
    return (
      <PageContainer
        title="Categorias"
        description="Selecciona una sucursal para ver sus categorias"
        helpContent={helpContent.categories}
      >
        <Card className="text-center py-12">
          <p className="text-zinc-500 mb-4">
            Selecciona una sucursal desde el Dashboard para ver sus categorias
          </p>
          <Button onClick={() => navigate('/')}>Ir al Dashboard</Button>
        </Card>
      </PageContainer>
    )
  }

  return (
    <>
      {/* REACT 19 IMPROVEMENT: Document metadata */}
      <title>{selectedBranch ? `Categorías - ${selectedBranch.name}` : 'Categorías - Dashboard'}</title>
      <meta name="description" content={`Administración de categorías de ${selectedBranch?.name || 'la sucursal'}`} />

      <PageContainer
        title={`Categorias - ${selectedBranch?.name || ''}`}
        description={`Administra las categorias de ${selectedBranch?.name || 'la sucursal'}`}
      helpContent={helpContent.categories}
      actions={
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva Categoria
        </Button>
      }
    >
      <Card padding="none">
        <Table
          data={paginatedCategories}
          columns={columns}
          emptyMessage="No hay categorias. Crea una para comenzar."
          ariaLabel={`Categorias de ${selectedBranch?.name || 'sucursal'}`}
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
        title={selectedCategory ? 'Editar Categoria' : 'Nueva Categoria'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedCategory ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Categoria"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar una categoria:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Nombre:</strong> Nombre descriptivo de la categoria (ej: Comidas, Bebidas, Postres). Es obligatorio.
                    </li>
                    <li>
                      <strong>Icono:</strong> Un emoji o codigo de icono para representar visualmente la categoria (ej: 🍔, 🍺).
                    </li>
                    <li>
                      <strong>Imagen:</strong> Sube una imagen representativa de la categoria. Se mostrara en el menu.
                    </li>
                    <li>
                      <strong>Orden:</strong> Numero que define la posicion de la categoria en el menu. Menor numero = aparece primero.
                    </li>
                    <li>
                      <strong>Categoria activa:</strong> Activa o desactiva la visibilidad de la categoria en el menu publico.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Las categorias inactivas no se mostraran en el menu publico pero se mantendran en el sistema con todos sus productos.
                    </p>
                  </div>
                </div>
              }
            />
            <span className="text-sm text-zinc-400">Ayuda sobre el formulario</span>
          </div>

          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Comidas, Bebidas, Postres"
            error={errors.name}
          />

          <Input
            label="Icono (emoji o codigo)"
            value={formData.icon}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🍔 o utensils"
          />

          <ImageUpload
            label="Imagen"
            value={formData.image}
            onChange={(url) =>
              setFormData((prev) => ({ ...prev, image: url }))
            }
          />

          <Input
            label="Orden"
            type="number"
            value={formData.order}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
            }
            min={0}
          />

          <Toggle
            label="Categoria activa"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Categoria"
        message={`¿Estas seguro de eliminar "${selectedCategory?.name}"? Esto tambien eliminara todas las subcategorias y productos asociados.`}
        confirmLabel="Eliminar"
      />
      </PageContainer>
    </>
  )
}

export default CategoriesPage
