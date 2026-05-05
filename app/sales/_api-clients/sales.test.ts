import { afterEach, describe, expect, it, vi } from "vitest"
import {
  exportSales,
  openSalePrintWithPrice,
  openSalePrintWithoutPrice,
} from "@/app/sales/_api-clients/sales"

describe("sales api client", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("exports sales CSV via API endpoint and resolves filename", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("id;total\nS-1;100", {
        status: 200,
        headers: {
          "content-type": "text/csv",
          "content-disposition": 'attachment; filename="penjualan_test.csv"',
        },
      })
    )

    const result = await exportSales({
      branchCode: "CBG",
      from: "2026-04-01",
      to: "2026-04-02",
      status: "Paid",
    })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/sales/export?")
    expect(result.filename).toBe("penjualan_test.csv")
    expect(result.blob).toBeDefined()
  })

  it("rejects export when date range is incomplete", async () => {
    await expect(
      exportSales({
        branchCode: "CBG",
        from: "2026-04-01",
        to: "",
      })
    ).rejects.toThrow("Rentang tanggal ekspor tidak valid")
  })

  it("opens price print preview through API client flow", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>print-ok</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    )

    const docOpen = vi.fn()
    const docWrite = vi.fn()
    const docClose = vi.fn()
    const focus = vi.fn()
    const popup = {
      document: { open: docOpen, write: docWrite, close: docClose },
      focus,
      location: { href: "" },
    } as unknown as Window

    vi.spyOn(window, "open").mockReturnValue(popup)

    await openSalePrintWithPrice({ saleId: "S-1" })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const [url] = fetchSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/sales/print?")
    expect(docOpen).toHaveBeenCalledTimes(1)
    expect(docWrite).toHaveBeenCalledWith("<html>print-ok</html>")
    expect(docClose).toHaveBeenCalledTimes(1)
    expect(focus).toHaveBeenCalledTimes(1)
  })

  it("opens no-price print preview through API client flow", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>print-noprice</html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      })
    )

    const popup = {
      document: { open: vi.fn(), write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      location: { href: "" },
    } as unknown as Window

    vi.spyOn(window, "open").mockReturnValue(popup)

    await openSalePrintWithoutPrice({ saleId: "S-2" })

    const [url] = fetchSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/sales/print-no-price?")
  })
})
