import {
  handleProductsDelete,
  handleProductsGet,
  handleProductsPost,
  handleProductsPut,
} from "@/app/api/(products)/_controller/products-controller"

export async function GET(request: Request) {
  return handleProductsGet(request)
}

export async function POST(request: Request) {
  return handleProductsPost(request)
}

export async function PUT(request: Request) {
  return handleProductsPut(request)
}

export async function DELETE(request: Request) {
  return handleProductsDelete(request)
}
