import axios, { AxiosInstance } from 'axios'
import { API_URL } from './constants'

export class ApiClient {
  private client: AxiosInstance

  constructor(baseURL = API_URL) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Get vault state (balance, PnL, metrics)
   */
  async getVault(vaultId: string) {
    const response = await this.client.get(`/vault/${vaultId}`)
    return response.data
  }

  /**
   * Create a new vault
   */
  async createVault(vaultId: string, authority: string, initialBalance: number = 0) {
    const response = await this.client.post(`/vault/${vaultId}/create`, {
      vault_id: vaultId,
      authority,
      initial_balance: initialBalance,
    })
    return response.data
  }

  /**
   * Get trade history
   */
  async getTrades(vaultId?: string, limit = 20, hoursBack = 24) {
    const response = await this.client.get('/trades', {
      params: {
        vault_id: vaultId,
        limit,
        hours_back: hoursBack,
      },
    })
    return response.data
  }

  /**
   * Get arbitrage opportunities
   */
  async getOpportunities(limit = 50, minSpreadBps = 0) {
    const response = await this.client.get('/opportunities', {
      params: {
        limit,
        min_spread_bps: minSpreadBps,
      },
    })
    return response.data
  }

  /**
   * Get agent activity logs
   */
  async getAgentLogs(agent?: string, limit = 500, hoursBack = 24) {
    const response = await this.client.get('/agent-logs', {
      params: {
        agent,
        limit,
        hours_back: hoursBack,
      },
    })
    return response.data
  }

  /**
   * Get server health and metrics
   */
  async getHealth() {
    const response = await this.client.get('/health')
    return response.data
  }

  /**
   * Get WebSocket URL for real-time updates
   */
  getWebSocketUrl(): string {
    const wsProto = API_URL.startsWith('https') ? 'wss' : 'ws'
    const url = new URL(API_URL)
    return `${wsProto}://${url.host}/ws/agent-state`
  }
}

export const apiClient = new ApiClient()
