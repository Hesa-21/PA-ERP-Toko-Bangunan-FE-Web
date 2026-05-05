export type Role = "admin-penjualan" | "viewer"

export function isRole(value: string): value is Role {
  return value === "admin-penjualan" || value === "viewer"
}