/**
 * SPRINT 8: useFormModal hook
 *
 * Reusable hook for managing modal state with form data.
 * Eliminates duplicate modal + form state management across 16 CRUD pages.
 *
 * Usage:
 * ```typescript
 * const modal = useFormModal(initialFormData)
 *
 * // Open for create
 * modal.openCreate()
 *
 * // Open for edit
 * modal.openEdit(existingItem)
 *
 * // Close and reset
 * modal.close()
 * ```
 */

import { useState, useCallback } from 'react'

export interface UseFormModalReturn<T> {
  /** Is modal currently open */
  isOpen: boolean
  /** Current form data */
  formData: T
  /** Selected item being edited (null for create) */
  selectedItem: any | null
  /** Update form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /** Open modal for creating new item */
  openCreate: () => void
  /** Open modal for editing existing item */
  openEdit: (item: any) => void
  /** Close modal and reset state */
  close: () => void
  /** Reset form to initial data */
  reset: () => void
}

/**
 * Hook for managing modal state with form data
 *
 * @param initialFormData - Initial/default form data
 * @returns Modal state and control functions
 *
 * @example
 * ```typescript
 * const categoryModal = useFormModal<CategoryFormData>({
 *   name: ''
 * })
 *
 * // Later in component
 * <Modal
 *   isOpen={categoryModal.isOpen}
 *   onClose={categoryModal.close}
 * >
 *   <Input
 *     value={categoryModal.formData.name}
 *     onChange={(e) => categoryModal.setFormData({
 *       ...categoryModal.formData,
 *       name: e.target.value
 *     })}
 *   />
 * </Modal>
 * ```
 */
export function useFormModal<T>(initialFormData: T): UseFormModalReturn<T> {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<T>(initialFormData)
  const [selectedItem, setSelectedItem] = useState<any | null>(null)

  const openCreate = useCallback(() => {
    setFormData(initialFormData)
    setSelectedItem(null)
    setIsOpen(true)
  }, [initialFormData])

  const openEdit = useCallback((item: any) => {
    setFormData(item as T)
    setSelectedItem(item)
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Reset after animation completes
    setTimeout(() => {
      setFormData(initialFormData)
      setSelectedItem(null)
    }, 200)
  }, [initialFormData])

  const reset = useCallback(() => {
    setFormData(initialFormData)
  }, [initialFormData])

  return {
    isOpen,
    formData,
    selectedItem,
    setFormData,
    openCreate,
    openEdit,
    close,
    reset,
  }
}
