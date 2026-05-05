import { computeSalesTotal, normalizeSalesPayment } from "@/lib/domain"
import { ensureBranchState, getSale } from "@/lib/server/mock-db"
import { formatDateTimeId } from "@/lib/utils/date"

function escapeHtml(v: string) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function renderSalesPrintHtml(input: { branchId: string; saleId: string; withPrice: boolean }): string {
  const doc = getSale(input.branchId, input.saleId)

  const state = ensureBranchState(input.branchId)
  const nameBySku = new Map(state.products.map((p) => [String(p.sku ?? "").toLowerCase(), String(p.name ?? "")] ))

  const when = doc.postedAt ?? doc.createdAt
  const whenLabel = formatDateTimeId(String(when ?? ""))

  const itemsHtml = (doc.items ?? [])
    .map((item) => {
      const sku = String(item.sku ?? "").trim()
      const name = nameBySku.get(sku.toLowerCase())?.trim() || sku || "-"
      const qty = Math.max(0, Math.trunc(Number(item.quantity) || 0))

      if (!input.withPrice) {
        return `
          <div class="item">
            <div>
              <div>${escapeHtml(name)}</div>
              <div style="font-size: 10px; color: #666;">${qty} x ${escapeHtml(sku)}</div>
            </div>
            <div class="right">${qty}</div>
          </div>
        `
      }

      const unitPrice = Math.max(0, Number(item.unitPrice) || 0)
      const discount = Math.max(0, Math.min(Number(item.discount) || 0, unitPrice))
      const lineTotal = Math.max(0, (unitPrice - discount) * qty)
      const discountLabel = discount > 0 ? ` (Diskon: ${discount.toLocaleString()})` : ""

      return `
        <div class="item">
          <div>
            <div>${escapeHtml(name)}</div>
            <div style="font-size: 10px; color: #666;">${qty} x ${unitPrice.toLocaleString()}${discountLabel}</div>
          </div>
          <div class="right">${lineTotal.toLocaleString()}</div>
        </div>
      `
    })
    .join("")

  const subtotalAfterItemDiscount = input.withPrice
    ? (doc.items ?? []).reduce((sum, item) => {
        const qty = Math.max(0, Math.trunc(Number(item.quantity) || 0))
        const unitNet = Math.max(0, (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))
        return sum + unitNet * qty
      }, 0)
    : 0

  const orderDiscountApplied = input.withPrice
    ? Math.max(0, Math.min(Number(doc.orderDiscount) || 0, subtotalAfterItemDiscount))
    : 0

  const grandTotal = input.withPrice ? Math.max(0, computeSalesTotal(doc)) : 0

  const paidCurrent = Math.max(0, Number(doc.paidAmount ?? 0) || 0)
  const { paidAmount, remaining } = input.withPrice
    ? normalizeSalesPayment({ total: grandTotal, paidAmountInput: paidCurrent })
    : { paidAmount: 0, remaining: 0 }

  const paymentLabel = doc.paymentStatus === "tunai" ? "Tunai" : paidAmount > 0 ? "DP" : "Tempo"

  const paymentDetailsHtml =
    doc.paymentStatus === "tunai"
      ? `
          <div class="row"><div>Dibayar</div><div class="right">Rp ${grandTotal.toLocaleString()}</div></div>
        `
      : `
          <div class="row"><div>DP</div><div class="right">Rp ${paidAmount.toLocaleString()}</div></div>
          <div class="row"><div>Sisa</div><div class="right">Rp ${remaining.toLocaleString()}</div></div>
          <div class="row"><div>Jatuh Tempo</div><div class="right">${remaining > 0 && doc.dueDate ? new Date(doc.dueDate).toLocaleDateString("id-ID") : "-"}</div></div>
        `

  return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Nota ${escapeHtml(doc.id)}</title>
          <style>
            body { font-family: 'Courier New', Courier, monospace; font-size: 12px; width: 320px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .divider { border-top: 1px dashed black; margin: 10px 0; }
            .row { display: flex; justify-content: space-between; margin-bottom: 2px; gap: 12px; }
            .right { text-align: right; }
            h3 { margin: 0 0 5px 0; }
            p { margin: 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3 style="margin-bottom: 2px;">BINTAMA SWALAYAN BANGUNAN</h3>
            <p>JL. Raya Daendels BARAT SPBU Paciran</p>
            <p>Telp. 0823-5419-0111</p>
          </div>
          <div class="divider"></div>
          <div class="row"><div>No. Transaksi</div><div class="right">${escapeHtml(doc.id)}</div></div>
          <div class="row"><div>Tanggal</div><div class="right">${escapeHtml(whenLabel)}</div></div>
          <div class="row"><div>Tenaga Penjual</div><div class="right">${escapeHtml(String(doc.salespersonName || "-"))}</div></div>
          <div class="divider"></div>
          <div class="row"><div>Pelanggan</div><div class="right">${escapeHtml(String(doc.customerName || "-"))}</div></div>
          <div class="row"><div>Alamat</div><div class="right">${escapeHtml(String(doc.customerAddress || "-"))}</div></div>
          <div class="row"><div>Telepon</div><div class="right">${escapeHtml(String(doc.customerPhone || "-"))}</div></div>
          <div class="divider"></div>
          <div class="items">${itemsHtml || ""}</div>
          <div class="divider"></div>
          ${
            input.withPrice
              ? `${orderDiscountApplied > 0 ? `<div class="row"><div>Diskon Pesanan</div><div class="right">- Rp ${orderDiscountApplied.toLocaleString()}</div></div>` : ""}
          <div class="row"><div>Total</div><div class="right">Rp ${grandTotal.toLocaleString()}</div></div>
          <div class="row"><div>Pembayaran</div><div class="right">${escapeHtml(paymentLabel)}</div></div>
          ${paymentDetailsHtml}`
              : ""
          }
          <div class="divider"></div>
          <p style="text-align:center;">Terima kasih</p>
          <script>
            window.onload = () => {
              window.print();
              window.onafterprint = () => window.close();
            }
          </script>
        </body>
      </html>
    `
}
