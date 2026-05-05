import { afterEach, describe, expect, it, vi } from "vitest"
import { NextResponse } from "next/server"
import * as productsController from "@/app/api/(products)/_controller/products-controller"
import { DELETE, GET, POST, PUT } from "@/app/api/(products)/products/route"

describe("products route", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("delegates GET to products controller", async () => {
    const request = new Request("https://example.com/api/products?branch=b_1")
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(productsController, "handleProductsGet").mockResolvedValue(response)

    const result = await GET(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates POST to products controller", async () => {
    const request = new Request("https://example.com/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 201 })
    const spy = vi.spyOn(productsController, "handleProductsPost").mockResolvedValue(response)

    const result = await POST(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates PUT to products controller", async () => {
    const request = new Request("https://example.com/api/products", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(productsController, "handleProductsPut").mockResolvedValue(response)

    const result = await PUT(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })

  it("delegates DELETE to products controller", async () => {
    const request = new Request("https://example.com/api/products", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    })
    const response = NextResponse.json({ ok: true }, { status: 200 })
    const spy = vi.spyOn(productsController, "handleProductsDelete").mockResolvedValue(response)

    const result = await DELETE(request)

    expect(spy).toHaveBeenCalledWith(request)
    expect(result).toBe(response)
  })
})