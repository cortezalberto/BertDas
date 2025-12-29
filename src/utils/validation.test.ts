/**
 * SPRINT 7: Validation utilities test suite
 *
 * Comprehensive tests for all validation functions covering:
 * - Edge cases (empty, null, undefined, extreme values)
 * - Valid inputs
 * - Invalid inputs
 * - Boundary conditions
 */

import { describe, it, expect } from 'vitest'
import {
  isValidNumber,
  isPositiveNumber,
  isNonNegativeNumber,
  validateRestaurant,
  validateBranch,
  validateCategory,
  validateSubcategory,
  validateProduct,
  validateAllergen,
  validateBadge,
  validateSeal,
  validatePromotionType,
  validatePromotion,
  validateTable,
  validateStaff,
  validateRole,
} from './validation'
import type {
  RestaurantFormData,
  BranchFormData,
  CategoryFormData,
  SubcategoryFormData,
  ProductFormData,
  AllergenFormData,
  BadgeFormData,
  SealFormData,
  PromotionTypeFormData,
  PromotionFormData,
  RestaurantTableFormData,
} from '../types'
import type { CreateStaffData } from '../types/staff'
import type { CreateRoleData } from '../types/role'

describe('Number Validation Functions', () => {
  describe('isValidNumber', () => {
    it('should return true for valid finite numbers', () => {
      expect(isValidNumber(0)).toBe(true)
      expect(isValidNumber(1)).toBe(true)
      expect(isValidNumber(-1)).toBe(true)
      expect(isValidNumber(3.14)).toBe(true)
      expect(isValidNumber(-999.99)).toBe(true)
      expect(isValidNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
      expect(isValidNumber(Number.MIN_SAFE_INTEGER)).toBe(true)
    })

    it('should return false for NaN', () => {
      expect(isValidNumber(NaN)).toBe(false)
      expect(isValidNumber(Number.NaN)).toBe(false)
    })

    it('should return false for Infinity', () => {
      expect(isValidNumber(Infinity)).toBe(false)
      expect(isValidNumber(-Infinity)).toBe(false)
      expect(isValidNumber(Number.POSITIVE_INFINITY)).toBe(false)
      expect(isValidNumber(Number.NEGATIVE_INFINITY)).toBe(false)
    })

    it('should return false for non-numbers', () => {
      expect(isValidNumber('123')).toBe(false)
      expect(isValidNumber('0')).toBe(false)
      expect(isValidNumber(null)).toBe(false)
      expect(isValidNumber(undefined)).toBe(false)
      expect(isValidNumber(true)).toBe(false)
      expect(isValidNumber({})).toBe(false)
      expect(isValidNumber([])).toBe(false)
    })
  })

  describe('isPositiveNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isPositiveNumber(1)).toBe(true)
      expect(isPositiveNumber(0.1)).toBe(true)
      expect(isPositiveNumber(999.99)).toBe(true)
      expect(isPositiveNumber(Number.MAX_SAFE_INTEGER)).toBe(true)
    })

    it('should return false for zero', () => {
      expect(isPositiveNumber(0)).toBe(false)
      expect(isPositiveNumber(-0)).toBe(false)
    })

    it('should return false for negative numbers', () => {
      expect(isPositiveNumber(-1)).toBe(false)
      expect(isPositiveNumber(-0.1)).toBe(false)
      expect(isPositiveNumber(Number.MIN_SAFE_INTEGER)).toBe(false)
    })

    it('should return false for invalid numbers', () => {
      expect(isPositiveNumber(NaN)).toBe(false)
      expect(isPositiveNumber(Infinity)).toBe(false)
      expect(isPositiveNumber('1')).toBe(false)
    })
  })

  describe('isNonNegativeNumber', () => {
    it('should return true for positive numbers', () => {
      expect(isNonNegativeNumber(1)).toBe(true)
      expect(isNonNegativeNumber(0.1)).toBe(true)
      expect(isNonNegativeNumber(999.99)).toBe(true)
    })

    it('should return true for zero', () => {
      expect(isNonNegativeNumber(0)).toBe(true)
      expect(isNonNegativeNumber(-0)).toBe(true)
    })

    it('should return false for negative numbers', () => {
      expect(isNonNegativeNumber(-1)).toBe(false)
      expect(isNonNegativeNumber(-0.1)).toBe(false)
    })

    it('should return false for invalid numbers', () => {
      expect(isNonNegativeNumber(NaN)).toBe(false)
      expect(isNonNegativeNumber(Infinity)).toBe(false)
    })
  })
})

