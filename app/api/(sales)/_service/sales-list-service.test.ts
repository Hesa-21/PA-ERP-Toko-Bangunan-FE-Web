import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import * as domain from "@/lib/domain"
import { listSalesMonitoring } from "@/app/api/(sales)/_service/sales-list-service"
import type { SalesListRouteQuery } from "@/app/api/(sales)/_lib/query-contracts"

function makeSalesDoc(input: {
  id: string
  createdAt: string
  customerName: string
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
    customerPhone: "0812",
    salespersonName: "Kasir A",
    paymentStatus: input.paymentStatus ?? "tunai",
    paidAmount: input.paidAmount ?? 100,
    dueDate: undefined,
    orderDiscount: 0,
    createdBy: "Kasir A",
    postedBy: "Kasir A",
    items: [],
  }
}

const baseQuery: SalesListRouteQuery = {
  branch: "b_1",
  scope: "",
  q: "",
  statusFilter: "",
  fromDate: null,
  toDate: null,
  pageRaw: 1,
  limitRaw: 5,
  invalidScopeParam: false,
  invalidStatusParam: false,
  invalidFromParam: false,
  invalidToParam: false,
  invalidPageParam: false,
  invalidLimitParam: false,
  dateRangeInvalid: false,
}

describe("sales list service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns bounded page slice with explicit limit", () => {
    const totalSpy = vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeSalesDoc({ id: "S-1", createdAt: "2026-04-01T08:00:00.000Z", customerName: "A" }),
        makeSalesDoc({ id: "S-2", createdAt: "2026-04-01T08:01:00.000Z", customerName: "B" }),
        makeSalesDoc({ id: "S-3", createdAt: "2026-04-01T08:02:00.000Z", customerName: "C" }),
        makeSalesDoc({ id: "S-4", createdAt: "2026-04-01T08:03:00.000Z", customerName: "D" }),
        makeSalesDoc({ id: "S-5", createdAt: "2026-04-01T08:04:00.000Z", customerName: "E" }),
        makeSalesDoc({ id: "S-6", createdAt: "2026-04-01T08:05:00.000Z", customerName: "F" }),
      ] as never
    )

    const result = listSalesMonitoring({
      ...baseQuery,
      pageRaw: 2,
      limitRaw: 2,
    })

    expect(result.total).toBe(6)
    expect(result.page).toBe(2)
    expect(result.limit).toBe(2)
    expect(result.items).toHaveLength(2)
    expect(result.items.map((item) => item.id)).toEqual(["S-3", "S-4"])
    expect(totalSpy).toHaveBeenCalledTimes(2)
  })

  it("filters by status and search term", () => {
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeSalesDoc({ id: "S-PAID", createdAt: "2026-04-01T08:00:00.000Z", customerName: "PT Maju" }),
        makeSalesDoc({
          id: "S-PENDING",
          createdAt: "2026-04-01T08:01:00.000Z",
          customerName: "PT Makmur",
          paymentStatus: "tempo",
          paidAmount: 0,
        }),
      ] as never
    )

    const result = listSalesMonitoring({
      ...baseQuery,
      statusFilter: "Pending",
      q: "makmur",
      limitRaw: 5,
    })

    expect(result.total).toBe(1)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe("S-PENDING")
    expect(result.items[0]?.status).toBe("Pending")
  })

  it("applies Jakarta day boundaries for from/to date filters", () => {
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeSalesDoc({ id: "S-BEFORE", createdAt: "2026-04-01T16:59:59.999Z", customerName: "Before" }),
        makeSalesDoc({ id: "S-START", createdAt: "2026-04-01T17:00:00.000Z", customerName: "Start" }),
        makeSalesDoc({ id: "S-END", createdAt: "2026-04-02T16:59:59.999Z", customerName: "End" }),
        makeSalesDoc({ id: "S-AFTER", createdAt: "2026-04-02T17:00:00.000Z", customerName: "After" }),
      ] as never
    )

    const result = listSalesMonitoring({
      ...baseQuery,
      fromDate: new Date(2026, 3, 2),
      toDate: new Date(2026, 3, 2),
      limitRaw: 10,
    })

    expect(result.total).toBe(2)
    expect(result.items.map((item) => item.id)).toEqual(["S-START", "S-END"])
  })

  it("formats list date using Jakarta timezone", () => {
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [makeSalesDoc({ id: "S-DATE", createdAt: "2026-04-01T18:00:00.000Z", customerName: "Tanggal" })] as never
    )

    const result = listSalesMonitoring({
      ...baseQuery,
      limitRaw: 10,
    })

    const expected = new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta" }).format(
      new Date("2026-04-01T18:00:00.000Z")
    )

    expect(result.items[0]?.date).toBe(expected)
  })
})