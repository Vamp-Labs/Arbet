'use client'

import { TradeData } from '@/lib/hooks/useAgentStream'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts'

interface PnLChartProps {
  trades: TradeData[]
  cumulativePnl: number
}

export function PnLChart({ trades, cumulativePnl }: PnLChartProps) {
  // Calculate cumulative PnL and edge over time
  let cumulativeLamports = 0
  const chartData = trades
    .slice()
    .reverse()
    .map((trade) => {
      cumulativeLamports += trade.pnl_lamports
      return {
        timestamp: new Date(trade.timestamp).toLocaleTimeString(),
        date: trade.timestamp,
        trade_id: trade.trade_id,
        cumulative_pnl_sol: cumulativeLamports / 1_000_000_000,
        edge_bps: trade.actual_edge_bps,
        pnl_sol: trade.pnl_lamports / 1_000_000_000,
      }
    })

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-slate-900 border border-slate-700 rounded p-3 text-xs">
          <p className="text-gray-400">{data.timestamp}</p>
          <p className="text-green-400 font-semibold">{data.trade_id}</p>
          <p className="text-blue-400">PnL: {data.pnl_sol.toFixed(6)} SOL</p>
          <p className="text-purple-400">Cumulative: {data.cumulative_pnl_sol.toFixed(6)} SOL</p>
          <p className="text-yellow-400">Edge: {data.edge_bps} bps</p>
        </div>
      )
    }
    return null
  }

  if (chartData.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-8">
        <div className="flex items-center justify-center h-80 text-gray-500">
          <div className="text-center">
            <p className="text-sm">No trade data yet</p>
            <p className="text-xs text-gray-600 mt-2">PnL chart will appear as trades execute</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">📈 PnL Dashboard</h3>
          <div className="text-right">
            <p className="text-xs text-gray-400">Cumulative PnL</p>
            <p
              className={`text-lg font-bold ${cumulativePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {(cumulativePnl / 1_000_000_000).toFixed(6)} SOL
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              stroke="#475569"
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              stroke="#475569"
              label={{ value: 'Cumulative PnL (SOL)', angle: -90, position: 'insideLeft' }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              stroke="#475569"
              label={{ value: 'Edge (bps)', angle: 90, position: 'insideRight' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '20px' }} />

            {/* Area for cumulative PnL */}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cumulative_pnl_sol"
              fill="#10B981"
              stroke="#34D399"
              fillOpacity={0.3}
              name="Cumulative PnL (SOL)"
            />

            {/* Line for edge */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="edge_bps"
              stroke="#8B5CF6"
              strokeWidth={2}
              dot={false}
              name="Edge (bps)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900 px-4 py-3 border-t border-slate-700 text-xs text-gray-400">
        <p>
          Showing {chartData.length} trades | Latest trade:{' '}
          {chartData[chartData.length - 1]?.timestamp}
        </p>
      </div>
    </div>
  )
}
