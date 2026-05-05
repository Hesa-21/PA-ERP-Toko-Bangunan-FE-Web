import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { ensureBranchAccess, requireProductZoneBalancesReadGuard } from "@/app/api/(products)/_lib/auth"
import { mapProductZoneBalancesRouteError } from "@/app/api/(products)/_lib/errors"
import { parseProductZoneBalancesGetQuery } from "@/app/api/(products)/_lib/validators"
import {
  listProductZoneBalances,
  validateProductZoneBalancesQuery,
} from "@/app/api/(products)/_service/product-zone-balances-service"

export async function handleProductZoneBalancesGet(request: Request) {
  const guard = requireProductZoneBalancesReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseProductZoneBalancesGetQuery(new URL(request.url))
  const valid = validateProductZoneBalancesQuery(query)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureBranchAccess(guard)
  if (forbidden) return forbidden

  try {
    const result = listProductZoneBalances(query)
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapProductZoneBalancesRouteError(err, "Failed to load product zone balances")
  }
}
