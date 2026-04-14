'use client'

import { useState } from 'react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useWallet } from '@solana/wallet-adapter-react'
import { useWalletBalance } from '@/lib/hooks/useWalletBalance'
import { useVaultStore } from '@/lib/store'
import { VaultSelector } from '@/components/VaultSelector'
import { VaultDisplay } from '@/components/VaultDisplay'
import { ErrorAlert } from '@/components/ErrorAlert'
import { AgentDashboard } from '@/components/AgentDashboard'

/**
 * Main Dashboard Page
 * Integrates wallet connection, vault management, and agent monitoring
 */
export default function Home() {
  const { connected } = useWallet()
  const { selectedVaultId } = useVaultStore()
  const [activeTab, setActiveTab] = useState<'vaults' | 'agents'>('vaults')

  // Fetch and update balance
  useWalletBalance()

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Arbet Agents</h1>
            <p className="text-sm text-gray-400">
              Autonomous prediction market arbitrage
            </p>
          </div>

          {/* Wallet Button (from wallet-adapter-react-ui) */}
          <WalletMultiButton />
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {!connected ? (
          /* Not Connected State */
          <div className="text-center py-20">
            <div className="inline-block bg-slate-800 border border-slate-700 rounded-lg p-12">
              <div className="text-5xl mb-4">🔗</div>
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-400 mb-8 max-w-md">
                Connect your Solana wallet to get started managing your trading
                vaults and monitoring arbitrage opportunities.
              </p>
              <p className="text-sm text-gray-500">
                Supported wallets: Phantom, Solflare, Ledger
              </p>
            </div>
          </div>
        ) : (
          /* Connected State */
          <div className="space-y-8">
            {/* Tab Navigation */}
            <div className="flex gap-4 border-b border-slate-700">
              <button
                onClick={() => setActiveTab('vaults')}
                className={`px-4 py-3 font-semibold border-b-2 transition ${
                  activeTab === 'vaults'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                💰 Vault Management
              </button>
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-4 py-3 font-semibold border-b-2 transition ${
                  activeTab === 'agents'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                🤖 Agent Dashboard
              </button>
            </div>

            {/* Vault Management Tab */}
            {activeTab === 'vaults' && (
              <div className="space-y-8">
                {/* Vault Selection Section */}
                <section>
                  <div className="mb-4">
                    <h2 className="text-lg font-semibold text-gray-300">
                      Vault Management
                    </h2>
                  </div>
                  <VaultSelector />
                </section>

                {/* Vault Display Section */}
                {selectedVaultId ? (
                  <section>
                    <div className="mb-4">
                      <h2 className="text-lg font-semibold text-gray-300">
                        Vault Metrics
                      </h2>
                    </div>
                    <VaultDisplay vaultId={selectedVaultId} />
                  </section>
                ) : (
                  <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
                    <p className="text-gray-400">
                      Create or select a vault to view metrics
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Agent Dashboard Tab */}
            {activeTab === 'agents' && (
              <AgentDashboard backendUrl="ws://localhost:8000/ws/agent-state" />
            )}
          </div>
        )}
      </div>

      {/* Error Alert Toast */}
      <ErrorAlert />
    </main>
  )
}

