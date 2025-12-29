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
  useAllergenStore,
  selectAllergens,
} from '../stores/allergenStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { cascadeDeleteAllergen } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validateAllergen } from '../utils/validation'
import { handleError } from '../utils/logger'
import { helpContent } from '../utils/helpContent'
import type { Allergen, AllergenFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: AllergenFormData = {
  name: '',
  icon: '',
  description: '',
  is_active: true,
}

export function AllergensPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Alérgenos')

  const allergens = useAllergenStore(selectAllergens)
  const addAllergen = useAllergenStore((s) => s.addAllergen)
  const updateAllergen = useAllergenStore((s) => s.updateAllergen)

  const products = useProductStore(selectProducts)

  // SPRINT 11: Use custom hooks for modal and dialog state
  const modal = useFormModal<AllergenFormData>(initialFormData)
  const deleteDialog = useConfirmDialog<Allergen>()

  const sortedAllergens = useMemo(
    () => [...allergens].sort((a, b) => a.name.localeCompare(b.name)),
    [allergens]
  )

  const {
    paginatedItems: paginatedAllergens,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedAllergens)

  const getProductCount = useCallback(
    (allergenId: string) => {
      return products.filter((p) => p.allergen_ids?.includes(allergenId)).length
    },
    [products]
  )

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<AllergenFormData>, formData: FormData): Promise<FormState<AllergenFormData>> => {
      const data: AllergenFormData = {
        name: formData.get('name') as string,
        icon: formData.get('icon') as string,
        description: formData.get('description') as string,
        is_active: formData.get('is_active') === 'on',
      }

      const validation = validateAllergen(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updateAllergen(modal.selectedItem.id, data)
          toast.success('Alergeno actualizado correctamente')
        } else {
          addAllergen(data)
          toast.success('Alergeno creado correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'AllergensPage.submitAction')
        toast.error(`Error al guardar el alergeno: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updateAllergen, addAllergen]
  )

  const [state, formAction, isPending] = useActionState<FormState<AllergenFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // SPRINT 11: Close modal on success using modal.close()
  if (state.isSuccess && modal.isOpen) {
    modal.close()
  }

  // SPRINT 11: Simplified modal handlers using custom hook
  const openEditModal = useCallback((allergen: Allergen) => {
    modal.openEdit(allergen)
  }, [modal])

  // SPRINT 11: Simplified delete handler
  const handleDelete = useCallback(() => {
    if (!deleteDialog.item) return

    try {
      const productCount = getProductCount(deleteDialog.item.id)
      const result = cascadeDeleteAllergen(deleteDialog.item.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar el alergeno')
        deleteDialog.close()
        return
      }

      if (productCount > 0) {
        toast.warning(
          `Este alergeno estaba vinculado a ${productCount} producto(s). Se elimino la referencia.`
        )
      }

      toast.success('Alergeno eliminado correctamente')
      deleteDialog.close()
    } catch (error) {
      const message = handleError(error, 'AllergensPage.handleDelete')
      toast.error(`Error al eliminar el alergeno: ${message}`)
    }
  }, [deleteDialog, getProductCount])

  const columns: TableColumn<Allergen>[] = useMemo(
    () => [
      {
        key: 'icon',
        label: 'Icono',
        width: 'w-16',
        render: (item) => (
          <span className="text-2xl" aria-label={`Icono de ${item.name}`}>
            {item.icon || '-'}
          </span>
        ),
      },
      {
        key: 'name',
        label: 'Nombre',
        render: (item) => <span className="font-medium">{item.name}</span>,
      },
      {
        key: 'description',
        label: 'Descripcion',
        render: (item) => (
          <span className="text-zinc-500 text-sm">
            {item.description || '-'}
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
              <span className="sr-only">Estado:</span> Activo
            </Badge>
          ) : (
            <Badge variant="danger">
              <span className="sr-only">Estado:</span> Inactivo
            </Badge>
          ),
      },
      {
        key: 'products',
        label: 'Productos',
        width: 'w-28',
        render: (item) => {
          const count = getProductCount(item.id)
          return <span className="text-zinc-500">{count} productos</span>
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
    [getProductCount, openEditModal, deleteDialog.open]
  )

  return (
    <PageContainer
      title="Alergenos"
      description="Administra los alergenos para los productos del menu"
      helpContent={helpContent.allergens}
      actions={
        <Button onClick={modal.openCreate} leftIcon={<Plus className="w-4 h-4" />}>
          Nuevo Alergeno
        </Button>
      }
    >
      <Card padding="none">
        <Table
          data={paginatedAllergens}
          columns={columns}
          emptyMessage="No hay alergenos. Crea uno para comenzar."
          ariaLabel="Lista de alergenos"
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
        title={modal.selectedItem ? 'Editar Alergeno' : 'Nuevo Alergeno'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={modal.close}>
              Cancelar
            </Button>
            <Button type="submit" form="allergen-form" isLoading={isPending}>
              {modal.selectedItem ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="allergen-form" action={formAction} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Alergeno"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar un alergeno:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Nombre:</strong> Nombre del alergeno (ej: Gluten, Lacteos, Frutos Secos). Es obligatorio.
                    </li>
                    <li>
                      <strong>Icono:</strong> Un emoji representativo del alergeno (ej: 🌾, 🥛, 🥜). Se mostrara junto a los productos.
                    </li>
                    <li>
                      <strong>Descripcion:</strong> Informacion adicional sobre el alergeno para referencia.
                    </li>
                    <li>
                      <strong>Alergeno activo:</strong> Activa o desactiva la disponibilidad del alergeno para asignar a productos.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Usa emojis claros y reconocibles para que los clientes identifiquen rapidamente los alergenos en el menu.
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
            placeholder="Ej: Gluten, Lacteos, Frutos Secos"
            error={state.errors?.name}
          />

          <Input
            label="Icono (emoji)"
            name="icon"
            value={modal.formData.icon}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🌾, 🥛, 🥜"
          />

          <Input
            label="Descripcion"
            name="description"
            value={modal.formData.description}
            onChange={(e) =>
              modal.setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion del alergeno"
          />

          <Toggle
            label="Alergeno activo"
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
        title="Eliminar Alergeno"
        message={`¿Estas seguro de eliminar "${deleteDialog.item?.name}"? Los productos que lo tengan vinculado perderan esta referencia.`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default AllergensPage
