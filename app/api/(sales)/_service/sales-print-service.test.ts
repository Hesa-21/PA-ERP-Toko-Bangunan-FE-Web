import { afterEach, describe, expect, it, vi } from "vitest"
import * as salesPrintRenderer from "@/lib/server/print/sales"
import { renderSalePrint } from "@/app/api/(sales)/_service/sales-print-service"

describe("sales print service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates HTML rendering to print renderer", () => {
    const spy = vi.spyOn(salesPrintRenderer, "renderSalesPrintHtml").mockReturnValue("<html>print-view</html>" as never)

    const html = renderSalePrint({
      branch: "b_1",
      saleId: "S-1",
      withPrice: false,
    })

    expect(spy).toHaveBeenCalledWith({
      branchId: "b_1",
      saleId: "S-1",
      withPrice: false,
    })
    expect(html).toContain("print-view")
  })
})
