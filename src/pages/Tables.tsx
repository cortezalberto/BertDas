import { useState, useMemo, useCallback, useId, useEffect } from 'react'
import { Plus, Trash2, Users, Archive, Clock } from 'lucide-react'
import { PageContainer } from '../components/layout'
import {
  Card,
  Button,
  Modal,
  Input,
  Select,
  Toggle,
  ConfirmDialog,
  Badge,
  HelpButton,
} from '../components/ui'
import { useTableStore, selectTables } from '../stores/tableStore'
import { useBranchStore, selectBranches } from '../stores/branchStore'
import { useOrderHistoryStore } from '../stores/orderHistoryStore'
import { toast } from '../stores/toastStore'
import { validateTable, type ValidationErrors } from '../utils/validation'
import { handleError } from '../utils/logger'
import { helpContent } from '../utils/helpContent'
import { TABLE_STATUS_LABELS, TABLE_SECTORS, TABLE_DEFAULT_TIME } from '../utils/constants'
import type { RestaurantTable, RestaurantTableFormData, TableStatus } from '../types'

const initialFormData: RestaurantTableFormData = {
  branch_id: '',
  number: 1,
  capacity: 4,
  sector: 'Interior',
  status: 'libre',
  order_time: TABLE_DEFAULT_TIME,
  close_time: TABLE_DEFAULT_TIME,
  is_active: true,
}

const statusOptions: { value: TableStatus; label: string }[] = [
  { value: 'libre', label: 'Libre' },
  { value: 'solicito_pedido', label: 'Solicito Pedido' },
  { value: 'pedido_cumplido', label: 'Pedido Cumplido' },
  { value: 'cuenta_solicitada', label: 'Cuenta Solicitada' },
  { value: 'ocupada', label: 'Ocupada' },
]

// Colores para cada estado de mesa
function getStatusStyles(status: TableStatus, isActive: boolean) {
  if (!isActive) {
    return {
      bg: 'bg-zinc-800',
      border: 'border-zinc-600',
      text: 'text-zinc-500',
      label: 'Inactiva',
    }
  }

  switch (status) {
    case 'libre':
      return {
        bg: 'bg-green-900/30',
        border: 'border-green-500',
        text: 'text-green-400',
        label: 'Libre',
      }
    case 'ocupada':
      return {
        bg: 'bg-red-900/30',
        border: 'border-red-500',
        text: 'text-red-400',
        label: 'Ocupada',
      }
    case 'solicito_pedido':
      return {
        bg: 'bg-yellow-900/30',
        border: 'border-yellow-500',
        text: 'text-yellow-400',
        label: 'Solicito Pedido',
      }
    case 'pedido_cumplido':
      return {
        bg: 'bg-blue-900/30',
        border: 'border-blue-500',
        text: 'text-blue-400',
        label: 'Pedido Cumplido',
      }
    case 'cuenta_solicitada':
      return {
        bg: 'bg-purple-900/30',
        border: 'border-purple-500',
        text: 'text-purple-400',
        label: 'Cuenta Solicitada',
      }
    default:
      return {
        bg: 'bg-zinc-800',
        border: 'border-zinc-600',
        text: 'text-zinc-400',
        label: TABLE_STATUS_LABELS[status] || status,
      }
  }
}

// Componente de tarjeta de mesa
interface TableCardProps {
  table: RestaurantTable
  onEdit: (table: RestaurantTable) => void
  onDelete: (table: RestaurantTable) => void
  onArchive: (table: RestaurantTable) => void
}

