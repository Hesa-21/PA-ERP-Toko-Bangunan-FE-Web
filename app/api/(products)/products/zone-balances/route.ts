import { handleProductZoneBalancesGet } from "@/app/api/(products)/_controller/product-zone-balances-controller"

export async function GET(request: Request) {
  return handleProductZoneBalancesGet(request)
}
