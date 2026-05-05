import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import {
  createProductCategory,
  editProductCategory,
  listProductCategoriesWithUsage,
  removeProductCategory,
  validateCreateCategoryInput,
  validateDeleteCategoryInput,
  validateUpdateCategoryInput,
} from "@/app/api/(products)/_service/product-categories-service"

describe("product-categories service mutation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("builds category usage counts from product list", () => {
    vi.spyOn(mockDb, "getProductCategories").mockReturnValue(
      [
        { id: "cat-1", name: "Semen" },
        { id: "cat-2", name: "Bata" },
      ] as never
    )
    vi.spyOn(mockDb, "getProducts").mockReturnValue(
      [
        { sku: "SKU-1", name: "Semen A", categoryId: "cat-1" },
        { sku: "SKU-2", name: "Semen B", categoryId: "cat-1" },
        { sku: "SKU-3", name: "Bata A", categoryId: "cat-2" },
      ] as never
    )

    const result = listProductCategoriesWithUsage()

    expect(result).toEqual([
      { id: "cat-1", name: "Semen", productCount: 2 },
      { id: "cat-2", name: "Bata", productCount: 1 },
    ])
  })

  it("validates create/update/delete inputs", () => {
    const invalidCreate = validateCreateCategoryInput({ name: "" })
    expect(invalidCreate.ok).toBe(false)

    const invalidUpdate = validateUpdateCategoryInput({ id: "", name: "Semen" })
    expect(invalidUpdate.ok).toBe(false)

    const invalidDelete = validateDeleteCategoryInput({ id: "" })
    expect(invalidDelete.ok).toBe(false)

    const validCreate = validateCreateCategoryInput({ name: "Semen" })
    const validUpdate = validateUpdateCategoryInput({ id: "cat-1", name: "Semen" })
    const validDelete = validateDeleteCategoryInput({ id: "cat-1" })

    expect(validCreate.ok).toBe(true)
    expect(validUpdate.ok).toBe(true)
    expect(validDelete.ok).toBe(true)
  })

  it("delegates create/edit/remove category to mock-db", () => {
    const createPayload = { name: "Semen" }
    const updatePayload = { id: "cat-1", name: "Semen Premium" }
    const deletePayload = { id: "cat-1" }

    const createdCategory = { id: "cat-1", name: "Semen" }
    const updatedCategory = { id: "cat-1", name: "Semen Premium" }

    const createSpy = vi.spyOn(mockDb, "addProductCategory").mockReturnValue(createdCategory as never)
    const updateSpy = vi.spyOn(mockDb, "updateProductCategory").mockReturnValue(updatedCategory as never)
    const deleteSpy = vi.spyOn(mockDb, "deleteProductCategory").mockImplementation(() => undefined)

    const created = createProductCategory(createPayload)
    const updated = editProductCategory(updatePayload)
    removeProductCategory(deletePayload)

    expect(createSpy).toHaveBeenCalledWith({ ...createPayload, branchId: "b_1" })
    expect(updateSpy).toHaveBeenCalledWith({ ...updatePayload, branchId: "b_1" })
    expect(deleteSpy).toHaveBeenCalledWith({ ...deletePayload, branchId: "b_1" })
    expect(created).toEqual(createdCategory)
    expect(updated).toEqual(updatedCategory)
  })
})