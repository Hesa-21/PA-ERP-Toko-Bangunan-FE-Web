import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import * as domain from "@/lib/domain"
import * as branches from "@/lib/single-branch"
import { buildSalesExportCsv } from "@/app/api/(sales)/_service/sales-export-service"

function makeSalesDoc(input: {
  id: string
  createdAt: string
  customerName: string
  customerPhone?: string
  salespersonName?: string
  status?: "DRAFT" | "POSTED" | "VOID"
  paymentStatus?: "tunai" | "tempo"
  paidAmount?: number
}) {
  return {
    id: input.id,
    branch: "b_1",
    status: input.status ?? "POSTED",
    createdAt: input.createdAt,
    postedAt: input.createdAt,
    customerName: input.customerName,
    customerPhone: input.customerPhone ?? "0812",
    salespersonName: input.salespersonName ?? "Kasir A",
    paymentStatus: input.paymentStatus ?? "tunai",
    paidAmount: input.paidAmount ?? 100,
    dueDate: undefined,
    orderDiscount: 0,
    createdBy: "Kasir A",
    postedBy: "Kasir A",
    items: [{ id: "line-1" }],
  }
}

describe("sales export service", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("neutralizes potential spreadsheet formulas in CSV cells", () => {
    vi.spyOn(branches, "getBranchById").mockReturnValue({ id: "b_1", code: "CBG" } as never)
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeSalesDoc({
          id: "=TX-1",
          createdAt: "2026-04-02T08:00:00.000Z",
          customerName: "@Pelanggan",
          customerPhone: "+62812345",
          salespersonName: "-Kasir",
        }),
      ] as never
    )

    const result = buildSalesExportCsv({
      branch: "b_1",
      q: "",
      statusFilter: "",
      fromDate: new Date(2026, 3, 2),
      toDate: new Date(2026, 3, 2),
    })

    expect(result.csv).toContain("'=TX-1")
    expect(result.csv).toContain("'@Pelanggan")
    expect(result.csv).toContain("'+62812345")
    expect(result.csv).toContain("'-Kasir")
  })

  it("uses Jakarta date boundaries and filename date", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-01T20:00:00.000Z"))

    vi.spyOn(branches, "getBranchById").mockReturnValue({ id: "b_1", code: "CBG" } as never)
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeSalesDoc({ id: "S-BEFORE", createdAt: "2026-04-01T16:59:59.999Z", customerName: "Before" }),
        makeSalesDoc({ id: "S-START", createdAt: "2026-04-01T17:00:00.000Z", customerName: "Start" }),
        makeSalesDoc({ id: "S-END", createdAt: "2026-04-02T16:59:59.999Z", customerName: "End" }),
        makeSalesDoc({ id: "S-AFTER", createdAt: "2026-04-02T17:00:00.000Z", customerName: "After" }),
      ] as never
    )

    const result = buildSalesExportCsv({
      branch: "b_1",
      q: "",
      statusFilter: "",
      fromDate: new Date(2026, 3, 2),
      toDate: new Date(2026, 3, 2),
    })

    expect(result.filename).toBe("penjualan_CBG_2026-04-02.csv")

    const lines = result.csv.replace(/^\uFEFF/, "").split("\n")
    expect(lines).toHaveLength(3)
    expect(lines[1]).toContain("S-START")
    expect(lines[2]).toContain("S-END")
  })
})