import { NextResponse } from "next/server"
import { jsonError } from "@/lib/http/response"
import { requireUsersCreateGuard, requireUsersDeleteGuard, requireUsersReadGuard, requireUsersUpdateGuard } from "@/app/api/(users)/_lib/auth"
import { mapUsersRouteError } from "@/app/api/(users)/_lib/errors"
import { parseJsonBodyOrResponse } from "@/app/api/(users)/_lib/request"
import { resolveRouteParams } from "@/app/api/(users)/_lib/route-context"
import {
  parseCreateUserBody,
  parsePatchUserBody,
  parseUsersListRouteQuery,
  validateCreateUserRequired,
  validateUserIdRequired,
} from "@/app/api/(users)/_lib/validators"
import {
  createUserRecord,
  listUsersFromQuery,
  patchUserRecord,
  removeUserRecord,
  type UsersServiceDeps,
} from "@/app/api/(users)/_service/users-service"

type UserRouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function handleUsersGet(request: Request, deps?: UsersServiceDeps) {
  const guard = requireUsersReadGuard(request)
  if (!guard.ok) return guard.response

  const parsedQuery = parseUsersListRouteQuery(new URL(request.url))
  if (!parsedQuery.ok) {
    return jsonError({ code: "BAD_REQUEST", message: parsedQuery.error, status: 400 })
  }
  if (parsedQuery.data.invalidPageParam) {
    return jsonError({ code: "BAD_REQUEST", message: "page tidak valid.", status: 400 })
  }
  if (parsedQuery.data.invalidLimitParam) {
    return jsonError({ code: "BAD_REQUEST", message: "limit tidak valid (1-200).", status: 400 })
  }

  try {
    const result = listUsersFromQuery(parsedQuery.data, deps)
    return NextResponse.json(result, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapUsersRouteError(err, "Failed to load users")
  }
}

export async function handleUsersPost(request: Request, deps?: UsersServiceDeps) {
  const guard = requireUsersCreateGuard(request)
  if (!guard.ok) return guard.response

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parseCreateUserBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  const valid = validateCreateUserRequired(parsedBody.data)
  if (!valid.ok) return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })

  try {
    const user = createUserRecord({
      name: valid.data.name,
      email: valid.data.email,
      password: valid.data.password,
      role: valid.data.role,
      branch: valid.data.branch,
    }, deps)

    return NextResponse.json({ user }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (err: unknown) {
    return mapUsersRouteError(err, "Failed to create user")
  }
}

export async function handleUserPatch(request: Request, ctx: UserRouteContext, deps?: UsersServiceDeps) {
  const guard = requireUsersUpdateGuard(request)
  if (!guard.ok) return guard.response

  const { id } = await resolveRouteParams(ctx.params)
  const validId = validateUserIdRequired(id)
  if (!validId.ok) return jsonError({ code: "BAD_REQUEST", message: validId.error, status: 400 })

  const rawBody = await parseJsonBodyOrResponse(request)
  if (!rawBody.ok) return rawBody.response

  const parsedBody = parsePatchUserBody(rawBody.data)
  if (!parsedBody.ok) return jsonError({ code: "BAD_REQUEST", message: parsedBody.error, status: 400 })

  try {
    const updated = patchUserRecord(validId.value, parsedBody.data, deps)
    if (!updated) return jsonError({ code: "NOT_FOUND", message: "Not found", status: 404 })
    return NextResponse.json({ user: updated }, { status: 200, headers: { "Cache-Control": "no-store" } })
  } catch (e: unknown) {
    return mapUsersRouteError(e, "Failed to update user")
  }
}

export async function handleUserDelete(request: Request, ctx: UserRouteContext, deps?: UsersServiceDeps) {
  const guard = requireUsersDeleteGuard(request)
  if (!guard.ok) return guard.response

  const { id } = await resolveRouteParams(ctx.params)
  const validId = validateUserIdRequired(id)
  if (!validId.ok) return jsonError({ code: "BAD_REQUEST", message: validId.error, status: 400 })

  if (guard.data.user.id === validId.value) {
    return jsonError({ code: "BAD_REQUEST", message: "Cannot delete your own account", status: 400 })
  }

  const ok = removeUserRecord(validId.value, deps)
  if (!ok) return jsonError({ code: "NOT_FOUND", message: "Not found", status: 404 })
  return NextResponse.json({ ok: true }, { status: 200, headers: { "Cache-Control": "no-store" } })
}