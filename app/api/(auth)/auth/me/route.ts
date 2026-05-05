import { handleAuthMeGet } from "@/app/api/(auth)/_controller/auth-me-controller"

export async function GET(request: Request) {
  return handleAuthMeGet(request)
}