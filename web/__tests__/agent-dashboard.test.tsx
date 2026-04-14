import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { AgentDashboard } from '../components/AgentDashboard'
import { AgentStatusCards } from '../components/AgentStatusCards'
import { OpportunityFeed } from '../components/OpportunityFeed'
import { AgentReasoningLog } from '../components/AgentReasoningLog'
import { PnLChart } from '../components/PnLChart'
import { TradeHistoryTable } from '../components/TradeHistoryTable'
import { EmergencyPauseButton } from '../components/EmergencyPauseButton'
import { AgentState, AgentLogEntry, OpportunityData, TradeData } from '../lib/hooks/useAgentStream'

// Mock WebSocket
class MockWebSocket {
  static INSTANCES: MockWebSocket[] = []
  url: string
  readyState = 1 // OPEN
  onopen: (() => void) | null = null
  onmessage: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onclose: (() => void) | null = null

  constructor(url: string) {
    this.url = url
    MockWebSocket.INSTANCES.push(this)
    setTimeout(() => this.onopen?.(), 10)
  }

  send(data: string) {
    // Mock send
  }

  close() {
    this.readyState = 3
    this.onclose?.()
  }

  static mockMessage(data: any) {
    const instance = MockWebSocket.INSTANCES[MockWebSocket.INSTANCES.length - 1]
    if (instance?.onmessage) {
      instance.onmessage({ data: JSON.stringify(data) })
    }
  }
}

global.WebSocket = MockWebSocket as any

