import { NextResponse } from "next/server"
import { resolveSessionFromRequest } from "@/app/api/(auth)/_service/auth-session-service"

export async function handleAuthMeGet(request: Request) {
  const cookieHeader = request.headers.get("cookie")
  const { user, session } = resolveSessionFromRequest({ cookieHeader })

  return NextResponse.json({ user, session }, { headers: { "Cache-Control": "no-store" } })
}
