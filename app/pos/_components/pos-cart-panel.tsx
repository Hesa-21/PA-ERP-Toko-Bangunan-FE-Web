"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ShoppingCart, CreditCard } from "lucide-react"
import type { PriceTier } from "@/lib/domain/types"
import type { PosProductDto, PosWarehouseZoneDto } from "@/app/pos/_api-clients/pos"

type CartItem = PosProductDto & {
  quantity: number
  unitPrice: number
  discount: number
  priceTier: PriceTier
  receivingDefaultWarehouseId?: string
}

type CustomerDraft = { name: string; address: string; phone: string }

type PosCartPanelProps = {
  cart: CartItem[]
  zones: PosWarehouseZoneDto[]
  discountInputs: Record<string, string>
  totals: {
    subtotal: number
    perItemDiscountTotal: number
    subtotalAfterItemDiscount: number
    orderDiscountApplied: number
    grandTotal: number
  }
  priceTierLabel: Record<PriceTier, string>
  isCRUD: boolean
  customer: CustomerDraft
  salespersonName: string
  paymentStatus: "tunai" | "tempo"
  dueDateInput: string
  paidAmountInput: string
  orderDiscountInput: string
  isSubmittingPayment: boolean
  isCustomerValid: boolean
  isSalespersonValid: boolean
  onRemoveFromCart: (sku: string) => void
  onUpdateQuantity: (sku: string, nextQty: number) => void
  onDiscountInputChange: (sku: string, value: string) => void
  onDiscountInputBlur: (sku: string) => void
  onSetCustomer: (updater: CustomerDraft | ((prev: CustomerDraft) => CustomerDraft)) => void
  onSetSalespersonName: (value: string) => void
  onSetPaymentStatus: (value: "tunai" | "tempo") => void
  onSetPaidAmountInput: (value: string) => void
  onSetDueDateInput: (value: string) => void
  onSetOrderDiscount: (value: number) => void
  onSetOrderDiscountInput: (value: string) => void
  onProcessPayment: () => void
}

