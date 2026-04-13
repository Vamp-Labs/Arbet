'use client'

import { useVaultPolling } from '@/lib/hooks/useVaultPolling'
import { getVaultMetrics } from '@/lib/store'
import { LAMPORTS_PER_SOL } from '@/lib/constants'

interface VaultDisplayProps {
  vaultId: string | null
}

/**
 * VaultDisplay Component
 * Shows 4 metric cards for the selected vault:
 * - Balance (in SOL)
 * - Cumulative P&L (%)
 * - Max Drawdown (%)
 * - Trades Executed (count)
 */
export function VaultDisplay({ vaultId }: VaultDisplayProps) {
  const { vault } = useVaultPolling(vaultId)

  if (!vault) {
    return (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-slate-800 rounded-lg p-6 h-32 animate-pulse"
          />
        ))}
      </div>
    )
  }

  const metrics = getVaultMetrics(vault)
  const balanceSol = (vault.balance / LAMPORTS_PER_SOL).toFixed(4)
  const initialBalanceSol = (vault.initial_balance / LAMPORTS_PER_SOL).toFixed(4)

  const MetricCard = ({
    label,
    value,
    unit = '',
    color = 'text-white',
  }: {
    label: string
    value: string | number
    unit?: string
    color?: string
  }) => (
    <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
      <p className="text-sm text-gray-400 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>
        {value} {unit}
      </p>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Vault: {vault.vault_id}</h3>
        <span className="text-xs bg-slate-700 text-gray-300 px-2 py-1 rounded">
          Auto-updating (5s)
        </span>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Balance"
          value={balanceSol}
          unit="SOL"
          color="text-blue-400"
        />

        <MetricCard
          label="P&L %"
          value={metrics.pnl_pct}
          unit="%"
          color={metrics.pnl_pct >= 0 ? 'text-green-400' : 'text-red-400'}
        />

        <MetricCard
          label="Max Drawdown"
          value={metrics.drawdown_pct}
          unit="%"
          color={metrics.drawdown_pct > 10 ? 'text-red-400' : 'text-yellow-400'}
        />

        <MetricCard
          label="Trades"
          value={vault.num_trades}
          color="text-purple-400"
        />
      </div>

      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Initial Balance: </span>
            <span className="text-white font-mono">{initialBalanceSol} SOL</span>
          </div>
          <div>
            <span className="text-gray-400">Cumulative PnL: </span>
            <span className="text-white font-mono">
              {(vault.cumulative_pnl / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          </div>
          <div>
            <span className="text-gray-400">Peak Balance: </span>
            <span className="text-white font-mono">
              {(vault.max_balance / LAMPORTS_PER_SOL).toFixed(4)} SOL
            </span>
          </div>
          <div>
            <span className="text-gray-400">Status: </span>
            <span className={vault.is_paused ? 'text-red-400' : 'text-green-400'}>
              {vault.is_paused ? '🔴 Paused' : '🟢 Active'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
