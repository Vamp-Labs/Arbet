'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '@/lib/store'
import { useEffect } from 'react'

/**
 * WalletConnect Component
 * Displays wallet connection button with address and balance display
 * Note: WalletMultiButton is provided by wallet-adapter-react-ui
 * and should be used in the header via the pre-built UI component
 */
export function WalletConnect() {
  const { publicKey, connected } = useWallet()
  const { address, balance, isLoadingBalance } = useWalletStore()
  const { setPublicKey } = useWalletStore()

  // Sync wallet context to store
  useEffect(() => {
    setPublicKey(publicKey || null)
  }, [publicKey, setPublicKey])

  // Format balance in SOL
  const balanceSol = (balance / 1_000_000_000).toFixed(4)

  return (
    <div className="flex items-center gap-4">
      {connected && address ? (
        <>
          <div className="text-sm text-gray-400">
            <div className="text-xs uppercase tracking-wide">Balance</div>
            <div className="text-white font-semibold">
              {isLoadingBalance ? '...' : `${balanceSol} SOL`}
            </div>
          </div>
          <div className="text-sm text-gray-400">
            <div className="text-xs uppercase tracking-wide">Wallet</div>
            <div className="text-white font-mono text-sm">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>
          </div>
        </>
      ) : (
        <div className="text-sm text-gray-400">Wallet not connected</div>
      )}
    </div>
  )
}

