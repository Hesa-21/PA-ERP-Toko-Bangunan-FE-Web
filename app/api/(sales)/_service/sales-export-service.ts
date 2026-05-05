import { getBranchById } from "@/lib/single-branch"
import { getSales } from "@/lib/server/mock-db"
import { computeSalesTotal } from "@/lib/domain"
import { mapSalesListStatus, type SalesListStatusUi } from "@/lib/domain/sales-analytics"
import { dayKeyJakarta, formatDateIdJakarta, getJakartaDayBoundsMs } from "@/lib/utils/date"

const CSV_FORMULA_PREFIX_RE = /^[\s]*[=+\-@]/

function neutralizeCsvFormula(value: string): string {
  if (!value) return value
  if (!CSV_FORMULA_PREFIX_RE.test(value)) return value
  return `'${value}`
}

function escapeCsvCell(v: string): string {
  const safe = neutralizeCsvFormula(v)
  const needsQuotes = /[";\n\r]/.test(safe)
  const doubled = safe.replace(/"/g, '""')
  return needsQuotes ? `"${doubled}"` : doubled
}

export function buildSalesExportCsv(input: {
  branch: string
  q: string
  statusFilter: SalesListStatusUi | ""
  fromDate: Date
  toDate: Date
}) {
  const branch = getBranchById(input.branch)
  if (!branch) throw new Error("BRANCH_NOT_FOUND")

  const fromBoundaryMs = getJakartaDayBoundsMs(input.fromDate).startMs
  const toBoundaryMs = getJakartaDayBoundsMs(input.toDate).endMs

  const docs = getSales(input.branch)

  const rows = docs
    .map((doc) => {
      const total = computeSalesTotal(doc)
      const status = mapSalesListStatus(doc, total)
      const whenRaw = doc.postedAt ?? doc.createdAt
      const when = new Date(whenRaw)
      const whenMs = Number.isNaN(when.getTime()) ? null : when.getTime()
      const paid = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
      const remaining = Math.max(0, total - paid)

      const paymentMethod = (() => {
        if (doc.paymentStatus === "tunai") return "Tunai"
        if (paid > 0) return "DP"
        return "Tempo"
      })()

      return {
        noTransaksi: doc.id,
        tanggal: formatDateIdJakarta(whenRaw),
        pelanggan: doc.customerName?.trim() || "Walk-in",
        nomorTelepon: (doc.customerPhone ?? "").trim() || "-",
        jumlahItem: doc.items.length,
        total,
        status,
        metodePembayaran: paymentMethod,
        jatuhTempo: doc.paymentStatus === "tempo" && remaining > 0 ? formatDateIdJakarta(doc.dueDate) : "-",
        sales: doc.salespersonName?.trim() || doc.postedBy || doc.createdBy,
        whenMs,
      }
    })
    .filter((r) => {
      if (input.statusFilter && r.status !== input.statusFilter) return false
      if (input.q && !(r.noTransaksi.toLowerCase().includes(input.q) || r.pelanggan.toLowerCase().includes(input.q))) return false
      if (r.whenMs === null) return false
      if (r.whenMs < fromBoundaryMs) return false
      if (r.whenMs > toBoundaryMs) return false
      return true
    })

  const headers = [
    "noTransaksi",
    "tanggal",
    "pelanggan",
    "nomorTelepon",
    "jumlahItem",
    "total",
    "status",
    "metodePembayaran",
    "jatuhTempo",
    "sales",
  ]

  const delimiter = ";"
  const lines: string[] = [headers.join(delimiter)]
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCsvCell(String((row as Record<string, unknown>)[h] ?? ""))).join(delimiter))
  }

  const date = dayKeyJakarta(new Date())
  const filename = `penjualan_${branch.code}_${date}.csv`
  const csv = "\uFEFF" + lines.join("\n")

  return { csv, filename }
}
