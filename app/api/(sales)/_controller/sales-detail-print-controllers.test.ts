import { afterEach, describe, expect, it, vi } from "vitest"
import * as salesAuth from "@/app/api/(sales)/_lib/auth"
import * as salesDetailService from "@/app/api/(sales)/_service/sales-detail-service"
import * as salesPrintService from "@/app/api/(sales)/_service/sales-print-service"
import { handleSaleDetailDelete, handleSaleDetailGet } from "@/app/api/(sales)/_controller/sales-controller"
import { handleSalesPrintGet } from "@/app/api/(sales)/_controller/sales-print-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Sales Admin",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Sales Admin",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

function createForbiddenResponse() {
  return new Response(JSON.stringify({ error: { code: "FORBIDDEN", message: "Forbidden" } }), {
    status: 403,
    headers: { "content-type": "application/json" },
  })
}

function makeCtx(saleId: string) {
  return { params: Promise.resolve({ saleId }) }
}

describe("sales detail/print controllers", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects missing saleId on detail get", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)
    const detailSpy = vi.spyOn(salesDetailService, "getSalesDetail")

    const response = await handleSaleDetailGet(
      new Request("https://example.com/api/sales/S-1?branch=b_1"),
      makeCtx("  ")
    )

    expect(response.status).toBe(400)
    expect(detailSpy).not.toHaveBeenCalled()
  })

  it("returns sale detail payload on happy path", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)

    const detailSpy = vi.spyOn(salesDetailService, "getSalesDetail").mockReturnValue({
      doc: {
        id: "S-1",
        status: "POSTED",
        createdAt: "2026-04-08T10:00:00.000Z",
        paymentStatus: "tunai",
        paidAmount: 100,
        orderDiscount: 0,
        totals: { total: 100, remaining: 0 },
        items: [],
      },
    } as never)

    const response = await handleSaleDetailGet(
      new Request("https://example.com/api/sales/S-1?branch=b_1"),
      makeCtx("S-1")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(detailSpy).toHaveBeenCalledWith({ branch: "b_1", saleId: "S-1" })

    const payload = (await response.json()) as { doc?: { id?: string } }
    expect(payload.doc?.id).toBe("S-1")
  })

  it("returns forbidden on detail delete when branch access fails", async () => {
    vi.spyOn(salesAuth, "requireSalesDeleteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(createForbiddenResponse() as never)

    const voidSpy = vi.spyOn(salesDetailService, "voidSaleWithPolicy")

    const response = await handleSaleDetailDelete(
      new Request("https://example.com/api/sales/S-1?branch=b_2", { method: "DELETE" }),
      makeCtx("S-1")
    )

    expect(response.status).toBe(403)
    expect(voidSpy).not.toHaveBeenCalled()
  })

  it("voids sale on delete happy path", async () => {
    vi.spyOn(salesAuth, "requireSalesDeleteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)

    const voidSpy = vi.spyOn(salesDetailService, "voidSaleWithPolicy").mockReturnValue({
      id: "S-1",
      status: "VOID",
    } as never)

    const response = await handleSaleDetailDelete(
      new Request("https://example.com/api/sales/S-1?branch=b_1", { method: "DELETE" }),
      makeCtx("S-1")
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(voidSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        branch: "b_1",
        saleId: "S-1",
        userName: "Sales Admin",
        userRole: "super-admin",
      })
    )

    const payload = (await response.json()) as { doc?: { status?: string } }
    expect(payload.doc?.status).toBe("VOID")
  })

  it("rejects missing saleId on print", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)

    const printSpy = vi.spyOn(salesPrintService, "renderSalePrint")

    const response = await handleSalesPrintGet(
      new Request("https://example.com/api/sales/print?branch=b_1"),
      { withPrice: true }
    )

    expect(response.status).toBe(400)
    expect(printSpy).not.toHaveBeenCalled()
  })

  it("returns html print on happy path", async () => {
    vi.spyOn(salesAuth, "requireSalesReadGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(salesAuth, "ensureSalesBranchAccess").mockReturnValue(null)

    const printSpy = vi.spyOn(salesPrintService, "renderSalePrint").mockReturnValue("<html>print-ok</html>" as never)

    const response = await handleSalesPrintGet(
      new Request("https://example.com/api/sales/print?branch=b_1&saleId=ignored"),
      { saleId: "S-1", withPrice: false }
    )

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toContain("text/html")
    expect(response.headers.get("Cache-Control")).toBe("no-store")
    expect(printSpy).toHaveBeenCalledWith({ branch: "b_1", saleId: "S-1", withPrice: false })
    await expect(response.text()).resolves.toContain("print-ok")
  })
})
