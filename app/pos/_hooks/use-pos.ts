"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { ApiRequestError } from "@/lib/client/http"
import { useActiveBranch } from "@/hooks/use-active-branch"
import { computePosTotals, normalizePaidAmount, validatePosCheckout, type PosCartLine, type PosPaymentStatus } from "@/lib/domain/pos"
import type { PriceTier } from "@/lib/domain/types"
import { buildPosDraftKey, buildPosPriceTierKey } from "@/lib/storage/keys"
import { useBranchScopedState } from "@/app/pos/_hooks/use-branch-scoped-state"
import { computePosStockMismatches, type PosStockMismatch } from "@/app/pos/_hooks/pos-stock-mismatch"
import {
	fetchPosProductZoneBalancesApi,
	fetchPosProductsApi,
	fetchPosZonesApi,
	postPosSaleApi,
	fetchProductCategoriesApi,
	type PosProductZoneBalanceDto,
	type PosProductDto,
	type PosSalesDocumentDto,
	type PosWarehouseZoneDto,
	type PosWarehouseZoneStockSummaryDto,
	type CategoryDto,
} from "@/app/pos/_api-clients/pos"

type CartItem = PosProductDto & {
	quantity: number
	unitPrice: number
	discount: number
	priceTier: PriceTier
	receivingDefaultWarehouseId?: string
}

type CustomerDraft = { name: string; address: string; phone: string }

const EMPTY_CART: CartItem[] = []
const EMPTY_DISCOUNT_INPUTS: Record<string, string> = {}
const EMPTY_CUSTOMER: CustomerDraft = { name: "", address: "", phone: "" }

type PosDraft = {
	cart: CartItem[]
	discountInputs: Record<string, string>
	customer: CustomerDraft
	salespersonName: string
	dueDateInput: string
	paidAmountInput: string
	paymentStatus: PosPaymentStatus
	orderDiscount: number
	orderDiscountInput: string
}

type ZonePickOption = {
	zoneId: string
	zoneName: string
	qty: number
}

type ZonePickState = {
	open: boolean
	product: PosProductDto | null
	options: ZonePickOption[]
}

type PosReloadSnapshot = {
	products: PosProductDto[]
	zoneStocks: PosWarehouseZoneStockSummaryDto
}

