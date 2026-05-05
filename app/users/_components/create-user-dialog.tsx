"use client"

import { isRole, type Role } from "@/lib/auth/role"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff } from "lucide-react"

export type CreateUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  email: string
  password: string
  showPassword: boolean
  role: Role
  branch: string
  branches: ReadonlyArray<{ code: string; name: string }>
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onToggleShowPassword: () => void
  onRoleChange: (role: Role) => void
  onBranchChange: (value: string) => void
  isSubmitting: boolean
  onSubmit: () => void
}

export function CreateUserDialog(props: CreateUserDialogProps) {
  const {
    open,
    onOpenChange,
    name,
    email,
    password,
    showPassword,
    role,
    branch,
    branches,
    onNameChange,
    onEmailChange,
    onPasswordChange,
    onToggleShowPassword,
    onRoleChange,
    onBranchChange,
    isSubmitting,
    onSubmit,
  } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Nama</label>
            <Input
              value={name}
              disabled={isSubmitting}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <Input
              type="email"
              value={email}
              disabled={isSubmitting}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="email@domain.com"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Password</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={password}
                disabled={isSubmitting}
                onChange={(e) => onPasswordChange(e.target.value)}
                placeholder="Password awal pengguna"
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isSubmitting}
                onClick={onToggleShowPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">Aturan: minimal 10 karakter dan mengandung huruf serta angka.</p>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Peran</label>
            <Select
              value={role}
              disabled={isSubmitting}
              onValueChange={(value) => {
                if (isRole(value)) {
                  onRoleChange(value)
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih peran" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin-penjualan">Admin Penjualan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Cabang</label>
            <Select value={branch} disabled={isSubmitting} onValueChange={(v) => onBranchChange(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih cabang" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.code} value={b.code}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={isSubmitting} onClick={onSubmit}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
