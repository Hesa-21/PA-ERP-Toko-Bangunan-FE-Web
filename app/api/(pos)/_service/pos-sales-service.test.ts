import { afterEach, describe, expect, it, vi } from "vitest"
import * as mockDb from "@/lib/server/mock-db"
import { createPosSale } from "@/app/api/(pos)/_service/pos-sales-service"

describe("pos sales service", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("throws DOMAIN:INVALID_INPUT for invalid tempo due date", () => {
    expect(() =>
      createPosSale({
        branch: "b_1",
        postedBy: "Kasir A",
        warehouseId: "z-1",
        salespersonName: "Kasir A",
        paymentStatus: "tempo",
        paidAmount: 0,
        dueDate: "not-a-date",
        orderDiscount: 0,
        customerName: "Customer A",
        customerAddress: "Alamat A",
        customerPhone: "08123",
        items: [
          {
            sku: "SKU-1",
            quantity: 1,
            unitPrice: 10_000,
            discount: 0,
            priceTier: "retail",
          },
        ],
      })
    ).toThrowError("DOMAIN:INVALID_INPUT")
  })

  it("creates sales draft without direct stock deduction", () => {
    const postSaleSpy = vi.spyOn(mockDb, "postSale")

    const result = createPosSale({
      branch: "b_1",
      postedBy: "Kasir A",
      warehouseId: "z-1",
      salespersonName: "Kasir A",
      paymentStatus: "tempo",
      paidAmount: 1_000,
      dueDate: "2026-05-01",
      orderDiscount: 0,
      customerName: "Customer A",
      customerAddress: "Alamat A",
      customerPhone: "08123",
      items: [
        {
          sku: "SKU-1",
          quantity: 1,
          unitPrice: 10_000,
          discount: 0,
          priceTier: "retail",
        },
      ],
    })

    expect(postSaleSpy).not.toHaveBeenCalled()
    expect(result.doc.status).toBe("DRAFT")
    expect(typeof result.doc.dueDate).toBe("string")
    expect(result.doc.dueDate).toContain("T")
    expect(result.newEntries).toEqual([])
  })
})