import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import {
  ensureDashboardBranchAccess,
  requireDashboardReadGuard,
} from "@/app/api/(dashboard)/_lib/auth"
import { mapDashboardRouteError } from "@/app/api/(dashboard)/_lib/errors"
import {
  parseDashboardWeeklyQuery,
  validateDashboardBranch,
} from "@/app/api/(dashboard)/_lib/validators"
import { buildDashboardWeekly } from "@/app/api/(dashboard)/_service/dashboard-service"

export async function handleDashboardWeeklyGet(request: Request) {
  const guard = requireDashboardReadGuard(request)
  if (!guard.ok) return guard.response

  const query = parseDashboardWeeklyQuery(new URL(request.url))
  const valid = validateDashboardBranch(query.branch)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  const forbidden = ensureDashboardBranchAccess(guard, query.branch)
  if (forbidden) return forbidden

  try {
    const dto = buildDashboardWeekly({ branch: query.branch })
    return NextResponse.json(dto, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapDashboardRouteError(err, "Failed to load dashboard weekly")
  }
}
