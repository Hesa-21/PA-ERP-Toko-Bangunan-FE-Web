import type { SalesStatusUi } from "@/app/sales/_api-clients/sales"

export function getSalesStatusLabel(status: SalesStatusUi): string {
  if (status === "Paid") return "Lunas"
  if (status === "Pending") return "Belum Lunas"
  if (status === "Cancelled") return "Dibatalkan"
  if (status === "Draft") return "Draf"
  if (status === "Confirmed") return "Terkonfirmasi"
  return status
}

export function getSalesStatusBadge(status: SalesStatusUi): string {
  const variants: Record<SalesStatusUi, string> = {
    Draft: "bg-gray-100 text-gray-800 border-gray-200",
    Confirmed: "bg-blue-100 text-blue-800 border-blue-200",
    Paid: "bg-green-100 text-green-800 border-green-200",
    Pending: "bg-orange-100 text-orange-800 border-orange-200",
    Cancelled: "bg-red-100 text-red-800 border-red-200",
  }

  return variants[status] || variants.Draft
}

export function toDateString(iso: string | undefined): string {
  if (!iso) return "-"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "-"
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export function getSalesDocStatusLabel(status: "DRAFT" | "POSTED" | "VOID"): string {
  if (status === "DRAFT") return "Draf"
  if (status === "POSTED") return "Terkonfirmasi"
  if (status === "VOID") return "Dibatalkan"
  return status
}
