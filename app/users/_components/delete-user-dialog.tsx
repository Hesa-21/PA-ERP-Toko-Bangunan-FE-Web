"use client"

import type { User } from "@/lib/domain/users"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export type DeleteUserDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: User | null
  isSubmitting: boolean
  onConfirm: () => void
}

export function DeleteUserDialog(props: DeleteUserDialogProps) {
  const { open, onOpenChange, user, isSubmitting, onConfirm } = props

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
          <AlertDialogDescription>
            {user
              ? `Anda akan menghapus pengguna "${user.name}". Tindakan ini tidak dapat dibatalkan.`
              : "Anda akan menghapus pengguna ini."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={isSubmitting} onClick={onConfirm}>
            {isSubmitting ? "Menghapus..." : "Hapus"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