export function PosCartPanel(props: PosCartPanelProps) {
  const {
    cart,
    zones,
    discountInputs,
    totals,
    priceTierLabel,
    isCRUD,
    customer,
    salespersonName,
    paymentStatus,
    dueDateInput,
    paidAmountInput,
    orderDiscountInput,
    isSubmittingPayment,
    isCustomerValid,
    isSalespersonValid,
    onRemoveFromCart,
    onUpdateQuantity,
    onDiscountInputChange,
    onDiscountInputBlur,
    onSetCustomer,
    onSetSalespersonName,
    onSetPaymentStatus,
    onSetPaidAmountInput,
    onSetDueDateInput,
    onSetOrderDiscount,
    onSetOrderDiscountInput,
    onProcessPayment,
  } = props

  const {
    subtotal,
    perItemDiscountTotal,
    subtotalAfterItemDiscount,
    orderDiscountApplied,
    grandTotal,
  } = totals
  const controlsDisabled = !isCRUD || isSubmittingPayment

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          Keranjang ({cart.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 space-y-3 mb-4 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Keranjang kosong</p>
          ) : (
            cart.map((item) => (
              <div key={item.sku} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    {(() => {
                      const zoneId = String(item.receivingDefaultWarehouseId ?? "").trim()
                      const zoneName = zoneId ? zones.find((z) => z.id === zoneId)?.name ?? zoneId : "-"
                      const zoneLabel = zoneName === "-" ? "-" : /^zona\b/i.test(zoneName) ? zoneName : `Zona ${zoneName}`
                      return (
                        <>
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-sm text-gray-600">
                      <span className="text-xs opacity-70 mr-2">{item.sku}</span>
                      {zoneLabel}
                    </p>
                        </>
                      )
                    })()}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveFromCart(item.sku)}
                    className="text-red-600"
                    disabled={controlsDisabled}
                  >
                    Hapus
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Harga {priceTierLabel[item.priceTier]} (daftar harga)</span>
                    <div className="font-semibold">Rp {item.unitPrice.toLocaleString()}</div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Diskon per item (Rp)</span>
                    <Input
                      type="number"
                      min={0}
                      value={discountInputs[item.sku] ?? (item.discount > 0 ? String(item.discount) : "")}
                      onChange={(e) => onDiscountInputChange(item.sku, e.target.value)}
                      onBlur={() => onDiscountInputBlur(item.sku)}
                      disabled={controlsDisabled}
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Jumlah</span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.sku, item.quantity - 1)}
                        disabled={controlsDisabled}
                      >
                        -
                      </Button>
                      <span className="w-10 text-center font-semibold">{item.quantity}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateQuantity(item.sku, item.quantity + 1)}
                        disabled={controlsDisabled}
                      >
                        +
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="space-y-4">
            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">Jumlah sebelum diskon:</span>
                <span className="font-semibold">Rp {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Diskon per item:</span>
                <span>- Rp {perItemDiscountTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span>Jumlah setelah diskon item:</span>
                <span>Rp {subtotalAfterItemDiscount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm flex-1 min-w-0">
                  <span className="whitespace-nowrap">Diskon pesanan (Rp):</span>
                  <Input
                    className="w-28 h-9"
                    type="number"
                    min={0}
                    value={orderDiscountInput}
                    onChange={(e) => onSetOrderDiscountInput(e.target.value)}
                    onBlur={() => {
                      const v = Number(orderDiscountInput) || 0
                      onSetOrderDiscount(v)
                      onSetOrderDiscountInput(v > 0 ? String(v) : "")
                    }}
                    disabled={controlsDisabled}
                    inputMode="numeric"
                  />
                </div>
                <span className="whitespace-nowrap">- Rp {orderDiscountApplied.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold border-t pt-2">
                <span>Total Bayar:</span>
                <span>Rp {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
                <div className="space-y-1">
                  <span className="text-sm font-medium">Pelanggan</span>
                  <Input
                    placeholder="Nama pelanggan"
                    value={customer.name}
                    onChange={(e) => onSetCustomer((prev) => ({ ...prev, name: e.target.value }))}
                    disabled={controlsDisabled}
                  />
                  <Textarea
                    placeholder="Alamat pelanggan"
                    value={customer.address}
                    onChange={(e) => onSetCustomer((prev) => ({ ...prev, address: e.target.value }))}
                    disabled={controlsDisabled}
                    className="min-h-[72px]"
                  />
                  <Input
                    placeholder="Nomor telepon pelanggan (opsional)"
                    value={customer.phone}
                    onChange={(e) => onSetCustomer((prev) => ({ ...prev, phone: e.target.value }))}
                    disabled={controlsDisabled}
                  />
                  {isCRUD && cart.length > 0 && !isCustomerValid && (
                    <p className="text-xs text-red-600">Nama dan alamat pelanggan wajib diisi.</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Tenaga Penjual</span>
                <Input
                  placeholder="Nama tenaga penjual"
                  value={salespersonName}
                  onChange={(e) => onSetSalespersonName(e.target.value)}
                  disabled={controlsDisabled}
                />
                {isCRUD && cart.length > 0 && !isSalespersonValid && (
                  <p className="text-xs text-red-600">Tenaga penjual wajib diisi.</p>
                )}
              </div>

              <div className="space-y-1">
                <span className="text-sm font-medium">Status Pembayaran</span>
                <Select disabled={controlsDisabled} value={paymentStatus} onValueChange={(v) => onSetPaymentStatus(v as "tunai" | "tempo")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tunai">Tunai</SelectItem>
                    <SelectItem value="tempo">Tempo / Kredit</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Tempo akan tercatat sebagai piutang. Tunai langsung mencatat kas/bank.
                </p>
              </div>

              {paymentStatus === "tempo" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <span className="text-sm font-medium">DP (opsional)</span>
                    <Input
                      placeholder="0"
                      type="number"
                      min={0}
                      value={paidAmountInput}
                      onChange={(e) => onSetPaidAmountInput(e.target.value)}
                      disabled={controlsDisabled}
                      inputMode="numeric"
                    />
                    <p className="text-xs text-muted-foreground">
                      Isi 0 untuk tempo tanpa DP. Jika isi DP, sisanya menjadi piutang.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Jatuh Tempo</span>
                    <Input
                      type="date"
                      value={dueDateInput}
                      onChange={(e) => onSetDueDateInput(e.target.value)}
                      disabled={controlsDisabled}
                    />
                    {isCRUD && !dueDateInput.trim() && (
                      <p className="text-xs text-red-600">Jatuh tempo wajib diisi untuk transaksi tempo.</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Button
                  className="w-full"
                  size="lg"
                  disabled={
                    controlsDisabled ||
                    !isCustomerValid ||
                    !isSalespersonValid ||
                    (paymentStatus === "tempo" && !dueDateInput.trim())
                  }
                  title={
                    controlsDisabled
                      ? isSubmittingPayment
                        ? "Transaksi sedang diproses"
                        : "Tidak diizinkan"
                      : !isCustomerValid
                        ? "Isi nama & alamat pelanggan dulu"
                        : !isSalespersonValid
                          ? "Isi tenaga penjual dulu"
                          : paymentStatus === "tempo" && !dueDateInput.trim()
                            ? "Isi jatuh tempo dulu"
                            : undefined
                  }
                  onClick={onProcessPayment}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  {isSubmittingPayment ? "Memproses transaksi..." : `Simpan & Proses Pembayaran (${paymentStatus === "tunai" ? "Tunai" : "Tempo"})`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
