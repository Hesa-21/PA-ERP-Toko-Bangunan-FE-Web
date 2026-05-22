"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { permissionOf, type Role } from "@/lib/auth/rbac"
import { useActiveBranch } from "@/hooks/use-active-branch"
import { useProducts } from "@/app/products/_hooks/use-products"
import type { ProductDto } from "@/app/products/_api-clients/products"
import type { ProductsInitialSnapshot } from "@/app/products/_lib/products-snapshot"
import {
  ALL_CATEGORIES_FILTER_VALUE,
  isOrderFilterValue,
  parseOrderFilterParam,
  RETAIL_ORDER_FILTER_VALUE,
  RETAIL_ORDER_HIGHEST_VALUE,
  RETAIL_ORDER_LOWEST_VALUE,
  STOCK_ORDER_FILTER_VALUE,
  STOCK_ORDER_HIGHEST_VALUE,
  STOCK_ORDER_LOWEST_VALUE,
  toOrderQueryParam,
  type OrderFilter,
} from "@/app/products/_lib/products-filters"
import { buildVisibleProductPages, PRODUCTS_PAGE_SIZE } from "@/app/products/_lib/products-pagination"

export function useProductsController(input?: {
  initialSnapshot?: ProductsInitialSnapshot
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { hasValidBranch } = useActiveBranch()
  const [searchTerm, setSearchTerm] = useState("")
  const [tab, setTabState] = useState<"produk" | "kategori">("produk")
  const pendingTabUrlSyncSkipsRef = useRef(0)

  const setTab = useCallback((next: "produk" | "kategori") => {
    pendingTabUrlSyncSkipsRef.current += 1
    setTabState(next)
  }, [])

  const { user } = useAuth()
  const role: Role = user?.role ?? "admin-penjualan"
  const perm = permissionOf(role, "categories")
  const isCRUD = perm === "CRUD"

  const {
    categories,
    productsError: productsLoadError,
    isLoadingCategories,
    categoriesError,
    saveCategory,
    removeCategory,
    saveProduct,
    removeProduct,
    queryProducts,
  } = useProducts({
    initialSnapshot: input?.initialSnapshot,
  })

  const [productRows, setProductRows] = useState<ProductDto[]>([])
  const [productsTotal, setProductsTotal] = useState(0)
  const [productsPage, setProductsPage] = useState(1)
  const [selectedCategoryFilterId, setSelectedCategoryFilterId] = useState<string>(ALL_CATEGORIES_FILTER_VALUE)
  const [selectedStockOrderFilter, setSelectedStockOrderFilter] = useState<OrderFilter>(STOCK_ORDER_FILTER_VALUE)
  const [selectedRetailOrderFilter, setSelectedRetailOrderFilter] = useState<OrderFilter>(RETAIL_ORDER_FILTER_VALUE)
  const [isSearchingProducts, setIsSearchingProducts] = useState(false)
  const [productsSearchError, setProductsSearchError] = useState("")
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("")
  const [productsReloadVersion, setProductsReloadVersion] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState<ProductDto[]>([])
  const [isLoadingSelectedCategoryProducts, setIsLoadingSelectedCategoryProducts] = useState(false)
  const [categoryProductsError, setCategoryProductsError] = useState("")

  const productsRequestSeqRef = useRef(0)
  const categoryProductsRequestSeqRef = useRef(0)
  const categoryProductsCacheRef = useRef(new Map<string, ProductDto[]>())
  const productsPageSize = PRODUCTS_PAGE_SIZE
  const productsTotalPages = Math.max(1, Math.ceil(productsTotal / productsPageSize))
  const activeCategoryFilterId = selectedCategoryFilterId.trim()
  const activeStockOrderFilter = selectedStockOrderFilter
  const activeRetailOrderFilter = selectedRetailOrderFilter
  const productsStartIndex = productsTotal === 0 ? 0 : (productsPage - 1) * productsPageSize + 1
  const productsEndIndex = Math.min(productsTotal, productsPage * productsPageSize)

  const visibleProductPages = useMemo(
    () => buildVisibleProductPages({ page: productsPage, totalPages: productsTotalPages, windowSize: 5 }),
    [productsPage, productsTotalPages]
  )

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>()
    for (const category of categories) {
      map.set(category.id, category.name)
    }
    return map
  }, [categories])

  const selectedCategoryName = categoryNameById.get(selectedCategoryId) || ""

  const productCountByCategoryId = useMemo(() => {
    const map = new Map<string, number>()
    for (const category of categories) {
      map.set(category.id, Math.max(0, Math.trunc(Number(category.productCount ?? 0) || 0)))
    }
    return map
  }, [categories])

  useEffect(() => {
    const urlTabRaw = (searchParams.get("tab") ?? "").trim().toLowerCase()
    const urlTab: "produk" | "kategori" = urlTabRaw === "kategori" ? "kategori" : "produk"
    const urlQ = (searchParams.get("q") ?? "").trim()
    const urlCategoryId = (searchParams.get("categoryId") ?? "").trim()
    const normalizedCategoryFilterId = urlCategoryId || ALL_CATEGORIES_FILTER_VALUE
    const normalizedStockOrderFilter = parseOrderFilterParam(searchParams.get("stockOrder"))
    const normalizedRetailOrderFilter = parseOrderFilterParam(searchParams.get("retailOrder"))
    const urlPageRaw = Number(searchParams.get("page") ?? "")
    const urlPage = Number.isFinite(urlPageRaw) ? Math.max(1, Math.trunc(urlPageRaw)) : 1

    if (tab !== urlTab) {
      if (pendingTabUrlSyncSkipsRef.current > 0) {
        pendingTabUrlSyncSkipsRef.current -= 1
      } else {
        setTabState(urlTab)
      }
    }
    if (searchTerm !== urlQ) setSearchTerm(urlQ)
    if (debouncedSearchTerm !== urlQ) setDebouncedSearchTerm(urlQ)
    if (selectedCategoryFilterId !== normalizedCategoryFilterId) {
      setSelectedCategoryFilterId(normalizedCategoryFilterId)
    }
    if (selectedStockOrderFilter !== normalizedStockOrderFilter) {
      setSelectedStockOrderFilter(normalizedStockOrderFilter)
    }
    if (selectedRetailOrderFilter !== normalizedRetailOrderFilter) {
      setSelectedRetailOrderFilter(normalizedRetailOrderFilter)
    }
    if (productsPage !== urlPage) setProductsPage(urlPage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim())
    }, 300)
    return () => window.clearTimeout(handle)
  }, [searchTerm])

  useEffect(() => {
    if (tab !== "produk") return
    setProductsPage(1)
  }, [debouncedSearchTerm, selectedCategoryFilterId, selectedRetailOrderFilter, selectedStockOrderFilter, tab])

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tab", tab)

    const q = debouncedSearchTerm.trim()
    if (q) params.set("q", q)
    else params.delete("q")

    const categoryId = selectedCategoryFilterId.trim()
    if (categoryId && categoryId !== ALL_CATEGORIES_FILTER_VALUE) params.set("categoryId", categoryId)
    else params.delete("categoryId")

    const stockOrderQuery = toOrderQueryParam(selectedStockOrderFilter)
    if (stockOrderQuery) {
      params.set("stockOrder", stockOrderQuery)
    } else {
      params.delete("stockOrder")
    }

    const retailOrderQuery = toOrderQueryParam(selectedRetailOrderFilter)
    if (retailOrderQuery) {
      params.set("retailOrder", retailOrderQuery)
    } else {
      params.delete("retailOrder")
    }

    if (productsPage > 1) params.set("page", String(productsPage))
    else params.delete("page")

    const nextQs = params.toString()
    const currentQs = searchParams.toString()
    if (nextQs === currentQs) return

    const href = nextQs ? `${pathname}?${nextQs}` : pathname
    router.replace(href, { scroll: false })
  }, [debouncedSearchTerm, pathname, productsPage, router, searchParams, selectedCategoryFilterId, selectedRetailOrderFilter, selectedStockOrderFilter, tab])

  useEffect(() => {
    if (selectedCategoryFilterId === ALL_CATEGORIES_FILTER_VALUE) return
    if (!activeCategoryFilterId) return
    if (categories.some((c) => c.id === selectedCategoryFilterId)) return
    setSelectedCategoryFilterId(ALL_CATEGORIES_FILTER_VALUE)
  }, [activeCategoryFilterId, categories, selectedCategoryFilterId])

  useEffect(() => {
    const selected = selectedCategoryId.trim()
    if (!selected) {
      setSelectedCategoryProducts([])
      setCategoryProductsError("")
      setIsLoadingSelectedCategoryProducts(false)
      return
    }

    if (categories.some((category) => category.id === selected)) return

    setSelectedCategoryId("")
    setSelectedCategoryProducts([])
    setCategoryProductsError("")
    setIsLoadingSelectedCategoryProducts(false)
  }, [categories, selectedCategoryId])

  const reloadProductRows = useCallback(async () => {
    if (tab !== "produk") return

    if (!hasValidBranch) {
      setProductRows([])
      setProductsTotal(0)
      setProductsSearchError("")
      setIsSearchingProducts(false)
      return
    }

    const seq = ++productsRequestSeqRef.current
    setIsSearchingProducts(true)
    setProductsSearchError("")

    try {
      const stockOrder = toOrderQueryParam(activeStockOrderFilter)
      const retailOrder = toOrderQueryParam(activeRetailOrderFilter)

      const result = await queryProducts({
        q: debouncedSearchTerm || undefined,
        categoryId:
          activeCategoryFilterId && activeCategoryFilterId !== ALL_CATEGORIES_FILTER_VALUE
            ? activeCategoryFilterId
            : undefined,
        stockOrder,
        retailOrder,
        page: productsPage,
        limit: productsPageSize,
        sortBy: "name",
        sortDir: "asc",
      })

      if (seq !== productsRequestSeqRef.current) return
      setProductRows(result.products)
      setProductsTotal(result.total)
    } catch (err: unknown) {
      if (seq !== productsRequestSeqRef.current) return
      setProductRows([])
      setProductsTotal(0)
      setProductsSearchError(err instanceof Error ? err.message : "Gagal memuat produk.")
    } finally {
      if (seq !== productsRequestSeqRef.current) return
      setIsSearchingProducts(false)
    }
  }, [activeCategoryFilterId, activeRetailOrderFilter, activeStockOrderFilter, debouncedSearchTerm, hasValidBranch, productsPage, queryProducts, tab, productsPageSize])

  useEffect(() => {
    void reloadProductRows()
  }, [reloadProductRows, productsReloadVersion])

  useEffect(() => {
    categoryProductsCacheRef.current.clear()
  }, [productsReloadVersion])

  const reloadSelectedCategoryProducts = useCallback(async () => {
    if (tab !== "kategori") return

    if (!hasValidBranch) {
      setSelectedCategoryProducts([])
      setCategoryProductsError("")
      setIsLoadingSelectedCategoryProducts(false)
      return
    }

    const categoryId = selectedCategoryId.trim()
    if (!categoryId) {
      setSelectedCategoryProducts([])
      setCategoryProductsError("")
      setIsLoadingSelectedCategoryProducts(false)
      return
    }

    const cached = categoryProductsCacheRef.current.get(categoryId)
    if (cached) {
      setSelectedCategoryProducts(cached)
      setCategoryProductsError("")
      setIsLoadingSelectedCategoryProducts(false)
      return
    }

    const seq = ++categoryProductsRequestSeqRef.current
    setIsLoadingSelectedCategoryProducts(true)
    setCategoryProductsError("")

    try {
      const result = await queryProducts({
        categoryId,
        sortBy: "name",
        sortDir: "asc",
      })

      if (seq !== categoryProductsRequestSeqRef.current) return
      categoryProductsCacheRef.current.set(categoryId, result.products)
      setSelectedCategoryProducts(result.products)
    } catch (err: unknown) {
      if (seq !== categoryProductsRequestSeqRef.current) return
      setSelectedCategoryProducts([])
      setCategoryProductsError(err instanceof Error ? err.message : "Gagal memuat produk kategori.")
    } finally {
      if (seq !== categoryProductsRequestSeqRef.current) return
      setIsLoadingSelectedCategoryProducts(false)
    }
  }, [hasValidBranch, queryProducts, selectedCategoryId, tab])

  useEffect(() => {
    void reloadSelectedCategoryProducts()
  }, [reloadSelectedCategoryProducts, productsReloadVersion])

  useEffect(() => {
    if (productsTotalPages === 0) return
    if (productsPage <= productsTotalPages) return
    setProductsPage(productsTotalPages)
  }, [productsPage, productsTotalPages])

  const bumpProductsReloadVersion = useCallback(() => {
    setProductsReloadVersion((v) => v + 1)
  }, [])

  return {
    isCRUD,
    isOrderFilterValue,

    categories,
    productsLoadError,
    isLoadingCategories,
    categoriesError,

    saveCategory,
    removeCategory,
    saveProduct,
    removeProduct,

    searchTerm,
    setSearchTerm,
    tab,
    setTab,

    selectedCategoryFilterId,
    setSelectedCategoryFilterId,
    selectedStockOrderFilter,
    setSelectedStockOrderFilter,
    selectedRetailOrderFilter,
    setSelectedRetailOrderFilter,

    selectedCategoryId,
    setSelectedCategoryId,
    selectedCategoryName,
    productCountByCategoryId,
    selectedCategoryProducts,
    isLoadingSelectedCategoryProducts,
    categoryProductsError,

    productRows,
    productsTotal,
    productsPage,
    setProductsPage,
    productsTotalPages,
    isSearchingProducts,
    productsSearchError,
    productsStartIndex,
    productsEndIndex,
    visibleProductPages,

    bumpProductsReloadVersion,

    ALL_CATEGORIES_FILTER_VALUE,
    STOCK_ORDER_FILTER_VALUE,
    STOCK_ORDER_HIGHEST_VALUE,
    STOCK_ORDER_LOWEST_VALUE,
    RETAIL_ORDER_FILTER_VALUE,
    RETAIL_ORDER_HIGHEST_VALUE,
    RETAIL_ORDER_LOWEST_VALUE,
  }
}
