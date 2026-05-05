import { type NextRequest } from 'next/server'
import { handleUserPasswordPatch } from '@/app/api/(users)/_controller/users-password-controller'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  return handleUserPasswordPatch(request, ctx)
}
