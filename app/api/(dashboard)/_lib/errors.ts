import { jsonError } from "@/lib/http/response"

export function mapDashboardRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error && err.message === "BRANCH_NOT_FOUND") {
    return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
