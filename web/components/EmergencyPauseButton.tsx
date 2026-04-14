'use client'

import { useState } from 'react'

interface EmergencyPauseButtonProps {
  isPaused: boolean
  onPause: () => Promise<void>
  onResume: () => Promise<void>
  disabled?: boolean
}

export function EmergencyPauseButton({
  isPaused,
  onPause,
  onResume,
  disabled = false,
}: EmergencyPauseButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setError(null)
    setIsLoading(true)

    try {
      if (isPaused) {
        await onResume()
      } else {
        // Confirm before pausing
        const confirmed = window.confirm(
          '⚠️ Are you sure you want to PAUSE all agents? This will stop trading immediately.'
        )
        if (confirmed) {
          await onPause()
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update pause state'
      setError(message)
      console.error('Pause/Resume error:', message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`px-4 py-3 rounded font-semibold transition flex items-center justify-center gap-2 ${
          isPaused
            ? 'bg-green-600 hover:bg-green-700 text-white disabled:opacity-50'
            : 'bg-red-600 hover:bg-red-700 text-white disabled:opacity-50'
        }`}
      >
        {isLoading ? (
          <>
            <span className="inline-block animate-spin">⏳</span>
            {isPaused ? 'Resuming...' : 'Pausing...'}
          </>
        ) : isPaused ? (
          <>
            <span>▶️</span>
            RESUME AGENTS
          </>
        ) : (
          <>
            <span>⏸️</span>
            PAUSE AGENTS
          </>
        )}
      </button>

      {error && (
        <div className="px-3 py-2 bg-red-500/20 border border-red-500/50 rounded text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="text-xs text-gray-400 px-3">
        <p className="font-semibold">
          {isPaused ? '🟡 Agents Paused' : '🟢 Agents Running'}
        </p>
        <p className="mt-1">
          {isPaused
            ? 'All trading has been stopped. Click RESUME to continue.'
            : 'Agents are actively trading. Click PAUSE to stop immediately.'}
        </p>
      </div>
    </div>
  )
}
