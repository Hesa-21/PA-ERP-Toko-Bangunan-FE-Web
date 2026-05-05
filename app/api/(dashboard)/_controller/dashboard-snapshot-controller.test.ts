import { afterEach, describe, expect, it, vi } from "vitest"
import * as dashboardAuth from "@/app/api/(dashboard)/_lib/auth"
import * as dashboardService from "@/app/api/(dashboard)/_service/dashboard-service"
import { handleDashboardSnapshotGet } from "@/app/api/(dashboard)/_controller/dashboard-snapshot-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Owner",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Owner",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

describe("dashboard snapshot controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid scope with bad request", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    const ensureSpy = vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardSnapshot")

    const response = await handleDashboardSnapshotGet(
      new Request("https://example.com/api/dashboard/snapshot?branch=branch-1&scope=wrong")
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toContain("scope")
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(serviceSpy).not.toHaveBeenCalled()
  })

  it("returns snapshot payload for valid request", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardSnapshot").mockReturnValue({
      summary: {
        totalRevenue: 120_000,
        pendingAmount: 10_000,
        totalTransactions: 2,
      },
      recent: {
        items: [],
        total: 0,
        page: 1,
        limit: 10,
      },
      weekly: [],
    })

    const response = await handleDashboardSnapshotGet(
      new Request("https://example.com/api/dashboard/snapshot?branch=branch-1&scope=today&limit=10")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const payload = (await response.json()) as {
      summary: { totalRevenue: number }
      recent: { limit: number }
      weekly: unknown[]
    }

    expect(payload.summary.totalRevenue).toBe(120_000)
    expect(payload.recent.limit).toBe(10)

    expect(serviceSpy).toHaveBeenCalledWith({
      branch: "b_1",
      scope: "today",
      limit: 10,
    })
  })
})
