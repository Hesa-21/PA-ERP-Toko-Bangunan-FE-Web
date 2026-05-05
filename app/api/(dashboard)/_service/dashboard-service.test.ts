import { afterEach, describe, expect, it, vi } from "vitest"
import * as domain from "@/lib/domain"
import * as mockDb from "@/lib/server/mock-db"
import { buildDashboardRecent, buildDashboardSnapshot } from "@/app/api/(dashboard)/_service/dashboard-service"

describe("dashboard service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("returns recent date in ISO datetime format", () => {
    const postedAt = "2026-04-04T17:30:00.000Z"

    vi.spyOn(mockDb, "getSales").mockReturnValue([
      {
        id: "SALE-1",
        postedAt,
        createdAt: postedAt,
        status: "POSTED",
        paymentStatus: "tunai",
        customerName: "Pelanggan A",
        items: [{ id: "line-1" }],
      } as unknown as ReturnType<typeof mockDb.getSales>[number],
    ])

    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(125_000)

    const result = buildDashboardRecent({
      branch: "branch-1",
      scope: "",
      limit: 10,
    })

    const expectedDate = new Date(postedAt).toISOString()

    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.date).toBe(expectedDate)
  })

  it("does not include removed legacy fields in recent payload", () => {
    const postedAt = "2026-04-04T17:30:00.000Z"

    vi.spyOn(mockDb, "getSales").mockReturnValue([
      {
        id: "SALE-2",
        postedAt,
        createdAt: postedAt,
        status: "POSTED",
        paymentStatus: "tunai",
        customerName: "Pelanggan B",
        items: [{ id: "line-1" }],
      } as unknown as ReturnType<typeof mockDb.getSales>[number],
    ])

    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(50_000)

    const result = buildDashboardRecent({
      branch: "branch-1",
      scope: "",
      limit: 10,
    })

    const item = result.items[0] as Record<string, unknown>
    expect("customerPhone" in item).toBe(false)
    expect("paid" in item).toBe(false)
    expect("remaining" in item).toBe(false)
    expect("paymentMethod" in item).toBe(false)
    expect("dueDate" in item).toBe(false)
    expect("salesperson" in item).toBe(false)
  })

  it("builds snapshot with a single sales read", () => {
    const postedAt = new Date().toISOString()
    const getSalesSpy = vi.spyOn(mockDb, "getSales").mockReturnValue([
      {
        id: "SALE-3",
        postedAt,
        createdAt: postedAt,
        status: "POSTED",
        paymentStatus: "tunai",
        customerName: "Pelanggan C",
        items: [{ id: "line-1" }],
      } as unknown as ReturnType<typeof mockDb.getSales>[number],
    ])

    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(90_000)

    const snapshot = buildDashboardSnapshot({
      branch: "branch-1",
      scope: "today",
      limit: 10,
    })

    expect(getSalesSpy).toHaveBeenCalledTimes(1)
    expect(snapshot.summary.totalTransactions).toBe(1)
    expect(snapshot.recent.items).toHaveLength(1)
    expect(snapshot.weekly).toHaveLength(7)
  })

  it("materializes only top-limit recent items while preserving total count", () => {
    const docs = Array.from({ length: 50 }, (_, idx) => {
      const postedAt = new Date(Date.UTC(2026, 3, 1, 8, idx, 0)).toISOString()
      return {
        id: `SALE-${idx}`,
        postedAt,
        createdAt: postedAt,
        status: "POSTED",
        paymentStatus: "tunai",
        customerName: `Pelanggan ${idx}`,
        items: [{ id: `line-${idx}` }],
      } as unknown as ReturnType<typeof mockDb.getSales>[number]
    })

    vi.spyOn(mockDb, "getSales").mockReturnValue(docs)
    const totalSpy = vi.spyOn(domain, "computeSalesTotal").mockReturnValue(75_000)

    const result = buildDashboardRecent({
      branch: "branch-1",
      scope: "",
      limit: 5,
    })

    expect(result.total).toBe(50)
    expect(result.limit).toBe(5)
    expect(result.items).toHaveLength(5)
    expect(totalSpy).toHaveBeenCalledTimes(5)
    expect(result.items.map((item) => item.id)).toEqual(["SALE-49", "SALE-48", "SALE-47", "SALE-46", "SALE-45"])
  })
})
