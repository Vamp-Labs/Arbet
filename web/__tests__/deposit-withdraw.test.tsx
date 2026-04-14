import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DepositForm } from '../components/DepositForm'
import { WithdrawForm } from '../components/WithdrawForm'

// Mock Solana modules
jest.mock('@solana/wallet-adapter-react', () => ({
  useWallet: jest.fn(),
  useConnection: jest.fn(),
}))

jest.mock('../lib/store', () => ({
  useVaultStore: jest.fn(() => ({
    setError: jest.fn(),
  })),
}))

jest.mock('../lib/api', () => ({
  apiClient: {
    getVault: jest.fn(),
  },
}))

describe('Deposit/Withdraw Forms', () => {
  const mockVault = {
    vault_id: 'test-vault',
    authority: '11111111111111111111111111111112',
    balance: 5_000_000_000, // 5 SOL
    initial_balance: 10_000_000_000,
    cumulative_pnl: -5_000_000_000,
    num_trades: 10,
    max_balance: 10_000_000_000,
    min_balance: 5_000_000_000,
    position_limit_bps: 500,
    max_drawdown_bps: 1000,
    is_paused: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('DepositForm', () => {
    it('does not render when closed', () => {
      const { container } = render(
        <DepositForm
          isOpen={false}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders form when open', () => {
      render(
        <DepositForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/Deposit SOL to test-vault/i)).toBeInTheDocument()
    })

    it('displays amount input field', () => {
      render(
        <DepositForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      const input = screen.getByPlaceholderText('0.5')
      expect(input).toBeInTheDocument()
    })

    it('has deposit button', () => {
      render(
        <DepositForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/Deposit/i)).toBeInTheDocument()
    })

    it('has cancel button', () => {
      render(
        <DepositForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('calls onClose when cancel is clicked', () => {
      const onClose = jest.fn()
      render(
        <DepositForm
          isOpen={true}
          vault={mockVault}
          onClose={onClose}
          onSuccess={jest.fn()}
        />
      )
      fireEvent.click(screen.getByText('Cancel'))
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('WithdrawForm', () => {
    it('does not render when closed', () => {
      const { container } = render(
        <WithdrawForm
          isOpen={false}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(container.firstChild).toBeNull()
    })

    it('renders form when open', () => {
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/Withdraw SOL from test-vault/i)).toBeInTheDocument()
    })

    it('displays available balance', () => {
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/Available: 5\.0000 SOL/)).toBeInTheDocument()
    })

    it('shows MVP limitation warning', () => {
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/MVP Limitation/i)).toBeInTheDocument()
    })

    it('has withdraw button', () => {
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText(/Withdraw/i)).toBeInTheDocument()
    })

    it('has cancel button', () => {
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      )
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    it('calls onClose when cancel is clicked', () => {
      const onClose = jest.fn()
      render(
        <WithdrawForm
          isOpen={true}
          vault={mockVault}
          onClose={onClose}
          onSuccess={jest.fn()}
        />
      )
      fireEvent.click(screen.getByText('Cancel'))
      expect(onClose).toHaveBeenCalled()
    })
  })
})