describe('Restaurant Validation', () => {
  const validRestaurant: RestaurantFormData = {
    name: 'Buen Sabor',
    slug: 'buen-sabor',
    description: 'Restaurante de comida casera',
    address: 'Calle Falsa 123',
    phone: '+54 11 1234-5678',
    email: 'info@buensabor.com',
  }

  it('should validate a valid restaurant', () => {
    const result = validateRestaurant(validRestaurant)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  describe('name field', () => {
    it('should fail when name is empty', () => {
      const result = validateRestaurant({ ...validRestaurant, name: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBe('El nombre es requerido')
    })

    it('should fail when name is only whitespace', () => {
      const result = validateRestaurant({ ...validRestaurant, name: '   ' })
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toBe('El nombre es requerido')
    })

    it('should fail when name is too short', () => {
      const result = validateRestaurant({ ...validRestaurant, name: 'AB' })
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toContain('al menos')
    })

    it('should fail when name is too long', () => {
      const result = validateRestaurant({ ...validRestaurant, name: 'A'.repeat(101) })
      expect(result.isValid).toBe(false)
      expect(result.errors.name).toContain('no puede exceder')
    })

    it('should trim whitespace from name', () => {
      const result = validateRestaurant({ ...validRestaurant, name: '  Buen Sabor  ' })
      expect(result.isValid).toBe(true)
    })
  })

  describe('slug field', () => {
    it('should fail when slug is empty', () => {
      const result = validateRestaurant({ ...validRestaurant, slug: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.slug).toBe('El slug es requerido')
    })

    it('should accept valid slug formats', () => {
      const validSlugs = ['buen-sabor', 'restaurant-123', 'mi-restaurant', 'a']
      validSlugs.forEach(slug => {
        const result = validateRestaurant({ ...validRestaurant, slug })
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Buen-Sabor',      // uppercase
        'buen sabor',      // spaces
        'buen_sabor',      // underscores
        'buen.sabor',      // dots
        '-buen-sabor',     // leading hyphen
        'buen-sabor-',     // trailing hyphen
        'buen--sabor',     // double hyphen
      ]
      invalidSlugs.forEach(slug => {
        const result = validateRestaurant({ ...validRestaurant, slug })
        expect(result.isValid).toBe(false)
        expect(result.errors.slug).toContain('letras minusculas')
      })
    })
  })

  describe('description field', () => {
    it('should fail when description is empty', () => {
      const result = validateRestaurant({ ...validRestaurant, description: '' })
      expect(result.isValid).toBe(false)
      expect(result.errors.description).toBe('La descripcion es requerida')
    })

    it('should fail when description is too long', () => {
      const result = validateRestaurant({ ...validRestaurant, description: 'A'.repeat(501) })
      expect(result.isValid).toBe(false)
      expect(result.errors.description).toContain('no puede exceder')
    })
  })

  describe('phone field', () => {
    it('should accept valid phone formats', () => {
      const validPhones = [
        '+54 11 1234-5678',
        '(011) 4567-8901',
        '11-1234-5678',
        '+541112345678',
        '1234567890',
        '',  // empty is valid (optional)
      ]
      validPhones.forEach(phone => {
        const result = validateRestaurant({ ...validRestaurant, phone })
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject invalid phone formats', () => {
      const invalidPhones = [
        '123',           // too short
        'abc123',        // letters
        '++54111234',    // double plus
      ]
      invalidPhones.forEach(phone => {
        const result = validateRestaurant({ ...validRestaurant, phone })
        expect(result.isValid).toBe(false)
        expect(result.errors.phone).toContain('invalido')
      })
    })
  })

  describe('email field', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co',
        'user+tag@example.com',
        '',  // empty is valid (optional)
      ]
      validEmails.forEach(email => {
        const result = validateRestaurant({ ...validRestaurant, email })
        expect(result.isValid).toBe(true)
      })
    })

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'invalid',
        'invalid@',
        '@domain.com',
        'user@domain',
        'user @domain.com',
      ]
      invalidEmails.forEach(email => {
        const result = validateRestaurant({ ...validRestaurant, email })
        expect(result.isValid).toBe(false)
        expect(result.errors.email).toBe('Email invalido')
      })
    })
  })
})

describe('Branch Validation', () => {
  const validBranch: BranchFormData = {
    name: 'Sucursal Centro',
    address: 'Av. Principal 456',
    phone: '+54 11 9876-5432',
    email: 'centro@buensabor.com',
    openingTime: '08:00',
    closingTime: '22:00',
  }

  it('should validate a valid branch', () => {
    const result = validateBranch(validBranch)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when name is empty', () => {
    const result = validateBranch({ ...validBranch, name: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBe('El nombre es requerido')
  })

  it('should fail when opening time is empty', () => {
    const result = validateBranch({ ...validBranch, openingTime: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.openingTime).toBe('El horario de apertura es requerido')
  })

  it('should fail when closing time is before opening time', () => {
    const result = validateBranch({
      ...validBranch,
      openingTime: '22:00',
      closingTime: '08:00'
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.closingTime).toContain('debe ser posterior')
  })
})

describe('Category Validation', () => {
  const validCategory: CategoryFormData = {
    name: 'Bebidas',
  }

  it('should validate a valid category', () => {
    const result = validateCategory(validCategory)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when name is empty', () => {
    const result = validateCategory({ name: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBe('El nombre es requerido')
  })

  it('should fail when name is too short', () => {
    const result = validateCategory({ name: 'AB' })
    expect(result.isValid).toBe(false)
  })

  it('should fail when name is too long', () => {
    const result = validateCategory({ name: 'A'.repeat(101) })
    expect(result.isValid).toBe(false)
  })
})

describe('Product Validation', () => {
  const validProduct: ProductFormData = {
    name: 'Cerveza Artesanal',
    description: 'Cerveza elaborada localmente',
    categoryId: 'cat-1',
    subcategoryId: 'subcat-1',
    allergenIds: ['alg-1'],
    badgeIds: ['badge-1'],
    sealIds: ['seal-1'],
  }

  it('should validate a valid product', () => {
    const result = validateProduct(validProduct)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when name is empty', () => {
    const result = validateProduct({ ...validProduct, name: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBe('El nombre es requerido')
  })

  it('should fail when category is not selected', () => {
    const result = validateProduct({ ...validProduct, categoryId: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.categoryId).toBe('Debes seleccionar una categoria')
  })

  it('should fail when subcategory is not selected', () => {
    const result = validateProduct({ ...validProduct, subcategoryId: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.subcategoryId).toBe('Debes seleccionar una subcategoria')
  })
})

describe('Promotion Validation', () => {
  const validPromotion: PromotionFormData = {
    name: 'Happy Hour',
    description: 'Descuento en bebidas',
    promotionTypeId: 'type-1',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    branchIds: ['branch-1'],
    productIds: ['prod-1'],
  }

  it('should validate a valid promotion', () => {
    const result = validatePromotion(validPromotion)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when end date is before start date', () => {
    const result = validatePromotion({
      ...validPromotion,
      startDate: '2025-12-31',
      endDate: '2025-01-01',
    })
    expect(result.isValid).toBe(false)
    expect(result.errors.endDate).toContain('debe ser posterior')
  })

  it('should fail when no branches are selected', () => {
    const result = validatePromotion({ ...validPromotion, branchIds: [] })
    expect(result.isValid).toBe(false)
    expect(result.errors.branchIds).toContain('menos una sucursal')
  })

  it('should fail when no products are selected', () => {
    const result = validatePromotion({ ...validPromotion, productIds: [] })
    expect(result.isValid).toBe(false)
    expect(result.errors.productIds).toContain('menos un producto')
  })
})

describe('Staff Validation', () => {
  const validStaff: CreateStaffData = {
    name: 'Juan',
    lastName: 'Pérez',
    email: 'juan@buensabor.com',
    phone: '+54 11 1234-5678',
    roleIds: ['role-1'],
  }

  it('should validate valid staff data', () => {
    const result = validateStaff(validStaff)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when name is empty', () => {
    const result = validateStaff({ ...validStaff, name: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBe('El nombre es requerido')
  })

  it('should fail when email is invalid', () => {
    const result = validateStaff({ ...validStaff, email: 'invalid-email' })
    expect(result.isValid).toBe(false)
    expect(result.errors.email).toBe('Email invalido')
  })

  it('should fail when no roles are assigned', () => {
    const result = validateStaff({ ...validStaff, roleIds: [] })
    expect(result.isValid).toBe(false)
    expect(result.errors.roleIds).toContain('menos un rol')
  })
})

describe('Role Validation', () => {
  const validRole: CreateRoleData = {
    name: 'Administrador',
    permissions: ['read', 'write', 'delete'],
  }

  it('should validate valid role data', () => {
    const result = validateRole(validRole)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('should fail when name is empty', () => {
    const result = validateRole({ ...validRole, name: '' })
    expect(result.isValid).toBe(false)
    expect(result.errors.name).toBe('El nombre es requerido')
  })

  it('should fail when no permissions are assigned', () => {
    const result = validateRole({ ...validRole, permissions: [] })
    expect(result.isValid).toBe(false)
    expect(result.errors.permissions).toContain('menos un permiso')
  })
})
