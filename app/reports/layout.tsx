import { requireSession } from '@/lib/auth/ssr-guard'

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  await requireSession()
  return children
}