export function usePos() {
	const { selectedBranch } = useActiveBranch()

	const initialLoadedBranchIdRef = useRef<string | null>(null)
	const lastAutoRefreshAtRef = useRef<number>(0)
	const lastDataRefreshAtRef = useRef<number>(0)
	const searchAbortRef = useRef<AbortController | null>(null)
	const priceTierInitRef = useRef<string | null>(null)
	const reloadInFlightRef = useRef(false)
	const productsRequestVersionRef = useRef(0)
	const lastProductsQueryRef = useRef<{
		q?: string
		sku?: string
		categoryId?: string
		page?: number
		limit?: number
		sortBy?: string
		sortDir?: "asc" | "desc"
		priceTier?: PriceTier
	} | null>(null)
	const draftInitRef = useRef<Record<string, boolean>>({})

	const getDraftKey = useCallback((branchId: string) => buildPosDraftKey(branchId), [])

	const readDraft = useCallback(
		(branchId: string): PosDraft | null => {
			try {
				const raw = window.localStorage.getItem(getDraftKey(branchId))
				if (!raw) return null
				const parsed = JSON.parse(raw) as Partial<PosDraft>
				if (!parsed || typeof parsed !== "object") return null
				return {
					cart: Array.isArray(parsed.cart) ? (parsed.cart as CartItem[]) : [],
					discountInputs: parsed.discountInputs && typeof parsed.discountInputs === "object" ? parsed.discountInputs : {},
					customer: parsed.customer && typeof parsed.customer === "object" ? (parsed.customer as CustomerDraft) : EMPTY_CUSTOMER,
					salespersonName: typeof parsed.salespersonName === "string" ? parsed.salespersonName : "",
					dueDateInput: typeof parsed.dueDateInput === "string" ? parsed.dueDateInput : "",
					paidAmountInput: typeof parsed.paidAmountInput === "string" ? parsed.paidAmountInput : "",
					paymentStatus: parsed.paymentStatus === "tempo" ? "tempo" : "tunai",
					orderDiscount: Number.isFinite(parsed.orderDiscount) ? Number(parsed.orderDiscount) : 0,
					orderDiscountInput: typeof parsed.orderDiscountInput === "string" ? parsed.orderDiscountInput : "",
				}
			} catch {
				return null
			}
		},
		[getDraftKey]
	)

	const writeDraft = useCallback(
		(branchId: string, draft: PosDraft) => {
			try {
				window.localStorage.setItem(getDraftKey(branchId), JSON.stringify(draft))
			} catch {
				// ignore storage errors
			}
		},
		[getDraftKey]
	)

	const clearDraft = useCallback(
		(branchId: string) => {
			try {
				window.localStorage.removeItem(getDraftKey(branchId))
			} catch {
				// ignore storage errors
			}
		},
		[getDraftKey]
	)

	const [zonesByBranch, setZonesByBranch] = useState<Record<string, PosWarehouseZoneDto[]>>({})
	const zones = useMemo(() => zonesByBranch[selectedBranch.id] ?? [], [zonesByBranch, selectedBranch.id])

	const [defaultWarehouseIdByBranch, setDefaultWarehouseIdByBranch] = useState<Record<string, string>>({})
	const selectedWarehouseId = defaultWarehouseIdByBranch[selectedBranch.id] ?? ""
	const selectedWarehouseLabel = useMemo(() => {
		if (!selectedWarehouseId) return ""
		return zones.find((z) => z.id === selectedWarehouseId)?.name ?? selectedWarehouseId
	}, [selectedWarehouseId, zones])

	const [zoneStocksByBranch, setZoneStocksByBranch] = useState<Record<string, PosWarehouseZoneStockSummaryDto>>({})
	const zoneStocks = useMemo(
		() => zoneStocksByBranch[selectedBranch.id] ?? ({} as PosWarehouseZoneStockSummaryDto),
		[zoneStocksByBranch, selectedBranch.id]
	)

	const [zoneBalancesByBranch, setZoneBalancesByBranch] = useState<Record<string, Record<string, PosProductZoneBalanceDto>>>({})
	const zoneBalanceMap = useMemo(
		() => zoneBalancesByBranch[selectedBranch.id] ?? {},
		[zoneBalancesByBranch, selectedBranch.id]
	)

	const getNormalQtyInZoneFromSnapshot = useCallback(
		(input: { zoneStocks: PosWarehouseZoneStockSummaryDto; sku: string; zoneId: string }) => {
			const skuKey = (input.sku ?? "").trim().toLowerCase()
			const zoneId = (input.zoneId ?? "").trim()
			if (!skuKey || !zoneId) return 0
			const lines = (input.zoneStocks as PosWarehouseZoneStockSummaryDto)[zoneId]
			if (!Array.isArray(lines)) return 0
			const line = lines.find(
				(l) => String((l as { sku?: string }).sku ?? "").trim().toLowerCase() === skuKey
			)
			return Math.trunc(Number((line as { normalQty?: number } | undefined)?.normalQty ?? 0))
		},
		[]
	)

	const getNormalQtyInZone = useCallback(
		(input: { sku: string; zoneId: string }) => {
			const skuKey = (input.sku ?? "").trim().toLowerCase()
			const zoneId = (input.zoneId ?? "").trim()
			if (!skuKey || !zoneId) return 0
			const lines = (zoneStocks as PosWarehouseZoneStockSummaryDto)[zoneId]
			if (!Array.isArray(lines)) return 0
			const line = lines.find((l) => String((l as { sku?: string }).sku ?? "").trim().toLowerCase() === skuKey)
			return Math.trunc(Number((line as { normalQty?: number } | undefined)?.normalQty ?? 0))
		},
		[zoneStocks]
	)

	const [productsByBranch, setProductsByBranch] = useState<Record<string, PosProductDto[]>>({})
	const products = useMemo(() => productsByBranch[selectedBranch.id] ?? [], [productsByBranch, selectedBranch.id])
	const [productsTotalByBranch, setProductsTotalByBranch] = useState<Record<string, number>>({})
	const productsTotal = productsTotalByBranch[selectedBranch.id] ?? 0

	const [isLoadingProducts, setIsLoadingProducts] = useState(false)
	const [productsError, setProductsError] = useState("")

	const [categoriesByBranch, setCategoriesByBranch] = useState<Record<string, CategoryDto[]>>({})
	const categories = useMemo(() => categoriesByBranch[selectedBranch.id] ?? [], [categoriesByBranch, selectedBranch.id])
	const [isLoadingCategories, setIsLoadingCategories] = useState(false)
	const [categoriesError, setCategoriesError] = useState("")

	const {
		value: cart,
		setValue: setCart,
	} = useBranchScopedState<CartItem[]>(selectedBranch.id, EMPTY_CART)

	const {
		value: discountInputs,
		setValue: setDiscountInputs,
	} = useBranchScopedState<Record<string, string>>(selectedBranch.id, EMPTY_DISCOUNT_INPUTS)

	const {
		value: customer,
		setValue: setCustomer,
	} = useBranchScopedState<CustomerDraft>(selectedBranch.id, EMPTY_CUSTOMER)

	const {
		value: salespersonName,
		setValue: setSalespersonName,
	} = useBranchScopedState<string>(selectedBranch.id, "")

	const {
		value: dueDateInput,
		setValue: setDueDateInput,
	} = useBranchScopedState<string>(selectedBranch.id, "")

	const {
		value: paidAmountInput,
		setValue: setPaidAmountInput,
	} = useBranchScopedState<string>(selectedBranch.id, "")

	const {
		value: paymentStatus,
		setValue: setPaymentStatus,
	} = useBranchScopedState<PosPaymentStatus>(selectedBranch.id, "tunai")
	const [priceTier, setPriceTier] = useState<PriceTier>("retail")

	const {
		value: orderDiscount,
		setValue: setOrderDiscount,
	} = useBranchScopedState<number>(selectedBranch.id, 0)

	const {
		value: orderDiscountInput,
		setValue: setOrderDiscountInput,
	} = useBranchScopedState<string>(selectedBranch.id, "")

	const [lastPostedSale, setLastPostedSale] = useState<PosSalesDocumentDto | null>(null)
	const [posMessage, setPosMessage] = useState<string>("")
	const [showSuccessDialog, setShowSuccessDialog] = useState(false)
	const [showErrorDialog, setShowErrorDialog] = useState(false)
	const [isSubmittingPayment, setIsSubmittingPayment] = useState(false)
	const [zonePick, setZonePick] = useState<ZonePickState>({ open: false, product: null, options: [] })

	const beginProductsRequest = useCallback(() => {
		productsRequestVersionRef.current += 1
		return productsRequestVersionRef.current
	}, [])

	const isLatestProductsRequest = useCallback((requestVersion: number) => {
		return productsRequestVersionRef.current === requestVersion
	}, [])

	const indexZoneBalances = useCallback((items: PosProductZoneBalanceDto[]) => {
		const next: Record<string, PosProductZoneBalanceDto> = {}
		for (const item of items ?? []) {
			const sku = String(item?.sku ?? "").trim().toLowerCase()
			if (!sku) continue
			next[sku] = item
		}
		return next
	}, [])

	const mergeZoneBalancesByBranch = useCallback(
		(branchId: string, incoming: Record<string, PosProductZoneBalanceDto>) => {
			if (Object.keys(incoming).length === 0) return
			setZoneBalancesByBranch((prev) => ({
				...prev,
				[branchId]: {
					...(prev[branchId] ?? {}),
					...incoming,
				},
			}))
		},
		[]
	)

	const fetchZoneBalancesForSkus = useCallback(
		async (input: { branchId: string; skus: string[] }) => {
			const uniqueSkus: string[] = []
			const seen = new Set<string>()
			for (const raw of input.skus ?? []) {
				const sku = String(raw ?? "").trim()
				if (!sku) continue
				const key = sku.toLowerCase()
				if (seen.has(key)) continue
				seen.add(key)
				uniqueSkus.push(sku)
			}

			if (uniqueSkus.length === 0) return {} as Record<string, PosProductZoneBalanceDto>

			const settled = await Promise.allSettled(
				uniqueSkus.map((sku) => fetchPosProductZoneBalancesApi({ sku }))
			)

			const merged: PosProductZoneBalanceDto[] = []
			for (const row of settled) {
				if (row.status !== "fulfilled") continue
				if (!Array.isArray(row.value.items)) continue
				merged.push(...row.value.items)
			}

			return indexZoneBalances(merged)
		},
		[indexZoneBalances]
	)

	const loadZoneBalances = useCallback(async (branchId: string) => {
		const data = await fetchPosProductZoneBalancesApi({})
		const indexed = indexZoneBalances(data.items ?? [])
		mergeZoneBalancesByBranch(branchId, indexed)
		return indexed
	}, [indexZoneBalances, mergeZoneBalancesByBranch])

	const mapProductsWithZoneProjection = useCallback(
		(items: PosProductDto[], branchId: string, balanceMapOverride?: Record<string, PosProductZoneBalanceDto>) => {
			const balanceMap = balanceMapOverride ?? zoneBalancesByBranch[branchId] ?? {}
			return (items ?? []).map((p) => {
				const skuKey = String(p.sku ?? "").trim().toLowerCase()
				const bal = balanceMap[skuKey]
				const projectedTotal = Math.max(0, Math.trunc(Number(bal?.totalNormalQty ?? NaN)))
				return {
					...p,
					stock: Number.isFinite(projectedTotal) ? projectedTotal : p.stock,
				}
			})
		},
		[zoneBalancesByBranch]
	)

	const totals = useMemo(() => {
		const lines: PosCartLine[] = cart.map((item) => ({
			sku: item.sku,
			name: item.name,
			quantity: item.quantity,
			unitPrice: item.unitPrice,
			discount: item.discount,
			priceTier: item.priceTier,
		}))

		return computePosTotals({ items: lines, orderDiscount })
	}, [cart, orderDiscount])

	const loadZones = useCallback(async () => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return

		try {
			const data = await fetchPosZonesApi()

			setZonesByBranch((prev) => ({ ...prev, [branchId]: data.zones }))
			setZoneStocksByBranch((prev) => ({ ...prev, [branchId]: data.zoneStocks }))

			const apiDefault = (data.defaultWarehouseId ?? "").trim()
			const fallback = data.zones[0]?.id ?? ""
			setDefaultWarehouseIdByBranch((prev) => ({ ...prev, [branchId]: apiDefault || fallback }))

			lastDataRefreshAtRef.current = Date.now()
		} catch {
			setZonesByBranch((prev) => ({ ...prev, [branchId]: [] }))
			setDefaultWarehouseIdByBranch((prev) => ({ ...prev, [branchId]: "" }))
			setZoneStocksByBranch((prev) => ({ ...prev, [branchId]: {} as PosWarehouseZoneStockSummaryDto }))
			setZoneBalancesByBranch((prev) => ({ ...prev, [branchId]: {} }))
		}
	}, [selectedBranch.id])

	const loadProducts = useCallback(
		async (input?: { page?: number; limit?: number; sortBy?: string; sortDir?: "asc" | "desc"; priceTier?: PriceTier }) => {
			const branchId = (selectedBranch.id ?? "").trim()
			if (!branchId) return
			const requestVersion = beginProductsRequest()

			lastProductsQueryRef.current = {
				page: input?.page,
				limit: input?.limit,
				sortBy: input?.sortBy,
				sortDir: input?.sortDir,
				priceTier: input?.priceTier,
			}
			setIsLoadingProducts(true)
			setProductsError("")
			try {
				const data = await fetchPosProductsApi({
					page: input?.page,
					limit: input?.limit,
					sortBy: input?.sortBy,
					sortDir: input?.sortDir,
					priceTier: input?.priceTier,
				})
				if (!isLatestProductsRequest(requestVersion)) return
				const mapped = mapProductsWithZoneProjection(data.products ?? [], branchId)
				setProductsByBranch((prev) => ({ ...prev, [branchId]: mapped }))
				setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: data.total ?? mapped.length }))

				lastDataRefreshAtRef.current = Date.now()
			} catch (err: unknown) {
				if (!isLatestProductsRequest(requestVersion)) return
				setProductsByBranch((prev) => ({ ...prev, [branchId]: [] }))
				setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: 0 }))
				setProductsError(err instanceof Error ? err.message : "Gagal memuat data POS.")
			} finally {
				if (isLatestProductsRequest(requestVersion)) {
					setIsLoadingProducts(false)
				}
			}
		},
		[beginProductsRequest, isLatestProductsRequest, mapProductsWithZoneProjection, selectedBranch.id]
	)

	const loadCategories = useCallback(async () => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return

		setIsLoadingCategories(true)
		setCategoriesError("")
		try {
			const data = await fetchProductCategoriesApi()
			setCategoriesByBranch((prev) => ({ ...prev, [branchId]: Array.isArray(data) ? data : [] }))
		} catch (err: unknown) {
			setCategoriesByBranch((prev) => ({ ...prev, [branchId]: [] }))
			setCategoriesError(err instanceof Error ? err.message : "Gagal memuat kategori produk.")
		} finally {
			setIsLoadingCategories(false)
		}
	}, [selectedBranch.id])

	const searchProducts = useCallback(
		async (input: {
			query?: string
			sku?: string
			categoryId?: string
			page?: number
			limit?: number
			sortBy?: string
			sortDir?: "asc" | "desc"
			priceTier?: PriceTier
		}) => {
			const branchId = (selectedBranch.id ?? "").trim()
			if (!branchId) return
			const requestVersion = beginProductsRequest()

			lastProductsQueryRef.current = {
				q: input.query,
				sku: input.sku,
				categoryId: input.categoryId,
				page: input.page,
				limit: input.limit,
				sortBy: input.sortBy,
				sortDir: input.sortDir,
				priceTier: input.priceTier,
			}

			searchAbortRef.current?.abort()
			const controller = new AbortController()
			searchAbortRef.current = controller

			setIsLoadingProducts(true)
			setProductsError("")

			try {
				const data = await fetchPosProductsApi({
					q: input.query,
					sku: input.sku,
					categoryId: input.categoryId,
					page: input.page,
					limit: input.limit,
					sortBy: input.sortBy,
					sortDir: input.sortDir,
					priceTier: input.priceTier,
					signal: controller.signal,
				})
				if (!isLatestProductsRequest(requestVersion)) return

				const mapped = mapProductsWithZoneProjection(data.products ?? [], branchId)
				setProductsByBranch((prev) => ({ ...prev, [branchId]: mapped }))
				setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: data.total ?? mapped.length }))
			} catch (err: unknown) {
				const aborted =
					(err instanceof DOMException && err.name === "AbortError") ||
					(err instanceof Error && err.name === "AbortError")
				if (aborted) return
				if (!isLatestProductsRequest(requestVersion)) return
				setProductsByBranch((prev) => ({ ...prev, [branchId]: [] }))
				setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: 0 }))
				setProductsError(err instanceof Error ? err.message : "Gagal memuat data POS.")
			} finally {
				if (searchAbortRef.current === controller) {
					searchAbortRef.current = null
				}
				if (isLatestProductsRequest(requestVersion)) {
					setIsLoadingProducts(false)
				}
			}
		},
		[beginProductsRequest, isLatestProductsRequest, mapProductsWithZoneProjection, selectedBranch.id]
	)

	useEffect(() => {
		return () => {
			searchAbortRef.current?.abort()
			searchAbortRef.current = null
		}
	}, [selectedBranch.id])

	const reloadPosData = useCallback(async (options?: { hydrateVisibleZoneBalances?: boolean }): Promise<PosReloadSnapshot | null> => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return null
		if (reloadInFlightRef.current) return null
		const requestVersion = beginProductsRequest()
		reloadInFlightRef.current = true
		const hydrateVisibleZoneBalances = options?.hydrateVisibleZoneBalances !== false

		try {
			const zonesSnap = await fetchPosZonesApi()

			setIsLoadingProducts(true)
			setProductsError("")
			const lastQuery: {
				q?: string
				sku?: string
				categoryId?: string
				page?: number
				limit?: number
				sortBy?: string
				sortDir?: "asc" | "desc"
				priceTier?: PriceTier
			} = lastProductsQueryRef.current ?? {
				page: 1,
				limit: 10,
				sortBy: "name",
				sortDir: "asc",
				priceTier,
			}
			const productsSnap = await fetchPosProductsApi({
				q: lastQuery?.q,
				sku: lastQuery?.sku,
				categoryId: lastQuery?.categoryId,
				page: lastQuery?.page,
				limit: lastQuery?.limit,
				sortBy: lastQuery?.sortBy,
				sortDir: lastQuery?.sortDir,
				priceTier: lastQuery?.priceTier,
			})

			const existingBalanceMap = zoneBalancesByBranch[branchId] ?? {}
			const fetchedBalanceMap = hydrateVisibleZoneBalances
				? await fetchZoneBalancesForSkus({
					branchId,
					skus: (productsSnap.products ?? []).map((p) => p.sku),
				})
				: {}
			const mergedBalanceMap = {
				...existingBalanceMap,
				...fetchedBalanceMap,
			}

			const mapped = (productsSnap.products ?? []).map((p) => {
				const bal = mergedBalanceMap[String(p.sku ?? "").trim().toLowerCase()]
				const projectedTotal = Math.max(0, Math.trunc(Number(bal?.totalNormalQty ?? NaN)))
				const primaryPick = String(bal?.primaryPickWarehouseId ?? "").trim()
				if (Number.isFinite(projectedTotal)) {
					return {
						...p,
						stock: projectedTotal,
					}
				}
				const zoneId = String(primaryPick || "").trim()
				if (!zoneId) return p
				return {
					...p,
					stock: getNormalQtyInZoneFromSnapshot({
						zoneStocks: zonesSnap.zoneStocks,
						sku: p.sku,
						zoneId,
					}),
				}
			})

			if (!isLatestProductsRequest(requestVersion)) return null

			setZonesByBranch((prev) => ({ ...prev, [branchId]: zonesSnap.zones }))
			setZoneStocksByBranch((prev) => ({ ...prev, [branchId]: zonesSnap.zoneStocks }))
			const apiDefault = (zonesSnap.defaultWarehouseId ?? "").trim()
			const fallback = zonesSnap.zones[0]?.id ?? ""
			setDefaultWarehouseIdByBranch((prev) => ({ ...prev, [branchId]: apiDefault || fallback }))
			if (hydrateVisibleZoneBalances) {
				mergeZoneBalancesByBranch(branchId, fetchedBalanceMap)
			}
			setProductsByBranch((prev) => ({ ...prev, [branchId]: mapped }))
			setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: productsSnap.total ?? mapped.length }))

			lastDataRefreshAtRef.current = Date.now()
			return {
				products: mapped,
				zoneStocks: zonesSnap.zoneStocks,
			}
		} catch (err: unknown) {
			if (!isLatestProductsRequest(requestVersion)) return null
			setProductsByBranch((prev) => ({ ...prev, [branchId]: [] }))
			setProductsTotalByBranch((prev) => ({ ...prev, [branchId]: 0 }))
			setProductsError(err instanceof Error ? err.message : "Gagal memuat data POS.")
			return null
		} finally {
			if (isLatestProductsRequest(requestVersion)) {
				setIsLoadingProducts(false)
			}
			reloadInFlightRef.current = false
		}
	}, [beginProductsRequest, fetchZoneBalancesForSkus, getNormalQtyInZoneFromSnapshot, isLatestProductsRequest, mergeZoneBalancesByBranch, priceTier, selectedBranch.id, zoneBalancesByBranch])

	useEffect(() => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return
		if (initialLoadedBranchIdRef.current === branchId) return
		initialLoadedBranchIdRef.current = branchId

		void reloadPosData()
		void loadCategories()
	}, [loadCategories, reloadPosData, selectedBranch.id])

	useEffect(() => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return
		if (draftInitRef.current[branchId]) return
		draftInitRef.current[branchId] = true

		const draft = readDraft(branchId)
		if (!draft) return

		setCart(draft.cart)
		setDiscountInputs(draft.discountInputs)
		setCustomer(draft.customer)
		setSalespersonName(draft.salespersonName)
		setDueDateInput(draft.dueDateInput)
		setPaidAmountInput(draft.paidAmountInput)
		setPaymentStatus(draft.paymentStatus)
		setOrderDiscount(draft.orderDiscount)
		setOrderDiscountInput(draft.orderDiscountInput)
	}, [readDraft, selectedBranch.id, setCart, setCustomer, setDiscountInputs, setDueDateInput, setOrderDiscount, setOrderDiscountInput, setPaidAmountInput, setPaymentStatus, setSalespersonName])

	useEffect(() => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return
		if (!draftInitRef.current[branchId]) return

		writeDraft(branchId, {
			cart,
			discountInputs,
			customer,
			salespersonName,
			dueDateInput,
			paidAmountInput,
			paymentStatus,
			orderDiscount,
			orderDiscountInput,
		})
	}, [cart, customer, discountInputs, dueDateInput, orderDiscount, orderDiscountInput, paidAmountInput, paymentStatus, selectedBranch.id, salespersonName, writeDraft])

	useEffect(() => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return

		if (priceTierInitRef.current === branchId) return
		priceTierInitRef.current = branchId

		try {
			const key = buildPosPriceTierKey(branchId)
			const stored = (window.localStorage.getItem(key) ?? "").trim()
			if (stored === "retail" || stored === "partai" || stored === "cabang") {
				if (stored !== priceTier) setPriceTier(stored)
			}
		} catch {
			// ignore storage errors
		}
	}, [priceTier, selectedBranch.id])

	useEffect(() => {
		const branchId = (selectedBranch.id ?? "").trim()
		if (!branchId) return
		try {
			const key = buildPosPriceTierKey(branchId)
			window.localStorage.setItem(key, priceTier)
		} catch {
			// ignore storage errors
		}
	}, [priceTier, selectedBranch.id])

	useEffect(() => {
		const refresh = () => {
			const now = Date.now()
			// Guard against accidental rapid re-triggers (dev overlays, focus churn)
			if (now - lastAutoRefreshAtRef.current < 1000) return
			lastAutoRefreshAtRef.current = now

			// Do not refresh on every alt+tab; only refresh when data is stale.
			// This avoids noisy request logs while still keeping POS data reasonably fresh.
			const STALE_AFTER_MS = 60_000
			if (now - lastDataRefreshAtRef.current < STALE_AFTER_MS) return
			// Best-effort refresh so POS reflects stock changes done elsewhere.
			void reloadPosData({ hydrateVisibleZoneBalances: false })
		}

		// Refresh when user returns to the POS tab/window.
		window.addEventListener("focus", refresh)
		const onVisibilityChange = () => {
			if (document.visibilityState === "visible") refresh()
		}
		document.addEventListener("visibilitychange", onVisibilityChange)

		return () => {
			window.removeEventListener("focus", refresh)
			document.removeEventListener("visibilitychange", onVisibilityChange)
		}
	}, [reloadPosData])

	useEffect(() => {
		// Ensure POS stock stays fresh even if this route is kept alive by App Router cache.
		const tick = () => {
			if (typeof window === "undefined") return
			if (document.visibilityState !== "visible") return
			if (!window.location.pathname.startsWith("/pos")) return
			const now = Date.now()
			const STALE_AFTER_MS = 60_000
			if (now - lastDataRefreshAtRef.current < STALE_AFTER_MS) return
			void reloadPosData({ hydrateVisibleZoneBalances: false })
		}

		const id = window.setInterval(tick, 60_000)
		return () => window.clearInterval(id)
	}, [reloadPosData])

	const getZoneNameById = useCallback(
		(zoneId: string) => {
			const id = (zoneId ?? "").trim()
			if (!id) return ""
			return zones.find((z) => z.id === id)?.name ?? id
		},
		[zones]
	)

	const getOtherZoneSellableStockHints = useCallback(
		(input: { sku: string; excludeZoneId?: string }) => {
			const skuKey = (input.sku ?? "").trim().toLowerCase()
			if (!skuKey) return [] as Array<{ zoneId: string; zoneName: string; qty: number }>

			const excludeZoneId = (input.excludeZoneId ?? "").trim()

			const hints: Array<{ zoneId: string; zoneName: string; qty: number }> = []
			for (const [zoneId, lines] of Object.entries(zoneStocks ?? {})) {
				if (!zoneId || zoneId === excludeZoneId) continue
				if (!Array.isArray(lines)) continue

				const line = lines.find((l) => String((l as { sku?: string }).sku ?? "").toLowerCase() === skuKey)
				const qty = Math.trunc(Number((line as { normalQty?: number } | undefined)?.normalQty ?? 0))
				if (qty > 0) {
					const zoneName = getZoneNameById(zoneId)
					hints.push({ zoneId, zoneName, qty })
				}
			}

			hints.sort((a, b) => b.qty - a.qty)
			return hints
		},
		[getZoneNameById, zoneStocks]
	)

	const buildOtherZoneStockMessage = useCallback(
		(input: { sku: string; productName?: string; requestedQty: number; availableQty: number; sourceZoneId?: string }) => {
			const sku = input.sku
			const title = input.productName ? `${input.productName} (${sku})` : sku

			const sourceZoneId = String(input.sourceZoneId ?? "").trim()
			const sourceZoneName = sourceZoneId ? getZoneNameById(sourceZoneId) : "Zona produk"

			const hints = getOtherZoneSellableStockHints({ sku, excludeZoneId: sourceZoneId })

			if (hints.length === 0) {
				return `Stok tidak cukup di zona ${sourceZoneName}. Tersedia ${input.availableQty}, diminta ${input.requestedQty}.`
			}

			const top = hints.slice(0, 3)
			const restCount = Math.max(0, hints.length - top.length)
			const list =
				top.map((h) => `${h.zoneName}: ${h.qty}`).join(", ") + (restCount > 0 ? ` (+${restCount} zona lain)` : "")
			return (
				`Stok ${title} kosong/tidak cukup di zona ${sourceZoneName}. ` +
				`Stok tersedia di zona lain: ${list}. ` +
				`Silakan lakukan Pindah Internal di menu Gudang ke zona ${sourceZoneName}, lalu coba lagi.`
			)
		},
		[getOtherZoneSellableStockHints, getZoneNameById]
	)

	const handlePriceTierChange = useCallback(
		(value: PriceTier) => {
			setPriceTier(value)
			setCart((prev) =>
				prev.map((item) => {
					const product = products.find((p) => p.sku === item.sku)
					if (!product) return { ...item, priceTier: value }
					return { ...item, unitPrice: product.prices[value], priceTier: value }
				})
			)
		},
		[products, setCart]
	)

	const getSellableZoneOptions = useCallback(
		(sku: string): ZonePickOption[] => {
			const skuKey = String(sku ?? "").trim().toLowerCase()
			if (!skuKey) return []

			const fromProjection = (zoneBalanceMap[skuKey]?.lines ?? [])
				.map((line) => ({
					zoneId: String(line.zoneId ?? "").trim(),
					zoneName: String(line.zoneName ?? "").trim() || getZoneNameById(String(line.zoneId ?? "").trim()),
					qty: Math.max(0, Math.trunc(Number(line.normalQty ?? 0))),
				}))
				.filter((x) => x.zoneId && x.qty > 0)

			if (fromProjection.length > 0) {
				return [...fromProjection].sort((a, b) => b.qty - a.qty)
			}

			const fallback: ZonePickOption[] = []
			for (const [zoneId, lines] of Object.entries(zoneStocks ?? {})) {
				if (!Array.isArray(lines)) continue
				const line = lines.find((l) => String((l as { sku?: string }).sku ?? "").trim().toLowerCase() === skuKey)
				const qty = Math.max(0, Math.trunc(Number((line as { normalQty?: number } | undefined)?.normalQty ?? 0)))
				if (qty <= 0) continue
				fallback.push({ zoneId, zoneName: getZoneNameById(zoneId), qty })
			}

			return fallback.sort((a, b) => b.qty - a.qty)
		},
		[getZoneNameById, zoneBalanceMap, zoneStocks]
	)

	const addToCartFromZone = useCallback(
		(input: { product: PosProductDto; zoneId: string }) => {
			const zoneId = String(input.zoneId ?? "").trim()
			if (!zoneId) return

			const available = getNormalQtyInZone({ sku: input.product.sku, zoneId })
			if (available <= 0) {
				setPosMessage(
					buildOtherZoneStockMessage({
						sku: input.product.sku,
						productName: input.product.name,
						requestedQty: 1,
						availableQty: 0,
						sourceZoneId: zoneId,
					})
				)
				setShowErrorDialog(true)
				return
			}

			const unitPrice = input.product.prices[priceTier]
			setCart((prev) => {
				const existingItem = prev.find((item) => item.sku === input.product.sku)
				if (existingItem) {
					const existingZoneId = String(existingItem.receivingDefaultWarehouseId ?? "").trim()
					if (existingZoneId && existingZoneId !== zoneId) {
						setPosMessage(
							`Produk ${input.product.sku} sudah ada di keranjang dengan zona ${getZoneNameById(existingZoneId)}. ` +
							"Untuk ganti zona, hapus item dulu dari keranjang lalu tambah lagi."
						)
						setShowErrorDialog(true)
						return prev
					}

					const nextQty = existingItem.quantity + 1
					if (nextQty > available) {
						setPosMessage(
							buildOtherZoneStockMessage({
								sku: input.product.sku,
								productName: input.product.name,
								requestedQty: nextQty,
								availableQty: available,
								sourceZoneId: zoneId,
							})
						)
						setShowErrorDialog(true)
						return prev
					}

					return prev.map((item) =>
						item.sku === input.product.sku
							? {
								...item,
								quantity: item.quantity + 1,
								unitPrice,
								priceTier,
								receivingDefaultWarehouseId: zoneId,
							}
							: item
					)
				}

				return [
					...prev,
					{
						...input.product,
						receivingDefaultWarehouseId: zoneId,
						stock: available,
						quantity: 1,
						unitPrice,
						discount: 0,
						priceTier,
					},
				]
			})
		},
		[buildOtherZoneStockMessage, getNormalQtyInZone, getZoneNameById, priceTier, setCart]
	)

	const addToCart = useCallback(
		(product: PosProductDto) => {
			const existingItem = cart.find((item) => item.sku === product.sku)
			if (existingItem) {
				const existingZoneId = String(existingItem.receivingDefaultWarehouseId ?? "").trim()
				if (existingZoneId) {
					addToCartFromZone({ product, zoneId: existingZoneId })
					return
				}
			}

			const options = getSellableZoneOptions(product.sku)
			if (options.length === 0) {
				setPosMessage(
					buildOtherZoneStockMessage({
						sku: product.sku,
						productName: product.name,
						requestedQty: 1,
						availableQty: 0,
						sourceZoneId: undefined,
					})
				)
				setShowErrorDialog(true)
				return
			}

			if (options.length === 1) {
				addToCartFromZone({ product, zoneId: options[0]!.zoneId })
				return
			}

			setZonePick({ open: true, product, options })
		},
		[addToCartFromZone, buildOtherZoneStockMessage, cart, getSellableZoneOptions]
	)

	const confirmAddToCartZone = useCallback(
		(zoneId: string) => {
			const product = zonePick.product
			if (!product) return
			setZonePick({ open: false, product: null, options: [] })
			addToCartFromZone({ product, zoneId })
		},
		[addToCartFromZone, zonePick.product]
	)

	const closeZonePickDialog = useCallback(() => {
		setZonePick({ open: false, product: null, options: [] })
	}, [])

	const removeFromCart = useCallback(
		(sku: string) => {
			setCart((prev) => prev.filter((item) => item.sku !== sku))
			setDiscountInputs((prev) => {
				const next = { ...prev }
				delete next[sku]
				return next
			})
		},
		[setCart, setDiscountInputs]
	)

	const updateQuantity = useCallback(
		(sku: string, quantity: number) => {
			if (quantity <= 0) {
				removeFromCart(sku)
				return
			}

			const p = products.find((x) => x.sku === sku)
			const cartItem = cart.find((x) => x.sku === sku)
			const sourceZoneId = String(cartItem?.receivingDefaultWarehouseId ?? "").trim()
			const available = sourceZoneId ? getNormalQtyInZone({ sku, zoneId: sourceZoneId }) : Math.trunc(Number(p?.stock ?? 0))
			if (quantity > available) {
				setPosMessage(
					buildOtherZoneStockMessage({
						sku,
						productName: p?.name,
						requestedQty: quantity,
						availableQty: available,
						sourceZoneId: sourceZoneId || undefined,
					})
				)
				setShowErrorDialog(true)
				return
			}

			setCart((prev) => prev.map((item) => (item.sku === sku ? { ...item, quantity } : item)))
		},
		[buildOtherZoneStockMessage, cart, getNormalQtyInZone, products, removeFromCart, setCart]
	)

	const updateCartItem = useCallback(
		(sku: string, updater: Partial<CartItem>) => {
			setCart((prev) =>
				prev.map((item) => {
					if (item.sku !== sku) return item
					const unitPrice = Math.max(0, updater.unitPrice ?? item.unitPrice)
					const discount = Math.max(0, Math.min(updater.discount ?? item.discount, unitPrice))
					return { ...item, ...updater, unitPrice, discount }
				})
			)
		},
		[setCart]
	)

	const handleDiscountInputChange = useCallback(
		(sku: string, val: string) => {
			setDiscountInputs((prev) => ({ ...prev, [sku]: val }))
		},
		[setDiscountInputs]
	)

	const handleDiscountInputBlur = useCallback(
		(sku: string) => {
			const strVal = discountInputs[sku] ?? ""
			const parsed = Number(strVal)
			const value = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
			updateCartItem(sku, { discount: value })
			setDiscountInputs((prev) => ({ ...prev, [sku]: value > 0 ? String(value) : "" }))
		},
		[discountInputs, setDiscountInputs, updateCartItem]
	)

	const openStockMismatchDialog = useCallback(
		(mismatches: PosStockMismatch<CartItem>[]) => {
			if (mismatches.length === 0) return false

			const first = mismatches[0]
			if (!first) return false

			const suffix =
				mismatches.length > 1 ? `\n\nCatatan: Ada ${mismatches.length - 1} item lain yang juga tidak cukup stoknya.` : ""
			setPosMessage(
				buildOtherZoneStockMessage({
					sku: first.item.sku,
					productName: first.product?.name ?? first.item.name,
					requestedQty: first.item.quantity,
					availableQty: first.available,
					sourceZoneId: first.sourceZoneId || undefined,
				}) + suffix
			)
			setShowErrorDialog(true)
			return true
		},
		[buildOtherZoneStockMessage]
	)

	const processPayment = useCallback(
		async (opts: { isCRUD: boolean }) => {
			if (isSubmittingPayment) return
			setIsSubmittingPayment(true)
			try {
				setPosMessage("")
				setLastPostedSale(null)

				if (!opts.isCRUD) return

				const warehouseIdForSale = selectedWarehouseId

				const validation = validatePosCheckout({
					warehouseId: warehouseIdForSale,
					items: cart,
					salespersonName: salespersonName.trim(),
					customerName: customer.name,
					customerAddress: customer.address,
					customerPhone: customer.phone,
					paymentStatus,
					dueDate: paymentStatus === "tempo" ? dueDateInput : undefined,
				})

				if (!validation.ok) {
					setPosMessage(validation.error.message)
					setShowErrorDialog(true)
					return
				}

				const preflightMismatches = computePosStockMismatches({
					cart,
					products,
					zoneStocks,
				})
				if (openStockMismatchDialog(preflightMismatches)) return

				const paidAmountRaw = Number(paidAmountInput)
				const { paidAmount } = normalizePaidAmount({
					paymentStatus,
					grandTotal: totals.grandTotal,
					paidAmountInput: paidAmountRaw,
				})

				try {
					const res = await postPosSaleApi({
						allowNegativeStock: false,
						warehouseId: warehouseIdForSale,
						salespersonName: salespersonName.trim(),
						paymentStatus,
						paidAmount,
						dueDate: paymentStatus === "tempo" ? dueDateInput : undefined,
						orderDiscount: totals.orderDiscountApplied,
						customerName: customer.name,
						customerAddress: customer.address,
						customerPhone: customer.phone,
						items: cart.map((item) => ({
							sku: item.sku,
							quantity: item.quantity,
							unitPrice: item.unitPrice,
							discount: item.discount,
							priceTier: item.priceTier,
							warehouseId: String(item.receivingDefaultWarehouseId ?? "").trim() || undefined,
						})),
					})

					setLastPostedSale(res.doc ?? null)
					setCart([])
					setOrderDiscount(0)
					setOrderDiscountInput("")
					setDiscountInputs({})
					setCustomer({ name: "", address: "", phone: "" })
					setSalespersonName("")
					setDueDateInput("")
					setPaidAmountInput("")
					setPosMessage(`Transaksi POSTED: ${res.doc?.id ?? "-"}`)
					setShowSuccessDialog(true)
					clearDraft(selectedBranch.id)

					await reloadPosData()
				} catch (err: unknown) {
					if (err instanceof ApiRequestError && err.code === "INSUFFICIENT_STOCK") {
						const refreshed = await reloadPosData()
						const mismatches = computePosStockMismatches({
							cart,
							products: refreshed?.products ?? products,
							zoneStocks: refreshed?.zoneStocks ?? zoneStocks,
						})

						if (openStockMismatchDialog(mismatches)) return
						setPosMessage(err.message)
						setShowErrorDialog(true)
						return
					} else {
						const msg = err instanceof Error ? err.message : "Gagal memproses transaksi."
						setPosMessage(msg)
						setShowErrorDialog(true)
					}
				}
			} finally {
				setIsSubmittingPayment(false)
			}
		},
		[
			cart,
			clearDraft,
			customer.address,
			customer.phone,
			customer.name,
			dueDateInput,
			isSubmittingPayment,
			openStockMismatchDialog,
			reloadPosData,
			paidAmountInput,
			paymentStatus,
			products,
			salespersonName,
			selectedBranch.id,
			selectedWarehouseId,
			setCart,
			setCustomer,
			setDiscountInputs,
			setDueDateInput,
			setOrderDiscount,
			setOrderDiscountInput,
			setPaidAmountInput,
			setSalespersonName,
			totals.grandTotal,
			totals.orderDiscountApplied,
			zoneStocks,
		]
	)

	return {
		zones,
		zoneStocks,
		zonePick,
		selectedWarehouseId,
		selectedWarehouseLabel,
		products,
		productsTotal,
		isLoadingProducts,
		productsError,
		categories,
		isLoadingCategories,
		categoriesError,

		cart,
		discountInputs,
		customer,
		salespersonName,
		dueDateInput,
		paidAmountInput,
		paymentStatus,
		priceTier,
		orderDiscount,
		orderDiscountInput,

		totals,

		lastPostedSale,
		posMessage,
		showSuccessDialog,
		showErrorDialog,
			isSubmittingPayment,

		actions: {
			setCustomer,
			setSalespersonName,
			setDueDateInput,
			setPaidAmountInput,
			setPaymentStatus,
			setOrderDiscount,
			setOrderDiscountInput,
			setShowSuccessDialog,
			setShowErrorDialog,
			closeZonePickDialog,
			confirmAddToCartZone,
			loadZones,
			loadZoneBalances,
			loadProducts,
			loadCategories,
			searchProducts,
			handlePriceTierChange,
			addToCart,
			removeFromCart,
			updateQuantity,
			updateCartItem,
			handleDiscountInputChange,
			handleDiscountInputBlur,
			processPayment,
		},
	}
}
