import type { Role } from "@/lib/auth/role"

export type { Role } from "@/lib/auth/role"
export { isRole } from "@/lib/auth/role"

export type ModuleKey =
  | "dashboard"
  | "pos"
  | "categories"
  | "sales"
  | "users"
  | "reports.sales"

export type Permission = "NA" | "RO" | "R" | "CRUD"

const CENTRALIZED_PERMISSIONS: Record<ModuleKey, Permission> = {
  dashboard: "CRUD",
  pos: "CRUD",
  categories: "CRUD",
  sales: "CRUD",
  users: "CRUD",
  "reports.sales": "CRUD",
}

export const ROLE_MATRIX: Record<Role, Record<ModuleKey, Permission>> = {
  "admin-penjualan": { ...CENTRALIZED_PERMISSIONS },
  viewer: {
    dashboard: "R",
    pos: "R",
    categories: "R",
    sales: "R",
    users: "R",
    "reports.sales": "R",
  },
}

export function canView(role: Role, mod: ModuleKey): boolean {
  return ROLE_MATRIX[role]?.[mod] !== "NA"
}

export function permissionOf(role: Role, mod: ModuleKey): Permission {
  return ROLE_MATRIX[role]?.[mod] ?? "NA"
}

export type CrudAction = "C" | "R" | "U" | "D"

export function hasPermission(role: Role, mod: ModuleKey, action: CrudAction): boolean {
  const p = permissionOf(role, mod)
  if (p === "NA") return false
  if (p === "CRUD") return true
  // Both "R" and "RO" should permit only read
  return action === "R"
}

// Label modul untuk konsistensi render UI & session
export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  pos: "Point of Sale",
  categories: "Master Data Produk",
  sales: "Penjualan",
  users: "Pengguna",
  "reports.sales": "Laporan Penjualan",
}

// Default landing route per role to keep redirects consistent across the app
export function defaultLandingForRole(_role: Role): string {
  return "/dashboard"
}
