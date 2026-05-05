import { afterEach, describe, expect, it, vi } from "vitest"
import * as dashboardAuth from "@/app/api/(dashboard)/_lib/auth"
import * as dashboardService from "@/app/api/(dashboard)/_service/dashboard-service"
import { handleDashboardRecentGet } from "@/app/api/(dashboard)/_controller/dashboard-recent-controller"

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
        provider: "jwt" as const,
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

describe("dashboard recent controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects invalid limit query before branch access check", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)

    const ensureSpy = vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess")
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardRecent")

    const response = await handleDashboardRecentGet(
      new Request("https://example.com/api/dashboard/recent?branch=branch-1&limit=0")
    )

    expect(response.status).toBe(400)
    expect(ensureSpy).not.toHaveBeenCalled()
    expect(serviceSpy).not.toHaveBeenCalled()

    const payload = (await response.json()) as {
      error?: {
        message?: string
      }
    }

    expect(payload.error?.message).toContain("limit")
  })

  it("returns recent payload for valid request", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)

    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardRecent").mockReturnValue({
      items: [
        {
          id: "INV-1",
          date: "2026-04-07T10:00:00.000Z",
          customer: "PT Maju",
          items: 2,
          total: 150_000,
          status: "Paid",
        },
      ],
      total: 1,
      page: 1,
      limit: 5,
    })

    const response = await handleDashboardRecentGet(
      new Request("https://example.com/api/dashboard/recent?branch=branch-1&scope=today&limit=5")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const payload = (await response.json()) as {
      items?: Array<{ id?: string; date?: string }>
      total?: number
      limit?: number
    }

    expect(payload.total).toBe(1)
    expect(payload.limit).toBe(5)
    expect(payload.items?.[0]?.id).toBe("INV-1")
    expect(payload.items?.[0]?.date).toBe("2026-04-07T10:00:00.000Z")

    expect(serviceSpy).toHaveBeenCalledWith({
      branch: "b_1",
      scope: "today",
      limit: 5,
    })
  })
})
