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

export function CancelSaleDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  isCRUD: boolean
  isCancelling: boolean
  cancelError: string
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={props.open} onOpenChange={props.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Batalkan transaksi?</AlertDialogTitle>
          <AlertDialogDescription>
            Transaksi akan dibatalkan (VOID). Untuk transaksi POSTED, stok akan dikembalikan.
          </AlertDialogDescription>
          {props.cancelError && <p className="text-sm text-red-600">{props.cancelError}</p>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={props.isCancelling}>Batal</AlertDialogCancel>
          <AlertDialogAction disabled={!props.isCRUD || props.isCancelling} onClick={() => props.onConfirm()}>
            {props.isCancelling ? "Membatalkan..." : "Ya, batalkan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
