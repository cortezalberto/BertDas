import { useState, useMemo, useCallback, useActionState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
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
  ProductSelect,
  BranchCheckboxes,
  HelpButton,
} from '../components/ui'
import { usePagination } from '../hooks/usePagination'
import {
  usePromotionStore,
  selectPromotions,
} from '../stores/promotionStore'
import { useBranchStore, selectBranches } from '../stores/branchStore'
import {
  usePromotionTypeStore,
  selectPromotionTypes,
} from '../stores/promotionTypeStore'
import { toast } from '../stores/toastStore'
import { validatePromotion } from '../utils/validation'
import { handleError } from '../utils/logger'
import { formatPrice } from '../utils/constants'
import { helpContent } from '../utils/helpContent'
import type { Promotion, PromotionFormData, TableColumn } from '../types'
import type { FormState } from '../types/form'

const initialFormData: PromotionFormData = {
  name: '',
  description: '',
  price: 0,
  image: '',
  start_date: '',
  end_date: '',
  start_time: '00:00',
  end_time: '23:59',
  promotion_type_id: '',
  branch_ids: [],
  items: [],
  is_active: true,
}

export function PromotionsPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Promociones')

  const promotions = usePromotionStore(selectPromotions)
  const addPromotion = usePromotionStore((s) => s.addPromotion)
  const updatePromotion = usePromotionStore((s) => s.updatePromotion)
  const deletePromotion = usePromotionStore((s) => s.deletePromotion)

  const branches = useBranchStore(selectBranches)
  const promotionTypes = usePromotionTypeStore(selectPromotionTypes)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [formData, setFormData] = useState<PromotionFormData>(initialFormData)

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<PromotionFormData>, formDataSubmit: FormData): Promise<FormState<PromotionFormData>> => {
      // Extract simple fields from FormData
      const data: PromotionFormData = {
        name: formDataSubmit.get('name') as string,
        description: formDataSubmit.get('description') as string,
        price: parseFloat(formDataSubmit.get('price') as string) || 0,
        image: formDataSubmit.get('image') as string,
        start_date: formDataSubmit.get('start_date') as string,
        end_date: formDataSubmit.get('end_date') as string,
        start_time: formDataSubmit.get('start_time') as string,
        end_time: formDataSubmit.get('end_time') as string,
        promotion_type_id: formDataSubmit.get('promotion_type_id') as string,
        is_active: formDataSubmit.get('is_active') === 'on',
        // Complex fields from component state (not FormData)
        branch_ids: formData.branch_ids,
        items: formData.items,
      }

      const validation = validatePromotion(data, { isEditing: !!selectedPromotion })
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (selectedPromotion) {
          updatePromotion(selectedPromotion.id, data)
          toast.success('Promocion actualizada correctamente')
        } else {
          addPromotion(data)
          toast.success('Promocion creada correctamente')
        }
        return { isSuccess: true }
      } catch (error) {
        const message = handleError(error, 'PromotionsPage.submitAction')
        toast.error(`Error al guardar la promocion: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [selectedPromotion, updatePromotion, addPromotion, formData.branch_ids, formData.items]
  )

  const [state, formAction, isPending] = useActionState<FormState<PromotionFormData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // Close modal on success
  if (state.isSuccess && isModalOpen) {
    setIsModalOpen(false)
    setSelectedPromotion(null)
    setFormData(initialFormData)
  }

  const sortedPromotions = useMemo(
    () => [...promotions].sort((a, b) => a.name.localeCompare(b.name)),
    [promotions]
  )

  const {
    paginatedItems: paginatedPromotions,
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    setCurrentPage,
  } = usePagination(sortedPromotions)

  const branchMap = useMemo(
    () => new Map(branches.map((b) => [b.id, b.name])),
    [branches]
  )

  const promotionTypeMap = useMemo(
    () => new Map(promotionTypes.map((pt) => [pt.id, pt])),
    [promotionTypes]
  )

  const activeBranchIds = useMemo(
    () => branches.filter((b) => b.is_active !== false).map((b) => b.id),
    [branches]
  )

  const getBranchNames = useCallback(
    (branchIds: string[]) => {
      if (branchIds.length === branches.length) {
        return 'Todas'
      }
      if (branchIds.length === 0) {
        return 'Ninguna'
      }
      if (branchIds.length <= 2) {
        return branchIds.map((id) => branchMap.get(id) || id).join(', ')
      }
      return `${branchIds.length} sucursales`
    },
    [branches.length, branchMap]
  )

  const openCreateModal = useCallback(() => {
    setSelectedPromotion(null)
    setFormData({
      ...initialFormData,
      branch_ids: activeBranchIds,
    })
    setIsModalOpen(true)
  }, [activeBranchIds])

  const openEditModal = useCallback((promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setFormData({
      name: promotion.name,
      description: promotion.description || '',
      price: promotion.price,
      image: promotion.image || '',
      start_date: promotion.start_date,
      end_date: promotion.end_date,
      start_time: promotion.start_time || '00:00',
      end_time: promotion.end_time || '23:59',
      promotion_type_id: promotion.promotion_type_id || '',
      branch_ids: promotion.branch_ids,
      items: promotion.items,
      is_active: promotion.is_active ?? true,
    })
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((promotion: Promotion) => {
    setSelectedPromotion(promotion)
    setIsDeleteOpen(true)
  }, [])


  const handleDelete = useCallback(() => {
    if (!selectedPromotion) return

    try {
      // Validate promotion exists before delete
      const promotionExists = promotions.some((p) => p.id === selectedPromotion.id)
      if (!promotionExists) {
        toast.error('La promocion ya no existe')
        setIsDeleteOpen(false)
        return
      }

      deletePromotion(selectedPromotion.id)
      toast.success('Promocion eliminada correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'PromotionsPage.handleDelete')
      toast.error(`Error al eliminar la promocion: ${message}`)
    }
  }, [selectedPromotion, promotions, deletePromotion])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('es-AR')
  }

  const isPromotionActive = useCallback((promotion: Promotion) => {
    if (promotion.is_active === false) return false

    // Use local date comparison to avoid timezone issues
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    // Compare dates as strings (YYYY-MM-DD format)
    return today >= promotion.start_date && today <= promotion.end_date
  }, [])

  const columns: TableColumn<Promotion>[] = useMemo(
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
        key: 'price',
        label: 'Precio',
        width: 'w-28',
        render: (item) => (
          <span className="font-medium text-orange-500">
            {formatPrice(item.price)}
          </span>
        ),
      },
      {
        key: 'promotion_type_id',
        label: 'Tipo',
        width: 'w-32',
        render: (item) => {
          const promoType = promotionTypeMap.get(item.promotion_type_id)
          return promoType ? (
            <span className="text-sm">
              {promoType.icon && <span className="mr-1">{promoType.icon}</span>}
              {promoType.name}
            </span>
          ) : (
            <span className="text-zinc-500">-</span>
          )
        },
      },
      {
        key: 'dates',
        label: 'Vigencia',
        width: 'w-40',
        render: (item) => (
          <div className="text-sm text-zinc-400">
            <div>{formatDate(item.start_date)} - {formatDate(item.end_date)}</div>
            <div className="text-xs text-zinc-500">
              {item.start_time || '00:00'} - {item.end_time || '23:59'}
            </div>
          </div>
        ),
      },
      {
        key: 'branch_ids',
        label: 'Sucursales',
        width: 'w-32',
        render: (item) => (
          <span className="text-sm text-zinc-400">
            {getBranchNames(item.branch_ids)}
          </span>
        ),
      },
      {
        key: 'items',
        label: 'Productos',
        width: 'w-24',
        render: (item) => (
          <span className="text-zinc-500">
            {item.items.length} producto{item.items.length !== 1 ? 's' : ''}
          </span>
        ),
      },
      {
        key: 'is_active',
        label: 'Estado',
        width: 'w-24',
        render: (item) =>
          isPromotionActive(item) ? (
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
    [getBranchNames, openEditModal, openDeleteDialog, promotionTypeMap, isPromotionActive]
  )

  return (
    <PageContainer
      title="Promociones"
      description="Administra las promociones y combos del menu"
      helpContent={helpContent.promotions}
      actions={
        <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
          Nueva Promocion
        </Button>
      }
    >
      <Card padding="none">
        <Table
          data={paginatedPromotions}
          columns={columns}
          emptyMessage="No hay promociones. Crea una para comenzar."
          ariaLabel="Lista de promociones"
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
        title={selectedPromotion ? 'Editar Promocion' : 'Nueva Promocion'}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="promotion-form" isLoading={isPending}>
              {selectedPromotion ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <form id="promotion-form" action={formAction} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Promocion"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar una promocion:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Nombre:</strong> Nombre descriptivo de la promocion (ej: Combo Familiar, 2x1 Hamburguesas). Es obligatorio.
                    </li>
                    <li>
                      <strong>Descripcion:</strong> Detalle de la promocion que veran los clientes.
                    </li>
                    <li>
                      <strong>Precio:</strong> Precio del combo o promocion.
                    </li>
                    <li>
                      <strong>Imagen:</strong> Foto para mostrar en el menu.
                    </li>
                    <li>
                      <strong>Tipo de Promocion:</strong> Categoria de la promocion (Happy Hour, 2x1, etc.).
                    </li>
                    <li>
                      <strong>Fechas:</strong> Periodo de vigencia de la promocion.
                    </li>
                    <li>
                      <strong>Horarios:</strong> Horas del dia en que aplica (ej: Happy Hour 17:00-20:00).
                    </li>
                    <li>
                      <strong>Productos:</strong> Selecciona los productos que forman parte del combo.
                    </li>
                    <li>
                      <strong>Sucursales:</strong> Donde estara disponible la promocion.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Las promociones solo se mostraran durante el periodo y horario configurados. Asegurate de que las fechas sean correctas.
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
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ej: Combo Familiar, 2x1 Hamburguesas"
            error={state.errors?.name}
          />

          <Input
            label="Descripcion"
            name="description"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Descripcion de la promocion"
          />

          <Input
            label="Precio"
            name="price"
            type="number"
            value={formData.price}
            onChange={(e) => {
              const value = e.target.value.trim()
              const parsed = value === '' ? 0 : Number(value)
              setFormData((prev) => ({
                ...prev,
                price: isNaN(parsed) ? 0 : Math.max(0, parsed),
              }))
            }}
            min={0}
            step={0.01}
            error={state.errors?.price}
          />

          <input type="hidden" name="image" value={formData.image} />
          <ImageUpload
            label="Imagen"
            value={formData.image}
            onChange={(url) =>
              setFormData((prev) => ({ ...prev, image: url }))
            }
          />

          {/* Tipo de Promocion */}
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">
              Tipo de Promocion
            </label>
            <select
              name="promotion_type_id"
              value={formData.promotion_type_id}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, promotion_type_id: e.target.value }))
              }
              className="w-full h-10 px-3 rounded-lg border border-zinc-700 bg-zinc-800 text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              aria-label="Tipo de promoción"
            >
              <option value="">Selecciona un tipo</option>
              {promotionTypes
                .filter((pt) => pt.is_active !== false)
                .map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.icon && `${pt.icon} `}{pt.name}
                  </option>
                ))}
            </select>
            {state.errors?.promotion_type_id && (
              <p className="text-sm text-red-500 mt-1">{state.errors.promotion_type_id}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Fecha de inicio"
              name="start_date"
              type="date"
              value={formData.start_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_date: e.target.value }))
              }
              error={state.errors?.start_date}
            />

            <Input
              label="Fecha de fin"
              name="end_date"
              type="date"
              value={formData.end_date}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, end_date: e.target.value }))
              }
              error={state.errors?.end_date}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hora de inicio"
              name="start_time"
              type="time"
              value={formData.start_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, start_time: e.target.value }))
              }
              error={state.errors?.start_time}
            />

            <Input
              label="Hora de fin"
              name="end_time"
              type="time"
              value={formData.end_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, end_time: e.target.value }))
              }
              error={state.errors?.end_time}
            />
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <ProductSelect
              label="Productos del combo"
              value={formData.items}
              onChange={(items) =>
                setFormData((prev) => ({ ...prev, items }))
              }
              error={state.errors?.items}
            />
          </div>

          <div className="border-t border-zinc-800 pt-4">
            <BranchCheckboxes
              label="Sucursales donde aplica"
              value={formData.branch_ids}
              onChange={(branchIds) =>
                setFormData((prev) => ({ ...prev, branch_ids: branchIds }))
              }
              error={state.errors?.branch_ids}
            />
          </div>

          <Toggle
            label="Promocion activa"
            name="is_active"
            checked={formData.is_active}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
            }
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Promocion"
        message={`¿Estas seguro de eliminar "${selectedPromotion?.name}"?`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default PromotionsPage
