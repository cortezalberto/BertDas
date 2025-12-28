/**
 * Cascade Delete Service
 * Centralizes all cascade delete operations to ensure data integrity
 * and provide transactional-like behavior for related entity cleanup.
 *
 * Uses dependency injection pattern for store access to enable:
 * - Better testability (mock stores in tests)
 * - Loose coupling (service doesn't directly depend on store implementations)
 * - Flexibility (can work with different store implementations)
 */

import type { Branch, Category, Subcategory, Product, Allergen, PromotionType, Promotion, RestaurantTable, OrderHistory } from '../types'

/**
 * Store interfaces for dependency injection
 * These define the minimal contract needed by the cascade service
 */
export interface BranchStoreActions {
  branches: Branch[]
  deleteBranch: (id: string) => void
}

export interface CategoryStoreActions {
  categories: Category[]
  getByBranch: (branchId: string) => Category[]
  deleteByBranch: (branchId: string) => void
  deleteCategory: (id: string) => void
}

export interface SubcategoryStoreActions {
  subcategories: Subcategory[]
  getByCategory: (categoryId: string) => Subcategory[]
  deleteByCategories: (categoryIds: string[]) => void
  deleteByCategory: (categoryId: string) => void
  deleteSubcategory: (id: string) => void
}

export interface ProductStoreActions {
  products: Product[]
  getByCategory: (categoryId: string) => Product[]
  getBySubcategory: (subcategoryId: string) => Product[]
  deleteByCategories: (categoryIds: string[]) => void
  deleteByCategory: (categoryId: string) => void
  deleteBySubcategory: (subcategoryId: string) => void
  deleteProduct: (id: string) => void
  removeAllergenFromProducts: (allergenId: string) => void
  removeBranchFromProductPrices: (branchId: string) => void
}

export interface PromotionStoreActions {
  promotions: Promotion[]
  removeProductFromPromotions: (productId: string) => void
  removeBranchFromPromotions: (branchId: string) => void
  clearPromotionType: (promotionTypeId: string) => void
}

export interface TableStoreActions {
  tables: RestaurantTable[]
  getByBranch: (branchId: string) => RestaurantTable[]
  deleteByBranch: (branchId: string) => void
}

export interface OrderHistoryStoreActions {
  orderHistory: OrderHistory[]
  deleteByBranch: (branchId: string) => void
}

export interface PromotionTypeStoreActions {
  promotionTypes: PromotionType[]
  deletePromotionType: (id: string) => void
}

export interface AllergenStoreActions {
  allergens: Allergen[]
  deleteAllergen: (id: string) => void
}

/**
 * Result of a cascade delete operation
 */
export interface CascadeDeleteResult {
  success: boolean
  deletedCounts: {
    categories?: number
    subcategories?: number
    products?: number
    promotions?: number
    tables?: number
    orderHistory?: number
  }
  error?: string
}

/**
 * Validates that an entity exists before attempting cascade delete
 */
function validateExists<T extends { id: string }>(
  items: T[],
  id: string,
  entityName: string
): T | null {
  const item = items.find((i) => i.id === id)
  if (!item) {
    console.warn(`${entityName} with id ${id} not found for cascade delete`)
    return null
  }
  return item
}

/**
 * Cascade delete a branch and all related data
 * Order: promotions cleanup → products → subcategories → categories → tables → orderHistory → branch
 */
