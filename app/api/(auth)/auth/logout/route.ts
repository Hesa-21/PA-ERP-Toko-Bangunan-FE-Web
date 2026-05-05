import { handleAuthLogoutPost } from "@/app/api/(auth)/_controller/auth-logout-controller"

export async function POST() {
  return handleAuthLogoutPost()
}
