"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  productsApiCreate,
  productsApiCreateCategory,
  productsApiDelete,
  productsApiDeleteCategory,
  productsApiFetchZones,
  productsApiList,
  productsApiListCategoriesWithUsage,
  productsApiUpdate,
  productsApiUpdateCategory,
  type CategoryDto,
  type PriceTier,
  type ProductDto,
  type ProductCategoryWithUsageDto,
  type WarehouseZoneDto,
} from "@/app/products/_api-clients/products"
import type { ZoneStocksDto } from "@/lib/domain"
import type { ProductsInitialSnapshot } from "@/app/products/_lib/products-snapshot"
import { getCentralBranchId } from "@/lib/single-branch"

export type { CategoryDto, PriceTier, ProductDto, WarehouseZoneDto }

export function useProducts(input: {
  initialSnapshot?: ProductsInitialSnapshot
}) {
  const branchId = getCentralBranchId()
  const hasValidBranch = true
  const INVALID_BRANCH_MESSAGE = "Cabang tidak valid."
  const hasInitialSnapshotForBranch = Boolean(input.initialSnapshot)

  const [categoriesByBranch, setCategoriesByBranch] = useState<Record<string, ProductCategoryWithUsageDto[]>>(
    hasInitialSnapshotForBranch
      ? { [branchId]: input.initialSnapshot?.categories ?? [] }
      : {}
  )
  const categories = useMemo(() => categoriesByBranch[branchId] ?? [], [categoriesByBranch, branchId])

  const categoriesRequestSeqRef = useRef(0)

  const beginCategoriesRequest = useCallback(() => {
    categoriesRequestSeqRef.current += 1
    return categoriesRequestSeqRef.current
  }, [])

  const isLatestCategoriesRequest = useCallback((seq: number) => seq === categoriesRequestSeqRef.current, [])

  const [productsError, setProductsError] = useState<string>("")

  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoriesError, setCategoriesError] = useState<string>("")
  const [zonesError, setZonesError] = useState("")

  const [zonesByBranch, setZonesByBranch] = useState<Record<string, WarehouseZoneDto[]>>(
    hasInitialSnapshotForBranch
      ? { [branchId]: input.initialSnapshot?.zones ?? [] }
      : {}
  )
  const zones = useMemo(() => zonesByBranch[branchId] ?? [], [zonesByBranch, branchId])

  const [zoneStocksByBranch, setZoneStocksByBranch] = useState<Record<string, ZoneStocksDto>>(
    hasInitialSnapshotForBranch
      ? { [branchId]: input.initialSnapshot?.zoneStocks ?? ({} as ZoneStocksDto) }
      : {}
  )
  const zoneStocks = useMemo(() => zoneStocksByBranch[branchId] ?? ({} as ZoneStocksDto), [zoneStocksByBranch, branchId])

  const [defaultWarehouseIdByBranch, setDefaultWarehouseIdByBranch] = useState<Record<string, string>>(
    hasInitialSnapshotForBranch
      ? { [branchId]: input.initialSnapshot?.defaultWarehouseId ?? "" }
      : {}
  )
  const defaultWarehouseId = defaultWarehouseIdByBranch[branchId] ?? ""

  const [skipInitialCategoriesReload, setSkipInitialCategoriesReload] = useState(hasInitialSnapshotForBranch)
  const [skipInitialZonesReload, setSkipInitialZonesReload] = useState(hasInitialSnapshotForBranch)

  const reloadCategories = useCallback(async () => {
    const seq = beginCategoriesRequest()

    if (!hasValidBranch) {
      if (!isLatestCategoriesRequest(seq)) return
      setCategoriesError("")
      setIsLoadingCategories(false)
      return
    }

    setIsLoadingCategories(true)
    setCategoriesError("")
    try {
      const next = await productsApiListCategoriesWithUsage({})
      if (!isLatestCategoriesRequest(seq)) return
      setCategoriesByBranch((prev) => ({ ...prev, [branchId]: next }))
    } catch (err: unknown) {
      if (!isLatestCategoriesRequest(seq)) return
      setCategoriesByBranch((prev) => ({ ...prev, [branchId]: [] }))
      setCategoriesError(err instanceof Error ? err.message : "Gagal memuat kategori.")
    } finally {
      if (!isLatestCategoriesRequest(seq)) return
      setIsLoadingCategories(false)
    }
  }, [beginCategoriesRequest, branchId, hasValidBranch, isLatestCategoriesRequest])

  const reloadZones = useCallback(async () => {
    if (!hasValidBranch) {
      setZonesError("")
      return
    }

    setZonesError("")
    try {
      const { zones: nextZones, defaultWarehouseId: nextDefaultWarehouseId, zoneStocks: nextZoneStocks } =
        await productsApiFetchZones({ includeMovements: false })
      setZonesByBranch((prev) => ({ ...prev, [branchId]: nextZones }))
      setDefaultWarehouseIdByBranch((prev) => ({ ...prev, [branchId]: nextDefaultWarehouseId }))
      setZoneStocksByBranch((prev) => ({ ...prev, [branchId]: nextZoneStocks }))
    } catch (err: unknown) {
      setZonesByBranch((prev) => ({ ...prev, [branchId]: [] }))
      setDefaultWarehouseIdByBranch((prev) => ({ ...prev, [branchId]: "" }))
      setZoneStocksByBranch((prev) => ({ ...prev, [branchId]: {} as ZoneStocksDto }))
      setZonesError(err instanceof Error ? err.message : "Gagal memuat data zona gudang.")
    }
  }, [branchId, hasValidBranch])

  const reloadAll = useCallback(async () => {
    await Promise.all([reloadCategories(), reloadZones()])
  }, [reloadCategories, reloadZones])

  useEffect(() => {
    // Invalidate pending category requests from previous branch before new fetch starts.
    categoriesRequestSeqRef.current += 1
  }, [branchId])

  useEffect(() => {
    if (!hasValidBranch) {
      setCategoriesError("")
      setIsLoadingCategories(false)
      setSkipInitialCategoriesReload(false)
      return
    }

    if (skipInitialCategoriesReload) {
      setSkipInitialCategoriesReload(false)
      return
    }
    void reloadCategories()
  }, [branchId, hasValidBranch, reloadCategories, skipInitialCategoriesReload])

  useEffect(() => {
    if (!hasValidBranch) {
      setZonesError("")
      setSkipInitialZonesReload(false)
      return
    }

    if (skipInitialZonesReload) {
      setSkipInitialZonesReload(false)
      return
    }
    void reloadZones()
  }, [branchId, hasValidBranch, reloadZones, skipInitialZonesReload])

  const saveCategory = useCallback(
    async (input: { id?: string; name: string }) => {
      if (!hasValidBranch) throw new Error(INVALID_BRANCH_MESSAGE)

      const name = input.name.trim()
      if (input.id) {
        await productsApiUpdateCategory({ id: input.id, name })
      } else {
        await productsApiCreateCategory({ name })
      }

      await reloadCategories()
    },
    [branchId, hasValidBranch, reloadCategories]
  )

  const removeCategory = useCallback(
    async (input: { id: string }) => {
      if (!hasValidBranch) {
        const error = new Error(INVALID_BRANCH_MESSAGE)
        setCategoriesError(error.message)
        throw error
      }

      setCategoriesError("")
      try {
        await productsApiDeleteCategory({ id: input.id })
        await reloadCategories()
      } catch (err: unknown) {
        setCategoriesError(err instanceof Error ? err.message : "Gagal menghapus kategori.")
        throw err
      }
    },
    [branchId, hasValidBranch, reloadCategories]
  )

  const saveProduct = useCallback(
    async (input: {
      sku: string
      name: string
      categoryId?: string
      hpp: number
      prices: Record<PriceTier, number>
      mode: "create" | "update"
    }) => {
      if (!hasValidBranch) throw new Error(INVALID_BRANCH_MESSAGE)

      const payload = {
        sku: input.sku,
        name: input.name,
        categoryId: input.categoryId,
        hpp: input.hpp,
        prices: input.prices,
      }

      if (input.mode === "create") {
        await productsApiCreate(payload)
      } else {
        await productsApiUpdate(payload)
      }

      await reloadCategories()
    },
    [branchId, hasValidBranch, reloadCategories]
  )

  const removeProduct = useCallback(
    async (input: { sku: string }) => {
      if (!hasValidBranch) {
        const error = new Error(INVALID_BRANCH_MESSAGE)
        setProductsError(error.message)
        throw error
      }

      setProductsError("")
      try {
        await productsApiDelete({ sku: input.sku })
        await reloadCategories()
      } catch (err: unknown) {
        setProductsError(err instanceof Error ? err.message : "Gagal menghapus produk.")
        throw err
      }
    },
    [branchId, hasValidBranch, reloadCategories]
  )

  const queryProducts = useCallback(
    async (input: {
      q?: string
      categoryId?: string
      stockOrder?: "highest" | "lowest"
      retailOrder?: "highest" | "lowest"
      page?: number
      limit?: number
      sortBy?: "name" | "sku" | "category" | "price" | "stock"
      sortDir?: "asc" | "desc"
      priceTier?: PriceTier
      warehouseId?: string
    }) => {
      if (!hasValidBranch) {
        return { products: [], total: 0 }
      }

      return productsApiList({ ...input })
    },
    [hasValidBranch]
  )

  return {
    categories,

    productsError,

    isLoadingCategories,
    categoriesError,
    zonesError,

    zones,
    zoneStocks,
    defaultWarehouseId,

    reloadCategories,
    reloadZones,
    reloadAll,
    queryProducts,

    saveCategory,
    removeCategory,

    saveProduct,
    removeProduct,
  }
}
