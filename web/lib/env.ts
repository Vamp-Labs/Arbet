/**
 * Environment variable type definitions for Solana frontend
 */
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_RPC_ENDPOINT: string
      NEXT_PUBLIC_NETWORK: string
      NEXT_PUBLIC_API_URL: string
    }
  }
}

export {}

