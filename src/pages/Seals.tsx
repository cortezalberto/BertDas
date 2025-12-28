import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
import { PageContainer } from '../components/layout'
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Toggle,
  ConfirmDialog,
  Badge as UIBadge,
  Pagination,
} from '../components/ui'
import { usePagination } from '../hooks/usePagination'
import { useSealStore, selectSeals } from '../stores/sealStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { toast } from '../stores/toastStore'
import { validateSeal, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import type { ProductSeal, SealFormData, TableColumn } from '../types'

const initialFormData: SealFormData = {
  name: '',
  color: '#10b981',
  icon: '',
  is_active: true,
}

export default function SealsPage() {
  const seals = useSealStore(selectSeals)
  const addSeal = useSealStore((s) => s.addSeal)
  const updateSeal = useSealStore((s) => s.updateSeal)
  const deleteSeal = useSealStore((s) => s.deleteSeal)

  const products = useProductStore(selectProducts)
  const removeSealFromProducts = useProductStore((s) => s.removeSealFromProducts)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedSeal, setSelectedSeal] = useState<ProductSeal | null>(null)
  const [formData, setFormData] = useState<SealFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<SealFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sortedSeals = useMemo(
    () => [...seals].sort((a, b) => a.name.localeCompare(b.name)),
    [seals]
  )

  const {
    paginatedItems: paginatedSeals,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedSeals)

  const getProductCount = useCallback(
    (sealName: string) => {
      return products.filter((p) => p.seal === sealName).length
    },
    [products]
  )

  const openCreateModal = useCallback(() => {
    setSelectedSeal(null)
    setFormData(initialFormData)
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((seal: ProductSeal) => {
    setSelectedSeal(seal)
    setFormData({
      name: seal.name,
      color: seal.color || '#10b981',
      icon: seal.icon || '',
      is_active: seal.is_active ?? true,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((seal: ProductSeal) => {
    setSelectedSeal(seal)
    setIsDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const validation = validateSeal(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedSeal) {
        updateSeal(selectedSeal.id, formData)
        toast.success('Sello actualizado correctamente')
      } else {
        addSeal(formData)
        toast.success('Sello creado correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'SealsPage.handleSubmit')
      toast.error(`Error al guardar el sello: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedSeal, updateSeal, addSeal])

  const handleDelete = useCallback(() => {
    if (!selectedSeal) return

    try {
      const productCount = getProductCount(selectedSeal.name)

      // Remove seal from products if needed
      if (removeSealFromProducts && productCount > 0) {
        removeSealFromProducts(selectedSeal.name)
      }

      // Delete seal
      deleteSeal(selectedSeal.id)

      if (productCount > 0) {
        toast.warning(
          `Este sello estaba vinculado a ${productCount} producto(s). Se elimino la referencia.`
        )
      }

      toast.success('Sello eliminado correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'SealsPage.handleDelete')
      toast.error(`Error al eliminar el sello: ${message}`)
    }
  }, [selectedSeal, getProductCount, deleteSeal, removeSealFromProducts])

  const columns: TableColumn<ProductSeal>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Preview',
        render: (seal) => (
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span
              className="text-xs px-2 py-1 rounded font-semibold flex items-center gap-1"
              style={{
                backgroundColor: `${seal.color}33`,
                color: seal.color,
              }}
            >
              {seal.icon && <span>{seal.icon}</span>}
              {seal.name}
            </span>
          </div>
        ),
      },
      {
        key: 'name',
        label: 'Nombre',
        sortable: true,
      },
      {
        key: 'icon',
        label: 'Icono',
        render: (seal) => (
          <span className="text-2xl">{seal.icon || '-'}</span>
        ),
      },
      {
        key: 'color',
        label: 'Color',
        render: (seal) => (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-zinc-700"
              style={{ backgroundColor: seal.color }}
            />
            <span className="text-sm text-zinc-400 font-mono">{seal.color}</span>
          </div>
        ),
      },
      {
        key: 'is_active',
        label: 'Estado',
        render: (seal) => (
          <UIBadge variant={seal.is_active ? 'success' : 'danger'}>
            {seal.is_active ? 'Activo' : 'Inactivo'}
          </UIBadge>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (seal) => {
          const productCount = getProductCount(seal.name)
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(seal)}
                aria-label={`Editar ${seal.name}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(seal)}
                aria-label={`Eliminar ${seal.name}`}
                disabled={productCount > 0}
                title={
                  productCount > 0
                    ? `No se puede eliminar. ${productCount} producto(s) usan este sello.`
                    : undefined
                }
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )
        },
      },
    ],
    [getProductCount, openEditModal, openDeleteDialog]
  )

  return (
    <>
      <title>Sellos - Dashboard</title>
      <meta name="description" content="Gestión de sellos para características especiales de productos" />

      <PageContainer
        title="Sellos"
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Sello
          </Button>
        }
      >
        <Card>
          <Table
            columns={columns}
            data={paginatedSeals}
            emptyMessage="No hay sellos creados. Crea uno para comenzar."
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
          title={selectedSeal ? 'Editar Sello' : 'Nuevo Sello'}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} isLoading={isSubmitting}>
                {selectedSeal ? 'Guardar Cambios' : 'Crear Sello'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ej: Vegano, Sin Gluten, Orgánico"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              error={errors.name}
              required
            />

            <Input
              label="Icono (Emoji)"
              placeholder="Ej: 🌱, 🥗, 🍃"
              value={formData.icon}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, icon: e.target.value }))
              }
              error={errors.icon}
            />

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-20 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                />
                <Input
                  placeholder="#10b981"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  error={errors.color}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Color del texto y fondo del sello
              </p>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Vista Previa
              </label>
              <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                {formData.name ? (
                  <span
                    className="inline-block text-xs px-2 py-1 rounded font-semibold"
                    style={{
                      backgroundColor: `${formData.color}33`,
                      color: formData.color,
                    }}
                  >
                    {formData.icon && <span className="mr-1">{formData.icon}</span>}
                    {formData.name}
                  </span>
                ) : (
                  <span className="text-sm text-zinc-500">
                    Ingresa un nombre para ver la vista previa
                  </span>
                )}
              </div>
            </div>

            <Toggle
              label="Activo"
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
          title="Eliminar Sello"
          message={`¿Estas seguro de eliminar "${selectedSeal?.name}"?`}
          confirmLabel="Eliminar"
        />
      </PageContainer>
    </>
  )
}
