import { useMemo, useCallback, useActionState } from 'react'
import { Plus, Pencil, Trash2, Shield } from 'lucide-react'
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
  Badge as UIBadge,
  Pagination,
} from '../components/ui'
import { useSealStore, selectSeals } from '../stores/sealStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { toast } from '../stores/toastStore'
import { validateSeal } from '../utils/validation'
import { handleError } from '../utils/logger'
import type { ProductSeal, SealFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: SealFormData = {
  name: '',
  color: '#10b981',
  icon: '',
  is_active: true,
}

export default function SealsPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Sellos')

  const seals = useSealStore(selectSeals)
  const addSeal = useSealStore((s) => s.addSeal)
  const updateSeal = useSealStore((s) => s.updateSeal)
  const deleteSeal = useSealStore((s) => s.deleteSeal)

  const products = useProductStore(selectProducts)
  const removeSealFromProducts = useProductStore((s) => s.removeSealFromProducts)

  // SPRINT 13: Use custom hooks for modal and dialog state
  const modal = useFormModal<SealFormData>(initialFormData)
  const deleteDialog = useConfirmDialog<ProductSeal>()

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

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<SealFormData>, formData: FormData): Promise<FormState<SealFormData>> => {
      const data: SealFormData = {
        name: formData.get('name') as string,
        color: formData.get('color') as string,
        icon: formData.get('icon') as string,
        is_active: formData.get('is_active') === 'on',
      }

      const validation = validateSeal(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updateSeal(modal.selectedItem.id, data)
          toast.success('Sello actualizado correctamente')
        } else {
          addSeal(data)
          toast.success('Sello creado correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'SealsPage.submitAction')
        toast.error(`Error al guardar el sello: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updateSeal, addSeal]
  )

  const [state, formAction, isPending] = useActionState<FormState<SealFormData>, FormData>(
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

  const openEditModal = useCallback((seal: ProductSeal) => {
    modal.openEdit(seal, {
      name: seal.name,
      color: seal.color || '#10b981',
      icon: seal.icon || '',
      is_active: seal.is_active ?? true,
    })
  }, [modal])

  // SPRINT 13: Simplified delete handler
  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return

    try {
      const productCount = getProductCount(deleteDialog.item.name)

      // Remove seal from products if needed
      if (removeSealFromProducts && productCount > 0) {
        removeSealFromProducts(deleteDialog.item.name)
      }

      // Delete seal
      deleteSeal(deleteDialog.item.id)

      if (productCount > 0) {
        toast.warning(
          `Este sello estaba vinculado a ${productCount} producto(s). Se elimino la referencia.`
        )
      }

      toast.success('Sello eliminado correctamente')
      deleteDialog.close()
    } catch (error) {
      const message = handleError(error, 'SealsPage.handleDelete')
      toast.error(`Error al eliminar el sello: ${message}`)
    }
  }, [deleteDialog, getProductCount, deleteSeal, removeSealFromProducts])

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
                onClick={() => deleteDialog.open(seal)}
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
    [getProductCount, openEditModal, deleteDialog.open]
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

        {/* SPRINT 13: Modal using useFormModal hook */}
        <Modal
          isOpen={modal.isOpen}
          onClose={modal.close}
          title={modal.selectedItem ? 'Editar Sello' : 'Nuevo Sello'}
          size="md"
          footer={
            <>
              <Button variant="ghost" onClick={modal.close}>
                Cancelar
              </Button>
              <Button type="submit" form="seal-form" isLoading={isPending}>
                {modal.selectedItem ? 'Guardar Cambios' : 'Crear Sello'}
              </Button>
            </>
          }
        >
          <form id="seal-form" action={formAction} className="space-y-4">
            <Input
              label="Nombre"
              name="name"
              placeholder="Ej: Vegano, Sin Gluten, Orgánico"
              value={modal.formData.name}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, name: e.target.value }))
              }
              error={state.errors?.name}
              required
            />

            <Input
              label="Icono (Emoji)"
              name="icon"
              placeholder="Ej: 🌱, 🥗, 🍃"
              value={modal.formData.icon}
              onChange={(e) =>
                modal.setFormData((prev) => ({ ...prev, icon: e.target.value }))
              }
              error={state.errors?.icon}
            />

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="color"
                  value={modal.formData.color}
                  onChange={(e) =>
                    modal.setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  className="h-10 w-20 rounded border border-zinc-700 bg-zinc-800 cursor-pointer"
                />
                <Input
                  name="color_text"
                  placeholder="#10b981"
                  value={modal.formData.color}
                  onChange={(e) =>
                    modal.setFormData((prev) => ({ ...prev, color: e.target.value }))
                  }
                  error={state.errors?.color}
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
                {modal.formData.name ? (
                  <span
                    className="inline-block text-xs px-2 py-1 rounded font-semibold"
                    style={{
                      backgroundColor: `${modal.formData.color}33`,
                      color: modal.formData.color,
                    }}
                  >
                    {modal.formData.icon && <span className="mr-1">{modal.formData.icon}</span>}
                    {modal.formData.name}
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
          title="Eliminar Sello"
          message={`¿Estas seguro de eliminar "${deleteDialog.item?.name}"?`}
          confirmLabel="Eliminar"
        />
      </PageContainer>
    </>
  )
}
