import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { SOLANA_RPC } from '@/lib/constants'
import { WALLET_ADAPTERS, getWalletNetwork } from '@/lib/wallet-config'
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
        <ConnectionProvider endpoint={SOLANA_RPC}>
          <WalletProvider wallets={WALLET_ADAPTERS} autoConnect>
            <WalletModalProvider>{children}</WalletModalProvider>
          </WalletProvider>
        </ConnectionProvider>
      </body>
    </html>
  )
}

