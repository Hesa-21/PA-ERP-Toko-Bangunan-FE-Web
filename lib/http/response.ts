import { NextResponse } from "next/server"

export type ApiError = {
  code: string
  message: string
}

export function jsonError(input: { code: string; message: string; status: number }) {
  return NextResponse.json(
    { error: { code: input.code, message: input.message } satisfies ApiError },
    { status: input.status, headers: { "Cache-Control": "no-store" } }
  )
}
