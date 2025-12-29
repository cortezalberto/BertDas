# React 19 useActionState Migration Status

## Overview
Migration of all Dashboard forms from traditional form handling to React 19's useActionState pattern, following the exact pattern established in Staff.tsx and Roles.tsx.

## Completed Migrations (3/12)

### ✅ 1. Branches.tsx
**Status:** Complete
**Form fields:** name, address, phone, email, image, opening_time, closing_time, order, is_active
**Validation:** validateBranch (already existed)
**Changes made:**
- Added `useActionState` import from react
- Added `FormState` type import
- Removed `errors` and `isSubmitting` state
- Created `submitAction` callback with validation
- Added `useActionState` hook
- Added modal close logic on success
- Changed form to use `action={formAction}`
- Added `name` attributes to all inputs
- Changed button to use `form="branch-form"` and `isLoading={isPending}`
- Display errors using `state.errors?.fieldName`
- Used hidden input for image field

### ✅ 2. Categories.tsx
**Status:** Complete
**Form fields:** branch_id, name, icon, image, order, is_active
**Validation:** validateCategory (already existed)
**Changes made:**
- Same pattern as Branches.tsx
- Used hidden inputs for branch_id and image
- Form ID: "category-form"

### ✅ 3. Allergens.tsx
**Status:** Complete
**Form fields:** name, icon, description, is_active
**Validation:** validateAllergen (already existed)
**Changes made:**
- Same pattern as Branches.tsx
- Form ID: "allergen-form"

## Remaining Migrations (9/12)

### 4. Subcategories.tsx
**Status:** Pending
**Form fields:** category_id, name, icon, image, order, is_active
**Validation:** validateSubcategory (already exists)
**Notes:** Similar to Categories.tsx, needs hidden input for category_id

### 5. Products.tsx
**Status:** Pending
**Form fields:** category_id, subcategory_id, name, description, image, price, preparation_time, is_active, allergen_ids[], badge_ids[], seal_ids[], branch_prices[]
**Validation:** validateProduct (already exists, returns both errors and branchPriceErrors)
**Notes:** Complex form with multi-select components and conditional branch pricing

### 6. Prices.tsx
**Status:** Pending
**Form fields:** product_id, branch_id, price, is_available
**Validation:** Need to create validatePrice function
**Notes:** Branch price bulk update form

### 7. Badges.tsx
**Status:** Pending
**Form fields:** name, icon, color, description, is_active
**Validation:** validateBadge (already exists)
**Notes:** Identical structure to Allergens.tsx

### 8. Seals.tsx
**Status:** Pending
**Form fields:** name, icon, color, description, is_active
**Validation:** validateSeal (already exists)
**Notes:** Identical structure to Allergens.tsx and Badges.tsx

### 9. PromotionTypes.tsx
**Status:** Pending
**Form fields:** name, description, discount_type, is_active
**Validation:** validatePromotionType (already exists)
**Notes:** Simple form, similar pattern

### 10. Promotions.tsx
**Status:** Pending
**Form fields:** branch_ids[], name, price, start_date, end_date, start_time, end_time, promotion_type_id, items[], is_active
**Validation:** validatePromotion (already exists, takes options: { isEditing })
**Notes:** Complex form with ProductSelect and BranchCheckboxes components

### 11. Tables.tsx
**Status:** Pending
**Form fields:** branch_id, number, capacity, sector, status, order_time, close_time, is_active
**Validation:** validateTable (already exists, takes options: { existingTables, editingTableId })
**Notes:** Complex validation with status-dependent time rules

### 12. Dashboard.tsx (BranchCard modal)
**Status:** Pending
**Form fields:** name, address, phone, email, opening_time, closing_time, is_active
**Validation:** validateBranch (reuse from Branches.tsx)
**Notes:** Inline branch creation modal in Dashboard page

## Migration Pattern Reference

### Required Imports
```typescript
import { useState, useMemo, useCallback, useActionState } from 'react'
import { validateX } from '../utils/validation'
import { handleError } from '../utils/logger'
import { toast } from '../stores/toastStore'
import type { FormState } from '../types/form'
```

### Remove Old State
```typescript
// REMOVE these:
const [errors, setErrors] = useState<ValidationErrors<XFormData>>({})
const [isSubmitting, setIsSubmitting] = useState(false)
```

