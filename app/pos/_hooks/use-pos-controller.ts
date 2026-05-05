"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { permissionOf, type Role } from "@/lib/auth/rbac"
import type { PriceTier } from "@/lib/domain/types"
import { usePos } from "@/app/pos/_hooks/use-pos"
import { PRICE_TIER_LABEL } from "@/app/pos/_lib/pos-utils"

type SortField = "name" | "sku" | "category" | "zone" | "price" | "stock"

type UsePosControllerResult = ReturnType<typeof usePos> & {
  ui: {
    searchTerm: string
    selectedCategory: string
    selectedIndex: number
    page: number
    pageSize: number
    sortBy: SortField
    sortDir: "asc" | "desc"
    totalPages: number
    paginatedProducts: ReturnType<typeof usePos>["products"]
    priceTierLabel: Record<PriceTier, string>
    isCRUD: boolean
    isCustomerValid: boolean
    isSalespersonValid: boolean
  }
  uiActions: {
    setSearchTerm: (value: string) => void
    setSelectedCategory: (value: string) => void
    setSelectedIndex: (value: number) => void
    setPage: (updater: number | ((prev: number) => number)) => void
    handleSortChange: (field: SortField) => void
    getSortIndicator: (field: SortField) => "▲" | "▼" | null
    handleKeyDownOnList: (e: React.KeyboardEvent<HTMLDivElement>) => void
    handleProcessPayment: () => void
    handleGoToSales: () => void
  }
  refs: {
    listContainerRef: React.RefObject<HTMLDivElement | null>
  }
}

export function usePosController(): UsePosControllerResult {
  const router = useRouter()
  const { user } = useAuth()
  const role: Role = (user?.role as Role | undefined) ?? "admin-penjualan"
  const perm = permissionOf(role, "pos")
  const isCRUD = perm === "CRUD"

  const pos = usePos()

  const {
    products,
    productsTotal,
    customer,
    salespersonName,
    priceTier,
    actions: posActions,
  } = pos

  const { loadProducts, searchProducts } = posActions

  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedIndex, setSelectedIndex] = useState<number>(0)
  const [page, setPage] = useState<number>(1)
  const [sortBy, setSortBy] = useState<SortField>("name")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(productsTotal / pageSize))
  const paginatedProducts = products

  const searchDebounceRef = useRef<number | null>(null)
  const searchInitializedRef = useRef(false)
  const listContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    listContainerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!searchInitializedRef.current) {
      searchInitializedRef.current = true
      return
    }

    if (searchDebounceRef.current) {
      window.clearTimeout(searchDebounceRef.current)
    }

    searchDebounceRef.current = window.setTimeout(() => {
      const q = searchTerm.trim()
      const categoryId = selectedCategory === "all" ? "" : selectedCategory

      if (!q && !categoryId) {
        void loadProducts({ page, limit: pageSize, sortBy, sortDir, priceTier })
        return
      }

      void searchProducts({
        query: q || undefined,
        categoryId: categoryId || undefined,
        page,
        limit: pageSize,
        sortBy,
        sortDir,
        priceTier,
      })
      setSelectedIndex(0)
    }, 250)

    return () => {
      if (searchDebounceRef.current) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [loadProducts, searchProducts, searchTerm, selectedCategory, page, sortBy, sortDir, priceTier])

  const handleProcessPayment = () => {
    void posActions.processPayment({ isCRUD })
  }

  const handleGoToSales = () => {
    posActions.setShowSuccessDialog(false)
    router.push("/sales")
  }

  const handleKeyDownOnList = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (paginatedProducts.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.min(prev + 1, paginatedProducts.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setSelectedIndex((prev) => Math.max(prev - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const safeIndex = Math.min(selectedIndex, Math.max(paginatedProducts.length - 1, 0))
      const product = paginatedProducts[safeIndex]
      if (product && isCRUD) posActions.addToCart(product)
    }
  }

  const handleSortChange = (field: SortField) => {
    setPage(1)
    setSelectedIndex(0)
    if (sortBy === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))
      return
    }
    setSortBy(field)
    setSortDir("asc")
  }

  const getSortIndicator = (field: SortField) => {
    if (sortBy !== field) return null
    return sortDir === "asc" ? "▲" : "▼"
  }

  const isCustomerValid = customer.name.trim().length > 0 && customer.address.trim().length > 0
  const isSalespersonValid = salespersonName.trim().length > 0

  return {
    ...pos,
    ui: {
      searchTerm,
      selectedCategory,
      selectedIndex,
      page,
      pageSize,
      sortBy,
      sortDir,
      totalPages,
      paginatedProducts,
      priceTierLabel: PRICE_TIER_LABEL,
      isCRUD,
      isCustomerValid,
      isSalespersonValid,
    },
    uiActions: {
      setSearchTerm,
      setSelectedCategory,
      setSelectedIndex,
      setPage,
      handleSortChange,
      getSortIndicator,
      handleKeyDownOnList,
      handleProcessPayment,
      handleGoToSales,
    },
    refs: {
      listContainerRef,
    },
  }
}
