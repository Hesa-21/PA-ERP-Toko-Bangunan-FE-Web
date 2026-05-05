import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import * as domain from "@/lib/domain"
import * as dateUtils from "@/lib/utils/date"
import { getSalesDetail, voidSaleWithPolicy } from "@/app/api/(sales)/_service/sales-detail-service"

function makeDoc(input: {
  id: string
  status: "DRAFT" | "POSTED" | "VOID"
  createdAt: string
  postedAt?: string
  paymentStatus?: "tunai" | "tempo"
  paidAmount?: number
}) {
  return {
    id: input.id,
    branch: "b_1",
    status: input.status,
    createdAt: input.createdAt,
    postedAt: input.postedAt,
    customerName: "PT Maju",
    customerAddress: "Jl. Raya",
    customerPhone: "0812",
    salespersonName: "Kasir A",
    paymentStatus: input.paymentStatus ?? "tunai",
    paidAmount: input.paidAmount ?? 0,
    dueDate: undefined,
    orderDiscount: 0,
    createdBy: "Kasir A",
    postedBy: "Kasir A",
    items: [
      {
        id: "line-1",
        sku: "SKU-1",
        quantity: 2,
        unitPrice: 100,
        discount: 0,
      },
    ],
  }
}

describe("sales detail service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("maps detail with product name and totals", () => {
    vi.spyOn(mockDb, "getSale").mockReturnValue(
      makeDoc({
        id: "S-1",
        status: "POSTED",
        createdAt: "2026-04-08T10:00:00.000Z",
        postedAt: "2026-04-08T10:05:00.000Z",
        paymentStatus: "tempo",
        paidAmount: 50,
      }) as never
    )
    vi.spyOn(mockDb, "ensureBranchState").mockReturnValue(
      {
        products: [{ sku: "SKU-1", name: "Semen" }],
      } as never
    )
    vi.spyOn(domain, "computeSalesTotal").mockReturnValue(200)

    const result = getSalesDetail({ branch: "b_1", saleId: "S-1" })

    expect(result.doc.id).toBe("S-1")
    expect(result.doc.items[0]?.name).toBe("Semen")
    expect(result.doc.totals.total).toBe(200)
    expect(result.doc.totals.remaining).toBe(150)
  })

  it("allows void posted sale for non-admin role within same day", () => {
    vi.spyOn(mockDb, "getSale").mockReturnValue(
      makeDoc({ id: "S-2", status: "POSTED", createdAt: "2026-04-08T10:00:00.000Z" }) as never
    )
    vi.spyOn(dateUtils, "isTodayJakarta").mockReturnValue(true)
    const voidSpy = vi.spyOn(mockDb, "voidSale").mockReturnValue({ id: "S-2", status: "VOID" } as never)

    const result = voidSaleWithPolicy({
      branch: "b_1",
      saleId: "S-2",
      userName: "Kasir",
      userRole: "viewer",
      now: new Date("2026-04-08T11:00:00.000Z"),
    })

    expect((result as { status?: string }).status).toBe("VOID")
    expect(voidSpy).toHaveBeenCalledWith({ branchId: "b_1", saleId: "S-2", voidedBy: "Kasir" })
  })

  it("enforces same-day cutoff when voiding posted sale", () => {
    vi.spyOn(mockDb, "getSale").mockReturnValue(
      makeDoc({ id: "S-3", status: "POSTED", createdAt: "2026-04-08T10:00:00.000Z" }) as never
    )
    vi.spyOn(dateUtils, "isTodayJakarta").mockReturnValue(false)
    const voidSpy = vi.spyOn(mockDb, "voidSale")

    expect(() =>
      voidSaleWithPolicy({
        branch: "b_1",
        saleId: "S-3",
        userName: "Owner",
        userRole: "admin-penjualan",
        now: new Date("2026-04-09T11:00:00.000Z"),
      })
    ).toThrowError("VOID_POSTED_CUTOFF")

    expect(voidSpy).not.toHaveBeenCalled()
  })

  it("voids posted sale for super-admin within same day", () => {
    vi.spyOn(mockDb, "getSale").mockReturnValue(
      makeDoc({ id: "S-4", status: "POSTED", createdAt: "2026-04-08T10:00:00.000Z" }) as never
    )
    vi.spyOn(dateUtils, "isTodayJakarta").mockReturnValue(true)
    const voidSpy = vi.spyOn(mockDb, "voidSale").mockReturnValue({ id: "S-4", status: "VOID" } as never)

    const result = voidSaleWithPolicy({
      branch: "b_1",
      saleId: "S-4",
      userName: "Owner",
      userRole: "admin-penjualan",
      now: new Date("2026-04-08T11:00:00.000Z"),
    })

    expect(voidSpy).toHaveBeenCalledWith({ branchId: "b_1", saleId: "S-4", voidedBy: "Owner" })
    expect((result as { status?: string }).status).toBe("VOID")
  })

  it("allows void draft sale without same-day check", () => {
    vi.spyOn(mockDb, "getSale").mockReturnValue(
      makeDoc({ id: "S-5", status: "DRAFT", createdAt: "2026-04-08T10:00:00.000Z" }) as never
    )
    const todaySpy = vi.spyOn(dateUtils, "isTodayJakarta")
    const voidSpy = vi.spyOn(mockDb, "voidSale").mockReturnValue({ id: "S-5", status: "VOID" } as never)

    voidSaleWithPolicy({
      branch: "b_1",
      saleId: "S-5",
      userName: "Kasir",
      userRole: "viewer",
      now: new Date("2026-04-10T11:00:00.000Z"),
    })

    expect(todaySpy).not.toHaveBeenCalled()
    expect(voidSpy).toHaveBeenCalledWith({ branchId: "b_1", saleId: "S-5", voidedBy: "Kasir" })
  })
})
