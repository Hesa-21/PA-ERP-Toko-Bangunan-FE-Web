import { jsonError } from "@/lib/http/response"

export async function parseJsonBodyOrResponse(request: Request): Promise<
  | { ok: true; data: unknown }
  | { ok: false; response: Response }
> {
  let rawText = ""

  try {
    rawText = await request.text()
  } catch {
    return {
      ok: false,
      response: jsonError({ code: "BAD_REQUEST", message: "Payload JSON tidak valid.", status: 400 }),
    }
  }

  if (!rawText.trim()) {
    return { ok: true, data: {} }
  }

  try {
    return { ok: true, data: JSON.parse(rawText) as unknown }
  } catch {
    return {
      ok: false,
      response: jsonError({ code: "BAD_REQUEST", message: "Payload JSON tidak valid.", status: 400 }),
    }
  }
}