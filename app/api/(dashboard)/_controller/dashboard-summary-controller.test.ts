import { afterEach, describe, expect, it, vi } from "vitest"
import * as dashboardAuth from "@/app/api/(dashboard)/_lib/auth"
import * as dashboardService from "@/app/api/(dashboard)/_service/dashboard-service"
import { handleDashboardSummaryGet } from "@/app/api/(dashboard)/_controller/dashboard-summary-controller"

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

describe("dashboard summary controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid scope with bad request", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    const ensureSpy = vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardSummary")

    const response = await handleDashboardSummaryGet(
      new Request("https://example.com/api/dashboard/summary?branch=branch-1&scope=bad-scope")
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toContain("scope")
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(serviceSpy).not.toHaveBeenCalled()
  })

  it("returns summary payload for valid scope", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardSummary").mockReturnValue({
      totalRevenue: 100_000,
      pendingAmount: 20_000,
      totalTransactions: 3,
    })

    const response = await handleDashboardSummaryGet(
      new Request("https://example.com/api/dashboard/summary?branch=branch-1&scope=today")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const payload = (await response.json()) as {
      totalRevenue: number
      pendingAmount: number
      totalTransactions: number
    }

    expect(payload).toEqual({
      totalRevenue: 100_000,
      pendingAmount: 20_000,
      totalTransactions: 3,
    })

    expect(serviceSpy).toHaveBeenCalledWith({
      branch: "b_1",
      scope: "today",
    })
  })
})
