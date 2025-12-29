import { useState, useMemo, useCallback, useActionState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Plus, Edit2, Trash2, Search } from 'lucide-react'
import { useDocumentTitle } from '../hooks/useDocumentTitle'
import { useFormModal } from '../hooks'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Modal } from '../components/ui/Modal'
import { Badge } from '../components/ui/Badge'
import { useStaffStore } from '../stores/staffStore'
import { useRoleStore, selectRoles } from '../stores/roleStore'
import { useBranchStore, selectSelectedBranchId } from '../stores/branchStore'
import { toast } from '../stores/toastStore'
import { validateStaff } from '../utils/validation'
import { handleError } from '../utils/logger'
import type { Staff, CreateStaffData } from '../types/staff'
import type { FormState } from '../types/form'

// REACT 19 IMPROVEMENT: Use useActionState for form handling
export default function StaffPage() {
  // REACT 19: Document metadata
  useDocumentTitle('Personal')
  const selectedBranchId = useBranchStore(selectSelectedBranchId)
  const selectedBranch = useBranchStore((state) =>
    selectedBranchId ? state.branches.find((b) => b.id === selectedBranchId) : undefined
  )
  const staff = useStaffStore(
    useShallow((state) =>
      selectedBranchId ? state.staff.filter((s) => s.branch_id === selectedBranchId) : []
    )
  )
  const addStaff = useStaffStore((state) => state.addStaff)
  const updateStaff = useStaffStore((state) => state.updateStaff)
  const deleteStaff = useStaffStore((state) => state.deleteStaff)
  const roles = useRoleStore(selectRoles)

  const [searchTerm, setSearchTerm] = useState('')

  // SPRINT 14: Use custom hook for modal state
  const modal = useFormModal<CreateStaffData>({
    branch_id: selectedBranchId || '',
    role_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    dni: '',
    hire_date: new Date().toISOString().split('T')[0],
    is_active: true,
  })

  // REACT 19 IMPROVEMENT: Use useActionState for form handling
  const submitAction = useCallback(
    async (_prevState: FormState<CreateStaffData>, formData: FormData): Promise<FormState<CreateStaffData>> => {
      const data: CreateStaffData = {
        branch_id: formData.get('branch_id') as string,
        role_id: formData.get('role_id') as string,
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        dni: formData.get('dni') as string,
        hire_date: formData.get('hire_date') as string,
        is_active: formData.get('is_active') === 'on',
      }

      const validation = validateStaff(data)
      if (!validation.isValid) {
        return { errors: validation.errors, isSuccess: false }
      }

      try {
        if (modal.selectedItem) {
          updateStaff(modal.selectedItem.id, data)
          toast.success('Empleado actualizado correctamente')
        } else {
          addStaff(data)
          toast.success('Empleado creado correctamente')
        }
        return { isSuccess: true, message: 'Guardado correctamente' }
      } catch (error) {
        const message = handleError(error, 'StaffPage.submitAction')
        toast.error(`Error al guardar el empleado: ${message}`)
        return { isSuccess: false, message: `Error: ${message}` }
      }
    },
    [modal.selectedItem, updateStaff, addStaff]
  )

  const [state, formAction, isPending] = useActionState<FormState<CreateStaffData>, FormData>(
    submitAction,
    { isSuccess: false }
  )

  // SPRINT 14: Close modal on success using modal.close()
  if (state.isSuccess && modal.isOpen) {
    modal.close()
  }

  // Filter staff based on search term
  const filteredStaff = useMemo(() => {
    return staff.filter(
      (s) =>
        s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.dni.includes(searchTerm)
    )
  }, [staff, searchTerm])

  // Get role name by id
  const getRoleName = (roleId: string) => {
    const role = roles.find((r) => r.id === roleId)
    return role?.name || 'Sin rol'
  }

  // SPRINT 14: Simplified modal handlers using custom hook
  const handleOpenModal = (staffMember?: Staff) => {
    if (staffMember) {
      modal.openEdit(staffMember, {
        branch_id: staffMember.branch_id,
        role_id: staffMember.role_id,
        first_name: staffMember.first_name,
        last_name: staffMember.last_name,
        email: staffMember.email,
        phone: staffMember.phone,
        dni: staffMember.dni,
        hire_date: staffMember.hire_date,
        is_active: staffMember.is_active,
      })
    } else {
      modal.openCreate({
        branch_id: selectedBranchId || '',
        role_id: '',
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        dni: '',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
      })
    }
  }

  const handleDelete = (id: string) => {
    if (window.confirm('¿Está seguro de eliminar este empleado?')) {
      deleteStaff(id)
      toast.success('Empleado eliminado correctamente')
    }
  }

  if (!selectedBranchId) {
    return (
      <div className="space-y-6">
        <div>
          <h1
            className="text-3xl font-bold text-[#fafafa]"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            Personal
          </h1>
          <p className="mt-2 text-[#a1a1aa]">
            Gestiona los datos del personal del restaurante
          </p>
        </div>
        <Card>
          <div className="text-center py-12">
            <p className="text-[#71717a] text-lg">Selecciona una sucursal para continuar</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="text-3xl font-bold text-[#fafafa]"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Personal - {selectedBranch?.name}
        </h1>
        <p className="mt-2 text-[#a1a1aa]">
          Gestiona los datos del personal de la sucursal
        </p>
      </div>

      {/* Actions Bar */}
      <Card padding="sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 max-w-md relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#71717a]" />
            <Input
              type="text"
              placeholder="Buscar por nombre, email o DNI..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => handleOpenModal()} leftIcon={<Plus className="w-4 h-4" />}>
            Nuevo Empleado
          </Button>
        </div>
      </Card>

      {/* Staff Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#3f3f46]">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Nombre</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Rol</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Email</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Teléfono</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">DNI</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Fecha Ingreso</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#fafafa]">Estado</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-[#fafafa]">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <p className="text-[#71717a] text-lg">No se encontraron empleados</p>
                    {searchTerm && (
                      <p className="text-[#52525b] text-sm mt-2">
                        Intenta con otro término de búsqueda
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staffMember) => (
                  <tr
                    key={staffMember.id}
                    className="border-b border-[#3f3f46] hover:bg-[#27272a] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="text-sm font-medium text-[#fafafa]">
                        {staffMember.first_name} {staffMember.last_name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#a1a1aa]">{getRoleName(staffMember.role_id)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#a1a1aa]">{staffMember.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#a1a1aa]">{staffMember.phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#a1a1aa]">{staffMember.dni}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-sm text-[#a1a1aa]">
                        {new Date(staffMember.hire_date).toLocaleDateString('es-AR')}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={staffMember.is_active ? 'success' : 'default'}>
                        {staffMember.is_active ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenModal(staffMember)}
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(staffMember.id)}
                          leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                          className="text-[#ef4444] hover:text-[#f87171]"
                        >
                          Eliminar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SPRINT 14: Modal using useFormModal hook */}
      <Modal
        isOpen={modal.isOpen}
        onClose={modal.close}
        title={modal.selectedItem ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="branch_id" value={modal.formData.branch_id} />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-[#e4e4e7] mb-2">
                Nombre *
              </label>
              <Input
                id="first_name"
                name="first_name"
                type="text"
                value={modal.formData.first_name}
                onChange={(e) => modal.setFormData({ ...modal.formData, first_name: e.target.value })}
                placeholder="Juan"
                error={state.errors?.first_name}
              />
            </div>

            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-[#e4e4e7] mb-2">
                Apellido *
              </label>
              <Input
                id="last_name"
                name="last_name"
                type="text"
                value={modal.formData.last_name}
                onChange={(e) => modal.setFormData({ ...modal.formData, last_name: e.target.value })}
                placeholder="Pérez"
                error={state.errors?.last_name}
              />
            </div>
          </div>

          <div>
            <label htmlFor="role_id" className="block text-sm font-medium text-[#e4e4e7] mb-2">
              Rol *
            </label>
            <select
              id="role_id"
              name="role_id"
              value={modal.formData.role_id}
              onChange={(e) => modal.setFormData({ ...modal.formData, role_id: e.target.value })}
              className={`w-full px-3 py-2 bg-[#3f3f46] border rounded-lg text-[#fafafa] placeholder-[#71717a] focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:border-transparent transition-colors ${state.errors?.role_id ? 'border-[#ef4444]' : 'border-[#52525b]'}`}
            >
              <option value="">Seleccionar rol</option>
              {roles.filter((r) => r.is_active).map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
            {state.errors?.role_id && (
              <p className="mt-1 text-sm text-[#ef4444]">{state.errors.role_id}</p>
            )}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-[#e4e4e7] mb-2">
              Email *
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              value={modal.formData.email}
              onChange={(e) => modal.setFormData({ ...modal.formData, email: e.target.value })}
              placeholder="juan.perez@example.com"
              error={state.errors?.email}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[#e4e4e7] mb-2">
                Teléfono *
              </label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={modal.formData.phone}
                onChange={(e) => modal.setFormData({ ...modal.formData, phone: e.target.value })}
                placeholder="+54 9 11 1234-5678"
                error={state.errors?.phone}
              />
            </div>

            <div>
              <label htmlFor="dni" className="block text-sm font-medium text-[#e4e4e7] mb-2">
                DNI *
              </label>
              <Input
                id="dni"
                name="dni"
                type="text"
                value={modal.formData.dni}
                onChange={(e) => modal.setFormData({ ...modal.formData, dni: e.target.value })}
                placeholder="12345678"
                error={state.errors?.dni}
              />
            </div>
          </div>

          <div>
            <label htmlFor="hire_date" className="block text-sm font-medium text-[#e4e4e7] mb-2">
              Fecha de Ingreso *
            </label>
            <Input
              id="hire_date"
              name="hire_date"
              type="date"
              value={modal.formData.hire_date}
              onChange={(e) => modal.setFormData({ ...modal.formData, hire_date: e.target.value })}
              error={state.errors?.hire_date}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is_active"
              name="is_active"
              type="checkbox"
              checked={modal.formData.is_active}
              onChange={(e) => modal.setFormData({ ...modal.formData, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-[#52525b] bg-[#3f3f46] text-[#f97316] focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 focus:ring-offset-[#18181b]"
            />
            <label htmlFor="is_active" className="text-sm font-medium text-[#e4e4e7]">
              Empleado activo
            </label>
          </div>

          <div className="flex items-center gap-3 pt-4">
            <Button type="submit" className="flex-1" isLoading={isPending}>
              {modal.selectedItem ? 'Actualizar' : 'Crear'}
            </Button>
            <Button type="button" variant="ghost" onClick={modal.close} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
