import { handleAuthLoginPost } from "@/app/api/(auth)/_controller/auth-login-controller"

export async function POST(request: Request) {
  return handleAuthLoginPost(request)
}
