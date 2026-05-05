import type { SalesReportViewKey } from "@/app/reports/sales/_lib/sales-report-ui-contract"

export type SalesReportPaymentQueryDto = "cash" | "credit" | ""

export interface SalesReportListQueryDto {
  branchId: string
  from: string
  to: string
  paymentType?: SalesReportPaymentQueryDto
  view?: SalesReportViewKey
  page?: number
  limit?: number
}

export interface SalesReportListItemDto {
  invoiceNo: string
  transactionDate: string
  customerName: string
  supplierName: string
  paymentTypeLabel: "cash" | "credit"
  totalAmount: number
  paidAmount: number
  remainingAmount: number
}

export interface SalesReportListResponseDto {
  items: SalesReportListItemDto[]
  total: number
  page: number
  limit: number
}

export interface SalesReportExportQueryDto {
  branchId: string
  branchCode: string
  from: string
  to: string
  paymentType?: SalesReportPaymentQueryDto
  view?: SalesReportViewKey
}

export interface SalesReportExportResponseDto {
  blob: Blob
  filename: string
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback
}

function asPaymentType(value: unknown): "cash" | "credit" {
  return value === "credit" ? "credit" : "cash"
}

export function parseSalesReportListItemDto(raw: unknown): SalesReportListItemDto {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>

  return {
    invoiceNo: asString(source.invoiceNo, "-"),
    transactionDate: asString(source.transactionDate, ""),
    customerName: asString(source.customerName, "-"),
    supplierName: asString(source.supplierName, "-"),
    paymentTypeLabel: asPaymentType(source.paymentTypeLabel),
    totalAmount: asFiniteNumber(source.totalAmount, 0),
    paidAmount: asFiniteNumber(source.paidAmount, 0),
    remainingAmount: asFiniteNumber(source.remainingAmount, 0),
  }
}

export function parseSalesReportListResponseDto(
  raw: unknown,
  fallback: { page: number; limit: number }
): SalesReportListResponseDto {
  const source = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>
  const rawItems = Array.isArray(source.items) ? source.items : []

  return {
    items: rawItems.map((item) => parseSalesReportListItemDto(item)),
    total: asFiniteNumber(source.total, 0),
    page: asFiniteNumber(source.page, fallback.page),
    limit: asFiniteNumber(source.limit, fallback.limit),
  }
}
