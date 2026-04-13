import { useEffect, useState } from 'react'

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let ws: WebSocket | null = null

    try {
      ws = new WebSocket(url)

      ws.onopen = () => setConnected(true)
      ws.onmessage = (event) => setData(JSON.parse(event.data))
      ws.onerror = (e) => setError('WebSocket error')
      ws.onclose = () => setConnected(false)
    } catch (err) {
      setError('Failed to connect WebSocket')
    }

    return () => {
      if (ws) ws.close()
    }
  }, [url])

  return { connected, data, error }
}
