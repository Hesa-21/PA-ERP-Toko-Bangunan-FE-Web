import { beforeEach, describe, expect, it, vi } from "vitest"
import * as httpClient from "@/lib/client/http"
import { fetchDashboardRecent, fetchDashboardSnapshotData } from "@/app/dashboard/_api-clients/dashboard"

describe("dashboard api client contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("builds recent query with safe limit clamp and normalizes empty payload", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson").mockResolvedValue({} as never)

    const result = await fetchDashboardRecent({
      scope: "today",
      limit: 999,
      baseUrl: "https://example.com",
      cookieHeader: "mock_session=abc",
    })

    expect(apiSpy).toHaveBeenCalledTimes(1)

    const [url, init] = apiSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("https://example.com/api/dashboard/recent?")
    expect(String(url)).toContain("scope=today")
    expect(String(url)).toContain("limit=200")

    expect(init).toEqual(
      expect.objectContaining({
        method: "GET",
        headers: { cookie: "mock_session=abc" },
      })
    )

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
    })
  })

  it("normalizes snapshot payload fields from partial API response", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson").mockResolvedValue({
      summary: { totalRevenue: 120000 },
      recent: { total: 2 },
      weekly: [{ day: "Sen", sales: 1.2, amount: 1200000 }],
    } as never)

    const result = await fetchDashboardSnapshotData({
      scope: "today",
      limit: 300,
    })

    expect(apiSpy).toHaveBeenCalledTimes(1)

    const [url] = apiSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/dashboard/snapshot?")
    expect(String(url)).toContain("limit=200")

    expect(result).toEqual({
      summary: {
        totalRevenue: 120000,
        pendingAmount: 0,
        totalTransactions: 0,
      },
      recent: {
        items: [],
        total: 2,
        page: 1,
        limit: 10,
      },
      weekly: [{ day: "Sen", sales: 1.2, amount: 1200000 }],
    })
  })
})
