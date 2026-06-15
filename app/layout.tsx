import type { Metadata } from 'next'

const APP_NAME = 'PA ERP API'
const APP_DESCRIPTION = 'Headless API service for PA ERP Toko Bangunan.'

export const metadata: Metadata = {
  title: APP_NAME,
  description: APP_DESCRIPTION,
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
