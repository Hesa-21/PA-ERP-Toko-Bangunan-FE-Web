import { NextResponse } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import * as posAuth from "@/app/api/(pos)/_lib/auth"
import * as posService from "@/app/api/(pos)/_service/pos-sales-service"
import { handlePosSalesPost } from "@/app/api/(pos)/_controller/pos-sales-controller"

function createAllowedGuard() {
  return {
    ok: true as const,
    data: {
      user: {
        id: "user-1",
        name: "Kasir",
        role: "super-admin",
        branch: "cabang-a",
      },
      session: {
        provider: "jwt",
        user: {
          id: "user-1",
          name: "Kasir",
          role: "super-admin",
          branch: "cabang-a",
        },
      },
    },
  }
}

function createValidBody(branch = "b_1") {
  return {
    branch,
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
        discount: 0,
        priceTier: "retail",
      },
    ],
  }
}

function createIdempotencyKey() {
  const random = Math.random().toString(36).slice(2)
  return `test-pos-${Date.now()}-${random}`
}

describe("pos sales controller", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("rejects request without idempotency key", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(null)
    const createSpy = vi.spyOn(posService, "createPosSale")

    const response = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(createValidBody()),
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toContain("Idempotency-Key")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("uses central branch regardless of payload branch", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(null)
    const validateSpy = vi.spyOn(posService, "validateCreatePosSaleInput").mockReturnValue({ ok: true } as never)
    const createSpy = vi.spyOn(posService, "createPosSale").mockReturnValue({
      doc: { id: "SALE-1" } as never,
      newEntries: [],
      computed: {
        subtotal: 10_000,
        perItemDiscountTotal: 0,
        subtotalAfterItemDiscount: 10_000,
        orderDiscountApplied: 0,
        grandTotal: 10_000,
      },
    })

    const response = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": createIdempotencyKey(),
        },
        body: JSON.stringify(createValidBody("unknown-branch")),
      })
    )

    expect(response.status).toBe(201)
    expect(validateSpy).toHaveBeenCalledWith(expect.objectContaining({ branch: "b_1" }))
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({ branch: "b_1" }))
  })

  it("rejects malformed JSON payload explicitly", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(null)
    const createSpy = vi.spyOn(posService, "createPosSale")

    const response = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": createIdempotencyKey(),
        },
        body: "{",
      })
    )

    expect(response.status).toBe(400)
    const payload = (await response.json()) as { error?: { message?: string } }
    expect(payload.error?.message).toBe("Payload JSON tidak valid.")
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("returns forbidden when branch access check fails", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(
      NextResponse.json({ error: { code: "FORBIDDEN", message: "Forbidden" } }, { status: 403 }) as never
    )
    const createSpy = vi.spyOn(posService, "createPosSale")

    const response = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": createIdempotencyKey(),
        },
        body: JSON.stringify(createValidBody()),
      })
    )

    expect(response.status).toBe(403)
    expect(createSpy).not.toHaveBeenCalled()
  })

  it("replays idempotent request without creating duplicate sales", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(null)

    const createSpy = vi.spyOn(posService, "createPosSale").mockReturnValue({
      doc: { id: "SALE-1" } as never,
      newEntries: [],
      computed: {
        subtotal: 10_000,
        perItemDiscountTotal: 0,
        subtotalAfterItemDiscount: 10_000,
        orderDiscountApplied: 0,
        grandTotal: 10_000,
      },
    })

    const idempotencyKey = createIdempotencyKey()
    const requestInit: RequestInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(createValidBody()),
    }

    const first = await handlePosSalesPost(new Request("https://example.com/api/pos/sales", requestInit))
    const second = await handlePosSalesPost(new Request("https://example.com/api/pos/sales", requestInit))

    expect(first.status).toBe(201)
    expect(second.status).toBe(201)
    expect(createSpy).toHaveBeenCalledTimes(1)

    const payload = (await second.json()) as { doc?: { id?: string } }
    expect(payload.doc?.id).toBe("SALE-1")
  })

  it("returns conflict when same idempotency key is reused with different payload", async () => {
    vi.spyOn(posAuth, "requirePosWriteGuard").mockReturnValue(createAllowedGuard() as never)
    vi.spyOn(posAuth, "ensurePosBranchAccess").mockReturnValue(null)

    const createSpy = vi.spyOn(posService, "createPosSale").mockReturnValue({
      doc: { id: "SALE-1" } as never,
      newEntries: [],
      computed: {
        subtotal: 10_000,
        perItemDiscountTotal: 0,
        subtotalAfterItemDiscount: 10_000,
        orderDiscountApplied: 0,
        grandTotal: 10_000,
      },
    })

    const idempotencyKey = createIdempotencyKey()
    const first = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify(createValidBody()),
      })
    )

    const second = await handlePosSalesPost(
      new Request("https://example.com/api/pos/sales", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          ...createValidBody(),
          orderDiscount: 1,
        }),
      })
    )

    expect(first.status).toBe(201)
    expect(second.status).toBe(409)
    expect(createSpy).toHaveBeenCalledTimes(1)

    const payload = (await second.json()) as { error?: { code?: string } }
    expect(payload.error?.code).toBe("CONFLICT")
  })
})