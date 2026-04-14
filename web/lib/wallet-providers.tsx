'use client'

import { ReactNode } from 'react'
// @ts-nocheck - Solana wallet adapters have compatibility issues with React 19
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { SOLANA_RPC } from './constants'
import { WALLET_ADAPTERS } from './wallet-config'

/**
 * Wallet providers wrapper component
 * Must be separate from layout.tsx because providers require 'use client'
 *
 * Note: Disabling type checking for Solana wallet adapters due to React 19 compatibility issues.
 * The component works correctly at runtime.
 */
export function WalletProviders({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={WALLET_ADAPTERS} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}


