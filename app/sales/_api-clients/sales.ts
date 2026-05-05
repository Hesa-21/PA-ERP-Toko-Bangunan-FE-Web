import { apiFetchBlob, apiFetchJson, apiFetchText } from "@/lib/client/http"
import {
  canExportSalesWithRange,
  normalizeSalesListFilters,
  type SalesStatusUi,
} from "@/app/sales/_lib/sales-query-contract"

export type { SalesStatusUi } from "@/app/sales/_lib/sales-query-contract"

export type SalesListItemDto = {
  id: string
  date: string
  customer: string
  items: number
  customerPhone?: string
  total: number
  paid: number
  remaining: number
  status: SalesStatusUi
  paymentMethod: string
  dueDate: string
  salesperson: string
}

export type SalesSummaryDto = {
  totalRevenue: number
  pendingAmount: number
  totalTransactions: number
}

export type SalesListResult = {
  items: SalesListItemDto[]
  total: number
  page: number
  limit: number
}

export type SalesDetailDto = {
  doc: {
    id: string
    status: "DRAFT" | "POSTED" | "VOID"
    createdAt: string
    postedAt?: string
    customerName?: string
    customerAddress?: string
    customerPhone?: string
    salespersonName?: string
    paymentStatus: "tunai" | "tempo"
    paidAmount: number
    dueDate?: string
    orderDiscount: number
    totals: { total: number; remaining: number }
    items: Array<{ sku: string; name: string; quantity: number; unitPrice: number; discount: number }>
  }
}

export type SalesListQuery = {
  q?: string
  status?: SalesStatusUi | ""
  from?: string
  to?: string
  page?: number
  limit?: number
}

export async function listSales(input: SalesListQuery) {
  const normalized = normalizeSalesListFilters(input)
  const qs = new URLSearchParams()
  const q = normalized.q
  const status = normalized.status
  const from = normalized.from
  const to = normalized.to
  const page = normalized.page
  const limit = normalized.limit
  if (q) qs.set("q", q)
  if (status) qs.set("status", status)
  if (from) qs.set("from", from)
  if (to) qs.set("to", to)
  if (typeof page === "number" && Number.isFinite(page)) qs.set("page", String(page))
  if (typeof limit === "number" && Number.isFinite(limit)) qs.set("limit", String(limit))
  const data = await apiFetchJson<{
    items?: SalesListItemDto[]
    total?: number
    page?: number
    limit?: number
  }>(
    `/api/sales?${qs.toString()}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat penjualan" }
  )

  return {
    items: Array.isArray(data?.items) ? (data.items as SalesListItemDto[]) : [],
    total: typeof data?.total === "number" && Number.isFinite(data.total) ? data.total : 0,
    page: typeof data?.page === "number" && Number.isFinite(data.page) ? data.page : page ?? 1,
    limit: typeof data?.limit === "number" && Number.isFinite(data.limit) ? data.limit : limit ?? 5,
  }
}

export async function getSaleDetail(input: { saleId: string }) {
  const qs = new URLSearchParams()
  return apiFetchJson<SalesDetailDto>(
    `/api/sales/${encodeURIComponent(input.saleId)}?${qs.toString()}`,
    { method: "GET" },
    { defaultErrorMessage: "Gagal memuat detail penjualan" }
  )
}

export async function cancelSale(input: { saleId: string }) {
  const qs = new URLSearchParams()
  await apiFetchJson(
    `/api/sales/${encodeURIComponent(input.saleId)}?${qs.toString()}`,
    { method: "DELETE" },
    { defaultErrorMessage: "Gagal menghapus penjualan" }
  )
}

function filenameFromContentDisposition(value: string | null): string | null {
  if (!value) return null
  const match = value.match(/filename\*=UTF-8''([^;]+)|filename="([^"]+)"|filename=([^;]+)/i)
  const raw = match?.[1] || match?.[2] || match?.[3]
  if (!raw) return null
  try {
    return decodeURIComponent(raw.trim())
  } catch {
    return raw.trim()
  }
}

export type SalesExportResult = {
  blob: Blob
  filename: string
}

export async function exportSales(input: {
  branchCode: string
  q?: string
  status?: SalesStatusUi | ""
  from?: string
  to?: string
}) {
  if (!canExportSalesWithRange({ from: input.from, to: input.to })) {
    throw new Error("Rentang tanggal ekspor tidak valid. Isi Dari dan Sampai dengan benar.")
  }

  const normalized = normalizeSalesListFilters({
    q: input.q,
    status: input.status,
    from: input.from,
    to: input.to,
  })

  const params = new URLSearchParams()
  const q = normalized.q
  if (q) params.set("q", q)
  const status = normalized.status
  if (status) params.set("status", status)
  const from = normalized.from
  const to = normalized.to
  if (from) params.set("from", from)
  if (to) params.set("to", to)

  const { blob, response } = await apiFetchBlob(
    `/api/sales/export?${params.toString()}`,
    { method: "GET" },
    {
      defaultErrorMessage: "Gagal ekspor penjualan",
      acceptHeader: "text/csv,application/octet-stream,*/*",
    }
  )

  const date = new Date().toISOString().slice(0, 10)
  const filename =
    filenameFromContentDisposition(response.headers.get("content-disposition")) ||
    (input.branchCode ? `penjualan_${input.branchCode}_${date}.csv` : `penjualan_${date}.csv`)

  return { blob, filename } as SalesExportResult
}

function buildSalesPrintUrl(input: { saleId: string; withPrice: boolean }) {
  const path = input.withPrice ? "/api/sales/print" : "/api/sales/print-no-price"
  const params = new URLSearchParams({
    saleId: input.saleId,
  })
  return `${path}?${params.toString()}`
}

async function openSalesPrintWindow(input: { saleId: string; withPrice: boolean }): Promise<void> {
  if (typeof window === "undefined") return

  const saleId = (input.saleId ?? "").trim()
  if (!saleId) return

  const url = buildSalesPrintUrl({ saleId, withPrice: input.withPrice })
  const popup = window.open("", "_blank", "width=420,height=700,noopener,noreferrer")

  if (!popup) {
    window.location.href = url
    return
  }

  try {
    const html = await apiFetchText(
      url,
      { method: "GET" },
      {
        defaultErrorMessage: "Gagal memuat halaman cetak penjualan",
        acceptHeader: "text/html,*/*",
      }
    )

    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    popup.focus?.()
  } catch {
    popup.location.href = url
  }
}

export async function openSalePrintWithPrice(input: { saleId: string }): Promise<void> {
  await openSalesPrintWindow({ ...input, withPrice: true })
}

export async function openSalePrintWithoutPrice(input: { saleId: string }): Promise<void> {
  await openSalesPrintWindow({ ...input, withPrice: false })
}
