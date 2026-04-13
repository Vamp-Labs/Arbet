'use client'

import { useState } from 'react'
import { useUserVaults } from '@/lib/hooks/useUserVaults'

interface VaultCreateFormProps {
  isOpen: boolean
  onClose: () => void
}

/**
 * VaultCreateForm Component
 * Modal form for creating a new vault
 * Fields: Vault ID, Initial Balance (in SOL)
 */
export function VaultCreateForm({ isOpen, onClose }: VaultCreateFormProps) {
  const [vaultId, setVaultId] = useState('')
  const [initialBalance, setInitialBalance] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const { createVault } = useUserVaults()

  const validateForm = (): boolean => {
    setLocalError(null)

    if (!vaultId.trim()) {
      setLocalError('Vault ID is required')
      return false
    }

    if (!/^[a-z0-9_-]+$/.test(vaultId)) {
      setLocalError('Vault ID must contain only lowercase letters, numbers, hyphens, and underscores')
      return false
    }

    const balance = parseFloat(initialBalance)
    if (isNaN(balance) || balance < 0.1) {
      setLocalError('Initial balance must be at least 0.1 SOL')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      const balanceInLamports = Math.floor(
        parseFloat(initialBalance) * 1_000_000_000
      )

      await createVault(vaultId, balanceInLamports)

      // Reset form and close
      setVaultId('')
      setInitialBalance('')
      onClose()
    } catch (error) {
      console.error('Failed to create vault:', error)
      // Error is displayed via global error alert
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg p-8 max-w-md w-full border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Create New Vault</h2>

        {localError && (
          <div className="mb-4 p-3 bg-red-500 bg-opacity-20 border border-red-500 rounded text-red-400 text-sm">
            {localError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Vault ID
            </label>
            <input
              type="text"
              value={vaultId}
              onChange={(e) => setVaultId(e.target.value)}
              placeholder="my-vault-01"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">
              Lowercase letters, numbers, hyphens, underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Initial Balance (SOL)
            </label>
            <input
              type="number"
              value={initialBalance}
              onChange={(e) => setInitialBalance(e.target.value)}
              placeholder="1.0"
              step="0.1"
              min="0.1"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-400 mt-1">Minimum 0.1 SOL</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition disabled:opacity-50"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50 font-semibold"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
