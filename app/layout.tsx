import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import 'leaflet/dist/leaflet.css'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'fckblrrealestate — Bengaluru Builder Fraud Exposed',
  description: 'RERA Karnataka data vs what builders advertise. The truth about Bengaluru real estate.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-950 text-white`}>{children}</body>
    </html>
  )
}
