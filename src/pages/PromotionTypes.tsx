import { useState, useMemo, useCallback } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageContainer } from '../components/layout'
import {
  Card,
  Button,
  Table,
  Modal,
  Input,
  Toggle,
  ConfirmDialog,
  Badge,
  Pagination,
  HelpButton,
} from '../components/ui'
import { usePagination } from '../hooks/usePagination'
import {
  usePromotionTypeStore,
  selectPromotionTypes,
} from '../stores/promotionTypeStore'
import { cascadeDeletePromotionType } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validatePromotionType, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import { helpContent } from '../utils/helpContent'
import type { PromotionType, PromotionTypeFormData, TableColumn } from '../types'

const initialFormData: PromotionTypeFormData = {
  name: '',
  description: '',
  icon: '',
  is_active: true,
}

export function PromotionTypesPage() {
  const promotionTypes = usePromotionTypeStore(selectPromotionTypes)
  const addPromotionType = usePromotionTypeStore((s) => s.addPromotionType)
  const updatePromotionType = usePromotionTypeStore((s) => s.updatePromotionType)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<PromotionType | null>(null)
  const [formData, setFormData] = useState<PromotionTypeFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<PromotionTypeFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const sortedTypes = useMemo(
    () => [...promotionTypes].sort((a, b) => a.name.localeCompare(b.name)),
    [promotionTypes]
  )

  const {
    paginatedItems: paginatedTypes,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedTypes)

  const openCreateModal = useCallback(() => {
    setSelectedType(null)
    setFormData(initialFormData)
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((promotionType: PromotionType) => {
    setSelectedType(promotionType)
    setFormData({
      name: promotionType.name,
      description: promotionType.description || '',
      icon: promotionType.icon || '',
      is_active: promotionType.is_active ?? true,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((promotionType: PromotionType) => {
    setSelectedType(promotionType)
    setIsDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const validation = validatePromotionType(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedType) {
        updatePromotionType(selectedType.id, formData)
        toast.success('Tipo de promocion actualizado correctamente')
      } else {
        addPromotionType(formData)
        toast.success('Tipo de promocion creado correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'PromotionTypesPage.handleSubmit')
      toast.error(`Error al guardar el tipo de promocion: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedType, updatePromotionType, addPromotionType])

  const handleDelete = useCallback(() => {
    if (!selectedType) return

    try {
      const result = cascadeDeletePromotionType(selectedType.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar el tipo de promocion')
        setIsDeleteOpen(false)
        return
      }

      toast.success('Tipo de promocion eliminado correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'PromotionTypesPage.handleDelete')
      toast.error(`Error al eliminar el tipo de promocion: ${message}`)
    }
  }, [selectedType])

  const columns: TableColumn<PromotionType>[] = useMemo(
    () => [
      {
        key: 'icon',
        label: 'Icono',
        width: 'w-20',
        render: (item) => (
          <span className="text-2xl" role="img" aria-label={`Icono de ${item.name}`}>
            {item.icon || '-'}
          </span>
        ),
      },
      {
        key: 'name',
        label: 'Nombre',
        render: (item) => (
          <div>
            <span className="font-medium">{item.name}</span>
            {item.description && (
              <p className="text-xs text-zinc-500 truncate max-w-xs">
                {item.description}
              </p>
            )}
          </div>
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
    ],
    [openEditModal, openDeleteDialog]
  )

  return (
    <PageContainer
      title="Tipos de Promocion"
      description="Administra los tipos de promociones disponibles"
      helpContent={helpContent.promotionTypes}
      actions={
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Tipo
        </Button>
      }
    >
      <Card padding="none">
        <Table
          data={paginatedTypes}
          columns={columns}
          emptyMessage="No hay tipos de promocion. Crea uno para comenzar."
          ariaLabel="Lista de tipos de promocion"
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
        title={selectedType ? 'Editar Tipo de Promocion' : 'Nuevo Tipo de Promocion'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedType ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Tipo de Promocion"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar un tipo de promocion:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Nombre:</strong> Nombre del tipo de promocion (ej: Happy Hour, 2x1, Combo Familiar). Es obligatorio.
                    </li>
                    <li>
                      <strong>Descripcion:</strong> Breve explicacion del tipo de promocion.
                    </li>
                    <li>
                      <strong>Icono:</strong> Un emoji representativo (ej: 🍺, 🎉, 💰). Se mostrara junto al nombre.
                    </li>
                    <li>
                      <strong>Tipo activo:</strong> Activa o desactiva la disponibilidad del tipo para crear nuevas promociones.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Los tipos de promocion te ayudan a organizar y filtrar tus ofertas. Por ejemplo: Happy Hour para descuentos por horario, 2x1 para ofertas de cantidad.
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
            placeholder="Ej: Happy Hour, 2x1, Combo Familiar"
            error={errors.name}
          />

          <Input
            label="Descripcion"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion del tipo de promocion"
          />

          <Input
            label="Icono (emoji)"
            value={formData.icon}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🍺, 🎉, 💰"
          />

          <Toggle
            label="Tipo activo"
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
        title="Eliminar Tipo de Promocion"
        message={`¿Estas seguro de eliminar "${selectedType?.name}"? Las promociones que usen este tipo tambien seran eliminadas.`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default PromotionTypesPage
