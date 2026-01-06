import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'

export const metadata: Metadata = {
  title: 'JKAP Memorial League | MLB The Show Online League',
  description: 'The premier MLB The Show online league experience. Compete, manage, and dominate with the JKAP Memorial League Front Office ecosystem.',
  keywords: ['MLB The Show', 'online league', 'baseball', 'gaming', 'esports', 'franchise'],
  authors: [{ name: 'JKAP Memorial League' }],
  openGraph: {
    title: 'JKAP Memorial League',
    description: 'The premier MLB The Show online league experience',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="antialiased bg-background text-foreground min-h-screen">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
