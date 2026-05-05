import { handleUsersGet, handleUsersPost } from '@/app/api/(users)/_controller/users-controller'

export async function GET(request: Request) {
  return handleUsersGet(request)
}

export async function POST(request: Request) {
  return handleUsersPost(request)
}
