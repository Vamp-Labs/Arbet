import { useEffect, useCallback } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useVaultStore } from '../store'
import { apiClient } from '../api'

/**
 * Hook to fetch vaults for the connected user
 * In MVP, this fetches all vaults (no auth filtering)
 * Future: filter by wallet authority
 */
export function useUserVaults() {
  const { publicKey, connected } = useWallet()
  const { vaults, setVaults, setLoading, setError } = useVaultStore()

  const fetchVaults = useCallback(async () => {
    if (!connected || !publicKey) {
      setVaults([])
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Fetch all vaults (in production, filter by authority = publicKey.toString())
      const opportunities = await apiClient.getOpportunities()

      // For MVP, we fetch all vaults from health endpoint
      // This is a placeholder - in production, add dedicated GET /vaults endpoint
      const response = await fetch(`${apiClient['client'].defaults.baseURL}/vault/test`, {
        method: 'GET',
      })

      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch vaults')
      }

      // For now, initialize with empty array until backend provides vault listing
      setVaults([])
    } catch (error) {
      console.error('Failed to fetch vaults:', error)
      setError('Failed to load vaults')
    } finally {
      setLoading(false)
    }
  }, [connected, publicKey, setVaults, setLoading, setError])

  // Fetch vaults when wallet connects
  useEffect(() => {
    if (connected && publicKey) {
      fetchVaults()
    }
  }, [connected, publicKey, fetchVaults])

  const createVault = useCallback(
    async (vaultId: string, initialBalance: number) => {
      if (!publicKey) {
        throw new Error('Wallet not connected')
      }

      try {
        setLoading(true)
        setError(null)

        const response = await apiClient.createVault(
          vaultId,
          publicKey.toString(),
          initialBalance
        )

        if (!response) {
          throw new Error('Failed to create vault')
        }

        // Refresh vaults list
        await fetchVaults()
        return response
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create vault'
        setError(message)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [publicKey, setLoading, setError, fetchVaults]
  )

  return {
    vaults,
    isLoading: useVaultStore((s) => s.isLoading),
    error: useVaultStore((s) => s.error),
    fetchVaults,
    createVault,
  }
}
