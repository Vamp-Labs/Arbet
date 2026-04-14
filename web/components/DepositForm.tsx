'use client'

import { useState } from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { useConnection } from '@solana/wallet-adapter-react'
import {
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'
import { useVaultStore, Vault } from '@/lib/store'
import { apiClient } from '@/lib/api'

interface DepositFormProps {
  isOpen: boolean
  vault: Vault | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * DepositForm Component
 * Modal form for depositing SOL into a vault
 * - Validates amount (>0, <= wallet balance)
 * - Creates transfer transaction
 * - Signs and sends via wallet
 * - Updates vault balance after confirmation
 */
export function DepositForm({
  isOpen,
  vault,
  onClose,
  onSuccess,
}: DepositFormProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)

  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { setError: setStoreError } = useVaultStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setTxSignature(null)

    if (!publicKey || !vault || !connection) {
      setError('Wallet not connected or vault not selected')
      return
    }

    const depositAmount = parseFloat(amount)
    if (isNaN(depositAmount) || depositAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      setIsLoading(true)

      const vaultAddress = new PublicKey(vault.authority)
      const lamports = Math.floor(depositAmount * LAMPORTS_PER_SOL)

      // Create transfer instruction
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: vaultAddress,
        lamports,
      })

      // Create transaction
      const transaction = new Transaction().add(transferInstruction)
      transaction.feePayer = publicKey

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Send transaction via wallet
      const signature = await sendTransaction(transaction, connection)
      setTxSignature(signature)

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      // Update vault state (will trigger balance refresh)
      await apiClient.getVault(vault.vault_id)

      onSuccess()
      setAmount('')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send transaction'
      setError(message)
      setStoreError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !vault) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">
          Deposit SOL to {vault.vault_id}
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
            {error}
          </div>
        )}

        {txSignature && (
          <div className="mb-4 p-3 bg-green-500 bg-opacity-20 border border-green-500 rounded text-green-400 text-sm">
            <p className="font-semibold mb-1">✓ Transaction Confirmed</p>
            <p className="text-xs font-mono break-all">{txSignature}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount (SOL)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.5"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Minimum: 0.01 SOL (for network fees)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Depositing...' : 'Deposit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
