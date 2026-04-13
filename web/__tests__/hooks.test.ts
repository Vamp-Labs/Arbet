import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { renderHook, waitFor } from '@testing-library/react'
import { useVaultPolling } from '../lib/hooks/useVaultPolling'
import { useVaultStore } from '../lib/store'
import * as api from '../lib/api'

// Mock the API
jest.mock('../lib/api', () => ({
  apiClient: {
    getVault: jest.fn(),
  },
}))

describe('Hooks', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Reset store
    useVaultStore.setState({
      vaults: [],
      selectedVaultId: null,
      isLoading: false,
      error: null,
    })
  })

  describe('useVaultPolling', () => {
    const mockVault = {
      vault_id: 'test-vault',
      authority: 'auth123',
      balance: 5_000_000_000,
      initial_balance: 10_000_000_000,
      cumulative_pnl: -5_000_000_000,
      num_trades: 10,
      max_balance: 10_000_000_000,
      min_balance: 5_000_000_000,
      position_limit_bps: 500,
      max_drawdown_bps: 1000,
      is_paused: false,
    }

    it('returns null vault when no vault ID provided', () => {
      const { result } = renderHook(() => useVaultPolling(null))

      expect(result.current.vault).toBeNull()
    })

    it('fetches vault data on mount', async () => {
      const mockedGetVault = api.apiClient.getVault as jest.Mock
      mockedGetVault.mockResolvedValue(mockVault)

      useVaultStore.setState({ vaults: [mockVault], selectedVaultId: 'test-vault' })

      const { result } = renderHook(() => useVaultPolling('test-vault'))

      await waitFor(() => {
        expect(mockedGetVault).toHaveBeenCalledWith('test-vault')
      })
    })

    it('does not fetch if no vault ID', () => {
      const mockedGetVault = api.apiClient.getVault as jest.Mock

      renderHook(() => useVaultPolling(null))

      expect(mockedGetVault).not.toHaveBeenCalled()
    })

    it('provides refetch function', async () => {
      const mockedGetVault = api.apiClient.getVault as jest.Mock
      mockedGetVault.mockResolvedValue(mockVault)

      useVaultStore.setState({ vaults: [mockVault], selectedVaultId: 'test-vault' })

      const { result } = renderHook(() => useVaultPolling('test-vault'))

      // Call refetch
      await result.current.refetch()

      expect(mockedGetVault).toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      const mockedGetVault = api.apiClient.getVault as jest.Mock
      mockedGetVault.mockRejectedValue(new Error('API error'))

      useVaultStore.setState({ vaults: [mockVault], selectedVaultId: 'test-vault' })

      const { result } = renderHook(() => useVaultPolling('test-vault'))

      // Should not throw
      await waitFor(() => {
        expect(mockedGetVault).toHaveBeenCalled()
      })

      // Vault should remain null
      expect(result.current.vault).toBeNull()
    })
  })
})