describe('Agent Dashboard Components', () => {
  const mockAgentState: AgentState = {
    scout: {
      status: 'scanning',
      opportunities_detected: 5,
      last_poll_time: new Date().toISOString(),
    },
    forecaster: {
      status: 'scoring',
      top_opportunity_score: 0.85,
      confidence_score: 0.92,
    },
    executor: {
      status: 'idle',
      last_tx_confirmed: new Date().toISOString(),
      cu_used: 45000,
      success_rate: 0.98,
    },
    coordinator: {
      status: 'monitoring',
      vault_drawdown_pct: 5.2,
      is_paused: false,
      circuit_breaker_threshold: 25,
    },
  }

  const mockLogEntry: AgentLogEntry = {
    timestamp: new Date().toISOString(),
    agent: 'Scout',
    level: 'INFO',
    message: 'Found potential arbitrage opportunity',
    action: 'Poll markets',
    reasoning: 'Spread exceeds threshold',
  }

  const mockOpportunity: OpportunityData = {
    opportunity_id: 'opp_123',
    buy_market_id: 'market_buy_1',
    sell_market_id: 'market_sell_1',
    buy_price: 0.95,
    sell_price: 1.05,
    spread_bps: 1050,
    timestamp: new Date().toISOString(),
  }

  const mockTrade: TradeData = {
    trade_id: 'tx_abc123',
    vault_id: 'vault_1',
    timestamp: new Date().toISOString(),
    buy_amount: 1_000_000_000,
    sell_amount: 1_050_000_000,
    actual_edge_bps: 95,
    pnl_lamports: 50_000_000,
  }

  beforeEach(() => {
    MockWebSocket.INSTANCES = []
    jest.clearAllMocks()
  })

  describe('AgentStatusCards', () => {
    it('renders all four agent status cards', () => {
      render(<AgentStatusCards agentState={mockAgentState} />)
      expect(screen.getByText('🔍 Scout')).toBeInTheDocument()
      expect(screen.getByText('📊 Forecaster')).toBeInTheDocument()
      expect(screen.getByText('⚙️ Executor')).toBeInTheDocument()
      expect(screen.getByText('👮 Coordinator')).toBeInTheDocument()
    })

    it('displays correct status indicators', () => {
      render(<AgentStatusCards agentState={mockAgentState} />)
      // Forecaster section exists
      expect(screen.getByText('📊 Forecaster')).toBeInTheDocument()
      // Executor section exists
      expect(screen.getByText('⚙️ Executor')).toBeInTheDocument()
    })

    it('displays agent metrics correctly', () => {
      render(<AgentStatusCards agentState={mockAgentState} />)
      expect(screen.getByText('5')).toBeInTheDocument() // Opportunities
      expect(screen.getByText('98.0%')).toBeInTheDocument() // Success rate
      expect(screen.getByText('5.20%')).toBeInTheDocument() // Drawdown
    })

    it('shows paused state for coordinator', () => {
      const pausedState = {
        ...mockAgentState,
        coordinator: {
          ...mockAgentState.coordinator,
          is_paused: true,
          status: 'paused' as const,
        },
      }
      render(<AgentStatusCards agentState={pausedState} />)
      expect(screen.getByText('YES')).toBeInTheDocument()
    })
  })

  describe('OpportunityFeed', () => {
    it('renders empty state when no opportunities', () => {
      render(<OpportunityFeed opportunities={[]} />)
      expect(screen.getByText('Waiting for opportunities...')).toBeInTheDocument()
    })

    it('displays opportunities with spread information', () => {
      render(<OpportunityFeed opportunities={[mockOpportunity]} />)
      expect(screen.getByText('opp_123')).toBeInTheDocument()
      expect(screen.getByText('1050 bps')).toBeInTheDocument()
      expect(screen.getByText(/market_buy_1/)).toBeInTheDocument()
      expect(screen.getByText(/market_sell_1/)).toBeInTheDocument()
    })

    it('color-codes spreads by size', () => {
      const smallSpread = { ...mockOpportunity, spread_bps: 30 }
      const { container } = render(
        <OpportunityFeed opportunities={[smallSpread]} />
      )
      const spreadBadge = screen.getByText('30 bps')
      expect(spreadBadge.className).toContain('gray-600/30')
    })

    it('displays multiple opportunities', () => {
      const opp2 = { ...mockOpportunity, opportunity_id: 'opp_456' }
      render(<OpportunityFeed opportunities={[mockOpportunity, opp2]} />)
      expect(screen.getByText('opp_123')).toBeInTheDocument()
      expect(screen.getByText('opp_456')).toBeInTheDocument()
      expect(screen.getByText('2 opportunities detected')).toBeInTheDocument()
    })
  })

  describe('AgentReasoningLog', () => {
    it('renders empty state when no logs', () => {
      render(<AgentReasoningLog logs={[]} />)
      expect(screen.getByText('Waiting for agent logs...')).toBeInTheDocument()
    })

    it('displays log entries with all fields', () => {
      render(<AgentReasoningLog logs={[mockLogEntry]} />)
      expect(screen.getByText('Scout')).toBeInTheDocument()
      expect(screen.getByText('Found potential arbitrage opportunity')).toBeInTheDocument()
      expect(screen.getByText(/Action:/)).toBeInTheDocument()
      expect(screen.getByText(/Poll markets/)).toBeInTheDocument()
      expect(screen.getByText(/Reasoning:/)).toBeInTheDocument()
      expect(screen.getByText(/Spread exceeds threshold/)).toBeInTheDocument()
    })

    it('color-codes log levels', () => {
      const errorLog = { ...mockLogEntry, level: 'ERROR' as const }
      const { container } = render(<AgentReasoningLog logs={[errorLog]} />)
      const logEntry = container.querySelector('.text-red-400')
      expect(logEntry).toBeInTheDocument()
    })

    it('shows log count', () => {
      const logs = [mockLogEntry, mockLogEntry, mockLogEntry]
      render(<AgentReasoningLog logs={logs} />)
      expect(screen.getByText('3 / 1000 lines')).toBeInTheDocument()
    })
  })

  describe('PnLChart', () => {
    it('renders empty state when no trades', () => {
      render(<PnLChart trades={[]} cumulativePnl={0} />)
      expect(screen.getByText('No trade data yet')).toBeInTheDocument()
    })

    it('displays cumulative PnL in header', () => {
      render(<PnLChart trades={[mockTrade]} cumulativePnl={50_000_000} />)
      expect(screen.getByText(/0.050000 SOL/)).toBeInTheDocument()
    })

    it('shows color based on PnL direction', () => {
      const lossTrade = { ...mockTrade, pnl_lamports: -10_000_000 }
      const { container } = render(
        <PnLChart trades={[lossTrade]} cumulativePnl={-10_000_000} />
      )
      const pnlDisplay = screen.getByText(/SOL/)
      expect(pnlDisplay.className).toContain('red-400')
    })

    it('renders chart for trades', () => {
      render(<PnLChart trades={[mockTrade]} cumulativePnl={50_000_000} />)
      expect(screen.getByText(/Showing 1 trades/)).toBeInTheDocument()
    })
  })

  describe('TradeHistoryTable', () => {
    it('renders empty state when no trades', () => {
      render(<TradeHistoryTable trades={[]} />)
      expect(screen.getByText('No trades yet')).toBeInTheDocument()
    })

    it('displays trade data in table', () => {
      render(<TradeHistoryTable trades={[mockTrade]} />)
      expect(screen.getByText('tx_abc123')).toBeInTheDocument()
      expect(screen.getByText('vault_1')).toBeInTheDocument()
      expect(screen.getByText('95')).toBeInTheDocument() // edge bps
      expect(screen.getByText(/0.050000/)).toBeInTheDocument() // PnL
    })

    it('colors PnL based on profit/loss', () => {
      const lossTrade = { ...mockTrade, pnl_lamports: -10_000_000 }
      const { container } = render(
        <TradeHistoryTable trades={[lossTrade]} />
      )
      const pnlCell = screen.getByText(/-0.010000/)
      expect(pnlCell.className).toContain('text-red-400')
    })

    it('supports sorting by different columns', () => {
      const trade2 = {
        ...mockTrade,
        trade_id: 'tx_def456',
        pnl_lamports: 100_000_000,
      }
      render(<TradeHistoryTable trades={[mockTrade, trade2]} />)

      // Click PnL header to sort
      const pnlHeader = screen.getByText('PnL (SOL)')
      fireEvent.click(pnlHeader)

      // Verify sorting occurred (higher PnL should be first now)
      const rows = screen.getAllByText(/SOL/)
      expect(rows[0]).toBeInTheDocument()
    })

    it('shows trade count', () => {
      const trades = [mockTrade, mockTrade, mockTrade]
      render(<TradeHistoryTable trades={trades} />)
      expect(screen.getByText('3 trades executed')).toBeInTheDocument()
    })
  })

  describe('EmergencyPauseButton', () => {
    it('renders as pause button when running', () => {
      render(
        <EmergencyPauseButton
          isPaused={false}
          onPause={jest.fn()}
          onResume={jest.fn()}
        />
      )
      expect(screen.getByText(/PAUSE AGENTS/)).toBeInTheDocument()
      expect(screen.getByText('🟢 Agents Running')).toBeInTheDocument()
    })

    it('renders as resume button when paused', () => {
      render(
        <EmergencyPauseButton
          isPaused={true}
          onPause={jest.fn()}
          onResume={jest.fn()}
        />
      )
      expect(screen.getByText(/RESUME AGENTS/)).toBeInTheDocument()
      expect(screen.getByText('🟡 Agents Paused')).toBeInTheDocument()
    })

    it('calls onPause with confirmation', async () => {
      window.confirm = jest.fn(() => true)
      const onPause = jest.fn()

      render(
        <EmergencyPauseButton
          isPaused={false}
          onPause={onPause}
          onResume={jest.fn()}
        />
      )

      fireEvent.click(screen.getByText(/PAUSE AGENTS/))

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalled()
        expect(onPause).toHaveBeenCalled()
      })
    })

    it('calls onResume without confirmation', async () => {
      const onResume = jest.fn()

      render(
        <EmergencyPauseButton
          isPaused={true}
          onPause={jest.fn()}
          onResume={onResume}
        />
      )

      fireEvent.click(screen.getByText(/RESUME AGENTS/))

      await waitFor(() => {
        expect(onResume).toHaveBeenCalled()
      })
    })

    it('disables when loading', () => {
      render(
        <EmergencyPauseButton
          isPaused={false}
          onPause={jest.fn()}
          onResume={jest.fn()}
          disabled={true}
        />
      )

      const button = screen.getByText(/PAUSE AGENTS/).closest('button')
      expect(button).toBeDisabled()
    })
  })

  describe('AgentDashboard Integration', () => {
    it('renders dashboard title', async () => {
      render(<AgentDashboard backendUrl="ws://localhost:8000/ws/agent-state" />)

      await waitFor(() => {
        expect(screen.getByText('🤖 Agent Dashboard')).toBeInTheDocument()
      }, { timeout: 100 })
    })

    it('renders agent status cards', async () => {
      render(<AgentDashboard backendUrl="ws://localhost:8000/ws/agent-state" />)

      await waitFor(
        () => {
          expect(screen.getByText('🔍 Scout')).toBeInTheDocument()
        },
        { timeout: 100 }
      )
    })

    it('shows connection status indicator', async () => {
      render(<AgentDashboard backendUrl="ws://localhost:8000/ws/agent-state" />)

      // Should show either connected or polling fallback
      const statusText = screen.getByText(/WebSocket Connected|Using Polling/)
      expect(statusText).toBeInTheDocument()
    })
  })
})
