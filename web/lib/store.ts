import { create } from 'zustand'
import { PublicKey } from '@solana/web3.js'

/**
 * Vault state from API
 */
export interface Vault {
  vault_id: string
  authority: string
  balance: number // lamports
  initial_balance: number
  cumulative_pnl: number
  num_trades: number
  max_balance: number
  min_balance: number
  position_limit_bps: number
  max_drawdown_bps: number
  is_paused: boolean
}

/**
 * Computed vault metrics
 */
export interface VaultMetrics {
  drawdown_pct: number
  pnl_pct: number
}

/**
 * Wallet store - connection state and balance
 */
interface WalletStore {
  publicKey: PublicKey | null
  isConnected: boolean
  balance: number // lamports
  isLoadingBalance: boolean
  address: string | null

  // Actions
  setPublicKey: (key: PublicKey | null) => void
  setBalance: (balance: number) => void
  setLoadingBalance: (loading: boolean) => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  isConnected: false,
  balance: 0,
  isLoadingBalance: false,
  address: null,

  setPublicKey: (key) =>
    set({
      publicKey: key,
      isConnected: key !== null,
      address: key?.toString() || null,
    }),

  setBalance: (balance) => set({ balance }),

  setLoadingBalance: (loading) => set({ isLoadingBalance: loading }),
}))

/**
 * Vault store - vault management and selection
 */
interface VaultStore {
  vaults: Vault[]
  selectedVaultId: string | null
  isLoading: boolean
  error: string | null

  // Actions
  setVaults: (vaults: Vault[]) => void
  addVault: (vault: Vault) => void
  selectVault: (vaultId: string | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

export const useVaultStore = create<VaultStore>((set) => ({
  vaults: [],
  selectedVaultId: null,
  isLoading: false,
  error: null,

  setVaults: (vaults) => set({ vaults }),

  addVault: (vault) =>
    set((state) => ({
      vaults: [...state.vaults, vault],
      selectedVaultId: vault.vault_id, // Auto-select new vault
    })),

  selectVault: (vaultId) => set({ selectedVaultId: vaultId }),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error }),

  clearError: () => set({ error: null }),
}))

/**
 * Get vault metrics (computed properties)
 */
export function getVaultMetrics(vault: Vault): VaultMetrics {
  const drawdown_pct =
    vault.initial_balance > 0
      ? (1.0 - vault.balance / vault.initial_balance) * 100
      : 0

  const pnl_pct =
    vault.initial_balance > 0
      ? ((vault.balance - vault.initial_balance) / vault.initial_balance) * 100
      : 0

  return {
    drawdown_pct: Math.round(drawdown_pct * 100) / 100,
    pnl_pct: Math.round(pnl_pct * 100) / 100,
  }
}
