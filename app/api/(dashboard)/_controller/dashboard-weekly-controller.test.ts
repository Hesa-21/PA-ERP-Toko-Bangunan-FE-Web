import { afterEach, describe, expect, it, vi } from "vitest"
import * as dashboardAuth from "@/app/api/(dashboard)/_lib/auth"
import * as dashboardService from "@/app/api/(dashboard)/_service/dashboard-service"
import { handleDashboardWeeklyGet } from "@/app/api/(dashboard)/_controller/dashboard-weekly-controller"

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

describe("dashboard weekly controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses central branch even when query branch is missing", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)

    const ensureSpy = vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)
    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardWeekly").mockReturnValue([])

    const response = await handleDashboardWeeklyGet(new Request("https://example.com/api/dashboard/weekly"))

    expect(response.status).toBe(200)
    expect(ensureSpy).toHaveBeenCalledWith(expect.anything(), "b_1")
    expect(serviceSpy).toHaveBeenCalledWith({ branch: "b_1" })
  })

  it("returns weekly payload for valid request", async () => {
    vi.spyOn(dashboardAuth, "requireDashboardReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(dashboardAuth, "ensureDashboardBranchAccess").mockReturnValue(null)

    const serviceSpy = vi.spyOn(dashboardService, "buildDashboardWeekly").mockReturnValue([
      { day: "Sen", sales: 1.2, amount: 1_200_000 },
      { day: "Sel", sales: 0.9, amount: 900_000 },
    ])

    const response = await handleDashboardWeeklyGet(
      new Request("https://example.com/api/dashboard/weekly?branch=branch-1")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")

    const payload = (await response.json()) as Array<{ day?: string; amount?: number }>
    expect(payload).toHaveLength(2)
    expect(payload[0]?.day).toBe("Sen")
    expect(payload[0]?.amount).toBe(1_200_000)

    expect(serviceSpy).toHaveBeenCalledWith({
      branch: "b_1",
    })
  })
})
