const EMAIL_MAX_LENGTH = 254
const PASSWORD_MAX_LENGTH = 128
const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeSignInEmail(email: string) {
  return String(email ?? "").trim().toLowerCase()
}

export function validateEmail(email: string) {
  const value = normalizeSignInEmail(email)
  if (!value) {
    return "Alamat email wajib diisi."
  }
  if (value.length > EMAIL_MAX_LENGTH) {
    return "Alamat email terlalu panjang."
  }
  if (!SIMPLE_EMAIL_REGEX.test(value)) {
    return "Format alamat email tidak valid."
  }
  return ""
}

export function validatePassword(password: string) {
  const raw = String(password ?? "")
  if (!raw.trim()) {
    return "Kata sandi wajib diisi."
  }
  if (raw.length > PASSWORD_MAX_LENGTH) {
    return "Kata sandi terlalu panjang."
  }
  return ""
}