### Add submitAction Callback
```typescript
const submitAction = useCallback(
  async (_prevState: FormState<XFormData>, formData: FormData): Promise<FormState<XFormData>> => {
    const data: XFormData = {
      field1: formData.get('field1') as string,
      field2: parseInt(formData.get('field2') as string, 10) || 0,
      is_active: formData.get('is_active') === 'on',
      // ... extract all fields
    }

    const validation = validateX(data)
    if (!validation.isValid) {
      return { errors: validation.errors, isSuccess: false }
    }

    try {
      if (selectedItem) {
        updateItem(selectedItem.id, data)
        toast.success('Item actualizado correctamente')
      } else {
        addItem(data)
        toast.success('Item creado correctamente')
      }
      return { isSuccess: true, message: 'Guardado correctamente' }
    } catch (error) {
      const message = handleError(error, 'PageName.submitAction')
      toast.error(`Error al guardar: ${message}`)
      return { isSuccess: false, message: `Error: ${message}` }
    }
  },
  [selectedItem, updateItem, addItem]
)
```

### Add useActionState Hook
```typescript
const [state, formAction, isPending] = useActionState<FormState<XFormData>, FormData>(
  submitAction,
  { isSuccess: false }
)

// Close modal on success
if (state.isSuccess && isModalOpen) {
  setIsModalOpen(false)
  setSelectedItem(null)
  setFormData(initialFormData)
}
```

### Update openModal Functions
```typescript
// Remove setErrors({}) calls
const openCreateModal = useCallback(() => {
  setSelectedItem(null)
  setFormData(initialFormData)
  // setErrors({}) // REMOVE THIS
  setIsModalOpen(true)
}, [])
```

### Remove handleSubmit Function
```typescript
// DELETE entire handleSubmit callback
```

### Update Form JSX
```typescript
<Modal
  footer={
    <>
      <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
        Cancelar
      </Button>
      <Button type="submit" form="x-form" isLoading={isPending}>
        {selectedItem ? 'Guardar' : 'Crear'}
      </Button>
    </>
  }
>
  <form id="x-form" action={formAction} className="space-y-4">
    <Input
      label="Field"
      name="field"
      value={formData.field}
      onChange={(e) => setFormData(prev => ({ ...prev, field: e.target.value }))}
      error={state.errors?.field}
    />

    {/* For hidden fields (image, IDs): */}
    <input type="hidden" name="image" value={formData.image} />

    <Toggle
      label="Active"
      name="is_active"
      checked={formData.is_active}
      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
    />
  </form>
</Modal>
```

## Special Considerations

### For Multi-Select Fields
```typescript
// In submitAction for allergen_ids, badge_ids, etc.:
allergen_ids: formData.getAll('allergen_ids') as string[]
```

### For Complex Validation (Products, Tables)
```typescript
// Products.tsx has branchPriceErrors
const validation = validateProduct(data)
if (!validation.isValid) {
  return {
    errors: validation.errors,
    branchPriceErrors: validation.branchPriceErrors,
    isSuccess: false
  }
}

// Tables.tsx needs uniqueness check options
const validation = validateTable(data, {
  existingTables: tables,
  editingTableId: selectedTable?.id
})
```

### For Conditional Fields
```typescript
// Promotions.tsx passes isEditing option
const validation = validatePromotion(data, { isEditing: !!selectedPromotion })
```

## Missing Validation Function

### validatePrice (needs to be created)
Location: `Dashboard/src/utils/validation.ts`

```typescript
// Add to validation.ts:
export function validatePrice(data: BranchPriceFormData): ValidationResult<BranchPriceFormData> {
  const errors: ValidationErrors<BranchPriceFormData> = {}

  if (!data.product_id) {
    errors.product_id = 'El producto es requerido'
  }

  if (!data.branch_id) {
    errors.branch_id = 'La sucursal es requerida'
  }

  if (!isPositiveNumber(data.price)) {
    errors.price = 'El precio debe ser mayor a 0'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
```

## Testing Checklist

For each migrated form:
- [ ] Form submits successfully (create)
- [ ] Form submits successfully (edit)
- [ ] Validation errors display correctly
- [ ] Modal closes on successful submit
- [ ] Loading state shows during submission
- [ ] Error toast shows on failure
- [ ] Success toast shows on success
- [ ] All form fields have name attributes
- [ ] Hidden fields work correctly
- [ ] Checkbox/Toggle fields work correctly
- [ ] Number fields parse correctly
- [ ] Multi-select fields work correctly (if applicable)

## Notes

- All validation functions already exist except `validatePrice`
- Keep existing validation logic intact - only change the form submission pattern
- Follow the exact pattern from Staff.tsx and Roles.tsx
- Use `form="form-id"` on submit button when button is in Modal footer
- Use hidden inputs for fields that aren't directly editable (IDs, images)
- Always use `parseInt(value, 10)` for number fields with fallback to 0
- Always use `=== 'on'` for checkbox fields
- Remove `setErrors({})` calls from modal open functions
- Remove entire `handleSubmit` callback
- Add modal close logic with `if (state.isSuccess && isModalOpen)`
