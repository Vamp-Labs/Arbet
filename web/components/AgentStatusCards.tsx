'use client'

import { AgentState } from '@/lib/hooks/useAgentStream'

interface AgentStatusCardsProps {
  agentState: AgentState
}

export function AgentStatusCards({ agentState }: AgentStatusCardsProps) {
  const getStatusColor = (
    status: 'idle' | 'scanning' | 'scoring' | 'executing' | 'monitoring' | 'paused' | 'error'
  ) => {
    switch (status) {
      case 'error':
        return 'text-red-500 bg-red-500/10 border-red-500/30'
      case 'scanning':
      case 'scoring':
      case 'executing':
      case 'monitoring':
        return 'text-green-500 bg-green-500/10 border-green-500/30'
      case 'paused':
        return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30'
      case 'idle':
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error':
        return '🔴'
      case 'scanning':
      case 'scoring':
      case 'executing':
      case 'monitoring':
        return '🟢'
      case 'paused':
        return '🟡'
      case 'idle':
      default:
        return '⚪'
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Scout Agent */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">🔍 Scout</h3>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(agentState.scout.status)}`}>
            {getStatusIcon(agentState.scout.status)} {agentState.scout.status}
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Opportunities:</span>
            <span className="text-white font-mono ml-2">{agentState.scout.opportunities_detected}</span>
          </div>
          {agentState.scout.last_poll_time && (
            <div>
              <span className="text-gray-400">Last Poll:</span>
              <span className="text-white font-mono ml-2 text-xs">
                {new Date(agentState.scout.last_poll_time).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Forecaster Agent */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">📊 Forecaster</h3>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(agentState.forecaster.status)}`}>
            {getStatusIcon(agentState.forecaster.status)} {agentState.forecaster.status}
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Top Score:</span>
            <span className="text-white font-mono ml-2">
              {agentState.forecaster.top_opportunity_score?.toFixed(2) ?? 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Confidence:</span>
            <span className="text-white font-mono ml-2">
              {agentState.forecaster.confidence_score
                ? `${(agentState.forecaster.confidence_score * 100).toFixed(0)}%`
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Executor Agent */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">⚙️ Executor</h3>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(agentState.executor.status)}`}>
            {getStatusIcon(agentState.executor.status)} {agentState.executor.status}
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Success Rate:</span>
            <span className="text-white font-mono ml-2">
              {agentState.executor.success_rate ? `${(agentState.executor.success_rate * 100).toFixed(1)}%` : 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-gray-400">Avg CU:</span>
            <span className="text-white font-mono ml-2">{agentState.executor.cu_used ?? 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Coordinator Agent */}
      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white">👮 Coordinator</h3>
          <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(agentState.coordinator.status)}`}>
            {getStatusIcon(agentState.coordinator.status)} {agentState.coordinator.status}
          </span>
        </div>
        <div className="space-y-2 text-xs">
          <div>
            <span className="text-gray-400">Drawdown:</span>
            <span className={`font-mono ml-2 ${agentState.coordinator.vault_drawdown_pct > agentState.coordinator.circuit_breaker_threshold ? 'text-red-400' : 'text-white'}`}>
              {agentState.coordinator.vault_drawdown_pct.toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-gray-400">Paused:</span>
            <span className={`font-mono ml-2 ${agentState.coordinator.is_paused ? 'text-red-400' : 'text-green-400'}`}>
              {agentState.coordinator.is_paused ? 'YES' : 'NO'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
