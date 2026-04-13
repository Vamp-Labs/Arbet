export const SOLANA_RPC = process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com'
export const NETWORK = (process.env.NEXT_PUBLIC_NETWORK || 'devnet') as 'mainnet-beta' | 'devnet' | 'testnet'
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const LAMPORTS_PER_SOL = 1_000_000_000
