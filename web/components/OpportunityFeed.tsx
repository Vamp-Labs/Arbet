'use client'

import { OpportunityData } from '@/lib/hooks/useAgentStream'

interface OpportunityFeedProps {
  opportunities: OpportunityData[]
  maxHeight?: string
}

export function OpportunityFeed({ opportunities, maxHeight = 'h-64' }: OpportunityFeedProps) {
  return (
    <div className={`bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex flex-col`}>
      <div className="bg-slate-900 px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">🎯 Live Opportunity Feed</h3>
        <p className="text-xs text-gray-400 mt-1">{opportunities.length} opportunities detected</p>
      </div>

      <div className={`${maxHeight} overflow-y-auto flex-1`}>
        {opportunities.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">
            Waiting for opportunities...
          </div>
        ) : (
          <div className="divide-y divide-slate-700">
            {opportunities.map((opp) => (
              <div
                key={opp.opportunity_id}
                className="px-4 py-3 hover:bg-slate-700/50 transition text-xs"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-gray-300">{opp.opportunity_id}</span>
                  <span
                    className={`px-2 py-1 rounded text-white font-semibold ${
                      opp.spread_bps > 100
                        ? 'bg-green-600/30 text-green-400'
                        : opp.spread_bps > 50
                          ? 'bg-blue-600/30 text-blue-400'
                          : 'bg-gray-600/30 text-gray-300'
                    }`}
                  >
                    {opp.spread_bps} bps
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-gray-400">
                  <div>
                    <span className="block text-gray-500">Buy Market</span>
                    <span className="text-white font-mono">{opp.buy_market_id}</span>
                    <span className="text-gray-500 ml-2">${opp.buy_price.toFixed(4)}</span>
                  </div>
                  <div>
                    <span className="block text-gray-500">Sell Market</span>
                    <span className="text-white font-mono">{opp.sell_market_id}</span>
                    <span className="text-gray-500 ml-2">${opp.sell_price.toFixed(4)}</span>
                  </div>
                </div>
                <div className="text-gray-500 mt-2">
                  {new Date(opp.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
