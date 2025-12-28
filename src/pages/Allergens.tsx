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
  useAllergenStore,
  selectAllergens,
} from '../stores/allergenStore'
import { useProductStore, selectProducts } from '../stores/productStore'
import { cascadeDeleteAllergen } from '../services/cascadeService'
import { toast } from '../stores/toastStore'
import { validateAllergen, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import { helpContent } from '../utils/helpContent'
import type { Allergen, AllergenFormData, TableColumn } from '../types'

const initialFormData: AllergenFormData = {
  name: '',
  icon: '',
  description: '',
  is_active: true,
}

export function AllergensPage() {
  const allergens = useAllergenStore(selectAllergens)
  const addAllergen = useAllergenStore((s) => s.addAllergen)
  const updateAllergen = useAllergenStore((s) => s.updateAllergen)

  const products = useProductStore(selectProducts)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedAllergen, setSelectedAllergen] = useState<Allergen | null>(null)
  const [formData, setFormData] = useState<AllergenFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<AllergenFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const openCreateModal = useCallback(() => {
    setSelectedAllergen(null)
    setFormData(initialFormData)
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openEditModal = useCallback((allergen: Allergen) => {
    setSelectedAllergen(allergen)
    setFormData({
      name: allergen.name,
      icon: allergen.icon || '',
      description: allergen.description || '',
      is_active: allergen.is_active ?? true,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((allergen: Allergen) => {
    setSelectedAllergen(allergen)
    setIsDeleteOpen(true)
  }, [])

  const handleSubmit = useCallback(() => {
    const validation = validateAllergen(formData)
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedAllergen) {
        updateAllergen(selectedAllergen.id, formData)
        toast.success('Alergeno actualizado correctamente')
      } else {
        addAllergen(formData)
        toast.success('Alergeno creado correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'AllergensPage.handleSubmit')
      toast.error(`Error al guardar el alergeno: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedAllergen, updateAllergen, addAllergen])

  const handleDelete = useCallback(() => {
    if (!selectedAllergen) return

    try {
      const productCount = getProductCount(selectedAllergen.id)
      const result = cascadeDeleteAllergen(selectedAllergen.id)

      if (!result.success) {
        toast.error(result.error || 'Error al eliminar el alergeno')
        setIsDeleteOpen(false)
        return
      }

      if (productCount > 0) {
        toast.warning(
          `Este alergeno estaba vinculado a ${productCount} producto(s). Se elimino la referencia.`
        )
      }

      toast.success('Alergeno eliminado correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'AllergensPage.handleDelete')
      toast.error(`Error al eliminar el alergeno: ${message}`)
    }
  }, [selectedAllergen, getProductCount])

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
    [getProductCount, openEditModal, openDeleteDialog]
  )

  return (
    <PageContainer
      title="Alergenos"
      description="Administra los alergenos para los productos del menu"
      helpContent={helpContent.allergens}
      actions={
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedAllergen ? 'Editar Alergeno' : 'Nuevo Alergeno'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedAllergen ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
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
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Gluten, Lacteos, Frutos Secos"
            error={errors.name}
          />

          <Input
            label="Icono (emoji)"
            value={formData.icon}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, icon: e.target.value }))
            }
            placeholder="Ej: 🌾, 🥛, 🥜"
          />

          <Input
            label="Descripcion"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion del alergeno"
          />

          <Toggle
            label="Alergeno activo"
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
        title="Eliminar Alergeno"
        message={`¿Estas seguro de eliminar "${selectedAllergen?.name}"? Los productos que lo tengan vinculado perderan esta referencia.`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default AllergensPage
