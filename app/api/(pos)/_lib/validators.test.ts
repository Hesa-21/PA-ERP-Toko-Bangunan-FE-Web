import { describe, expect, it } from "vitest"
import { parsePosSalesBody, validatePosSalesBody } from "@/app/api/(pos)/_lib/validators"

describe("pos validators", () => {
  it("rejects payload with missing required fields at parse level", () => {
    const parsed = parsePosSalesBody({
      items: [],
    })

    expect(parsed.ok).toBe(false)
    if (parsed.ok) return

    expect(parsed.error).toContain("Payload POS tidak valid")
  })

  it("rejects discount above unit price", () => {
    const valid = validatePosSalesBody({
      warehouseId: "z-1",
      salespersonName: "Kasir A",
      paymentStatus: "tunai",
      paidAmount: 10_000,
      dueDate: undefined,
      orderDiscount: 0,
      customerName: "Customer A",
      customerAddress: "Alamat A",
      customerPhone: "08123",
      items: [
        {
          sku: "SKU-1",
          quantity: 1,
          unitPrice: 10_000,
          discount: 20_000,
          priceTier: "retail",
        },
      ],
    })

    expect(valid.ok).toBe(false)
    if (valid.ok) return

    expect(valid.error).toContain("discount")
  })

  it("requires valid due date for tempo payment", () => {
    const valid = validatePosSalesBody({
      warehouseId: "z-1",
      salespersonName: "Kasir A",
      paymentStatus: "tempo",
      paidAmount: 0,
      dueDate: "invalid-date",
      orderDiscount: 0,
      customerName: "Customer A",
      customerAddress: "Alamat A",
      customerPhone: undefined,
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

    expect(valid.ok).toBe(false)
    if (valid.ok) return

    expect(valid.error).toContain("Jatuh tempo")
  })
})