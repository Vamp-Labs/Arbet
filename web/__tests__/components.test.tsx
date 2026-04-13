import { describe, it, expect, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ErrorAlert } from '../components/ErrorAlert'
import { useVaultStore } from '../lib/store'

// Mock zustand
jest.mock('../lib/store', () => ({
  useVaultStore: jest.fn(),
}))

describe('Components', () => {
  describe('ErrorAlert', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('does not render when no error', () => {
      ;(useVaultStore as jest.Mock).mockReturnValue({
        error: null,
        clearError: jest.fn(),
      })

      const { container } = render(<ErrorAlert />)
      expect(container.firstChild).toBeNull()
    })

    it('renders error message when error exists', () => {
      const clearError = jest.fn()
      ;(useVaultStore as jest.Mock).mockReturnValue({
        error: 'Test error message',
        clearError,
      })

      render(<ErrorAlert />)

      expect(screen.getByText('Test error message')).toBeInTheDocument()
    })

    it('dismisses error when close button clicked', async () => {
      const clearError = jest.fn()
      ;(useVaultStore as jest.Mock).mockReturnValue({
        error: 'Test error',
        clearError,
      })

      render(<ErrorAlert />)

      const closeButton = screen.getByText('✕')
      fireEvent.click(closeButton)

      expect(clearError).toHaveBeenCalled()
    })

    it('auto-dismisses after 5 seconds', async () => {
      const clearError = jest.fn()
      ;(useVaultStore as jest.Mock).mockReturnValue({
        error: 'Test error',
        clearError,
      })

      jest.useFakeTimers()

      render(<ErrorAlert />)

      expect(screen.getByText('Test error')).toBeInTheDocument()

      jest.advanceTimersByTime(5000)

      jest.useRealTimers()

      await waitFor(() => {
        expect(clearError).toHaveBeenCalled()
      })
    })
  })
})
