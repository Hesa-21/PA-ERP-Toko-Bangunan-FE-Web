export type Role = "admin-penjualan"

export function isRole(value: string): value is Role {
  return value === "admin-penjualan"
}
