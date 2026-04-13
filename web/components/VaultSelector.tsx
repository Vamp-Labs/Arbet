'use client'

import { useState } from 'react'
import { useVaultStore } from '@/lib/store'
import { useUserVaults } from '@/lib/hooks/useUserVaults'
import { VaultCreateForm } from './VaultCreateForm'
import { LAMPORTS_PER_SOL } from '@/lib/constants'

/**
 * VaultSelector Component
 * Dropdown for selecting active vault
 * Includes button to create new vault
 */
export function VaultSelector() {
  const { vaults, selectedVaultId, selectVault } = useVaultStore()
  const { isLoading } = useUserVaults()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)

  const selectedVault = vaults.find((v) => v.vault_id === selectedVaultId)

  const handleCreateClick = () => {
    setIsCreateFormOpen(true)
    setIsDropdownOpen(false)
  }

  return (
    <>
      <div className="relative">
        {/* Dropdown Button */}
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white text-left flex items-center justify-between hover:bg-slate-600 transition"
          disabled={isLoading}
        >
          <div>
            {selectedVault ? (
              <div>
                <p className="text-sm text-gray-400">Active Vault</p>
                <p className="font-semibold">{selectedVault.vault_id}</p>
              </div>
            ) : (
              <p className="text-gray-400">Select or create a vault</p>
            )}
          </div>
          <span className={`transform transition ${isDropdownOpen ? 'rotate-180' : ''}`}>
            ▼
          </span>
        </button>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-700 border border-slate-600 rounded-lg shadow-lg z-40">
            {vaults.length > 0 ? (
              vaults.map((vault) => (
                <button
                  key={vault.vault_id}
                  onClick={() => {
                    selectVault(vault.vault_id)
                    setIsDropdownOpen(false)
                  }}
                  className={`w-full px-4 py-3 text-left border-b border-slate-600 last:border-b-0 hover:bg-slate-600 transition ${
                    selectedVaultId === vault.vault_id ? 'bg-slate-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-white">{vault.vault_id}</p>
                      <p className="text-sm text-gray-400">
                        Balance: {(vault.balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
                      </p>
                    </div>
                    {vault.is_paused && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                        Paused
                      </span>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-4 py-6 text-center text-gray-400">
                No vaults yet
              </div>
            )}

            {/* Create New Vault Button */}
            <button
              onClick={handleCreateClick}
              className="w-full px-4 py-3 text-blue-400 hover:text-blue-300 border-t border-slate-600 font-semibold transition flex items-center justify-center gap-2"
            >
              <span>+</span> Create New Vault
            </button>
          </div>
        )}
      </div>

      {/* Create Vault Modal */}
      <VaultCreateForm
        isOpen={isCreateFormOpen}
        onClose={() => setIsCreateFormOpen(false)}
      />
    </>
  )
}
