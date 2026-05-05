import { NextResponse, type NextRequest } from "next/server"
import { jsonError } from "@/lib/http/response"
import { requireUsersUpdateGuard } from "@/app/api/(users)/_lib/auth"
import { mapUsersRouteError } from "@/app/api/(users)/_lib/errors"
import { parseJsonBodyOrResponse } from "@/app/api/(users)/_lib/request"
import { resolveRouteParams } from "@/app/api/(users)/_lib/route-context"
import { parsePasswordBody, validateNewPasswordRequired, validateUserIdRequired } from "@/app/api/(users)/_lib/validators"
import { changeUserPassword, type UsersServiceDeps } from "@/app/api/(users)/_service/users-service"

type PasswordRouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function handleUserPasswordPatch(request: NextRequest, ctx: PasswordRouteContext, deps?: UsersServiceDeps) {
  const guard = requireUsersUpdateGuard(request)
  if (!guard.ok) return guard.response

  const { id } = await resolveRouteParams(ctx.params)
  const validId = validateUserIdRequired(id)
  if (!validId.ok) return jsonError({ code: "BAD_REQUEST", message: validId.error, status: 400 })

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parsePasswordBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })
  const body = parsedBody.data

  const validPassword = validateNewPasswordRequired(body.newPassword)
  if (!validPassword.ok) return jsonError({ code: "BAD_REQUEST", message: validPassword.error, status: 400 })

  try {
    const ok = changeUserPassword(validId.value, body.newPassword!, deps)
    if (!ok) {
      return jsonError({ code: "NOT_FOUND", message: "User not found", status: 404 })
    }
    return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapUsersRouteError(err, "Failed to update user password")
  }
}