'use client'

import { useEffect, useState } from 'react'
import { useAgentStream } from '@/lib/hooks/useAgentStream'
import { AgentStatusCards } from './AgentStatusCards'
import { OpportunityFeed } from './OpportunityFeed'
import { AgentReasoningLog } from './AgentReasoningLog'
import { PnLChart } from './PnLChart'
import { TradeHistoryTable } from './TradeHistoryTable'
import { EmergencyPauseButton } from './EmergencyPauseButton'

interface AgentDashboardProps {
  backendUrl?: string
}

/**
 * Agent Dashboard Component
 * Real-time monitoring of all 4 agents with:
 * - Agent status cards
 * - Live opportunity feed
 * - Reasoning logs
 * - PnL chart
 * - Trade history
 * - Emergency pause button
 *
 * Uses WebSocket for real-time updates with fallback to REST polling
 */
export function AgentDashboard({ backendUrl = 'ws://localhost:8000/ws/agent-state' }: AgentDashboardProps) {
  const { data, error, isConnected } = useAgentStream(backendUrl)
  const [isPauseLoading, setIsPauseLoading] = useState(false)

  const handlePause = async () => {
    setIsPauseLoading(true)
    try {
      // TODO: Implement actual pause API call
      // await fetch(`${backendUrl.replace('ws://', 'http://').split('/ws/')[0]}/pause`, { method: 'POST' })
      console.log('Pause requested')
    } finally {
      setIsPauseLoading(false)
    }
  }

  const handleResume = async () => {
    setIsPauseLoading(true)
    try {
      // TODO: Implement actual resume API call
      // await fetch(`${backendUrl.replace('ws://', 'http://').split('/ws/')[0]}/resume`, { method: 'POST' })
      console.log('Resume requested')
    } finally {
      setIsPauseLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">🤖 Agent Dashboard</h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? 'WebSocket Connected' : 'Using Polling (WebSocket Disconnected)'}
          </span>
          {error && <span className="text-xs text-red-400">{error}</span>}
        </div>
      </div>

      {/* Agent Status Cards */}
      <div>
        <AgentStatusCards agentState={data.agentState} />
      </div>

      {/* Emergency Pause Button */}
      <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
        <EmergencyPauseButton
          isPaused={data.agentState.coordinator.is_paused}
          onPause={handlePause}
          onResume={handleResume}
          disabled={isPauseLoading}
        />
      </div>

      {/* Top Row: Opportunity Feed + Reasoning Log */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OpportunityFeed opportunities={data.opportunities} />
        <AgentReasoningLog logs={data.logs} />
      </div>

      {/* PnL Chart */}
      <div>
        <PnLChart trades={data.trades} cumulativePnl={data.pnl_cumulative} />
      </div>

      {/* Trade History Table */}
      <div>
        <TradeHistoryTable trades={data.trades} />
      </div>

      {/* Footer with last update */}
      <div className="text-xs text-gray-500 text-center py-4 border-t border-slate-700">
        <p>Last update: {new Date(data.last_update).toLocaleTimeString()}</p>
      </div>
    </div>
  )
}
