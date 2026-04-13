import { useEffect, useCallback } from 'react'
import { useVaultStore } from '../store'
import { apiClient } from '../api'
import { Vault } from '../store'

/**
 * Hook to poll selected vault state every 5 seconds
 * Automatically updates store when vault state changes
 */
export function useVaultPolling(vaultId: string | null) {
  const { selectedVaultId, setVaults, vaults, setError } = useVaultStore()

  const fetchVaultState = useCallback(async () => {
    const id = vaultId || selectedVaultId
    if (!id) return

    try {
      const vaultData = await apiClient.getVault(id)

      // Update vault in store
      setVaults(
        vaults.map((v) => (v.vault_id === id ? (vaultData as Vault) : v))
      )
      setError(null)
    } catch (error) {
      console.error(`Failed to poll vault ${id}:`, error)
      // Don't show error on polling failure, just log it
    }
  }, [vaultId, selectedVaultId, vaults, setVaults, setError])

  useEffect(() => {
    if (!vaultId && !selectedVaultId) return

    // Initial fetch
    fetchVaultState()

    // Poll every 5 seconds
    const interval = setInterval(fetchVaultState, 5000)

    return () => clearInterval(interval)
  }, [vaultId, selectedVaultId, fetchVaultState])

  const selectedVault = vaults.find(
    (v) => v.vault_id === (vaultId || selectedVaultId)
  )

  return {
    vault: selectedVault || null,
    refetch: fetchVaultState,
  }
}
