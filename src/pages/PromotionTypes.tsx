import { useMemo, useCallback, useActionState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFormModal, useConfirmDialog, usePagination } from '../hooks'
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
import {
  usePromotionTypeStore,
  selectPromotionTypes,
} from '../stores/promotionTypeStore'
import { cascadeDeletePromotionType } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validatePromotionType } from '../utils/validation'
import { handleError } from '../utils/logger'
import { helpContent } from '../utils/helpContent'
import type { PromotionType, PromotionTypeFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: PromotionTypeFormData = {
  name: '',
  description: '',
  icon: '',
  is_active: true,
}

export function PromotionTypesPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Tipos de Promoción')

  const promotionTypes = usePromotionTypeStore(selectPromotionTypes)
  const addPromotionType = usePromotionTypeStore((s) => s.addPromotionType)
  const updatePromotionType = usePromotionTypeStore((s) => s.updatePromotionType)

  // SPRINT 13: Use custom hooks for modal and dialog state
  const modal = useFormModal<PromotionTypeFormData>(initialFormData)
  const deleteDialog = useConfirmDialog<PromotionType>()

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

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<PromotionTypeFormData>, formData: FormData): Promise<FormState<PromotionTypeFormData>> => {
      const data: PromotionTypeFormData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        icon: formData.get('icon') as string,
        is_active: formData.get('is_active') === 'on',
      }

      const validation = validatePromotionType(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updatePromotionType(modal.selectedItem.id, data)
          toast.success('Tipo de promocion actualizado correctamente')
        } else {
          addPromotionType(data)
          toast.success('Tipo de promocion creado correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'PromotionTypesPage.submitAction')
        toast.error(`Error al guardar el tipo de promocion: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updatePromotionType, addPromotionType]
  )

  const [state, formAction, isPending] = useActionState<FormState<PromotionTypeFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // SPRINT 13: Close modal on success using modal.close()
  if (state.isSuccess && modal.isOpen) {
    modal.close()
  }

  // SPRINT 13: Simplified modal handlers using custom hook
  const openCreateModal = useCallback(() => {
    modal.openCreate(initialFormData)
  }, [modal])

  const openEditModal = useCallback((promotionType: PromotionType) => {
    modal.openEdit(promotionType, {
      name: promotionType.name,
      description: promotionType.description || '',
      icon: promotionType.icon || '',
      is_active: promotionType.is_active ?? true,
    })
  }, [modal])

  // SPRINT 13: Simplified delete handler
  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return

    try {
      const result = cascadeDeletePromotionType(deleteDialog.item.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar el tipo de promocion')
        deleteDialog.close()
        return
      }

      toast.success('Tipo de promocion eliminado correctamente')
      deleteDialog.close()
    } catch (error) {
      const message = handleError(error, 'PromotionTypesPage.handleDelete')
      toast.error(`Error al eliminar el tipo de promocion: ${message}`)
    }
  }, [deleteDialog])

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
    [openEditModal, deleteDialog.open]
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

      {/* SPRINT 13: Modal using useFormModal hook */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.selectedItem ? 'Editar Tipo de Promocion' : 'Nuevo Tipo de Promocion'}
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>
              Cancelar
            </Button>
            <Button type="submit" form="promotion-type-form" isLoading={isPending}>
              {modal.selectedItem ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="promotion-type-form" action={formAction} className="space-y-4">
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
            name="name"
            value={modal.formData.name}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Happy Hour, 2x1, Combo Familiar"
            error={state.errors?.name}
          />

          <Input
            label="Descripcion"
            name="description"
            value={modal.formData.description}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion del tipo de promocion"
          />

          <Input
            label="Icono (emoji)"
            name="icon"
            value={modal.formData.icon}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🍺, 🎉, 💰"
          />

          <Toggle
            label="Tipo activo"
            name="is_active"
            checked={modal.formData.is_active}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
        </form>
      </Modal>

      {/* SPRINT 13: Delete confirmation using useConfirmDialog hook */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={deleteDialog.close}
        onConfirm={handleDelete}
        title="Eliminar Tipo de Promocion"
        message={`¿Estas seguro de eliminar "${deleteDialog.item?.name}"? Las promociones que usen este tipo tambien seran eliminadas.`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default PromotionTypesPage
