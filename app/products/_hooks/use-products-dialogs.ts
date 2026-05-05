"use client"

import { useCallback, useState } from "react"
import type { CategoryDto, PriceTier, ProductDto } from "@/app/products/_api-clients/products"
import type { ProductFormState } from "@/app/products/_lib/products-dialog-types"

type SaveProductInput = {
  sku: string
  name: string
  categoryId?: string
  hpp: number
  prices: Record<PriceTier, number>
  mode: "create" | "update"
}

type SaveCategoryInput = { id?: string; name: string }

type RemoveCategoryInput = { id: string }

type RemoveProductInput = { sku: string }

export function useProductsDialogs(input: {
  isCRUD: boolean
  categories: CategoryDto[]
  productCountByCategoryId: Map<string, number>
  selectedCategoryName: string
  saveCategory: (input: SaveCategoryInput) => Promise<void>
  removeCategory: (input: RemoveCategoryInput) => Promise<void>
  saveProduct: (input: SaveProductInput) => Promise<void>
  removeProduct: (input: RemoveProductInput) => Promise<void>
  bumpProductsReloadVersion: () => void
}) {
  const [showProductDialog, setShowProductDialog] = useState(false)
  const [productToEdit, setProductToEdit] = useState<ProductDto | null>(null)
  const [productForm, setProductForm] = useState<ProductFormState>({
    sku: "",
    name: "",
    categoryId: "",
    hpp: "",
    retail: "",
    partai: "",
    cabang: "",
  })

  const [showCategoryDialog, setShowCategoryDialog] = useState(false)
  const [categoryToEdit, setCategoryToEdit] = useState<CategoryDto | null>(null)
  const [categoryName, setCategoryName] = useState("")
  const [categorySubmitError, setCategorySubmitError] = useState<string>("")
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false)

  const [submitError, setSubmitError] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [productToDelete, setProductToDelete] = useState<ProductDto | null>(null)
  const [isDeletingProduct, setIsDeletingProduct] = useState(false)
  const [deleteProductError, setDeleteProductError] = useState("")
  const [productToRemoveFromCategory, setProductToRemoveFromCategory] = useState<ProductDto | null>(null)
  const [removeFromCategoryLabel, setRemoveFromCategoryLabel] = useState("")
  const [isRemovingFromCategory, setIsRemovingFromCategory] = useState(false)
  const [removeFromCategoryError, setRemoveFromCategoryError] = useState("")
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryDto | null>(null)
  const [deleteCategoryMessage, setDeleteCategoryMessage] = useState("")
  const [isDeletingCategory, setIsDeletingCategory] = useState(false)
  const [deleteCategoryError, setDeleteCategoryError] = useState("")

  const openAddProduct = useCallback(() => {
    if (!input.isCRUD) return
    setSubmitError("")
    setProductToEdit(null)

    setProductForm({
      sku: "",
      name: "",
      categoryId: "",
      hpp: "",
      retail: "",
      partai: "",
      cabang: "",
    })
    setShowProductDialog(true)
  }, [input.isCRUD])

  const openEditProduct = useCallback(
    (p: ProductDto) => {
      if (!input.isCRUD) return
      setSubmitError("")
      setProductToEdit(p)
      setProductForm({
        sku: p.sku,
        name: p.name,
        categoryId: p.categoryId ?? "",
        hpp: String(p.hpp ?? 0),
        retail: String(p.prices.retail ?? 0),
        partai: String(p.prices.partai ?? 0),
        cabang: String(p.prices.cabang ?? 0),
      })
      setShowProductDialog(true)
    },
    [input.isCRUD]
  )

  const openAddCategory = useCallback(() => {
    if (!input.isCRUD) return
    setCategorySubmitError("")
    setCategoryToEdit(null)
    setCategoryName("")
    setShowCategoryDialog(true)
  }, [input.isCRUD])

  const openEditCategory = useCallback(
    (c: CategoryDto) => {
      if (!input.isCRUD) return
      setCategorySubmitError("")
      setCategoryToEdit(c)
      setCategoryName(c.name)
      setShowCategoryDialog(true)
    },
    [input.isCRUD]
  )

  const submitCategory = useCallback(async () => {
    if (!input.isCRUD) return
    setCategorySubmitError("")

    const name = categoryName.trim()
    if (!name) {
      setCategorySubmitError("Nama kategori wajib.")
      return
    }

    setIsSubmittingCategory(true)
    try {
      await input.saveCategory({ id: categoryToEdit?.id, name })
      input.bumpProductsReloadVersion()

      setShowCategoryDialog(false)
      setCategoryToEdit(null)
    } catch (err: unknown) {
      setCategorySubmitError(err instanceof Error ? err.message : "Gagal menyimpan kategori.")
    } finally {
      setIsSubmittingCategory(false)
    }
  }, [categoryName, categoryToEdit?.id, input])

  const requestDeleteCategory = useCallback(
    (c: CategoryDto) => {
      if (!input.isCRUD) return
      const count = input.productCountByCategoryId.get(c.id) ?? 0

      const message =
        count > 0
          ? `Kategori "${c.name}" masih dipakai ${count} produk. Kategori akan dinonaktifkan (soft delete). Lanjutkan?`
          : `Hapus kategori "${c.name}"?`
      setDeleteCategoryError("")
      setDeleteCategoryMessage(message)
      setCategoryToDelete(c)
    },
    [input]
  )

  const confirmDeleteCategory = useCallback(async () => {
    if (!input.isCRUD) return
    if (!categoryToDelete) return

    setIsDeletingCategory(true)
    setDeleteCategoryError("")
    try {
      await input.removeCategory({ id: categoryToDelete.id })
      input.bumpProductsReloadVersion()
      setCategoryToDelete(null)
      setDeleteCategoryMessage("")
    } catch (err: unknown) {
      setDeleteCategoryError(err instanceof Error ? err.message : "Gagal menghapus kategori.")
    } finally {
      setIsDeletingCategory(false)
    }
  }, [categoryToDelete, input])

  const requestDeleteProduct = useCallback(
    (p: ProductDto) => {
      if (!input.isCRUD) return
      setDeleteProductError("")
      setProductToDelete(p)
    },
    [input.isCRUD]
  )

  const confirmDeleteProduct = useCallback(async () => {
    if (!input.isCRUD) return
    if (!productToDelete) return

    setIsDeletingProduct(true)
    setDeleteProductError("")
    try {
      await input.removeProduct({ sku: productToDelete.sku })
      input.bumpProductsReloadVersion()
      setProductToDelete(null)
    } catch (err: unknown) {
      setDeleteProductError(err instanceof Error ? err.message : "Gagal menghapus produk.")
    } finally {
      setIsDeletingProduct(false)
    }
  }, [input, productToDelete])

  const requestRemoveProductFromCategory = useCallback(
    (p: ProductDto) => {
      if (!input.isCRUD) return
      const categoryLabel = input.selectedCategoryName || p.category || "kategori ini"
      setRemoveFromCategoryError("")
      setRemoveFromCategoryLabel(categoryLabel)
      setProductToRemoveFromCategory(p)
    },
    [input.isCRUD, input.selectedCategoryName]
  )

  const confirmRemoveProductFromCategory = useCallback(async () => {
    if (!input.isCRUD) return
    if (!productToRemoveFromCategory) return

    setIsRemovingFromCategory(true)
    setRemoveFromCategoryError("")
    try {
      await input.saveProduct({
        mode: "update",
        sku: productToRemoveFromCategory.sku,
        name: productToRemoveFromCategory.name,
        categoryId: "",
        hpp: Number(productToRemoveFromCategory.hpp ?? 0),
        prices: productToRemoveFromCategory.prices,
      })
      input.bumpProductsReloadVersion()
      setProductToRemoveFromCategory(null)
      setRemoveFromCategoryLabel("")
    } catch (err: unknown) {
      setRemoveFromCategoryError(err instanceof Error ? err.message : "Gagal menghapus produk dari kategori.")
    } finally {
      setIsRemovingFromCategory(false)
    }
  }, [input, productToRemoveFromCategory])

  const submitProduct = useCallback(async () => {
    if (!input.isCRUD) return
    setSubmitError("")

    const sku = productForm.sku.trim()
    const name = productForm.name.trim()
    const categoryId = (productForm.categoryId ?? "").trim()

    const hpp = Number(productForm.hpp)

    const retail = Number(productForm.retail)
    const partai = Number(productForm.partai)
    const cabang = Number(productForm.cabang)

    if (!sku) return setSubmitError("SKU wajib.")
    if (!name) return setSubmitError("Nama produk wajib.")
    if (!Number.isFinite(hpp) || hpp < 0) return setSubmitError("HPP wajib diisi (>= 0).")
    if (![retail, partai, cabang].every((n) => Number.isFinite(n) && n >= 0)) {
      return setSubmitError("Harga retail/partai/cabang wajib diisi (>= 0).")
    }

    setIsSubmitting(true)
    try {
      await input.saveProduct({
        mode: productToEdit ? "update" : "create",
        sku,
        name,
        categoryId: categoryId || undefined,
        hpp,
        prices: { retail, partai, cabang },
      })
      input.bumpProductsReloadVersion()

      setShowProductDialog(false)
      setProductToEdit(null)
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Gagal menyimpan produk.")
    } finally {
      setIsSubmitting(false)
    }
  }, [input, productForm, productToEdit])

  return {
    showProductDialog,
    setShowProductDialog,
    productToEdit,
    productForm,
    setProductForm,
    submitError,
    isSubmitting,
    openAddProduct,
    openEditProduct,
    submitProduct,

    showCategoryDialog,
    setShowCategoryDialog,
    categoryToEdit,
    categoryName,
    setCategoryName,
    categorySubmitError,
    isSubmittingCategory,
    openAddCategory,
    openEditCategory,
    submitCategory,

    productToDelete,
    isDeletingProduct,
    deleteProductError,
    requestDeleteProduct,
    confirmDeleteProduct,
    setProductToDelete,
    setDeleteProductError,

    productToRemoveFromCategory,
    removeFromCategoryLabel,
    isRemovingFromCategory,
    removeFromCategoryError,
    requestRemoveProductFromCategory,
    confirmRemoveProductFromCategory,
    setProductToRemoveFromCategory,
    setRemoveFromCategoryLabel,
    setRemoveFromCategoryError,

    categoryToDelete,
    deleteCategoryMessage,
    isDeletingCategory,
    deleteCategoryError,
    requestDeleteCategory,
    confirmDeleteCategory,
    setCategoryToDelete,
    setDeleteCategoryMessage,
    setDeleteCategoryError,
  }
}
