import { headers } from "next/headers"
import ProductsClientPage from "@/app/products/client-page"
import { fetchProductsInitialSnapshot } from "@/app/products/_lib/products-server-snapshot"

export default async function ProductsPage() {
  await headers()
  const initialSnapshot = fetchProductsInitialSnapshot()

  return <ProductsClientPage initialSnapshot={initialSnapshot} />
}
