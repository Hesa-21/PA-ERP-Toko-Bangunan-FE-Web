import { NextResponse } from "next/server"
import { buildLogoutCookies } from "@/app/api/(auth)/_service/auth-session-service"

export async function handleAuthLogoutPost() {
  const res = NextResponse.json({ ok: true })
  res.headers.set("Cache-Control", "no-store")

  for (const cookie of buildLogoutCookies()) {
    res.headers.append("Set-Cookie", cookie)
  }

  return res
}