function TableCard({ table, onEdit, onDelete, onArchive }: TableCardProps) {
  const styles = getStatusStyles(table.status, table.is_active !== false)

  return (
    <div
      className={`
        relative p-2 rounded-md border-2 transition-all duration-200
        hover:scale-[1.03] hover:shadow-md cursor-pointer min-w-[100px]
        ${styles.bg} ${styles.border}
      `}
      onClick={() => onEdit(table)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit(table)
        }
      }}
      aria-label={`Mesa ${table.number}, ${styles.label}, ${table.capacity} personas, sector ${table.sector}`}
    >
      {/* Numero de mesa */}
      <div className="text-center mb-1">
        <span className="text-lg font-bold text-white">#{table.number}</span>
      </div>

      {/* Estado */}
      <div className={`text-center text-[10px] font-semibold mb-1 ${styles.text}`}>
        {styles.label}
      </div>

      {/* Info mínima */}
      <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
        <div className="flex items-center gap-0.5">
          <Users className="w-2.5 h-2.5" aria-hidden="true" />
          <span>{table.capacity}</span>
        </div>
        {table.status !== 'libre' && table.status !== 'ocupada' && (
          <div className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" aria-hidden="true" />
            <span>{table.order_time}</span>
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="absolute top-0.5 right-0.5 flex gap-0.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(table)
          }}
          className="p-0.5 rounded bg-zinc-800/80 hover:bg-red-600 text-zinc-400 hover:text-white transition-colors"
          aria-label={`Eliminar mesa ${table.number}`}
        >
          <Trash2 className="w-2.5 h-2.5" aria-hidden="true" />
        </button>
        {table.status === 'cuenta_solicitada' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onArchive(table)
            }}
            className="p-0.5 rounded bg-zinc-800/80 hover:bg-green-600 text-green-400 hover:text-white transition-colors"
            aria-label={`Liberar mesa ${table.number}`}
            title="Liberar mesa y archivar en historial"
          >
            <Archive className="w-2.5 h-2.5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  )
}

