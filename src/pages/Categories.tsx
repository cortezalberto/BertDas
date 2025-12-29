import { useMemo, useCallback, useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFormModal, useConfirmDialog, usePagination } from '../hooks'
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
import { validateCategory } from '../utils/validation'
import { handleError } from '../utils/logger'
import { HOME_CATEGORY_NAME } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Category, CategoryFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: CategoryFormData = {
  name: '',
  icon: '',
  image: '',
  order: 0,
  branch_id: '',
  is_active: true,
}

export function CategoriesPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Categorías')

  const navigate = useNavigate()
  const categories = useCategoryStore(selectCategories)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const updateCategory = useCategoryStore((s) => s.updateCategory)

  const selectedBranchId = useBranchStore(selectSelectedBranchId)
  const selectedBranch = useBranchStore(selectBranchById(selectedBranchId))

  const getByCategory = useSubcategoryStore((s) => s.getByCategory)

  // SPRINT 11: Use custom hooks for modal and dialog state
  const modal = useFormModal<CategoryFormData>(initialFormData)
  const deleteDialog = useConfirmDialog<Category>()

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

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<CategoryFormData>, formData: FormData): Promise<FormState<CategoryFormData>> => {
      const data: CategoryFormData = {
        branch_id: formData.get('branch_id') as string,
        name: formData.get('name') as string,
        icon: formData.get('icon') as string,
        image: formData.get('image') as string,
        order: parseInt(formData.get('order') as string, 10) || 0,
        is_active: formData.get('is_active') === 'on',
      }

      const validation = validateCategory(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updateCategory(modal.selectedItem.id, data)
          toast.success('Categoria actualizada correctamente')
        } else {
          addCategory(data)
          toast.success('Categoria creada correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'CategoriesPage.submitAction')
        toast.error(`Error al guardar la categoria: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updateCategory, addCategory]
  )

  const [state, formAction, isPending] = useActionState<FormState<CategoryFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // SPRINT 11: Close modal on success using modal.close()
  if (state.isSuccess && modal.isOpen) {
    modal.close()
  }

  // SPRINT 11: Simplified modal handlers using custom hook
  const openCreateModal = useCallback(() => {
    if (!selectedBranchId) {
      toast.error('Selecciona una sucursal primero')
      return
    }
    const orders = branchCategories.map((c) => c.order).filter((o) => typeof o === 'number' && !isNaN(o))
    modal.openCreate({
      ...initialFormData,
      branch_id: selectedBranchId,
      order: (orders.length > 0 ? Math.max(...orders) : 0) + 1,
    })
  }, [branchCategories, selectedBranchId, modal])

  const openEditModal = useCallback(
    (category: Category) => {
      modal.openEdit(category, {
        name: category.name,
        icon: category.icon || '',
        image: category.image || '',
        order: category.order,
        branch_id: category.branch_id,
        is_active: category.is_active ?? true,
      })
    },
    [modal]
  )

  // SPRINT 11: Simplified delete handler
  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return

    try {
      const result = cascadeDeleteCategory(deleteDialog.item.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar la categoria')
        deleteDialog.close()
        return
      }

      toast.success('Categoria eliminada correctamente')
      deleteDialog.close()
    } catch (error) {
      const message = handleError(error, 'CategoriesPage.handleDelete')
      toast.error(`Error al eliminar la categoria: ${message}`)
    }
  }, [deleteDialog])

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
                deleteDialog.open(item)
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
    [getByCategory, openEditModal, deleteDialog.open]
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

      {/* SPRINT 11: Modal using useFormModal hook */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.selectedItem ? 'Editar Categoria' : 'Nueva Categoria'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form" isLoading={isPending}>
              {modal.selectedItem ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="category-form" action={formAction} className="space-y-4">
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

          <input type="hidden" name="branch_id" value={modal.formData.branch_id} />

          <Input
            label="Nombre"
            name="name"
            value={modal.formData.name}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Comidas, Bebidas, Postres"
            error={state.errors?.name}
          />

          <Input
            label="Icono (emoji o codigo)"
            name="icon"
            value={modal.formData.icon}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🍔 o utensils"
          />

          <input type="hidden" name="image" value={modal.formData.image} />
          <ImageUpload
            label="Imagen"
            value={modal.formData.image}
            onChange={(url) =>
              modal.setFormData((prev) => ({ ...prev, image: url }))
            }
          />

          <Input
            label="Orden"
            name="order"
            type="number"
            value={modal.formData.order}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, order: parseInt(e.target.value, 10) || 0 }))
            }
            min={0}
          />

          <Toggle
            label="Categoria activa"
            name="is_active"
            checked={modal.formData.is_active}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
        </form>
      </Modal>

      {/* SPRINT 11: Delete confirmation using useConfirmDialog hook */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDelete}
        title="Eliminar Categoria"
        message={`¿Estas seguro de eliminar "${deleteDialog.item?.name}"? Esto tambien eliminara todas las subcategorias y productos asociados.`}
        confirmLabel="Eliminar"
      />
      </PageContainer>
    </>
  )
}

export default CategoriesPage
