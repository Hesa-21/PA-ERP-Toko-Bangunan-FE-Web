import { getProductZoneBalances } from "@/lib/server/mock-db"
import { getCentralBranchId } from "@/lib/single-branch"
import type { ProductZoneBalancesGetQuery } from "@/app/api/(products)/_lib/query-contracts"

type ProductZoneBalancesItems = ReturnType<typeof getProductZoneBalances>

export type ProductZoneBalancesListResult = {
  items: ProductZoneBalancesItems
  total: number
  page: number
  limit: number
  hasMore: boolean
}

const MAX_ZONE_BALANCES_PAGE = 1000

export function validateProductZoneBalancesQuery(input: ProductZoneBalancesGetQuery) {
  if (input.invalidPageParam) return { ok: false as const, error: "page tidak valid." }
  if (input.invalidLimitParam) return { ok: false as const, error: "limit tidak valid." }
  if (input.page > MAX_ZONE_BALANCES_PAGE) return { ok: false as const, error: "page terlalu besar." }
  return { ok: true as const }
}

export function listProductZoneBalances(input: ProductZoneBalancesGetQuery) {
  const all = getProductZoneBalances({
    branchId: getCentralBranchId(),
    sku: input.sku || undefined,
  })

  if (input.sku) {
    return {
      items: all,
      total: all.length,
      page: 1,
      limit: Math.max(1, all.length || 1),
      hasMore: false,
    } satisfies ProductZoneBalancesListResult
  }

  const start = (input.page - 1) * input.limit
  const items = start >= all.length ? [] : all.slice(start, start + input.limit)

  return {
    items,
    total: all.length,
    page: input.page,
    limit: input.limit,
    hasMore: start + input.limit < all.length,
  } satisfies ProductZoneBalancesListResult
}
