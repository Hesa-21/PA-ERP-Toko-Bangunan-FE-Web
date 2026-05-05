import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSalesController } from "@/app/sales/_hooks/use-sales-controller"

const selectedBranch = { id: "branch-a", code: "CAB-A" }
const userState = { role: "owner" }
const useSalesMock = vi.fn()

type UseSalesInput = {
  branchId: string
  query?: {
    q?: string
    status?: string
    from?: string
    to?: string
    page?: number
    limit?: number
  }
}

vi.mock("@/hooks/use-active-branch", () => ({
  useActiveBranch: () => ({ selectedBranch }),
}))

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ user: userState }),
}))

vi.mock("@/app/sales/_hooks/use-sales", () => ({
  useSales: (input: unknown) => useSalesMock(input),
}))

function makeUseSalesState(overrides: Record<string, unknown> = {}) {
  return {
    salesData: [],
    total: 0,
    page: 1,
    limit: 5,
    isLoading: false,
    loadError: "",
    loadSaleDetail: vi.fn(),
    cancelSale: vi.fn().mockResolvedValue(undefined),
    downloadExport: vi.fn().mockResolvedValue(undefined),
    openPrint: vi.fn().mockResolvedValue(undefined),
    openPrintNoPrice: vi.fn().mockResolvedValue(undefined),
    reloadAll: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("useSalesController", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    selectedBranch.id = "branch-a"
    selectedBranch.code = "CAB-A"
    userState.role = "owner"
  })

  it("resets page to 1 when filters change", () => {
    useSalesMock.mockImplementation(() => makeUseSalesState())

    const { result } = renderHook(() => useSalesController())

    act(() => {
      result.current.actions.setPage(3)
    })

    let latestInput = useSalesMock.mock.calls.at(-1)?.[0] as UseSalesInput
    expect(latestInput.query?.page).toBe(3)

    act(() => {
      result.current.actions.handleSearchChange("INV-2026-1")
    })

    latestInput = useSalesMock.mock.calls.at(-1)?.[0] as UseSalesInput
    expect(latestInput.query?.q).toBe("INV-2026-1")
    expect(latestInput.query?.page).toBe(1)
  })

  it("shows export error when branch code is missing", async () => {
    selectedBranch.code = ""
    const downloadExport = vi.fn().mockResolvedValue(undefined)
    useSalesMock.mockImplementation(() => makeUseSalesState({ downloadExport }))

    const { result } = renderHook(() => useSalesController())

    await act(async () => {
      await result.current.actions.handleExport()
    })

    expect(downloadExport).not.toHaveBeenCalled()
    expect(result.current.data.exportError).toBe("Cabang tidak valid untuk ekspor.")
  })

  it("delegates print actions to sales hook actions", async () => {
    const openPrint = vi.fn().mockResolvedValue(undefined)
    const openPrintNoPrice = vi.fn().mockResolvedValue(undefined)

    useSalesMock.mockImplementation(() =>
      makeUseSalesState({
        openPrint,
        openPrintNoPrice,
      })
    )

    const { result } = renderHook(() => useSalesController())

    await act(async () => {
      await result.current.actions.handlePrint("S-1")
      await result.current.actions.handlePrintNoPrice("S-1")
    })

    expect(openPrint).toHaveBeenCalledWith("S-1")
    expect(openPrintNoPrice).toHaveBeenCalledWith("S-1")
  })
})
