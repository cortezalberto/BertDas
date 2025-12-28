import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2, MapPin, ExternalLink } from 'lucide-react'
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
import { usePagination } from '../hooks/usePagination'
import { useBranchStore, selectBranches } from '../stores/branchStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useRestaurantStore, selectRestaurant } from '../stores/restaurantStore'
import { cascadeDeleteBranch } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validateBranch, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import { HOME_CATEGORY_NAME, BRANCH_DEFAULT_OPENING_TIME, BRANCH_DEFAULT_CLOSING_TIME } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Branch, BranchFormData, TableColumn } from '../types'

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
  const navigate = useNavigate()
  const restaurant = useRestaurantStore(selectRestaurant)
  const branches = useBranchStore(selectBranches)
  const addBranch = useBranchStore((s) => s.addBranch)
  const updateBranch = useBranchStore((s) => s.updateBranch)
  const selectBranch = useBranchStore((s) => s.selectBranch)

  const getByBranch = useCategoryStore((s) => s.getByBranch)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [formData, setFormData] = useState<BranchFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<BranchFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const openCreateModal = useCallback(() => {
    setSelectedBranch(null)
    const orders = branches.map((b) => b.order).filter((o) => typeof o === 'number' && !isNaN(o))
    setFormData({
      ...initialFormData,
      order: (orders.length > 0 ? Math.max(...orders) : 0) + 1,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [branches])

  const openEditModal = useCallback((branch: Branch) => {
    setSelectedBranch(branch)
    setFormData({
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
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((branch: Branch) => {
    setSelectedBranch(branch)
    setIsDeleteOpen(true)
  }, [])

  const handleViewMenu = useCallback(
    (branch: Branch) => {
      selectBranch(branch.id)
      navigate('/categories')
    },
    [selectBranch, navigate]
  )

  const handleSubmit = useCallback(() => {
    const validation = validateBranch(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedBranch) {
        updateBranch(selectedBranch.id, formData)
        toast.success('Sucursal actualizada correctamente')
      } else {
        if (!restaurant) {
          toast.error('Crea un restaurante primero en la seccion Restaurante')
          setIsSubmitting(false)
          return
        }
        addBranch({ ...formData, restaurant_id: restaurant.id })
        toast.success('Sucursal creada correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'BranchesPage.handleSubmit')
      toast.error(`Error al guardar la sucursal: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedBranch, updateBranch, addBranch, restaurant])

  const handleDelete = useCallback(() => {
    if (!selectedBranch) return

    try {
      const result = cascadeDeleteBranch(selectedBranch.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar la sucursal')
        setIsDeleteOpen(false)
        return
      }

      toast.success('Sucursal eliminada correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'BranchesPage.handleDelete')
      toast.error(`Error al eliminar la sucursal: ${message}`)
    }
  }, [selectedBranch])

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
    [getByBranch, handleViewMenu, openEditModal, openDeleteDialog]
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBranch ? 'Editar Sucursal' : 'Nueva Sucursal'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedBranch ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Nombre"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Buen Sabor Centro"
            error={errors.name}
          />

          <Input
            label="Direccion"
            value={formData.address}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, address: e.target.value }))
            }
            placeholder="Ej: Av. Corrientes 1234, CABA"
            error={errors.address}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Telefono"
              value={formData.phone}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, phone: e.target.value }))
              }
              placeholder="Ej: +54 11 1234-5678"
              error={errors.phone}
            />

            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              placeholder="Ej: sucursal@buensabor.com"
              error={errors.email}
            />
          </div>

          <ImageUpload
            label="Imagen"
            value={formData.image}
            onChange={(url) => setFormData((prev) => ({ ...prev, image: url }))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Horario de Apertura"
              type="time"
              value={formData.opening_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, opening_time: e.target.value }))
              }
              error={errors.opening_time}
            />

            <Input
              label="Horario de Cierre"
              type="time"
              value={formData.closing_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, closing_time: e.target.value }))
              }
              error={errors.closing_time}
            />
          </div>

          <Input
            label="Orden"
            type="number"
            value={formData.order}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                order: parseInt(e.target.value, 10) || 0,
              }))
            }
            min={0}
          />

          <Toggle
            label="Sucursal activa"
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
        title="Eliminar Sucursal"
        message={`¿Estas seguro de eliminar "${selectedBranch?.name}"? Esto eliminara TODAS las categorias, subcategorias y productos asociados a esta sucursal.`}
        confirmLabel="Eliminar"
      />
      </PageContainer>
    </>
  )
}

export default BranchesPage
