const base = "http://localhost:3000"

async function call(path, options = {}) {
  try {
    const res = await fetch(base + path, options)
    return { status: res.status, headers: res.headers, body: await res.text() }
  } catch (error) {
    return { status: -1, error: String(error) }
  }
}

async function main() {
  const login = await call("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "owner@buildingstore.com", password: "ownerpass1" }),
  })

  const setCookie = login.headers?.get("set-cookie") ?? ""
  const cookie = (setCookie.split(";")[0] ?? "").trim()

  const authed = (path, options = {}) => {
    const headers = { ...(options.headers ?? {}), cookie }
    return call(path, { ...options, headers })
  }

  const list = await authed("/api/sales?branchId=branch-a&page=1&limit=5")

  let saleId = "missing-sale-id"
  try {
    const payload = JSON.parse(list.body || "{}")
    if (Array.isArray(payload.items) && payload.items[0]?.id) {
      saleId = String(payload.items[0].id)
    }
  } catch {
    // ignore parse failure for smoke
  }

  const missingBranch = await authed("/api/sales?page=1&limit=5")
  const summary = await authed("/api/sales/summary?branchId=branch-a")
  const weekly = await authed("/api/sales/weekly?branchId=branch-a")
  const exportMissingDates = await authed("/api/sales/export?branchId=branch-a")
  const exportWithDates = await authed("/api/sales/export?branchId=branch-a&from=2026-03-01&to=2026-03-28")

  const detail = await authed(`/api/sales/${encodeURIComponent(saleId)}?branchId=branch-a`)
  const print = await authed(`/api/sales/print?saleId=${encodeURIComponent(saleId)}&branchId=branch-a`)
  const printNoPrice = await authed(`/api/sales/print-no-price?saleId=${encodeURIComponent(saleId)}&branchId=branch-a`)
  const detailPrint = await authed(`/api/sales/${encodeURIComponent(saleId)}/print?branchId=branch-a`)
  const detailPrintNoPrice = await authed(`/api/sales/${encodeURIComponent(saleId)}/print-no-price?branchId=branch-a`)

  const logout = await authed("/api/auth/logout", { method: "POST" })

  console.log(`login=${login.status}`)
  console.log(`sales_list=${list.status}`)
  console.log(`sales_missing_branch=${missingBranch.status}`)
  console.log(`sales_summary=${summary.status}`)
  console.log(`sales_weekly=${weekly.status}`)
  console.log(`sales_export_missing_dates=${exportMissingDates.status}`)
  console.log(`sales_export_with_dates=${exportWithDates.status}`)
  console.log(`sales_detail=${detail.status}`)
  console.log(`sales_print=${print.status}`)
  console.log(`sales_print_no_price=${printNoPrice.status}`)
  console.log(`sales_detail_print=${detailPrint.status}`)
  console.log(`sales_detail_print_no_price=${detailPrintNoPrice.status}`)
  console.log(`logout=${logout.status}`)
  console.log(`sample_sale_id=${saleId}`)
}

main().catch((error) => {
  console.error("smoke_error", error)
  process.exit(1)
})
