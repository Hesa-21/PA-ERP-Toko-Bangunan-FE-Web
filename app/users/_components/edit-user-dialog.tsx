"use client"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, EyeOff, KeyRound } from "lucide-react"

export type EditUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  name: string
  email: string
  active: boolean
  newPassword: string
  confirmPassword: string
  showNewPassword: boolean
  showConfirmPassword: boolean
  onNameChange: (value: string) => void
  onEmailChange: (value: string) => void
  onActiveChange: (value: boolean) => void
  onNewPasswordChange: (value: string) => void
  onConfirmPasswordChange: (value: string) => void
  onToggleShowNewPassword: () => void
  onToggleShowConfirmPassword: () => void
  isSaving: boolean
  isSettingPassword: boolean
  onSave: () => void
  onSetNewPassword: () => void
}

export function EditUserDialog(props: EditUserDialogProps) {
  const {
    open,
    onOpenChange,
    name,
    email,
    active,
    newPassword,
    confirmPassword,
    showNewPassword,
    showConfirmPassword,
    onNameChange,
    onEmailChange,
    onActiveChange,
    onNewPasswordChange,
    onConfirmPasswordChange,
    onToggleShowNewPassword,
    onToggleShowConfirmPassword,
    isSaving,
    isSettingPassword,
    onSave,
    onSetNewPassword,
  } = props

  const disableProfileFields = isSaving || isSettingPassword

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Pengguna</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm">Nama</label>
            <Input disabled={disableProfileFields} value={name} onChange={(e) => onNameChange(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm">Email</label>
            <Input
              type="email"
              disabled={disableProfileFields}
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
            />
          </div>

          <div className="h-px bg-gray-200" />
          <div className="grid gap-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Set Password Baru
            </label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                placeholder="Password baru"
                value={newPassword}
                disabled={isSettingPassword}
                onChange={(e) => onNewPasswordChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showNewPassword ? "Sembunyikan password baru" : "Lihat password baru"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isSettingPassword}
                onClick={onToggleShowNewPassword}
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Konfirmasi password baru"
                value={confirmPassword}
                disabled={isSettingPassword}
                onChange={(e) => onConfirmPasswordChange(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Lihat konfirmasi password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isSettingPassword}
                onClick={onToggleShowConfirmPassword}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" disabled={isSettingPassword} onClick={onSetNewPassword}>
                {isSettingPassword ? "Menyimpan..." : "Simpan Password Baru"}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Catatan: Password saat ini tidak pernah ditampilkan. Gunakan aksi Set Password Baru untuk menetapkan
              password baru.
            </p>
            <p className="text-xs text-gray-500">Aturan: minimal 10 karakter dan mengandung huruf serta angka.</p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm">Status</label>
            <Select
              disabled={disableProfileFields}
              value={active ? "active" : "inactive"}
              onValueChange={(v) => {
                if (v === "active") return onActiveChange(true)
                if (v === "inactive") return onActiveChange(false)
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" disabled={disableProfileFields} onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={isSaving} onClick={onSave}>{isSaving ? "Menyimpan..." : "Simpan"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
