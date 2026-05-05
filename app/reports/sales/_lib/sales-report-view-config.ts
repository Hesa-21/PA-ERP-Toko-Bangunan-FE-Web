import type { SalesReportViewKey } from "@/app/reports/sales/_lib/sales-report-ui-contract"

export interface SalesReportViewConfig {
  key: SalesReportViewKey
  title: string
  shortLabel: string
  tableColumns: ReadonlyArray<string>
}

export const SALES_REPORT_VIEW_CONFIG: Record<SalesReportViewKey, SalesReportViewConfig> = {
  period: {
    key: "period",
    title: "By Periode",
    shortLabel: "Periode",
    tableColumns: ["No. Transaksi", "Tanggal", "Customer", "Supplier", "Pembayaran", "Total", "Terbayar", "Sisa"],
  },
  customer: {
    key: "customer",
    title: "By Customer",
    shortLabel: "Customer",
    tableColumns: ["Customer", "No. Transaksi", "Tanggal", "Supplier", "Pembayaran", "Total", "Sisa"],
  },
  supplier: {
    key: "supplier",
    title: "By Supplier",
    shortLabel: "Supplier",
    tableColumns: ["Supplier", "No. Transaksi", "Tanggal", "Customer", "Pembayaran", "Total", "Sisa"],
  },
}
