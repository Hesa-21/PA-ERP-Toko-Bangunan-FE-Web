function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function readApiErrorMessage(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined

  const errorVal = data.error
  if (typeof errorVal === "string" && errorVal.trim()) return errorVal
  if (isRecord(errorVal)) {
    const msg = errorVal.message
    if (typeof msg === "string" && msg.trim()) return msg
  }

  // Fallback: some APIs might return { message: "..." }
  const topMessage = data.message
  if (typeof topMessage === "string" && topMessage.trim()) return topMessage

  return undefined
}

export function readApiErrorCode(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined
  const errorVal = data.error
  if (!errorVal || typeof errorVal !== "object" || errorVal === null) return undefined
  const code = (errorVal as Record<string, unknown>).code
  return typeof code === "string" && code.trim() ? code : undefined
}

async function safeReadJson(response: Response): Promise<unknown> {
  // Some responses might be empty (204) or invalid JSON.
  const text = await response.text().catch(() => "")
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return {}
  }
}

async function safeReadUnknown(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "")
  if (!text) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    return { message: text }
  }
}

export class ApiRequestError extends Error {
  status: number
  code?: string
  data?: unknown

  constructor(message: string, opts: { status: number; code?: string; data?: unknown }) {
    super(message)
    this.name = "ApiRequestError"
    this.status = opts.status
    this.code = opts.code
    this.data = opts.data
  }
}

export type ApiFetchJsonOptions = {
  defaultErrorMessage?: string
}

export type ApiFetchResponseOptions = ApiFetchJsonOptions & {
  acceptHeader?: string
}

export async function apiFetchResponse(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchResponseOptions
): Promise<Response> {
  const res = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      ...(options?.acceptHeader ? { Accept: options.acceptHeader } : {}),
      ...(init?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const data = await safeReadUnknown(res)
    const apiMessage = readApiErrorMessage(data)
    const msg =
      apiMessage ||
      (options?.defaultErrorMessage
        ? `${options.defaultErrorMessage} (HTTP ${res.status}).`
        : `Request failed (HTTP ${res.status}).`)
    const code = readApiErrorCode(data)
    throw new ApiRequestError(msg, { status: res.status, code, data })
  }

  return res
}

export async function apiFetchBlob(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchResponseOptions
): Promise<{ blob: Blob; response: Response }> {
  const response = await apiFetchResponse(input, init, options)
  const blob = await response.blob()
  return { blob, response }
}

export async function apiFetchText(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchResponseOptions
): Promise<string> {
  const response = await apiFetchResponse(input, init, options)
  return response.text()
}

export async function apiFetchJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchJsonOptions
): Promise<T> {
  const res = await fetch(input, {
    credentials: "include",
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  })

  const data = (await safeReadJson(res)) as unknown

  if (!res.ok) {
    const apiMessage = readApiErrorMessage(data)
    const msg =
      apiMessage ||
      (options?.defaultErrorMessage
        ? `${options.defaultErrorMessage} (HTTP ${res.status}).`
        : `Request failed (HTTP ${res.status}).`)
    const code = readApiErrorCode(data)
    throw new ApiRequestError(msg, { status: res.status, code, data })
  }

  return data as T
}

export async function apiPostJson<TResponse, TBody>(
  url: string,
  body: TBody,
  init?: Omit<RequestInit, "method" | "body">,
  options?: ApiFetchJsonOptions
): Promise<TResponse> {
  return apiFetchJson<TResponse>(
    url,
    {
      ...init,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
      body: JSON.stringify(body),
    },
    options
  )
}
