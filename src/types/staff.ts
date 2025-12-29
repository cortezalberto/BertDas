export interface Staff {
  id: string
  branch_id: string
  role_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  dni: string
  hire_date: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CreateStaffData = Omit<Staff, 'id' | 'created_at' | 'updated_at'>
export type UpdateStaffData = Partial<CreateStaffData>
