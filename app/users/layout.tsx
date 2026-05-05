import { requireSession } from '@/lib/auth/ssr-guard'

export default async function UsersLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
