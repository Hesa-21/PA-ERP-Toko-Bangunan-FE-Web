import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import * as domain from "@/lib/domain"
import * as dateUtils from "@/lib/utils/date"
import { buildSalesSummary, buildSalesWeekly } from "@/app/api/(sales)/_service/sales-analytics-service"

function makeDoc(input: {
  id: string
  status: "DRAFT" | "POSTED" | "VOID"
  createdAt: string
  postedAt?: string
  paymentStatus?: "tunai" | "tempo"
  paidAmount?: number
}) {
  return {
    id: input.id,
    branch: "b_1",
    status: input.status,
    createdAt: input.createdAt,
    postedAt: input.postedAt,
    customerName: "PT Maju",
    customerPhone: "0812",
    salespersonName: "Kasir A",
    paymentStatus: input.paymentStatus ?? "tunai",
    paidAmount: input.paidAmount ?? 0,
    dueDate: undefined,
    orderDiscount: 0,
    createdBy: "Kasir A",
    postedBy: "Kasir A",
    items: [{ id: "line-1", sku: "SKU-1", quantity: 1, unitPrice: 100, discount: 0 }],
  }
}

describe("sales analytics service", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("builds summary totals with paid and pending split", () => {
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeDoc({ id: "S-PAID", status: "POSTED", createdAt: "2026-04-08T10:00:00.000Z", paymentStatus: "tunai" }),
        makeDoc({
          id: "S-PENDING",
          status: "POSTED",
          createdAt: "2026-04-08T11:00:00.000Z",
          paymentStatus: "tempo",
          paidAmount: 40,
        }),
        makeDoc({ id: "S-VOID", status: "VOID", createdAt: "2026-04-08T12:00:00.000Z", paymentStatus: "tunai" }),
      ] as never
    )

    vi.spyOn(domain, "computeSalesTotal").mockImplementation((doc) => {
      const id = (doc as { id?: string }).id
      if (id === "S-VOID") return 999
      return 100
    })

    const result = buildSalesSummary({ branch: "b_1", scope: "" })

    expect(result.totalRevenue).toBe(200)
    expect(result.pendingAmount).toBe(60)
    expect(result.totalTransactions).toBe(2)
  })

  it("applies today scope using Jakarta day matcher", () => {
    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeDoc({ id: "S-TODAY", status: "POSTED", createdAt: "2026-04-08T10:00:00.000Z", paymentStatus: "tunai" }),
        makeDoc({ id: "S-OLD", status: "POSTED", createdAt: "2026-04-06T10:00:00.000Z", paymentStatus: "tunai" }),
      ] as never
    )

    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(100)
    vi.spyOn(dateUtils, "isTodayJakarta").mockImplementation((iso) => String(iso).includes("2026-04-08"))

    const result = buildSalesSummary({ branch: "b_1", scope: "today" })

    expect(result.totalRevenue).toBe(100)
    expect(result.pendingAmount).toBe(0)
    expect(result.totalTransactions).toBe(1)
  })

  it("builds weekly points and excludes cancelled docs", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-08T12:00:00.000Z"))

    vi.spyOn(mockDb, "getSales").mockReturnValue(
      [
        makeDoc({ id: "S-1", status: "POSTED", createdAt: "2026-04-08T01:00:00.000Z" }),
        makeDoc({ id: "S-2", status: "POSTED", createdAt: "2026-04-07T01:00:00.000Z" }),
        makeDoc({ id: "S-CANCELLED", status: "VOID", createdAt: "2026-04-07T02:00:00.000Z" }),
      ] as never
    )

    vi.spyOn(domain, "computeSalesTotal").mockImplementation((doc) => {
      const id = (doc as { id?: string }).id
      if (id === "S-1") return 100
      if (id === "S-2") return 200
      return 999
    })

    const points = buildSalesWeekly({ branch: "b_1" })

    expect(points).toHaveLength(7)
    const totalAmount = points.reduce((sum, point) => sum + point.amount, 0)
    expect(totalAmount).toBe(300)
  })
})
