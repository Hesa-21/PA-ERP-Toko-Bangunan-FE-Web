import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import {
  ensureDashboardBranchAccess,
  requireDashboardReadGuard,
} from "@/app/api/(dashboard)/_lib/auth"
import { mapDashboardRouteError } from "@/app/api/(dashboard)/_lib/errors"
import {
  parseDashboardRecentQuery,
  validateDashboardRecentQuery,
} from "@/app/api/(dashboard)/_lib/validators"
import { buildDashboardRecent } from "@/app/api/(dashboard)/_service/dashboard-service"

export async function handleDashboardRecentGet(request: Request) {
  const guard = requireDashboardReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseDashboardRecentQuery(new URL(request.url))
  const valid = validateDashboardRecentQuery(query)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureDashboardBranchAccess(guard, query.branch)
  if (forbidden) return forbidden

  try {
    const dto = buildDashboardRecent({
      branch: query.branch,
      scope: query.scope,
      limit: query.limit,
    })

    return NextResponse.json(dto, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    })
  } catch (err: unknown) {
    return mapDashboardRouteError(err, "Failed to load dashboard recent")
  }
}
