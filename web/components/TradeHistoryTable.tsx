'use client'

import { useState, useMemo } from 'react'
import { TradeData } from '@/lib/hooks/useAgentStream'

interface TradeHistoryTableProps {
  trades: TradeData[]
  maxHeight?: string
}

type SortKey = 'timestamp' | 'pnl' | 'edge' | 'amount'
type SortOrder = 'asc' | 'desc'

export function TradeHistoryTable({ trades, maxHeight = 'h-96' }: TradeHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const sortedTrades = useMemo(() => {
    const sorted = [...trades]
    sorted.sort((a, b) => {
      let aVal: number | string
      let bVal: number | string

      switch (sortKey) {
        case 'timestamp':
          aVal = new Date(a.timestamp).getTime()
          bVal = new Date(b.timestamp).getTime()
          break
        case 'pnl':
          aVal = a.pnl_lamports
          bVal = b.pnl_lamports
          break
        case 'edge':
          aVal = a.actual_edge_bps
          bVal = b.actual_edge_bps
          break
        case 'amount':
          aVal = a.buy_amount
          bVal = b.buy_amount
          break
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    return sorted
  }, [trades, sortKey, sortOrder])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortOrder('desc')
    }
  }

  const SortHeader = ({ label, sortBy }: { label: string; sortBy: SortKey }) => (
    <button
      onClick={() => handleSort(sortBy)}
      className="text-xs font-semibold text-gray-300 hover:text-white transition flex items-center gap-1"
    >
      {label}
      {sortKey === sortBy && (sortOrder === 'desc' ? ' ▼' : ' ▲')}
    </button>
  )

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">📊 Trade History</h3>
        <p className="text-xs text-gray-400 mt-1">{trades.length} trades executed</p>
      </div>

      <div className={`${maxHeight} overflow-x-auto overflow-y-auto flex-1`}>
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No trades yet
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-900 border-b border-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">
                  <SortHeader label="Timestamp" sortBy="timestamp" />
                </th>
                <th className="px-3 py-2 text-left">Trade ID</th>
                <th className="px-3 py-2 text-left">Vault</th>
                <th className="px-3 py-2 text-right">
                  <SortHeader label="Amount" sortBy="amount" />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortHeader label="Edge (bps)" sortBy="edge" />
                </th>
                <th className="px-3 py-2 text-right">
                  <SortHeader label="PnL (SOL)" sortBy="pnl" />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {sortedTrades.map((trade) => {
                const pnlSol = trade.pnl_lamports / 1_000_000_000
                const isProfitable = trade.pnl_lamports >= 0

                return (
                  <tr
                    key={trade.trade_id}
                    className="hover:bg-slate-700/30 transition border-slate-700"
                  >
                    <td className="px-3 py-2 text-gray-400">
                      {new Date(trade.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 font-mono text-gray-300">{trade.trade_id}</td>
                    <td className="px-3 py-2 text-gray-400">{trade.vault_id}</td>
                    <td className="px-3 py-2 text-right font-mono text-gray-300">
                      {(trade.buy_amount / 1_000_000_000).toFixed(4)} SOL
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span
                        className={
                          trade.actual_edge_bps > 0 ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {trade.actual_edge_bps}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={isProfitable ? 'text-green-400' : 'text-red-400'}>
                        {isProfitable ? '+' : ''}
                        {pnlSol.toFixed(6)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
