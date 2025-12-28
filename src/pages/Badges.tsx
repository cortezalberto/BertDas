import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2, Award } from 'lucide-react'
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
import { useBadgeStore, selectBadges } from '../stores/badgeStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { toast } from '../stores/toastStore'
import { validateBadge, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import type { ProductBadge, BadgeFormData, TableColumn } from '../types'

const initialFormData: BadgeFormData = {
  name: '',
  color: '#f97316',
  is_active: true,
}

export default function BadgesPage() {
  const badges = useBadgeStore(selectBadges)
  const addBadge = useBadgeStore((s) => s.addBadge)
  const updateBadge = useBadgeStore((s) => s.updateBadge)
  const deleteBadge = useBadgeStore((s) => s.deleteBadge)

  const products = useProductStore(selectProducts)
  const removeBadgeFromProducts = useProductStore((s) => s.removeBadgeFromProducts)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState<ProductBadge | null>(null)
  const [formData, setFormData] = useState<BadgeFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<BadgeFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sortedBadges = useMemo(
    () => [...badges].sort((a, b) => a.name.localeCompare(b.name)),
    [badges]
  )

  const {
    paginatedItems: paginatedBadges,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedBadges)

  const getProductCount = useCallback(
    (badgeName: string) => {
      return products.filter((p) => p.badge === badgeName).length
    },
    [products]
  )

  const openCreateModal = useCallback(() => {
    setSelectedBadge(null)
    setFormData(initialFormData)
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((badge: ProductBadge) => {
    setSelectedBadge(badge)
    setFormData({
      name: badge.name,
      color: badge.color || '#f97316',
      is_active: badge.is_active ?? true,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((badge: ProductBadge) => {
    setSelectedBadge(badge)
    setIsDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const validation = validateBadge(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedBadge) {
        updateBadge(selectedBadge.id, formData)
        toast.success('Insignia actualizada correctamente')
      } else {
        addBadge(formData)
        toast.success('Insignia creada correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'BadgesPage.handleSubmit')
      toast.error(`Error al guardar la insignia: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedBadge, updateBadge, addBadge])

  const handleDelete = useCallback(() => {
    if (!selectedBadge) return

    try {
      const productCount = getProductCount(selectedBadge.name)

      // Remove badge from products if needed
      if (removeBadgeFromProducts && productCount > 0) {
        removeBadgeFromProducts(selectedBadge.name)
      }

      // Delete badge
      deleteBadge(selectedBadge.id)

      if (productCount > 0) {
        toast.warning(
          `Esta insignia estaba vinculada a ${productCount} producto(s). Se elimino la referencia.`
        )
      }

      toast.success('Insignia eliminada correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'BadgesPage.handleDelete')
      toast.error(`Error al eliminar la insignia: ${message}`)
    }
  }, [selectedBadge, getProductCount, deleteBadge, removeBadgeFromProducts])

  const columns: TableColumn<ProductBadge>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Preview',
        render: (badge) => (
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-orange-500" />
            <span
              className="text-xs px-2 py-1 rounded font-semibold"
              style={{
                backgroundColor: `${badge.color}33`,
                color: badge.color,
              }}
            >
              {badge.name}
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
        key: 'color',
        label: 'Color',
        render: (badge) => (
          <div className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded border border-zinc-700"
              style={{ backgroundColor: badge.color }}
            />
            <span className="text-sm text-zinc-400 font-mono">{badge.color}</span>
          </div>
        ),
      },
      {
        key: 'is_active',
        label: 'Estado',
        render: (badge) => (
          <UIBadge variant={badge.is_active ? 'success' : 'danger'}>
            {badge.is_active ? 'Activo' : 'Inactivo'}
          </UIBadge>
        ),
      },
      {
        key: 'actions',
        label: '',
        render: (badge) => {
          const productCount = getProductCount(badge.name)
          return (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openEditModal(badge)}
                aria-label={`Editar ${badge.name}`}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openDeleteDialog(badge)}
                aria-label={`Eliminar ${badge.name}`}
                disabled={productCount > 0}
                title={
                  productCount > 0
                    ? `No se puede eliminar. ${productCount} producto(s) usan esta insignia.`
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
      <title>Insignias - Dashboard</title>
      <meta name="description" content="Gestión de insignias para productos del restaurante" />

      <PageContainer
        title="Insignias"
        actions={
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva Insignia
          </Button>
        }
      >
        <Card>
          <Table
            columns={columns}
            data={paginatedBadges}
            emptyMessage="No hay insignias creadas. Crea una para comenzar."
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
          title={selectedBadge ? 'Editar Insignia' : 'Nueva Insignia'}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} isLoading={isSubmitting}>
                {selectedBadge ? 'Guardar Cambios' : 'Crear Insignia'}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <Input
              label="Nombre"
              placeholder="Ej: Nuevo, Popular, Chef's Choice"
              value={formData.name}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              error={errors.name}
              required
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
                  placeholder="#f97316"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  error={errors.color}
                />
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Color del texto y fondo de la insignia
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
          title="Eliminar Insignia"
          message={`¿Estas seguro de eliminar "${selectedBadge?.name}"?`}
          confirmLabel="Eliminar"
        />
      </PageContainer>
    </>
  )
}
