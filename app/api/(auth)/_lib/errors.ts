import { jsonError } from "@/lib/http/response"

export function mapAuthRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    if (err.message === "INVALID_CREDENTIALS") {
      return jsonError({ code: "UNAUTHORIZED", message: "Invalid credentials", status: 401 })
    }
    if (err.message === "TOO_MANY_REQUESTS") {
      return jsonError({ code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again later.", status: 429 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
