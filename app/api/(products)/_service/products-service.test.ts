import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import {
  createProduct,
  editProduct,
  removeProduct,
  validateCreateProductInput,
  validateDeleteProductInput,
  validateUpdateProductInput,
} from "@/app/api/(products)/_service/products-service"

describe("products service mutation", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("validates create payload prices and hpp", () => {
    const invalid = validateCreateProductInput({
      sku: "SKU-1",
      name: "Semen 40kg",
      prices: { retail: 70000, partai: -1, cabang: 68000 },
      hpp: 60000,
    })
    expect(invalid.ok).toBe(false)

    const valid = validateCreateProductInput({
      sku: "SKU-1",
      name: "Semen 40kg",
      prices: { retail: 70000, partai: 69000, cabang: 68000 },
      hpp: 60000,
    })
    expect(valid.ok).toBe(true)
    if (!valid.ok) return
    expect(valid.prices).toEqual({ retail: 70000, partai: 69000, cabang: 68000 })
  })

  it("accepts update payload with valid prices", () => {
    const valid = validateUpdateProductInput({
      sku: "SKU-1",
      prices: { retail: 70000 },
    })

    expect(valid.ok).toBe(true)
  })

  it("delegates create/edit/remove to mock-db operations", () => {
    const createPayload = {
      sku: "SKU-1",
      name: "Semen 40kg",
      categoryId: "cat-1",
      prices: { retail: 70000, partai: 69000, cabang: 68000 },
      hpp: 60000,
    }

    const editPayload = {
      sku: "SKU-1",
      name: "Semen 50kg",
      prices: { retail: 71000 },
      hpp: 60500,
    }

    const deletePayload = { sku: "SKU-1" }

    const createdProduct = {
      sku: "SKU-1",
      name: "Semen 40kg",
      prices: { retail: 70000, partai: 69000, cabang: 68000 },
      hpp: 60000,
      stock: 0,
    }
    const editedProduct = { ...createdProduct, name: "Semen 50kg", hpp: 60500 }

    const addSpy = vi.spyOn(mockDb, "addProduct").mockReturnValue(createdProduct as never)
    const editSpy = vi.spyOn(mockDb, "updateProduct").mockReturnValue(editedProduct as never)
    const deleteSpy = vi.spyOn(mockDb, "deleteProduct").mockImplementation(() => undefined)

    const created = createProduct(createPayload)
    const edited = editProduct(editPayload)
    removeProduct(deletePayload)

    expect(addSpy).toHaveBeenCalledWith({ ...createPayload, branchId: "b_1" })
    expect(editSpy).toHaveBeenCalledWith({ ...editPayload, branchId: "b_1" })
    expect(deleteSpy).toHaveBeenCalledWith({ branchId: "b_1", sku: "SKU-1" })
    expect(created).toEqual(createdProduct)
    expect(edited).toEqual(editedProduct)
  })

  it("validates delete payload sku", () => {
    const invalid = validateDeleteProductInput({ sku: "" })
    expect(invalid.ok).toBe(false)

    const valid = validateDeleteProductInput({ sku: "SKU-1" })
    expect(valid.ok).toBe(true)
  })
})