import { NextResponse } from "next/server"
import { serializeSessionCookie } from "@/lib/auth/session"
import { jsonError } from "@/lib/http/response"
import { mapAuthRouteError } from "@/app/api/(auth)/_lib/errors"
import { resolveClientIp } from "@/app/api/(auth)/_lib/request"
import { parseLoginBody, validateLoginInput } from "@/app/api/(auth)/_lib/validators"
import { authenticateLogin } from "@/app/api/(auth)/_service/auth-login-service"
import { logAuthLoginAudit } from "@/app/api/(auth)/_service/auth-audit-log-service"
import {
  clearLoginThrottle,
  readLoginThrottle,
  registerLoginFailure,
} from "@/app/api/(auth)/_service/auth-rate-limit-service"

async function parseJsonBodyOrResponse(request: Request): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: Response }
> {
  try {
    return { ok: true, data: await request.json() }
  } catch {
    return {
      ok: false,
      response: jsonError({ code: "BAD_REQUEST", message: "Payload JSON tidak valid.", status: 400 }),
    }
  }
}

export async function handleAuthLoginPost(request: Request) {
  const clientIp = resolveClientIp(request)

  try {
    const rawBody = await parseJsonBodyOrResponse(request)
    if (!rawBody.ok) {
      logAuthLoginAudit({ status: "FAILED", reason: "INVALID_JSON_PAYLOAD", clientIp })
      return rawBody.response
    }

    const parsed = parseLoginBody(rawBody.data)
    if (!parsed.ok) {
      logAuthLoginAudit({ status: "FAILED", reason: "INVALID_PAYLOAD", clientIp })
      return jsonError({ code: "BAD_REQUEST", message: parsed.error, status: 400 })
    }

    const valid = validateLoginInput(parsed.data)
    if (!valid.ok) {
      const rawEmail = typeof parsed.data.email === "string" ? parsed.data.email : undefined
      logAuthLoginAudit({
        status: "FAILED",
        reason: "INVALID_INPUT",
        clientIp,
        email: rawEmail,
      })
      return jsonError({ code: "BAD_REQUEST", message: valid.error, status: 400 })
    }

    const throttleInput = { email: valid.email, clientIp }

    const preCheck = readLoginThrottle(throttleInput)
    if (preCheck.blocked) {
      logAuthLoginAudit({
        status: "THROTTLED",
        reason: `PRECHECK_${preCheck.scope ?? "unknown"}`,
        email: valid.email,
        clientIp,
        retryAfterSec: preCheck.retryAfterSec,
      })
      return NextResponse.json(
        { error: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again later." } },
        {
          status: 429,
          headers: {
            "Cache-Control": "no-store",
            "Retry-After": String(preCheck.retryAfterSec),
          },
        }
      )
    }

    let user: ReturnType<typeof authenticateLogin>["user"]
    let session: ReturnType<typeof authenticateLogin>["session"]

    try {
      const result = authenticateLogin({ email: valid.email, password: valid.password })
      user = result.user
      session = result.session
    } catch (err: unknown) {
      if (err instanceof Error && err.message === "INVALID_CREDENTIALS") {
        const postFail = registerLoginFailure(throttleInput)
        if (postFail.blocked) {
          logAuthLoginAudit({
            status: "THROTTLED",
            reason: `POSTFAIL_${postFail.scope ?? "unknown"}`,
            email: valid.email,
            clientIp,
            retryAfterSec: postFail.retryAfterSec,
          })
          return NextResponse.json(
            { error: { code: "TOO_MANY_REQUESTS", message: "Too many login attempts. Please try again later." } },
            {
              status: 429,
              headers: {
                "Cache-Control": "no-store",
                "Retry-After": String(postFail.retryAfterSec),
              },
            }
          )
        }

        logAuthLoginAudit({
          status: "FAILED",
          reason: "INVALID_CREDENTIALS",
          email: valid.email,
          clientIp,
        })
      }
      throw err
    }

    clearLoginThrottle(throttleInput)
    logAuthLoginAudit({
      status: "SUCCESS",
      reason: "LOGIN_SUCCESS",
      email: valid.email,
      clientIp,
    })

    const res = NextResponse.json({
      ok: true,
      user,
      session,
    })

    res.headers.set("Cache-Control", "no-store")
    res.headers.append("Set-Cookie", serializeSessionCookie(session))

    return res
  } catch (err: unknown) {
    if (!(err instanceof Error && err.message === "INVALID_CREDENTIALS")) {
      logAuthLoginAudit({
        status: "FAILED",
        reason: "UNEXPECTED_ERROR",
        clientIp,
      })
    }
    return mapAuthRouteError(err, "Failed to sign in")
  }
}
