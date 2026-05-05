import { handlePosSalesPost } from "@/app/api/(pos)/_controller/pos-sales-controller"

export async function POST(request: Request) {
  return handlePosSalesPost(request)
}
