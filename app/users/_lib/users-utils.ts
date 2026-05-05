import type { Role } from "@/lib/auth/role"

export const roleLabel: Record<Role, string> = {
  "admin-penjualan": "Admin Penjualan",
  viewer: "Pembaca (Penjualan)",
}

export const roleBadgeClass: Record<Role, string> = {
  "admin-penjualan": "bg-blue-100 text-blue-800 border-blue-200",
  viewer: "bg-gray-100 text-gray-800 border-gray-200",
}

export function statusBadge(active: boolean) {
  return active ? "bg-green-100 text-green-800 border-green-200" : "bg-red-100 text-red-800 border-red-200"
}
