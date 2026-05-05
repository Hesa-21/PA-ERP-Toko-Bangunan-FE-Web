import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { useSalesReportController } from "@/app/reports/sales/_hooks/use-sales-report-controller"
const replaceSpy = vi.fn()
let searchParamsRaw = ""
let searchParams = new URLSearchParams()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceSpy,
  }),
  usePathname: () => "/reports/sales",
  useSearchParams: () => searchParams,
}))

vi.mock("@/hooks/use-active-branch", () => ({
  useActiveBranch: () => ({
    selectedBranch: { id: "branch-a", code: "cabang-a" },
  }),
}))

vi.mock("@/app/reports/sales/_hooks/use-sales-report-data", () => ({
  useSalesReportData: vi.fn((input: { query: { page?: number } }) => ({
    table: {
      rows: [],
      total: 0,
      page: input.query.page ?? 1,
      totalPages: input.query.page ?? 1,
    },
    isLoading: false,
    isFetching: false,
    error: "",
    isEmpty: true,
    hasLoaded: true,
    refetch: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn(),
  })),
}))

vi.mock("@/app/reports/sales/_hooks/use-sales-report-export", () => ({
  useSalesReportExport: vi.fn(() => ({
    isExporting: false,
    exportError: "",
    exportReport: vi.fn().mockResolvedValue({ blob: new Blob([]), filename: "x.csv" }),
    cancelExport: vi.fn(),
  })),
}))

describe("useSalesReportController URI sync", () => {
  beforeEach(() => {
    searchParamsRaw = ""
    searchParams = new URLSearchParams(searchParamsRaw)
    replaceSpy.mockReset()
  })

  it("hydrates applied filters/view/page from URL", async () => {
    searchParamsRaw = "from=2026-03-01&to=2026-03-08&payment=credit&view=customer&page=2"
    searchParams = new URLSearchParams(searchParamsRaw)

    const { result } = renderHook(() => useSalesReportController())

    await waitFor(() => {
      expect(result.current.filters.applied.periodFrom).toBe("2026-03-01")
    })

    expect(result.current.filters.applied.paymentType).toBe("credit")
    expect(result.current.filters.activeView).toBe("customer")
    expect(result.current.data.page).toBe(2)
    expect(result.current.data.hasApplied).toBe(true)
  })

  it("falls back to initial state when URL range is invalid", async () => {
    searchParamsRaw = "from=2026-03-10&to=2026-03-08&payment=cash&view=supplier&page=3"
    searchParams = new URLSearchParams(searchParamsRaw)

    const { result } = renderHook(() => useSalesReportController())

    await waitFor(() => {
      expect(result.current.data.hasApplied).toBe(false)
    })

    expect(result.current.filters.applied.periodFrom).toBe("")
    expect(result.current.filters.applied.periodTo).toBe("")
    expect(result.current.filters.applied.paymentType).toBe("all")
    expect(result.current.filters.activeView).toBe("supplier")
  })
})
