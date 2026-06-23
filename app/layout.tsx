import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/AuthProvider'

export const metadata: Metadata = {
  title: 'ActMap — 今、近くで何してる？',
  description: '活動を地図上でリアルタイムシェア。近くの人と一緒に動こう。',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className="h-full">
      <body className="h-full overflow-hidden bg-[#0A0F1E] antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
