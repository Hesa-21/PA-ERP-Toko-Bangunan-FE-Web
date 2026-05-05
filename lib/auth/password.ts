import "server-only"

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto"

const PASSWORD_SCHEME = "scrypt"
const DEFAULT_SCRYPT_N = 16384
const DEFAULT_SCRYPT_R = 8
const DEFAULT_SCRYPT_P = 1
const DEFAULT_KEY_LEN = 64
const DEFAULT_SALT_BYTES = 16

function parsePositiveInt(value: string | undefined, fallback: number): number {
  const raw = Number(value)
  if (!Number.isFinite(raw)) return fallback
  const n = Math.trunc(raw)
  return n > 0 ? n : fallback
}

function getScryptParams() {
  return {
    N: parsePositiveInt(process.env.AUTH_PASSWORD_SCRYPT_N, DEFAULT_SCRYPT_N),
    r: parsePositiveInt(process.env.AUTH_PASSWORD_SCRYPT_R, DEFAULT_SCRYPT_R),
    p: parsePositiveInt(process.env.AUTH_PASSWORD_SCRYPT_P, DEFAULT_SCRYPT_P),
    keyLen: parsePositiveInt(process.env.AUTH_PASSWORD_KEY_LEN, DEFAULT_KEY_LEN),
    saltBytes: parsePositiveInt(process.env.AUTH_PASSWORD_SALT_BYTES, DEFAULT_SALT_BYTES),
  }
}

export function isPasswordHash(value: string): boolean {
  const raw = String(value ?? "")
  const parts = raw.split("$")
  if (parts.length !== 8) return false
  if (parts[0] !== PASSWORD_SCHEME) return false

  const [saltBytesRaw, keyLenRaw, nRaw, rRaw, pRaw, saltHex, hashHex] = parts.slice(1)
  const saltBytes = Number(saltBytesRaw)
  const keyLen = Number(keyLenRaw)
  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)

  if (![saltBytes, keyLen, n, r, p].every((x) => Number.isFinite(x) && x > 0)) return false
  if (!/^[0-9a-f]+$/i.test(saltHex)) return false
  if (!/^[0-9a-f]+$/i.test(hashHex)) return false

  return true
}

export function hashPassword(plainPassword: string): string {
  const plain = String(plainPassword ?? "")
  const params = getScryptParams()
  const salt = randomBytes(params.saltBytes)

  const derived = scryptSync(plain, salt, params.keyLen, {
    N: params.N,
    r: params.r,
    p: params.p,
  })

  return [
    PASSWORD_SCHEME,
    String(params.saltBytes),
    String(params.keyLen),
    String(params.N),
    String(params.r),
    String(params.p),
    salt.toString("hex"),
    derived.toString("hex"),
  ].join("$")
}

function verifyScryptHash(plainPassword: string, storedHash: string): boolean {
  const parts = storedHash.split("$")
  if (parts.length !== 8) return false
  if (parts[0] !== PASSWORD_SCHEME) return false

  const [saltBytesRaw, keyLenRaw, nRaw, rRaw, pRaw, saltHex, hashHex] = parts.slice(1)

  const saltBytes = Number(saltBytesRaw)
  const keyLen = Number(keyLenRaw)
  const n = Number(nRaw)
  const r = Number(rRaw)
  const p = Number(pRaw)

  if (![saltBytes, keyLen, n, r, p].every((x) => Number.isFinite(x) && x > 0)) return false

  try {
    const salt = Buffer.from(saltHex, "hex")
    const expected = Buffer.from(hashHex, "hex")
    if (salt.length !== saltBytes) return false
    if (expected.length !== keyLen) return false

    const derived = scryptSync(String(plainPassword ?? ""), salt, keyLen, {
      N: n,
      r,
      p,
    })

    return timingSafeEqual(derived, expected)
  } catch {
    return false
  }
}

export function verifyPassword(plainPassword: string, storedPassword: string): boolean {
  const plain = String(plainPassword ?? "")
  const stored = String(storedPassword ?? "")

  if (!stored) return false
  if (!isPasswordHash(stored)) {
    return plain === stored
  }

  return verifyScryptHash(plain, stored)
}

export function needsPasswordRehash(storedPassword: string): boolean {
  return !isPasswordHash(String(storedPassword ?? ""))
}
