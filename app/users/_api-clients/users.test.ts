import { beforeEach, describe, expect, it, vi } from "vitest"
import * as httpClient from "@/lib/client/http"
import { listUsers } from "@/app/users/_api-clients/users"

describe("users api client contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("uses backend-safe defaults for page and limit", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson").mockResolvedValue({ users: [] } as never)

    const result = await listUsers({ q: "owner", role: "all", status: "all" })

    expect(apiSpy).toHaveBeenCalledTimes(1)
    const [url, init] = apiSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("/api/users?")
    expect(String(url)).toContain("q=owner")
    expect(String(url)).toContain("role=all")
    expect(String(url)).toContain("status=all")
    expect(String(url)).toContain("page=1")
    expect(String(url)).toContain("limit=100")
    expect((init as RequestInit | undefined)?.method).toBe("GET")

    expect(result.meta.page).toBe(1)
    expect(result.meta.limit).toBe(100)
  })

  it("clamps list limit above backend max to 200", async () => {
    const apiSpy = vi.spyOn(httpClient, "apiFetchJson").mockResolvedValue({ users: [] } as never)

    const result = await listUsers({ role: "all", status: "all", page: 1, limit: 999 })

    expect(apiSpy).toHaveBeenCalledTimes(1)
    const [url] = apiSpy.mock.calls[0] ?? []
    expect(String(url)).toContain("limit=200")
    expect(result.meta.limit).toBe(200)
  })
})
