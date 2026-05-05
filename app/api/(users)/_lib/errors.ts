import { jsonError } from "@/lib/http/response"

export function mapUsersRouteError(err: unknown, fallbackMessage: string) {
  if (err instanceof Error) {
    if (err.message === "EMAIL_TAKEN") {
      return jsonError({ code: "CONFLICT", message: "Email sudah digunakan.", status: 409 })
    }
    if (err.message === "BRANCH_REQUIRED") {
      return jsonError({ code: "BAD_REQUEST", message: "Cabang wajib diisi.", status: 400 })
    }
    if (err.message === "BRANCH_NOT_FOUND") {
      return jsonError({ code: "BAD_REQUEST", message: "Cabang pengguna tidak valid.", status: 400 })
    }
    if (err.message === "INVALID_PASSWORD") {
      return jsonError({
        code: "BAD_REQUEST",
        message: "Password tidak valid. Minimal 10 karakter dan harus mengandung huruf serta angka.",
        status: 400,
      })
    }
    if (err.message === "BAD_REQUEST") {
      return jsonError({ code: "BAD_REQUEST", message: "Bad request", status: 400 })
    }
  }

  return jsonError({ code: "INTERNAL", message: fallbackMessage, status: 500 })
}
