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

  async getVault(vaultId: string) {
    const response = await this.client.get(`/vault/${vaultId}`)
    return response.data
  }

  async getTrades(vaultId: string, limit = 20) {
    const response = await this.client.get('/trades', {
      params: { vault_id: vaultId, limit },
    })
    return response.data
  }

  async getOpportunities() {
    const response = await this.client.get('/opportunities')
    return response.data
  }

  async getAgentLogs(vaultId: string) {
    const response = await this.client.get('/agent-logs', {
      params: { vault_id: vaultId },
    })
    return response.data
  }

  async updateConfig(vaultId: string, config: any) {
    const response = await this.client.post(`/config/${vaultId}`, config)
    return response.data
  }

  getWebSocketUrl(): string {
    const wsProto = API_URL.startsWith('https') ? 'wss' : 'ws'
    const url = new URL(API_URL)
    return `${wsProto}://${url.host}/ws/agent-state`
  }
}

export const apiClient = new ApiClient()
