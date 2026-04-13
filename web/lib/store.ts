import { create } from 'zustand'
import { PublicKey } from '@solana/web3.js'

interface WalletStore {
  publicKey: PublicKey | null
  isConnected: boolean
  setPublicKey: (key: PublicKey | null) => void
}

export const useWalletStore = create<WalletStore>((set) => ({
  publicKey: null,
  isConnected: false,
  setPublicKey: (key) =>
    set({ publicKey: key, isConnected: key !== null }),
}))
