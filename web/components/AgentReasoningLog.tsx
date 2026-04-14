'use client'

import { useEffect, useRef } from 'react'
import { AgentLogEntry } from '@/lib/hooks/useAgentStream'

interface AgentReasoningLogProps {
  logs: AgentLogEntry[]
  maxHeight?: string
}

export function AgentReasoningLog({ logs, maxHeight = 'h-96' }: AgentReasoningLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logs])

  const getLevelColor = (level: 'INFO' | 'WARN' | 'ERROR') => {
    switch (level) {
      case 'ERROR':
        return 'text-red-400'
      case 'WARN':
        return 'text-yellow-400'
      case 'INFO':
      default:
        return 'text-green-400'
    }
  }

  const getLevelBgColor = (level: 'INFO' | 'WARN' | 'ERROR') => {
    switch (level) {
      case 'ERROR':
        return 'bg-red-500/10'
      case 'WARN':
        return 'bg-yellow-500/10'
      case 'INFO':
      default:
        return 'bg-green-500/10'
    }
  }

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col">
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">📋 Agent Reasoning Log</h3>
        <p className="text-xs text-gray-400 mt-1">{logs.length} / 1000 lines</p>
      </div>

      <div
        ref={scrollRef}
        className={`${maxHeight} overflow-y-auto flex-1 bg-slate-900 font-mono text-xs`}
      >
        {logs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Waiting for agent logs...
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`px-4 py-2 border-l-4 ${getLevelBgColor(log.level)} ${getLevelColor(log.level)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 flex-shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="font-semibold flex-shrink-0">{log.agent}</span>
                      <span className="text-gray-500 flex-shrink-0">[{log.level}]</span>
                    </div>
                    <div className="text-gray-300 mt-1 break-words">{log.message}</div>
                    {log.action && (
                      <div className="text-blue-300 mt-1">
                        <span className="text-gray-500">Action:</span> {log.action}
                      </div>
                    )}
                    {log.reasoning && (
                      <div className="text-purple-300 mt-1">
                        <span className="text-gray-500">Reasoning:</span> {log.reasoning}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