export function cascadeDeleteBranch(
  branchId: string,
  stores: {
    branch: BranchStoreActions
    category: CategoryStoreActions
    subcategory: SubcategoryStoreActions
    product: ProductStoreActions
    promotion: PromotionStoreActions
    table: TableStoreActions
    orderHistory: OrderHistoryStoreActions
  }
): CascadeDeleteResult {
  const { branch: branchStore, category: categoryStore, subcategory: subcategoryStore, product: productStore, promotion: promotionStore, table: tableStore, orderHistory: orderHistoryStore } = stores

  // Validate branch exists
  const branch = validateExists(branchStore.branches, branchId, 'Branch')
  if (!branch) {
    return { success: false, deletedCounts: {}, error: 'Branch not found' }
  }

  try {
    // Get all categories for this branch
    const branchCategories = categoryStore.getByBranch(branchId)
    const categoryIds = branchCategories.map((c) => c.id)

    // Count subcategories BEFORE deletion
    let subcategoriesCount = 0
    categoryIds.forEach((catId) => {
      subcategoriesCount += subcategoryStore.getByCategory(catId).length
    })

    // Count products BEFORE deletion
    const productsToDelete: string[] = []
    categoryIds.forEach((catId) => {
      const products = productStore.getByCategory(catId)
      productsToDelete.push(...products.map((p) => p.id))
    })

    // Count tables BEFORE deletion
    const tablesCount = tableStore.getByBranch(branchId).length

    // Count order history BEFORE deletion
    const orderHistoryCount = orderHistoryStore.orderHistory.filter((h) => h.branch_id === branchId).length

    // 1. Clean products from promotions (removes empty promotions automatically)
    productsToDelete.forEach((productId) => {
      promotionStore.removeProductFromPromotions(productId)
    })

    // 2. Remove branch from remaining promotions
    promotionStore.removeBranchFromPromotions(branchId)

    // 3. Delete products by categories
    if (categoryIds.length > 0) {
      productStore.deleteByCategories(categoryIds)
    }

    // 4. Delete subcategories by categories
    if (categoryIds.length > 0) {
      subcategoryStore.deleteByCategories(categoryIds)
    }

    // 5. Delete categories
    categoryStore.deleteByBranch(branchId)

    // 6. Remove branch from product prices (for products in OTHER branches)
    productStore.removeBranchFromProductPrices(branchId)

    // 7. Delete tables
    tableStore.deleteByBranch(branchId)

    // 8. Delete order history
    orderHistoryStore.deleteByBranch(branchId)

    // 9. Finally delete the branch
    branchStore.deleteBranch(branchId)

    return {
      success: true,
      deletedCounts: {
        categories: branchCategories.length,
        subcategories: subcategoriesCount,
        products: productsToDelete.length,
        tables: tablesCount,
        orderHistory: orderHistoryCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

/**
 * Cascade delete a category and all related data
 * Order: promotions cleanup → products → subcategories → category
 */
export function cascadeDeleteCategory(
  categoryId: string,
  stores: {
    category: CategoryStoreActions
    subcategory: SubcategoryStoreActions
    product: ProductStoreActions
    promotion: PromotionStoreActions
  }
): CascadeDeleteResult {
  const { category: categoryStore, subcategory: subcategoryStore, product: productStore, promotion: promotionStore } = stores

  // Validate category exists
  const categories = categoryStore.categories
  const category = validateExists(categories, categoryId, 'Category')
  if (!category) {
    return { success: false, deletedCounts: {}, error: 'Category not found' }
  }

  try {
    // Get products in this category to clean up promotions
    const products = productStore.getByCategory(categoryId)

    // Count subcategories BEFORE deletion
    const subcategoriesCount = subcategoryStore.getByCategory(categoryId).length

    // 1. Clean products from promotions
    products.forEach((product) => {
      promotionStore.removeProductFromPromotions(product.id)
    })

    // 2. Delete products
    productStore.deleteByCategory(categoryId)

    // 3. Delete subcategories
    subcategoryStore.deleteByCategory(categoryId)

    // 4. Delete category
    categoryStore.deleteCategory(categoryId)

    return {
      success: true,
      deletedCounts: {
        products: products.length,
        subcategories: subcategoriesCount,
      },
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

/**
 * Cascade delete a subcategory and all related products
 * Order: promotions cleanup → products → subcategory
 */
export function cascadeDeleteSubcategory(
  subcategoryId: string,
  stores: {
    subcategory: SubcategoryStoreActions
    product: ProductStoreActions
    promotion: PromotionStoreActions
  }
): CascadeDeleteResult {
  const { subcategory: subcategoryStore, product: productStore, promotion: promotionStore } = stores

  // Validate subcategory exists
  const subcategories = subcategoryStore.subcategories
  const subcategory = validateExists(subcategories, subcategoryId, 'Subcategory')
  if (!subcategory) {
    return { success: false, deletedCounts: {}, error: 'Subcategory not found' }
  }

  try {
    // Get products in this subcategory
    const products = productStore.getBySubcategory(subcategoryId)

    // 1. Clean products from promotions
    products.forEach((product) => {
      promotionStore.removeProductFromPromotions(product.id)
    })

    // 2. Delete products
    productStore.deleteBySubcategory(subcategoryId)

    // 3. Delete subcategory
    subcategoryStore.deleteSubcategory(subcategoryId)

    return {
      success: true,
      deletedCounts: {
        products: products.length,
      },
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

/**
 * Delete a product and clean up promotions
 * Order: promotions cleanup → product
 */
export function cascadeDeleteProduct(
  productId: string,
  stores: {
    product: ProductStoreActions
    promotion: PromotionStoreActions
  }
): CascadeDeleteResult {
  const { product: productStore, promotion: promotionStore } = stores

  // Validate product exists
  const products = productStore.products
  const product = validateExists(products, productId, 'Product')
  if (!product) {
    return { success: false, deletedCounts: {}, error: 'Product not found' }
  }

  try {
    // 1. Clean product from promotions (removes empty promotions automatically)
    promotionStore.removeProductFromPromotions(productId)

    // 2. Delete product
    productStore.deleteProduct(productId)

    return {
      success: true,
      deletedCounts: {
        products: 1,
      },
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

/**
 * Delete an allergen and clean up product references
 * Order: product cleanup → allergen
 */
export function cascadeDeleteAllergen(
  allergenId: string,
  stores: {
    allergen: AllergenStoreActions
    product: ProductStoreActions
  }
): CascadeDeleteResult {
  const { allergen: allergenStore, product: productStore } = stores

  // Validate allergen exists
  const allergens = allergenStore.allergens
  const allergen = validateExists(allergens, allergenId, 'Allergen')
  if (!allergen) {
    return { success: false, deletedCounts: {}, error: 'Allergen not found' }
  }

  try {
    // 1. Remove allergen from all products
    productStore.removeAllergenFromProducts(allergenId)

    // 2. Delete allergen
    allergenStore.deleteAllergen(allergenId)

    return {
      success: true,
      deletedCounts: {},
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

/**
 * Delete a promotion type and all related promotions
 * Order: promotions → promotion type
 */
export function cascadeDeletePromotionType(
  promotionTypeId: string,
  stores: {
    promotionType: PromotionTypeStoreActions
    promotion: PromotionStoreActions
  }
): CascadeDeleteResult {
  const { promotionType: promotionTypeStore, promotion: promotionStore } = stores

  // Validate promotion type exists
  const promotionTypes = promotionTypeStore.promotionTypes
  const promotionType = validateExists(promotionTypes, promotionTypeId, 'PromotionType')
  if (!promotionType) {
    return { success: false, deletedCounts: {}, error: 'Promotion type not found' }
  }

  try {
    // Count promotions that will be deleted
    const promotionsToDelete = promotionStore.promotions.filter(
      (p) => p.promotion_type_id === promotionTypeId
    ).length

    // 1. Delete all promotions with this type
    promotionStore.clearPromotionType(promotionTypeId)

    // 2. Delete promotion type
    promotionTypeStore.deletePromotionType(promotionTypeId)

    return {
      success: true,
      deletedCounts: {
        promotions: promotionsToDelete,
      },
    }
  } catch (error) {
    return {
      success: false,
      deletedCounts: {},
      error: error instanceof Error ? error.message : 'Unknown error during cascade delete',
    }
  }
}

// ============================================================================
// Convenience functions that use the actual Zustand stores
// These provide backward compatibility and easy usage in components
// ============================================================================

import { useBranchStore } from '../stores/branchStore'
import { useCategoryStore } from '../stores/categoryStore'
import { useSubcategoryStore } from '../stores/subcategoryStore'
import { useProductStore } from '../stores/productStore'
import { usePromotionStore } from '../stores/promotionStore'
import { useTableStore } from '../stores/tableStore'
import { useOrderHistoryStore } from '../stores/orderHistoryStore'
import { usePromotionTypeStore } from '../stores/promotionTypeStore'
import { useAllergenStore } from '../stores/allergenStore'

/**
 * Helper to get all store states for cascade operations
 */
function getStoreStates() {
  return {
    branch: useBranchStore.getState(),
    category: useCategoryStore.getState(),
    subcategory: useSubcategoryStore.getState(),
    product: useProductStore.getState(),
    promotion: usePromotionStore.getState(),
    table: useTableStore.getState(),
    orderHistory: useOrderHistoryStore.getState(),
    promotionType: usePromotionTypeStore.getState(),
    allergen: useAllergenStore.getState(),
  }
}

/** Convenience wrapper for cascadeDeleteBranch using actual stores */
export function deleteBranchWithCascade(branchId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeleteBranch(branchId, stores)
}

/** Convenience wrapper for cascadeDeleteCategory using actual stores */
export function deleteCategoryWithCascade(categoryId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeleteCategory(categoryId, stores)
}

/** Convenience wrapper for cascadeDeleteSubcategory using actual stores */
export function deleteSubcategoryWithCascade(subcategoryId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeleteSubcategory(subcategoryId, stores)
}

/** Convenience wrapper for cascadeDeleteProduct using actual stores */
export function deleteProductWithCascade(productId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeleteProduct(productId, stores)
}

/** Convenience wrapper for cascadeDeleteAllergen using actual stores */
export function deleteAllergenWithCascade(allergenId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeleteAllergen(allergenId, stores)
}

/** Convenience wrapper for cascadeDeletePromotionType using actual stores */
export function deletePromotionTypeWithCascade(promotionTypeId: string): CascadeDeleteResult {
  const stores = getStoreStates()
  return cascadeDeletePromotionType(promotionTypeId, stores)
}
