"use client"

import type { User } from "@/lib/domain/users"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Building2, Edit, Mail, Trash2 } from "lucide-react"
import { roleBadgeClass, roleLabel, statusBadge } from "@/app/users/_lib/users-utils"

export type UsersTableProps = {
  users: User[]
  branchNameByCode: Map<string, string>
  disabledActions?: boolean
  onEdit: (user: User) => void
  onDelete: (user: User) => void
}

export function UsersTable(props: UsersTableProps) {
  const { users, branchNameByCode, disabledActions, onEdit, onDelete } = props

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID Pengguna</TableHead>
            <TableHead>Nama</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Peran</TableHead>
            <TableHead>Cabang</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.id}</TableCell>
              <TableCell>
                <div className="font-medium">{u.name}</div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {u.email}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={roleBadgeClass[u.role]}>{roleLabel[u.role]}</Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {u.branch ? branchNameByCode.get(u.branch) ?? u.branch : "-"}
                </div>
              </TableCell>
              <TableCell>
                <Badge className={statusBadge(u.active)}>{u.active ? "Aktif" : "Nonaktif"}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" disabled={disabledActions} onClick={() => onEdit(u)}>
                    <Edit className="h-3 w-3 mr-1" />
                    Ubah
                  </Button>
                  <Button variant="outline" size="sm" disabled={disabledActions} onClick={() => onDelete(u)}>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Hapus
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
