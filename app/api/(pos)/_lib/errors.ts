import { jsonError } from "@/lib/http/response"

function mapDomainError(message: string) {
  const match = message.match(/^DOMAIN:([^:]+):(.*)$/)
  if (!match) return null

  const code = match[1]
  const msg = match[2]

  if (code === "INVALID_INPUT") {
    return jsonError({ code: "INVALID_INPUT", message: msg, status: 400 })
  }
  if (code === "INSUFFICIENT_STOCK") {
    return jsonError({ code: "INSUFFICIENT_STOCK", message: msg, status: 409 })
  }
  if (code === "INVALID_STATUS_TRANSITION") {
    return jsonError({ code: "INVALID_STATUS_TRANSITION", message: msg, status: 409 })
  }

  return jsonError({ code: "DOMAIN_ERROR", message: msg, status: 400 })
}

export function mapPosSalesRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    const maybe = mapDomainError(err.message)
    if (maybe) return maybe

    if (err.message === "BRANCH_NOT_FOUND") {
      return jsonError({ code: "NOT_FOUND", message: "Branch not found", status: 404 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
