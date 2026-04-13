import { useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletStore } from '../store'

/**
 * Hook to poll wallet balance every 30 seconds
 * Automatically updates store when balance changes
 */
export function useWalletBalance() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { balance, setBalance, setLoadingBalance } = useWalletStore()

  useEffect(() => {
    if (!publicKey || !connection) {
      setBalance(0)
      return
    }

    // Fetch balance immediately
    const fetchBalance = async () => {
      try {
        setLoadingBalance(true)
        const lamports = await connection.getBalance(publicKey)
        setBalance(lamports)
      } catch (error) {
        console.error('Failed to fetch balance:', error)
        // Don't clear balance on error, use last known value
      } finally {
        setLoadingBalance(false)
      }
    }

    // Initial fetch
    fetchBalance()

    // Poll every 30 seconds
    const interval = setInterval(fetchBalance, 30000)

    return () => clearInterval(interval)
  }, [publicKey, connection, setBalance, setLoadingBalance])

  return { balance }
}
