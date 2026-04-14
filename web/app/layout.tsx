import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { WalletProviders } from '@/lib/wallet-providers'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Arbet Agents',
  description: 'Autonomous AI agent swarm for Solana prediction market arbitrage',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  )
}



