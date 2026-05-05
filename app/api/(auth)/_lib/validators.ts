import { z } from "zod"

const EMAIL_MAX_LENGTH = 254
const PASSWORD_MAX_LENGTH = 128
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const loginBodySchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
})

export type LoginBody = z.infer<typeof loginBodySchema>

export function parseLoginBody(raw: unknown):
  | { ok: true; data: LoginBody }
  | { ok: false; error: string } {
  const parsed = loginBodySchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: "Payload login tidak valid." }
  return { ok: true, data: parsed.data }
}

export function validateLoginInput(input: { email?: string; password?: string }) {
  const email = String(input.email ?? "").trim().toLowerCase()
  const password = String(input.password ?? "")
  const passwordTrimmed = password.trim()

  if (!email || !passwordTrimmed) {
    return { ok: false as const, error: "Email dan kata sandi wajib diisi." }
  }

  if (email.length > EMAIL_MAX_LENGTH) {
    return { ok: false as const, error: "Alamat email terlalu panjang." }
  }

  if (!SIMPLE_EMAIL_REGEX.test(email)) {
    return { ok: false as const, error: "Format alamat email tidak valid." }
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return { ok: false as const, error: "Kata sandi terlalu panjang." }
  }

  return { ok: true as const, email, password }
}
