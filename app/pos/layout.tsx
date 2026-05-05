import { requireSession } from '@/lib/auth/ssr-guard'

export default async function PosLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
