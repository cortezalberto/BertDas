import { useMemo, useCallback, useActionState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, ExternalLink } from 'lucide-react'
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
} from '../components/ui'
import { useBranchStore, selectBranches } from '../stores/branchStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useRestaurantStore, selectRestaurant } from '../stores/restaurantStore'
import { cascadeDeleteBranch } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validateBranch } from '../utils/validation'
import { handleError } from '../utils/logger'
import { HOME_CATEGORY_NAME, BRANCH_DEFAULT_OPENING_TIME, BRANCH_DEFAULT_CLOSING_TIME } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Branch, BranchFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: BranchFormData = {
  name: '',
  address: '',
  phone: '',
  email: '',
  image: '',
  opening_time: BRANCH_DEFAULT_OPENING_TIME,
  closing_time: BRANCH_DEFAULT_CLOSING_TIME,
  is_active: true,
  order: 0,
}

export function BranchesPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Sucursales')

  const navigate = useNavigate()
  const restaurant = useRestaurantStore(selectRestaurant)
  const branches = useBranchStore(selectBranches)
  const addBranch = useBranchStore((s) => s.addBranch)
  const updateBranch = useBranchStore((s) => s.updateBranch)
  const selectBranch = useBranchStore((s) => s.selectBranch)

  const getByBranch = useCategoryStore((s) => s.getByBranch)

  // SPRINT 12: Use custom hooks for modal and dialog state
  const modal = useFormModal<BranchFormData>(initialFormData)
  const deleteDialog = useConfirmDialog<Branch>()

  const sortedBranches = useMemo(
    () => [...branches].sort((a, b) => a.order - b.order),
    [branches]
  )

  const {
    paginatedItems: paginatedBranches,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedBranches)

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<BranchFormData>, formData: FormData): Promise<FormState<BranchFormData>> => {
      const data: BranchFormData = {
        name: formData.get('name') as string,
        address: formData.get('address') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        image: formData.get('image') as string,
        opening_time: formData.get('opening_time') as string,
        closing_time: formData.get('closing_time') as string,
        is_active: formData.get('is_active') === 'on',
        order: parseInt(formData.get('order') as string, 10) || 0,
      }

      const validation = validateBranch(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updateBranch(modal.selectedItem.id, data)
          toast.success('Sucursal actualizada correctamente')
        } else {
          if (!restaurant) {
            toast.error('Crea un restaurante primero en la seccion Restaurante')
            return { isSuccess: false, message: 'No hay restaurante' }
          }
          addBranch({ ...data, restaurant_id: restaurant.id })
          toast.success('Sucursal creada correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'BranchesPage.submitAction')
        toast.error(`Error al guardar la sucursal: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updateBranch, addBranch, restaurant]
  )

  const [state, formAction, isPending] = useActionState<FormState<BranchFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // SPRINT 12: Close modal on success using modal.close()
  if (state.isSuccess && modal.isOpen) {
    modal.close()
  }

  // SPRINT 12: Simplified modal handlers using custom hook
  const openCreateModal = useCallback(() => {
    const orders = branches.map((b) => b.order).filter((o) => typeof o === 'number' && !isNaN(o))
    modal.openCreate({
      ...initialFormData,
      order: (orders.length > 0 ? Math.max(...orders) : 0) + 1,
    })
  }, [branches, modal])

  const openEditModal = useCallback((branch: Branch) => {
    modal.openEdit(branch, {
      name: branch.name,
      address: branch.address || '',
      phone: branch.phone || '',
      email: branch.email || '',
      image: branch.image || '',
      opening_time: branch.opening_time ?? BRANCH_DEFAULT_OPENING_TIME,
      closing_time: branch.closing_time ?? BRANCH_DEFAULT_CLOSING_TIME,
      is_active: branch.is_active ?? true,
      order: branch.order,
    })
  }, [modal])

  const handleViewMenu = useCallback(
    (branch: Branch) => {
      selectBranch(branch.id)
      navigate('/categories')
    },
    [selectBranch, navigate]
  )

  // SPRINT 12: Simplified delete handler
  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return

    try {
      const result = cascadeDeleteBranch(deleteDialog.item.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar la sucursal')
        deleteDialog.close()
        return
      }

      toast.success('Sucursal eliminada correctamente')
      deleteDialog.close()
    } catch (error) {
      const message = handleError(error, 'BranchesPage.handleDelete')
      toast.error(`Error al eliminar la sucursal: ${message}`)
    }
  }, [deleteDialog])

  const columns: TableColumn<Branch>[] = useMemo(
    () => [
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
        key: 'address',
        label: 'Direccion',
        render: (item) => (
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <MapPin className="w-4 h-4" aria-hidden="true" />
            {item.address || '-'}
          </div>
        ),
      },
      {
        key: 'hours',
        label: 'Horario',
        width: 'w-32',
        render: (item) => (
          <span className="text-sm text-zinc-400">
            {item.opening_time || BRANCH_DEFAULT_OPENING_TIME} - {item.closing_time || BRANCH_DEFAULT_CLOSING_TIME}
          </span>
        ),
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
        key: 'categories',
        label: 'Categorias',
        width: 'w-28',
        render: (item) => {
          const count = getByBranch(item.id).filter((c) => c.name !== HOME_CATEGORY_NAME).length
          return <span className="text-zinc-500">{count} categorias</span>
        },
      },
      {
        key: 'actions',
        label: 'Acciones',
        width: 'w-36',
        render: (item) => (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleViewMenu(item)
              }}
              aria-label={`Ver menu de ${item.name}`}
            >
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Button>
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
    [getByBranch, handleViewMenu, openEditModal, deleteDialog.open]
  )

  return (
    <>
      {/* REACT 19 IMPROVEMENT: Document metadata */}
      <title>Sucursales - Dashboard</title>
      <meta name="description" content="Administración de sucursales del restaurante" />

      <PageContainer
        title="Sucursales"
        description="Administra las sucursales del restaurante"
        helpContent={helpContent.branches}
        actions={
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Nueva Sucursal
          </Button>
        }
      >
      <Card padding="none">
        <Table
          data={paginatedBranches}
          columns={columns}
          emptyMessage="No hay sucursales. Crea una para comenzar."
          ariaLabel="Lista de sucursales"
        />
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
        />
      </Card>

      {/* SPRINT 12: Modal using useFormModal hook */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.selectedItem ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>
              Cancelar
            </Button>
            <Button type="submit" form="branch-form" isLoading={isPending}>
              {modal.selectedItem ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="branch-form" action={formAction} className="space-y-4">
          <Input
            label="Nombre"
            name="name"
            value={modal.formData.name}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Buen Sabor Centro"
            error={state.errors?.name}
          />

          <Input
            label="Direccion"
            name="address"
            value={modal.formData.address}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="Ej: Av. Corrientes 1234, CABA"
            error={state.errors?.address}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefono"
              name="phone"
              value={modal.formData.phone}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Ej: +54 11 1234-5678"
              error={state.errors?.phone}
            />

            <Input
              label="Email"
              name="email"
              type="email"
              value={modal.formData.email}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Ej: sucursal@buensabor.com"
              error={state.errors?.email}
            />
          </div>

          <input type="hidden" name="image" value={modal.formData.image} />
          <ImageUpload
            label="Imagen"
            value={modal.formData.image}
            onChange={(url) => modal.setFormData((prev) => ({ ...prev, image: url }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horario de Apertura"
              name="opening_time"
              type="time"
              value={modal.formData.opening_time}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, opening_time: e.target.value }))
              }
              error={state.errors?.opening_time}
            />

            <Input
              label="Horario de Cierre"
              name="closing_time"
              type="time"
              value={modal.formData.closing_time}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, closing_time: e.target.value }))
              }
              error={state.errors?.closing_time}
            />
          </div>

          <Input
            label="Orden"
            name="order"
            type="number"
            value={modal.formData.order}
            onChange={(e) =>
              modal.setFormData((prev) => ({
                ...prev,
                order: parseInt(e.target.value, 10) || 0,
              }))
            }
            min={0}
          />

          <Toggle
            label="Sucursal activa"
            name="is_active"
            checked={modal.formData.is_active}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
        </form>
      </Modal>

      {/* SPRINT 12: Delete confirmation using useConfirmDialog hook */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDelete}
        title="Eliminar Sucursal"
        message={`¿Estas seguro de eliminar "${deleteDialog.item?.name}"? Esto eliminara TODAS las categorias, subcategorias y productos asociados a esta sucursal.`}
        confirmLabel="Eliminar"
      />
      </PageContainer>
    </>
  )
}

export default BranchesPage
