'use client'

import { useEffect, useState } from 'react'
import { useVaultStore } from '@/lib/store'

/**
 * ErrorAlert Component
 * Displays error messages as a toast notification
 * Auto-dismisses after 5 seconds
 */
export function ErrorAlert() {
  const { error, clearError } = useVaultStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (error) {
      setVisible(true)
      const timer = setTimeout(() => {
        setVisible(false)
        clearError()
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [error, clearError])

  if (!visible || !error) {
    return null
  }

  return (
    <div className="fixed top-4 right-4 max-w-md z-50">
      <div className="bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-start gap-3">
        <div className="text-lg leading-none mt-0.5">⚠️</div>
        <div>
          <p className="font-semibold text-sm">Error</p>
          <p className="text-sm text-red-100">{error}</p>
        </div>
        <button
          onClick={() => {
            setVisible(false)
            clearError()
          }}
          className="text-red-100 hover:text-white ml-auto flex-shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
