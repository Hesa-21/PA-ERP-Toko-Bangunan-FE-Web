import type { SalesReportListItemDto, SalesReportListResponseDto } from "@/app/reports/sales/_api-clients/sales-report.types"
import { formatIDR } from "@/lib/utils/number"

export interface SalesReportRowModel {
  invoiceNo: string
  transactionDateText: string
  customerName: string
  supplierName: string
  paymentTypeText: "Cash" | "Kredit"
  totalAmountText: string
  paidAmountText: string
  remainingAmountText: string
}

export interface SalesReportTableModel {
  rows: SalesReportRowModel[]
  total: number
  page: number
  limit: number
  totalPages: number
}

function toDateText(input: string): string {
  if (!input) return "-"
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return "-"
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function toPaymentText(input: SalesReportListItemDto["paymentTypeLabel"]): "Cash" | "Kredit" {
  return input === "credit" ? "Kredit" : "Cash"
}

export function mapSalesReportRowModel(dto: SalesReportListItemDto): SalesReportRowModel {
  return {
    invoiceNo: dto.invoiceNo,
    transactionDateText: toDateText(dto.transactionDate),
    customerName: dto.customerName,
    supplierName: dto.supplierName,
    paymentTypeText: toPaymentText(dto.paymentTypeLabel),
    totalAmountText: formatIDR(dto.totalAmount),
    paidAmountText: formatIDR(dto.paidAmount),
    remainingAmountText: formatIDR(dto.remainingAmount),
  }
}

export function mapSalesReportTableModel(dto: SalesReportListResponseDto): SalesReportTableModel {
  const safeLimit = dto.limit > 0 ? dto.limit : 20
  const safeTotal = Math.max(0, dto.total)
  const totalPages = Math.max(1, Math.ceil(safeTotal / safeLimit))
  const safePage = Math.min(Math.max(1, dto.page), totalPages)

  return {
    rows: dto.items.map((item) => mapSalesReportRowModel(item)),
    total: safeTotal,
    page: safePage,
    limit: safeLimit,
    totalPages,
  }
}
