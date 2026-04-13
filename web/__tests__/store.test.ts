import { describe, it, expect, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import {
  useWalletStore,
  useVaultStore,
  getVaultMetrics,
  Vault,
} from '../lib/store'
import { PublicKey } from '@solana/web3.js'

describe('Store', () => {
  beforeEach(() => {
    // Reset stores before each test
    useWalletStore.setState({
      publicKey: null,
      isConnected: false,
      balance: 0,
      isLoadingBalance: false,
      address: null,
    })

    useVaultStore.setState({
      vaults: [],
      selectedVaultId: null,
      isLoading: false,
      error: null,
    })
  })

  describe('useWalletStore', () => {
    it('initializes with default state', () => {
      const state = useWalletStore.getState()
      expect(state.publicKey).toBeNull()
      expect(state.isConnected).toBe(false)
      expect(state.balance).toBe(0)
    })

    it('updates public key and connection status', () => {
      const { result } = renderHook(() => useWalletStore())
      const mockPublicKey = new PublicKey(
        '11111111111111111111111111111112'
      )

      act(() => {
        result.current.setPublicKey(mockPublicKey)
      })

      expect(result.current.publicKey).toEqual(mockPublicKey)
      expect(result.current.isConnected).toBe(true)
      expect(result.current.address).toBe(mockPublicKey.toString())
    })

    it('disconnects wallet when public key is null', () => {
      const { result } = renderHook(() => useWalletStore())

      act(() => {
        result.current.setPublicKey(null)
      })

      expect(result.current.publicKey).toBeNull()
      expect(result.current.isConnected).toBe(false)
      expect(result.current.address).toBeNull()
    })

    it('updates balance', () => {
      const { result } = renderHook(() => useWalletStore())

      act(() => {
        result.current.setBalance(1_000_000_000)
      })

      expect(result.current.balance).toBe(1_000_000_000)
    })

    it('tracks loading state', () => {
      const { result } = renderHook(() => useWalletStore())

      act(() => {
        result.current.setLoadingBalance(true)
      })

      expect(result.current.isLoadingBalance).toBe(true)

      act(() => {
        result.current.setLoadingBalance(false)
      })

      expect(result.current.isLoadingBalance).toBe(false)
    })
  })

  describe('useVaultStore', () => {
    const mockVault: Vault = {
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

    it('initializes with empty state', () => {
      const state = useVaultStore.getState()
      expect(state.vaults).toEqual([])
      expect(state.selectedVaultId).toBeNull()
      expect(state.error).toBeNull()
    })

    it('adds vault to list', () => {
      const { result } = renderHook(() => useVaultStore())

      act(() => {
        result.current.addVault(mockVault)
      })

      expect(result.current.vaults).toHaveLength(1)
      expect(result.current.vaults[0]).toEqual(mockVault)
    })

    it('auto-selects new vault', () => {
      const { result } = renderHook(() => useVaultStore())

      act(() => {
        result.current.addVault(mockVault)
      })

      expect(result.current.selectedVaultId).toBe(mockVault.vault_id)
    })

    it('selects vault by ID', () => {
      const { result } = renderHook(() => useVaultStore())

      act(() => {
        result.current.setVaults([mockVault])
        result.current.selectVault(mockVault.vault_id)
      })

      expect(result.current.selectedVaultId).toBe(mockVault.vault_id)
    })

    it('sets and clears errors', () => {
      const { result } = renderHook(() => useVaultStore())

      act(() => {
        result.current.setError('Test error')
      })

      expect(result.current.error).toBe('Test error')

      act(() => {
        result.current.clearError()
      })

      expect(result.current.error).toBeNull()
    })

    it('handles multiple vaults', () => {
      const { result } = renderHook(() => useVaultStore())
      const vault2: Vault = { ...mockVault, vault_id: 'vault-2' }

      act(() => {
        result.current.setVaults([mockVault, vault2])
      })

      expect(result.current.vaults).toHaveLength(2)
    })
  })

  describe('getVaultMetrics', () => {
    it('calculates drawdown percentage', () => {
      const vault: Vault = {
        vault_id: 'test',
        authority: 'auth',
        balance: 9_000_000_000, // 90% of initial
        initial_balance: 10_000_000_000,
        cumulative_pnl: -1_000_000_000,
        num_trades: 5,
        max_balance: 10_000_000_000,
        min_balance: 9_000_000_000,
        position_limit_bps: 500,
        max_drawdown_bps: 1000,
        is_paused: false,
      }

      const metrics = getVaultMetrics(vault)
      expect(metrics.drawdown_pct).toBe(10)
    })

    it('calculates PnL percentage', () => {
      const vault: Vault = {
        vault_id: 'test',
        authority: 'auth',
        balance: 11_000_000_000, // 110% of initial (10% gain)
        initial_balance: 10_000_000_000,
        cumulative_pnl: 1_000_000_000,
        num_trades: 5,
        max_balance: 11_000_000_000,
        min_balance: 10_000_000_000,
        position_limit_bps: 500,
        max_drawdown_bps: 1000,
        is_paused: false,
      }

      const metrics = getVaultMetrics(vault)
      expect(metrics.pnl_pct).toBe(10)
    })

    it('handles zero initial balance', () => {
      const vault: Vault = {
        vault_id: 'test',
        authority: 'auth',
        balance: 5_000_000_000,
        initial_balance: 0, // Edge case
        cumulative_pnl: 0,
        num_trades: 0,
        max_balance: 0,
        min_balance: 0,
        position_limit_bps: 500,
        max_drawdown_bps: 1000,
        is_paused: false,
      }

      const metrics = getVaultMetrics(vault)
      expect(metrics.drawdown_pct).toBe(0)
      expect(metrics.pnl_pct).toBe(0)
    })
  })
})
