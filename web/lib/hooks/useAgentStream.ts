import { useEffect, useState, useRef, useCallback } from 'react'

export interface AgentState {
  scout: {
    status: 'idle' | 'scanning' | 'error'
    opportunities_detected: number
    last_poll_time: string | null
  }
  forecaster: {
    status: 'idle' | 'scoring' | 'error'
    top_opportunity_score: number | null
    confidence_score: number | null
  }
  executor: {
    status: 'idle' | 'executing' | 'error'
    last_tx_confirmed: string | null
    cu_used: number | null
    success_rate: number | null
  }
  coordinator: {
    status: 'idle' | 'monitoring' | 'paused' | 'error'
    vault_drawdown_pct: number
    is_paused: boolean
    circuit_breaker_threshold: number
  }
}

export interface AgentLogEntry {
  timestamp: string
  agent: string
  level: 'INFO' | 'WARN' | 'ERROR'
  message: string
  action?: string
  reasoning?: string
}

export interface OpportunityData {
  opportunity_id: string
  buy_market_id: string
  sell_market_id: string
  buy_price: number
  sell_price: number
  spread_bps: number
  timestamp: string
}

export interface TradeData {
  trade_id: string
  vault_id: string
  timestamp: string
  buy_amount: number
  sell_amount: number
  actual_edge_bps: number
  pnl_lamports: number
}

export interface AgentStreamData {
  agentState: AgentState
  logs: AgentLogEntry[]
  opportunities: OpportunityData[]
  trades: TradeData[]
  pnl_cumulative: number
  connection_status: 'connected' | 'connecting' | 'disconnected'
  last_update: string
}

const DEFAULT_AGENT_STATE: AgentState = {
  scout: {
    status: 'idle',
    opportunities_detected: 0,
    last_poll_time: null,
  },
  forecaster: {
    status: 'idle',
    top_opportunity_score: null,
    confidence_score: null,
  },
  executor: {
    status: 'idle',
    last_tx_confirmed: null,
    cu_used: null,
    success_rate: null,
  },
  coordinator: {
    status: 'idle',
    vault_drawdown_pct: 0,
    is_paused: false,
    circuit_breaker_threshold: 25,
  },
}

const DEFAULT_STREAM_DATA: AgentStreamData = {
  agentState: DEFAULT_AGENT_STATE,
  logs: [],
  opportunities: [],
  trades: [],
  pnl_cumulative: 0,
  connection_status: 'disconnected',
  last_update: new Date().toISOString(),
}

export function useAgentStream(
  wsUrl: string,
  fallbackPollInterval: number = 10000, // 10 seconds
) {
  const [data, setData] = useState<AgentStreamData>(DEFAULT_STREAM_DATA)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5

  // Convert REST response to AgentStreamData
  const processHealthData = useCallback(
    (health: any): AgentStreamData => {
      return {
        agentState: {
          scout: {
            status: health.scout_opportunities_1h ? 'scanning' : 'idle',
            opportunities_detected: health.scout_opportunities_1h || 0,
            last_poll_time: health.timestamp || null,
          },
          forecaster: {
            status: health.forecaster_avg_score ? 'scoring' : 'idle',
            top_opportunity_score: health.forecaster_avg_score || null,
            confidence_score: health.forecaster_avg_score || null,
          },
          executor: {
            status: health.executor_success_rate ? 'executing' : 'idle',
            last_tx_confirmed: health.last_trade_timestamp || null,
            cu_used: health.avg_cu_per_trade || null,
            success_rate: health.executor_success_rate || null,
          },
          coordinator: {
            status: health.system_paused ? 'paused' : 'monitoring',
            vault_drawdown_pct: health.max_drawdown_pct || 0,
            is_paused: health.system_paused || false,
            circuit_breaker_threshold: 25,
          },
        },
        logs: [],
        opportunities: [],
        trades: [],
        pnl_cumulative: health.cumulative_pnl_lamports || 0,
        connection_status: 'connected',
        last_update: new Date().toISOString(),
      }
    },
    []
  )

  // Fallback REST polling
  const startPolling = useCallback(async () => {
    const poll = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) throw new Error(`Health check failed: ${response.status}`)
        const health = await response.json()
        const newData = processHealthData(health)
        setData(newData)
        setError(null)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Polling error'
        setError(message)
        console.error('Polling error:', message)
      }
    }

    // Initial poll
    await poll()

    // Set up polling interval
    pollIntervalRef.current = setInterval(poll, fallbackPollInterval)
  }, [fallbackPollInterval, processHealthData])

  // WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!wsUrl) {
      console.warn('WebSocket URL not provided, using polling')
      startPolling()
      return
    }

    try {
      setData((prev) => ({
        ...prev,
        connection_status: 'connecting',
      }))

      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setData((prev) => ({
          ...prev,
          connection_status: 'connected',
        }))
        reconnectAttemptsRef.current = 0
        setError(null)

        // Clear polling if active
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
          pollIntervalRef.current = null
        }
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)

          if (message.type === 'server_ready') {
            // Process initial server state
            const newData = processHealthData(message.data)
            setData(newData)
          } else if (message.type === 'agent_state') {
            // Update agent state
            setData((prev) => ({
              ...prev,
              agentState: message.data || prev.agentState,
              last_update: new Date().toISOString(),
            }))
          } else if (message.type === 'log_entry') {
            // Add log entry
            setData((prev) => ({
              ...prev,
              logs: [message.data, ...prev.logs].slice(0, 1000),
              last_update: new Date().toISOString(),
            }))
          } else if (message.type === 'opportunity') {
            // Add opportunity
            setData((prev) => ({
              ...prev,
              opportunities: [message.data, ...prev.opportunities].slice(0, 100),
              last_update: new Date().toISOString(),
            }))
          } else if (message.type === 'trade') {
            // Add trade
            setData((prev) => ({
              ...prev,
              trades: [message.data, ...prev.trades].slice(0, 500),
              pnl_cumulative: (prev.pnl_cumulative || 0) + (message.data.pnl_lamports || 0),
              last_update: new Date().toISOString(),
            }))
          } else if (message.type === 'heartbeat') {
            // Just update timestamp
            setData((prev) => ({
              ...prev,
              last_update: new Date().toISOString(),
            }))
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
        setError('WebSocket connection error')
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        wsRef.current = null

        setData((prev) => ({
          ...prev,
          connection_status: 'disconnected',
        }))

        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000 // Exponential backoff
          reconnectAttemptsRef.current += 1

          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`)

          reconnectTimeoutRef.current = setTimeout(() => {
            connectWebSocket()
          }, delay)
        } else {
          // Max reconnect attempts reached, fall back to polling
          console.log('Max reconnection attempts reached, falling back to polling')
          startPolling()
        }
      }

      wsRef.current = ws
    } catch (err) {
      const message = err instanceof Error ? err.message : 'WebSocket connection failed'
      console.error('WebSocket error:', message)
      setError(message)
      // Fall back to polling
      startPolling()
    }
  }, [wsUrl, startPolling, processHealthData])

  // Initialize connection
  useEffect(() => {
    connectWebSocket()

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
        reconnectTimeoutRef.current = null
      }
    }
  }, [connectWebSocket])

  return {
    data,
    error,
    isConnected: data.connection_status === 'connected',
  }
}
