import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lily — She remembers so you can start',
  description:
    'A proactive reminder assistant that lives in WhatsApp. Tell her what you need to do — she remembers, and shows up at the right moment with just enough to get you going.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
