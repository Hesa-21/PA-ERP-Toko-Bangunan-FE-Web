import { getDefaultWarehouseZoneId, getProducts, getPurchase, getWarehouse } from "@/lib/server/mock-db"
import { formatDateId } from "@/lib/utils/date"

function escapeHtml(v: string) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function renderPurchasePrintHtml(input: { branchId: string; purchaseId: string }): string {
  const doc = getPurchase(input.branchId, input.purchaseId)
  const warehouse = getWarehouse(input.branchId)
  const defaultZoneId = getDefaultWarehouseZoneId(input.branchId)

  const zoneNameById = new Map((warehouse.zones ?? []).map((z) => [String(z.id ?? ""), String(z.name ?? "")]))
  const products = getProducts(input.branchId)
  const productBySku = new Map(products.map((p) => [String(p.sku ?? "").trim().toLowerCase(), p]))

  const zoneLabelForLine = (line: { sku?: string; warehouseId?: string }): string => {
    const fromLine = String(line.warehouseId ?? "").trim()
    if (fromLine) {
      const name = zoneNameById.get(fromLine)
      return name ? `${name} (${fromLine})` : fromLine
    }

    const skuKey = String(line.sku ?? "").trim().toLowerCase()
    const p = skuKey ? productBySku.get(skuKey) : undefined
    const derived = String(doc.warehouseId ?? defaultZoneId ?? "").trim()
    if (!derived) return "(Default)"
    const name = zoneNameById.get(derived)
    return name ? `${name} (${derived})` : derived
  }

  const itemsRows = (doc.items ?? [])
    .map((it, idx) => {
      const qtyOrder = Math.max(0, Math.trunc(Number(it.quantity) || 0))
      const qtyRecv = Math.max(0, Math.trunc(Number(it.receivedQty) || 0))
      const zone = zoneLabelForLine(it)
      const skuKey = String(it.sku ?? "").trim().toLowerCase()
      const name = String(productBySku.get(skuKey)?.name ?? "").trim()

      return `
          <tr>
            <td class="c">${idx + 1}</td>
            <td>
              <div><b>${escapeHtml(String(it.sku ?? ""))}</b></div>
              ${name ? `<div style="font-size: 11px; color: #444; margin-top: 2px;">${escapeHtml(name)}</div>` : ""}
            </td>
            <td class="r">${qtyOrder}</td>
            <td class="r">${doc.postedAt ? qtyRecv : "-"}</td>
            <td>${escapeHtml(zone)}</td>
          </tr>
        `
    })
    .join("")

  return `
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Surat Jalan ${escapeHtml(doc.id)}</title>
          <style>
            @page { size: A4; margin: 12mm; }
            body { font-family: Arial, sans-serif; font-size: 12px; color: #111; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; }
            .brand h1 { font-size: 16px; margin: 0 0 2px 0; }
            .brand div { font-size: 11px; margin: 0; color: #333; }
            .doc-title { text-align: right; }
            .doc-title h2 { margin: 0; font-size: 16px; }
            .doc-title div { font-size: 11px; color: #333; }
            .divider { border-top: 1px solid #ddd; margin: 10px 0; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
            .meta .box { border: 1px solid #ddd; padding: 8px; border-radius: 6px; }
            .meta .row { display: flex; justify-content: space-between; gap: 12px; margin: 2px 0; }
            .meta .k { color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 6px; vertical-align: top; }
            th { background: #f6f6f6; text-align: left; }
            td.c, th.c { text-align: center; }
            td.r, th.r { text-align: right; }
            .sign { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 22px; }
            .sign .box { border: 1px solid #ddd; height: 90px; border-radius: 6px; padding: 8px; }
            .sign .label { font-size: 11px; color: #555; margin-bottom: 6px; }
            .sign .value { font-size: 12px; margin-top: 18px; }
            .sign .value b { font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="brand">
              <h1>BINTAMA SWALAYAN BANGUNAN</h1>
              <div>JL. Raya Daendels BARAT SPBU Paciran</div>
              <div>Telp. 0823-5419-0111</div>
            </div>
            <div class="doc-title">
              <h2>SURAT JALAN (PEMBELIAN)</h2>
              <div>No. PO: <b>${escapeHtml(doc.id)}</b></div>
            </div>
          </div>

          <div class="divider"></div>

          <div class="meta">
            <div class="box">
              <div class="row"><div class="k">Supplier</div><div><b>${escapeHtml(doc.supplierName || "-")}</b></div></div>
              <div class="row"><div class="k">Telp Supplier</div><div>${escapeHtml(doc.supplierPhone || "-")}</div></div>
              <div class="row"><div class="k">Alamat Supplier</div><div>${escapeHtml(doc.supplierAddress || "-")}</div></div>
              <div class="row"><div class="k">Tanggal PO</div><div>${escapeHtml(formatDateId(doc.createdAt))}</div></div>
              <div class="row"><div class="k">Perkiraan Tiba</div><div>${escapeHtml(doc.expectedDelivery ? formatDateId(doc.expectedDelivery) : "-")}</div></div>
              <div class="row"><div class="k">Tanggal Terima</div><div>${escapeHtml(doc.postedAt ? formatDateId(doc.postedAt) : "-")}</div></div>
            </div>
            <div class="box">
              <div class="row"><div class="k">Pembuat</div><div>${escapeHtml(doc.createdBy || "-")}</div></div>
              <div class="row"><div class="k">Pembayaran</div><div>${escapeHtml(doc.paymentStatus === "tempo" ? "Tempo" : "Tunai")}</div></div>
              <div class="row"><div class="k">Catatan</div><div>${escapeHtml(doc.note || "-")}</div></div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="c" style="width: 34px;">No</th>
                <th style="width: 160px;">SKU</th>
                <th class="r" style="width: 90px;">Qty PO</th>
                <th class="r" style="width: 90px;">Qty Terima</th>
                <th>Zona Tujuan</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows || '<tr><td colspan="5" class="c">Tidak ada item</td></tr>'}
            </tbody>
          </table>

          <div class="sign">
            <div class="box">
              <div class="label">Dibuat oleh</div>
              <div class="value"><b>${escapeHtml(doc.createdBy || "-")}</b></div>
            </div>
            <div class="box">
              <div class="label">Dikirim oleh (Supplier)</div>
              <div class="value"><b>${escapeHtml(doc.supplierName || "-")}</b></div>
            </div>
            <div class="box">
              <div class="label">Diterima oleh</div>
              <div class="value"><b>${escapeHtml(doc.postedBy || "-")}</b></div>
            </div>
          </div>

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