// Leyenda de estados
function StatusLegend() {
  const statuses: { status: TableStatus; label: string }[] = [
    { status: 'libre', label: 'Libre' },
    { status: 'ocupada', label: 'Ocupada' },
    { status: 'solicito_pedido', label: 'Solicito Pedido' },
    { status: 'pedido_cumplido', label: 'Pedido Cumplido' },
    { status: 'cuenta_solicitada', label: 'Cuenta Solicitada' },
  ]

  return (
    <div className="flex flex-wrap gap-4 mb-4 p-3 bg-zinc-800/50 rounded-lg">
      <span className="text-sm text-zinc-400 font-medium">Leyenda:</span>
      {statuses.map(({ status, label }) => {
        const styles = getStatusStyles(status, true)
        return (
          <div key={status} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded border-2 ${styles.bg} ${styles.border}`} />
            <span className={`text-sm ${styles.text}`}>{label}</span>
          </div>
        )
      })}
    </div>
  )
}

export function TablesPage() {
  const tables = useTableStore(selectTables)
  const addTable = useTableStore((s) => s.addTable)
  const updateTable = useTableStore((s) => s.updateTable)
  const deleteTable = useTableStore((s) => s.deleteTable)
  const getNextTableNumber = useTableStore((s) => s.getNextTableNumber)

  const branches = useBranchStore(selectBranches)

  const createOrderHistory = useOrderHistoryStore((s) => s.createOrderHistory)
  const closeOrderHistory = useOrderHistoryStore((s) => s.closeOrderHistory)
  const getActiveOrderHistory = useOrderHistoryStore((s) => s.getActiveOrderHistory)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null)
  const [formData, setFormData] = useState<RestaurantTableFormData>(initialFormData)
  const [errors, setErrors] = useState<ValidationErrors<RestaurantTableFormData>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterBranchId, setFilterBranchId] = useState<string>(() => branches[0]?.id || '')
  const [filterStatus, setFilterStatus] = useState<string>('')

  // Sync filterBranchId when branches load or change
  useEffect(() => {
    if (branches.length > 0 && !branches.some((b) => b.id === filterBranchId)) {
      setFilterBranchId(branches[0].id)
    }
  }, [branches, filterBranchId])

  // Unique IDs for form fields
  const filterBranchSelectId = useId()
  const filterStatusSelectId = useId()

  // Filter tables by branch and status
  const filteredTables = useMemo(() => {
    let result = tables.filter((t) => t.branch_id === filterBranchId)
    if (filterStatus) {
      result = result.filter((t) => t.status === filterStatus)
    }
    return result
  }, [tables, filterBranchId, filterStatus])

  // Sort by status (grouped), then by number within each status
  const sortedTables = useMemo(() => {
    const statusOrder: Record<TableStatus, number> = {
      cuenta_solicitada: 1,  // Más urgente primero
      solicito_pedido: 2,
      pedido_cumplido: 3,
      ocupada: 4,
      libre: 5,              // Menos urgente al final
    }
    return [...filteredTables].sort((a, b) => {
      const statusDiff = statusOrder[a.status] - statusOrder[b.status]
      if (statusDiff !== 0) return statusDiff
      return a.number - b.number
    })
  }, [filteredTables])

  const getBranchName = useCallback(
    (branchId: string) => {
      const branch = branches.find((b) => b.id === branchId)
      return branch?.name || 'Sin sucursal'
    },
    [branches]
  )

  const openCreateModal = useCallback(() => {
    const defaultBranchId = filterBranchId || (branches.length > 0 ? branches[0].id : '')
    const nextNumber = defaultBranchId ? getNextTableNumber(defaultBranchId) : 1
    setSelectedTable(null)
    setFormData({
      ...initialFormData,
      branch_id: defaultBranchId,
      number: nextNumber,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [branches, getNextTableNumber, filterBranchId])

  const openEditModal = useCallback((table: RestaurantTable) => {
    setSelectedTable(table)
    setFormData({
      branch_id: table.branch_id,
      number: table.number,
      capacity: table.capacity,
      sector: table.sector,
      status: table.status,
      order_time: table.order_time ?? TABLE_DEFAULT_TIME,
      close_time: table.close_time ?? TABLE_DEFAULT_TIME,
      is_active: table.is_active ?? true,
    })
    setErrors({})
    setIsModalOpen(true)
  }, [])

  const openDeleteDialog = useCallback((table: RestaurantTable) => {
    setSelectedTable(table)
    setIsDeleteOpen(true)
  }, [])

  const handleBranchChange = useCallback(
    (branchId: string) => {
      const nextNumber = getNextTableNumber(branchId)
      setFormData((prev) => ({
        ...prev,
        branch_id: branchId,
        number: selectedTable ? prev.number : nextNumber,
      }))
    },
    [getNextTableNumber, selectedTable]
  )

  const getCurrentTime = useCallback(() => {
    const now = new Date()
    return now.toTimeString().slice(0, 5)
  }, [])

  const handleStatusChange = useCallback((newStatus: TableStatus) => {
    setFormData((prev) => {
      if (newStatus === 'libre' || newStatus === 'ocupada') {
        return {
          ...prev,
          status: newStatus,
          order_time: TABLE_DEFAULT_TIME,
          close_time: TABLE_DEFAULT_TIME,
        }
      }

      if (newStatus === 'solicito_pedido') {
        const orderTime = (prev.status === 'libre' || prev.status === 'ocupada')
          ? getCurrentTime()
          : prev.order_time
        return {
          ...prev,
          status: newStatus,
          order_time: orderTime === TABLE_DEFAULT_TIME ? getCurrentTime() : orderTime,
          close_time: TABLE_DEFAULT_TIME,
        }
      }

      if (newStatus === 'pedido_cumplido') {
        const orderTime = prev.order_time === TABLE_DEFAULT_TIME ? getCurrentTime() : prev.order_time
        return {
          ...prev,
          status: newStatus,
          order_time: orderTime,
          close_time: TABLE_DEFAULT_TIME,
        }
      }

      if (newStatus === 'cuenta_solicitada') {
        const orderTime = prev.order_time === TABLE_DEFAULT_TIME ? getCurrentTime() : prev.order_time
        const closeTime = prev.close_time === TABLE_DEFAULT_TIME ? getCurrentTime() : prev.close_time
        return {
          ...prev,
          status: newStatus,
          order_time: orderTime,
          close_time: closeTime,
        }
      }

      return { ...prev, status: newStatus }
    })
  }, [getCurrentTime])

  const handleSubmit = useCallback(() => {
    const validation = validateTable(formData, {
      existingTables: tables,
      editingTableId: selectedTable?.id,
    })
    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    setIsSubmitting(true)
    try {
      if (selectedTable) {
        updateTable(selectedTable.id, formData)
        toast.success('Mesa actualizada correctamente')
      } else {
        addTable(formData)
        toast.success('Mesa creada correctamente')
      }
      setIsModalOpen(false)
    } catch (error) {
      const message = handleError(error, 'TablesPage.handleSubmit')
      toast.error(`Error al guardar la mesa: ${message}`)
    } finally {
      setIsSubmitting(false)
    }
  }, [formData, selectedTable, updateTable, addTable, tables])

  const handleDelete = useCallback(() => {
    if (!selectedTable) return

    try {
      const tableExists = tables.some((t) => t.id === selectedTable.id)
      if (!tableExists) {
        toast.error('La mesa ya no existe')
        setIsDeleteOpen(false)
        return
      }

      deleteTable(selectedTable.id)
      toast.success('Mesa eliminada correctamente')
      setIsDeleteOpen(false)
    } catch (error) {
      const message = handleError(error, 'TablesPage.handleDelete')
      toast.error(`Error al eliminar la mesa: ${message}`)
    }
  }, [selectedTable, tables, deleteTable])

  const handleArchive = useCallback((table: RestaurantTable) => {
    try {
      const closeTime = getCurrentTime()
      const activeHistory = getActiveOrderHistory(table.id)

      if (activeHistory) {
        closeOrderHistory(activeHistory.id, closeTime)
      } else {
        const newHistory = createOrderHistory({
          branch_id: table.branch_id,
          table_id: table.id,
          table_number: table.number,
        })
        closeOrderHistory(newHistory.id, closeTime)
      }

      updateTable(table.id, {
        status: 'libre',
        order_time: TABLE_DEFAULT_TIME,
        close_time: TABLE_DEFAULT_TIME,
      })

      toast.success(`Mesa #${table.number} archivada y liberada`)
    } catch (error) {
      const message = handleError(error, 'TablesPage.handleArchive')
      toast.error(`Error al archivar: ${message}`)
    }
  }, [createOrderHistory, closeOrderHistory, getActiveOrderHistory, getCurrentTime, updateTable])

  const branchOptions = useMemo(
    () =>
      branches.map((b) => ({
        value: b.id,
        label: b.name,
      })),
    [branches]
  )

  const sectorOptions = useMemo(
    () =>
      TABLE_SECTORS.map((sector) => ({
        value: sector,
        label: sector,
      })),
    []
  )

  const filterStatusOptions = useMemo(
    () => [
      { value: '', label: 'Todos los estados' },
      ...statusOptions,
    ],
    []
  )

  // Contadores por estado
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      total: sortedTables.length,
      libre: 0,
      ocupada: 0,
      solicito_pedido: 0,
      pedido_cumplido: 0,
      cuenta_solicitada: 0,
    }
    sortedTables.forEach((t) => {
      if (counts[t.status] !== undefined) {
        counts[t.status]++
      }
    })
    return counts
  }, [sortedTables])

  return (
    <PageContainer
      title="Mesas"
      description="Administra las mesas de las sucursales"
      helpContent={helpContent.tables}
      actions={
        <Button
          onClick={openCreateModal}
          leftIcon={<Plus className="w-4 h-4" />}
          disabled={branches.length === 0}
        >
          Nueva Mesa
        </Button>
      }
    >
      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-4">
        <Select
          id={filterBranchSelectId}
          options={branchOptions}
          value={filterBranchId}
          onChange={(e) => setFilterBranchId(e.target.value)}
          className="w-64"
          aria-label="Filtrar mesas por sucursal"
        />
        <Select
          id={filterStatusSelectId}
          options={filterStatusOptions}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-48"
          aria-label="Filtrar mesas por estado"
        />

        {/* Contador de mesas */}
        <div className="flex items-center gap-2 ml-auto">
          <Badge variant="default">{statusCounts.total} mesas</Badge>
          {statusCounts.libre > 0 && (
            <Badge variant="success">{statusCounts.libre} libres</Badge>
          )}
          {statusCounts.ocupada > 0 && (
            <Badge variant="danger">{statusCounts.ocupada} ocupadas</Badge>
          )}
        </div>
      </div>

      {/* Leyenda de colores */}
      <StatusLegend />

      {branches.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-500">
            No hay sucursales. Crea una sucursal primero para poder agregar mesas.
          </p>
        </Card>
      ) : sortedTables.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-zinc-500 mb-4">
            No hay mesas en esta sucursal. Crea una para comenzar.
          </p>
          <Button onClick={openCreateModal} leftIcon={<Plus className="w-4 h-4" />}>
            Nueva Mesa
          </Button>
        </Card>
      ) : (
        /* Cuadrícula de mesas - 8 columnas, scrollable */
        <div className="max-h-[600px] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
            {sortedTables.map((table) => (
              <TableCard
                key={table.id}
                table={table}
                onEdit={openEditModal}
                onDelete={openDeleteDialog}
                onArchive={handleArchive}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTable ? 'Editar Mesa' : 'Nueva Mesa'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {selectedTable ? 'Guardar' : 'Crear'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpButton
              title="Formulario de Mesa"
              size="sm"
              content={
                <div className="space-y-3">
                  <p>
                    <strong>Completa los siguientes campos</strong> para crear o editar una mesa:
                  </p>
                  <ul className="list-disc pl-5 space-y-2">
                    <li>
                      <strong>Sucursal:</strong> Selecciona a que sucursal pertenece la mesa. Es obligatorio.
                    </li>
                    <li>
                      <strong>Numero de mesa:</strong> Identificador unico de la mesa dentro de la sucursal.
                    </li>
                    <li>
                      <strong>Capacidad:</strong> Cantidad maxima de comensales (1-50).
                    </li>
                    <li>
                      <strong>Sector:</strong> Ubicacion dentro del local (Interior, Terraza, VIP, etc.).
                    </li>
                    <li>
                      <strong>Estado:</strong> Estado actual de la mesa para el seguimiento de pedidos.
                    </li>
                    <li>
                      <strong>Hora Pedido:</strong> Hora del primer pedido de la mesa (formato HH:mm).
                    </li>
                    <li>
                      <strong>Hora Cierre:</strong> Hora estimada de cierre de la mesa (formato HH:mm).
                    </li>
                    <li>
                      <strong>Mesa activa:</strong> Activa o desactiva la disponibilidad de la mesa.
                    </li>
                  </ul>
                  <div className="bg-zinc-800 p-3 rounded-lg mt-3">
                    <p className="text-orange-400 font-medium text-sm">Consejo:</p>
                    <p className="text-sm mt-1">
                      Organiza las mesas por sectores para facilitar el seguimiento de pedidos y la asignacion de mozos.
                    </p>
                  </div>
                </div>
              }
            />
            <span className="text-sm text-zinc-400">Ayuda sobre el formulario</span>
          </div>

          {/* Branch Select */}
          <Select
            label="Sucursal"
            options={branchOptions}
            placeholder="Seleccionar sucursal"
            value={formData.branch_id}
            onChange={(e) => handleBranchChange(e.target.value)}
            error={errors.branch_id}
          />

          {/* Table Number */}
          <Input
            label="Numero de mesa"
            type="number"
            min={1}
            value={formData.number}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                number: parseInt(e.target.value, 10) || 1,
              }))
            }
            error={errors.number}
          />

          {/* Capacity */}
          <Input
            label="Capacidad (comensales)"
            type="number"
            min={1}
            max={50}
            value={formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                capacity: parseInt(e.target.value, 10) || 1,
              }))
            }
            error={errors.capacity}
          />

          {/* Sector */}
          <Select
            label="Sector"
            options={sectorOptions}
            value={formData.sector}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, sector: e.target.value }))
            }
            error={errors.sector}
          />

          {/* Status */}
          <Select
            label="Estado"
            options={statusOptions}
            value={formData.status}
            onChange={(e) => handleStatusChange(e.target.value as TableStatus)}
            error={errors.status}
          />

          {/* Time fields */}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Hora Pedido"
              type="time"
              value={formData.order_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, order_time: e.target.value }))
              }
              disabled={formData.status === 'libre' || formData.status === 'ocupada'}
              error={errors.order_time}
            />
            <Input
              label="Hora Cierre"
              type="time"
              value={formData.close_time}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, close_time: e.target.value }))
              }
              disabled={formData.status !== 'cuenta_solicitada'}
              error={errors.close_time}
            />
          </div>
          <p className="text-xs text-zinc-500 -mt-2">
            {formData.status === 'solicito_pedido' || formData.status === 'pedido_cumplido'
              ? 'Hora de pedido requerida. Hora de cierre en 00:00.'
              : formData.status === 'cuenta_solicitada'
                ? 'Ambas horas requeridas. Hora de cierre debe ser >= hora de pedido.'
                : 'Ambas horas en 00:00 para este estado.'}
          </p>

          {/* Active Toggle */}
          <Toggle
            label="Mesa activa"
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
        title="Eliminar Mesa"
        message={`¿Estas seguro de eliminar la mesa #${selectedTable?.number} de ${selectedTable ? getBranchName(selectedTable.branch_id) : ''}?`}
        confirmLabel="Eliminar"
      />
    </PageContainer>
  )
}

export default TablesPage
