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

interface WithdrawFormProps {
  isOpen: boolean
  vault: Vault | null
  onClose: () => void
  onSuccess: () => void
}

/**
 * WithdrawForm Component
 * Modal form for withdrawing SOL from a vault
 * - Validates amount (>0, <= vault balance)
 * - Creates transfer instruction from vault address (requires vault authorization)
 * - Handles withdrawal with proper error handling
 * - Updates vault state after confirmation
 *
 * Note: In production, vault withdrawals would require:
 * - Vault authority signature (multi-sig or timelock)
 * - Proper authorization checks
 * - For MVP: withdrawals go to the vault authority (user)
 */
export function WithdrawForm({
  isOpen,
  vault,
  onClose,
  onSuccess,
}: WithdrawFormProps) {
  const [amount, setAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [txSignature, setTxSignature] = useState<string | null>(null)

  const { publicKey } = useWallet()
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

    const withdrawAmount = parseFloat(amount)
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      setError('Please enter a valid amount')
      return
    }

    // Check withdrawal amount doesn't exceed vault balance
    const vaultBalanceSol = vault.balance / LAMPORTS_PER_SOL
    if (withdrawAmount > vaultBalanceSol) {
      setError(`Insufficient vault balance. Available: ${vaultBalanceSol.toFixed(4)} SOL`)
      return
    }

    try {
      setIsLoading(true)

      // In MVP: Vault authority is the user who created it
      // In production: would need multi-sig or timelock authority
      if (vault.authority !== publicKey.toString()) {
        setError('Only vault authority can withdraw funds')
        return
      }

      const lamports = Math.floor(withdrawAmount * LAMPORTS_PER_SOL)
      const vaultAddress = new PublicKey(vault.authority)

      // Create transfer instruction (withdrawal)
      // In MVP: vault authority withdraws to themselves
      const transferInstruction = SystemProgram.transfer({
        fromPubkey: vaultAddress,
        toPubkey: publicKey,
        lamports,
      })

      // Create transaction
      const transaction = new Transaction().add(transferInstruction)
      transaction.feePayer = publicKey

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // For MVP: User signs as vault authority
      // In production: would use vault's PDA or multi-sig authority
      // Note: This requires the vault to have signing capability
      // For now, we'll show the limitation
      setError(
        'Withdrawals require vault authority signature. Contact vault administrator.'
      )
      setIsLoading(false)
      return

      // If we had the ability to sign as vault:
      // const signature = await sendTransaction(transaction, connection)
      // setTxSignature(signature)
      // await connection.confirmTransaction(signature, 'confirmed')
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to process withdrawal'
      setError(message)
      setStoreError(message)
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen || !vault) {
    return null
  }

  const vaultBalanceSol = (vault.balance / LAMPORTS_PER_SOL).toFixed(4)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">
          Withdraw SOL from {vault.vault_id}
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
              max={vaultBalanceSol}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Available: {vaultBalanceSol} SOL
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
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? 'Processing...' : 'Withdraw'}
            </button>
          </div>
        </form>

        <div className="mt-4 p-3 bg-yellow-500 bg-opacity-10 border border-yellow-600 rounded text-yellow-600 text-xs">
          <p className="font-semibold mb-1">ℹ️ MVP Limitation</p>
          <p>Withdrawals require vault authority signature and are currently limited to administrators.</p>
        </div>
      </div>
    </div>
  )
}
