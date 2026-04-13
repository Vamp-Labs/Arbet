import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  LedgerWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base'
import { NETWORK } from './constants'

/**
 * Get the wallet adapter network from our network constant
 */
export function getWalletNetwork(): WalletAdapterNetwork {
  switch (NETWORK) {
    case 'mainnet-beta':
      return WalletAdapterNetwork.Mainnet
    case 'testnet':
      return WalletAdapterNetwork.Testnet
    case 'devnet':
    default:
      return WalletAdapterNetwork.Devnet
  }
}

/**
 * Predefined list of wallet adapters in priority order
 * These are the most commonly used wallets
 */
export const WALLET_ADAPTERS = [
  new PhantomWalletAdapter(),
  new SolflareWalletAdapter(),
  new LedgerWalletAdapter(),
]

/**
 * Human-readable names for wallet adapters
 */
export const WALLET_NAMES: Record<string, string> = {
  Phantom: 'Phantom Wallet',
  Solflare: 'Solflare',
  Ledger: 'Ledger',
  'Magic Eden': 'Magic Eden',
}

/**
 * Wallet connection error messages
 */
export const WALLET_ERRORS = {
  NOT_INSTALLED: 'Wallet not installed. Please install the wallet extension.',
  CONNECT_FAILED: 'Failed to connect wallet. Please try again.',
  ALREADY_CONNECTED: 'Wallet is already connected.',
  USER_REJECTED: 'Connection request was rejected by the user.',
  NETWORK_MISMATCH: 'Network mismatch. Please switch to the correct network.',
} as const
