import { handleUserDelete, handleUserPatch } from '@/app/api/(users)/_controller/users-controller'

type RouteContext = { params: { id: string } | Promise<{ id: string }> }

export async function PATCH(_request: Request, ctx: RouteContext) {
  return handleUserPatch(_request, ctx)
}

export async function DELETE(request: Request, ctx: RouteContext) {
  return handleUserDelete(request, ctx)
}
