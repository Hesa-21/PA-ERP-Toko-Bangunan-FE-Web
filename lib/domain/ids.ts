export type IdFactory = () => string

export function defaultIdFactory(): string {
  // Works in modern browsers + Node runtimes used by Next.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID()
  // Fallback: not cryptographically strong, but OK for UI prototype domain IDs.
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}
