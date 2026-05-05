"use client"

import {
  type UserRoleFilter,
  type UserStatusFilter,
} from "@/lib/domain/users"
import { isUserRoleFilter, isUserStatusFilter } from "@/app/users/_lib/users-filter-guards"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

export type UsersFiltersBarProps = {
  searchTerm: string
  onSearchTermChange: (value: string) => void
  roleFilter: UserRoleFilter
  onRoleFilterChange: (value: UserRoleFilter) => void
  statusFilter: UserStatusFilter
  onStatusFilterChange: (value: UserStatusFilter) => void
}

export function UsersFiltersBar(props: UsersFiltersBarProps) {
  const {
    searchTerm,
    onSearchTermChange,
    roleFilter,
    onRoleFilterChange,
    statusFilter,
    onStatusFilterChange,
  } = props

  return (
    <div className="flex gap-4 mt-4">
      <div className="flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Cari nama atau email..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>
      <Select
        value={roleFilter}
        onValueChange={(value) => {
          if (isUserRoleFilter(value)) {
            onRoleFilterChange(value)
          }
        }}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Saring Peran" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Peran</SelectItem>
          <SelectItem value="admin-penjualan">Admin Penjualan</SelectItem>
          <SelectItem value="viewer">Pembaca (Penjualan)</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={statusFilter}
        onValueChange={(value) => {
          if (isUserStatusFilter(value)) {
            onStatusFilterChange(value)
          }
        }}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Status</SelectItem>
          <SelectItem value="active">Aktif</SelectItem>
          <SelectItem value="inactive">Nonaktif</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
