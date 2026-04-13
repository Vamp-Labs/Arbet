# CLE-130: Quick Start Guide for Developers

## 🚀 Getting Started in 5 Minutes

### Step 1: Understand the Architecture (2 min)
- **Store**: Single Zustand store manages wallet + vault state
- **Hooks**: Custom hooks (useWalletBalance, useUserVaults, useVaultPolling) handle data fetching
- **Components**: Presentational components receive props and dispatch actions
- **API Client**: Axios-based client handles backend communication

### Step 2: Review Key Files (2 min)

**Must Read First:**
1. `/web/lib/store.ts` - Zustand store definition
2. `/web/lib/hooks.ts` - Custom hooks for data fetching
3. `/web/lib/api.ts` - API client methods

**Then Read:**
4. `/web/app/layout.tsx` - Root layout (will add Providers)
5. `/web/app/page.tsx` - Home page (dashboard)

### Step 3: Execute Implementation Plan (1 min)
Follow the sequence in Section 11 of the full plan document.

---

## 📋 Implementation Checklist

### Phase 1: Foundation
- [ ] Create `app/providers.tsx`
- [ ] Update `app/layout.tsx` with `<Providers>`
- [ ] Extend `lib/store.ts` with vault state
- [ ] Create `components/wallet/WalletConnect.tsx`
- [ ] Test wallet connection

### Phase 2: Wallet Integration
- [ ] Create `components/wallet/WalletInfo.tsx`
- [ ] Add `useWalletBalance()` hook
- [ ] Create `components/layout/Header.tsx`
- [ ] Verify balance updates

### Phase 3: Vault Selection
- [ ] Extend `lib/api.ts` with vault methods
- [ ] Add `useUserVaults()` hook
- [ ] Create `components/vault/VaultSelector.tsx`
- [ ] Test vault fetching

### Phase 4: Vault Creation
- [ ] Create `components/vault/VaultCreateForm.tsx`
- [ ] Add form validation
- [ ] Test vault creation end-to-end

### Phase 5: Vault Display & Polling
- [ ] Create `lib/vault.ts` utilities
- [ ] Create `components/vault/VaultMetrics.tsx`
- [ ] Create `components/vault/VaultDisplay.tsx`
- [ ] Add `useVaultPolling()` hook
- [ ] Verify 5s polling works

### Phase 6: Polish
- [ ] Complete dashboard page
- [ ] Error handling
- [ ] Loading states
- [ ] Mobile responsive
- [ ] Tests
- [ ] Documentation

---

## 🎯 Key Component Examples

### Example 1: Store Setup (lib/store.ts)

```typescript
import { create } from 'zustand'
import { PublicKey } from '@solana/web3.js'

// [COPY-PASTE READY] See full document Section 4
export const useStore = create<Store>((set, get) => ({
  // Initial state
  publicKey: null,
  isConnected: false,
  solBalance: 0n,
  vaults: [],
  selectedVaultId: null,
  selectedVault: null,
  isLoadingVault: false,
  isLoadingBalance: false,
  lastVaultUpdate: null,
  errorMessage: null,

  // Actions
  setPublicKey: (key) => set({ publicKey: key, isConnected: key !== null }),
  // ... (see full document for all actions)
}))
```

### Example 2: Providers Setup (app/providers.tsx)

```typescript
'use client'

import { ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { SOLANA_RPC } from '@/lib/constants'
import '@solana/wallet-adapter-react-ui/styles.css'

export function Providers({ children }: { children: ReactNode }) {
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ]

  return (
    <ConnectionProvider endpoint={SOLANA_RPC}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}
```

### Example 3: Wallet Component (components/wallet/WalletConnect.tsx)

```typescript
'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { useEffect } from 'react'
import { useStore } from '@/lib/store'

export function WalletConnect() {
  const wallet = useWallet()
  const { setPublicKey, setConnected } = useStore()

  useEffect(() => {
    setPublicKey(wallet.publicKey)
    setConnected(wallet.connected)
  }, [wallet.publicKey, wallet.connected, setPublicKey, setConnected])

  return (
    <div className="flex items-center gap-4">
      <WalletMultiButton />
    </div>
  )
}
```

### Example 4: Hook (lib/hooks.ts - useWalletBalance)

```typescript
import { useEffect, useState } from 'react'
import { PublicKey, Connection } from '@solana/web3.js'
import { SOLANA_RPC } from '@/lib/constants'
import { useStore } from '@/lib/store'

export function useWalletBalance(publicKey: PublicKey | null) {
  const [balance, setBalance] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setSolBalance } = useStore()

  useEffect(() => {
    if (!publicKey) {
      setBalance(0n)
      return
    }

    const fetchBalance = async () => {
      try {
        setLoading(true)
        const connection = new Connection(SOLANA_RPC)
        const lamports = await connection.getBalance(publicKey)
        setBalance(BigInt(lamports))
        setSolBalance(BigInt(lamports))
        setError(null)
      } catch (err) {
        setError('Failed to fetch balance')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchBalance()
    const timer = setInterval(fetchBalance, 30000) // Every 30s

    return () => clearInterval(timer)
  }, [publicKey, setSolBalance])

  return { balance, loading, error }
}
```

### Example 5: Vault Utilities (lib/vault.ts)

```typescript
import { VaultState } from '@/lib/store'

export function calculatePnLPercentage(vault: VaultState): number {
  if (vault.initial_balance === 0n) return 0
  return (Number(vault.cumulative_pnl) / Number(vault.initial_balance)) * 100
}

export function calculateDrawdownPercentage(vault: VaultState): number {
  if (vault.initial_balance === 0n) return 0
  const maxDrawdown = vault.initial_balance - vault.min_balance!
  return (Number(maxDrawdown) / Number(vault.initial_balance)) * 100
}

export function formatSol(lamports: bigint): string {
  return (Number(lamports) / 1e9).toFixed(4)
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
```

---

## 🧪 Testing Quick Start

### Unit Test Template (lib/store.test.ts)

```typescript
import { renderHook, act } from '@testing-library/react'
import { useStore } from '@/lib/store'
import { PublicKey } from '@solana/web3.js'

describe('useStore', () => {
  it('should initialize with defaults', () => {
    const { result } = renderHook(() => useStore())
    expect(result.current.publicKey).toBeNull()
    expect(result.current.isConnected).toBe(false)
    expect(result.current.vaults).toEqual([])
  })

  it('should update public key', () => {
    const { result } = renderHook(() => useStore())
    const pubKey = new PublicKey('Ey4zVv7E6PJ2BXR2UhfPZVhDEBBRPJFEJpZ4p8KAhVpZ')
    
    act(() => {
      result.current.setPublicKey(pubKey)
    })

    expect(result.current.publicKey).toEqual(pubKey)
    expect(result.current.isConnected).toBe(true)
  })
})
```

### Component Test Template

```typescript
import { render, screen } from '@testing-library/react'
import { VaultMetrics } from '@/components/vault/VaultMetrics'

describe('VaultMetrics', () => {
  const mockVault = {
    vault_id: 'vault-123',
    balance: BigInt(5000000000),
    initial_balance: BigInt(4000000000),
    cumulative_pnl: BigInt(1000000000),
    num_trades: 25,
    // ... other fields
  }

  it('should display balance', () => {
    render(<VaultMetrics vault={mockVault} />)
    expect(screen.getByText(/5\.0000 SOL/)).toBeInTheDocument()
  })

  it('should show positive PnL in green', () => {
    render(<VaultMetrics vault={mockVault} />)
    const pnlElement = screen.getByTestId('pnl-card')
    expect(pnlElement).toHaveClass('text-green-600')
  })
})
```

---

## 🔧 Common Tasks

### Task: Update a Vault in the Store

```typescript
// From within a component or hook
const { updateVaultState } = useStore()

// Update when balance changes
updateVaultState('vault-123', {
  balance: BigInt(5500000000)
})

// The store merges partial updates
```

### Task: Handle API Error

```typescript
try {
  const vault = await apiClient.getVault(vaultId)
  store.updateVaultState(vaultId, vault)
} catch (err) {
  console.error('Failed to fetch vault:', err)
  store.setErrorMessage('Failed to fetch vault state')
  // Show error to user
}
```

### Task: Trigger Wallet Connection

```typescript
// User clicks the WalletConnect button
// @solana/wallet-adapter handles the modal
// On success, WalletMultiButton updates `useWallet()`
// Our WalletConnect component listens and updates Zustand

// No manual trigger needed! The adapter handles it.
```

### Task: Create a New Vault

```typescript
// 1. User fills VaultCreateForm
// 2. Form validation passes
// 3. API call:
const vault = await apiClient.createVault(
  'vault-' + Date.now(),
  walletAddress,
  BigInt(initialBalance)
)

// 4. Add to store:
store.addVault(vault)

// 5. Auto-select:
store.selectVault(vault.vault_id)

// 6. Polling starts for new vault
```

---

## 📊 File Structure Quick Reference

```
web/
├── app/
│   ├── layout.tsx                 ← Update with <Providers>
│   ├── providers.tsx              ← NEW: Wallet providers
│   ├── page.tsx                   ← Update: Dashboard
│   └── globals.css
│
├── components/
│   ├── wallet/
│   │   ├── WalletConnect.tsx      ← NEW
│   │   ├── WalletInfo.tsx         ← NEW
│   │   └── WalletButton.tsx       ← NEW (optional)
│   │
│   ├── vault/
│   │   ├── VaultSelector.tsx      ← NEW
│   │   ├── VaultDisplay.tsx       ← NEW
│   │   ├── VaultCreateForm.tsx    ← NEW
│   │   └── VaultMetrics.tsx       ← NEW
│   │
│   ├── common/
│   │   ├── ErrorAlert.tsx         ← NEW
│   │   ├── LoadingSpinner.tsx     ← NEW
│   │   └── StatCard.tsx           ← NEW
│   │
│   └── layout/
│       └── Header.tsx             ← NEW
│
├── lib/
│   ├── store.ts                   ← MODIFY: Add vault state
│   ├── api.ts                     ← MODIFY: Add vault methods
│   ├── hooks.ts                   ← MODIFY: Add polling hooks
│   ├── vault.ts                   ← NEW: Utilities
│   ├── constants.ts               ← (Keep as-is)
│   └── env.ts                     ← (Keep as-is)
│
└── __tests__/
    ├── lib/
    │   ├── store.test.ts          ← NEW
    │   └── vault.test.ts          ← NEW
    └── components/
        ├── wallet/
        │   └── WalletConnect.test.tsx ← NEW
        └── vault/
            └── VaultMetrics.test.tsx  ← NEW
```

---

## 🎨 Tailwind Patterns Used

### Card Layout
```typescript
<div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
  {/* content */}
</div>
```

### Stat Display
```typescript
<div className="flex items-center gap-4">
  <div className="text-4xl font-bold text-gray-900">5.0000</div>
  <div className="text-sm text-gray-500">SOL Balance</div>
</div>
```

### Color Coding (PnL)
```typescript
// Positive PnL: green
<div className="text-green-600 font-semibold">+1.0 SOL (+25%)</div>

// Negative PnL: red
<div className="text-red-600 font-semibold">-0.5 SOL (-12%)</div>
```

### Loading State
```typescript
{isLoading ? (
  <LoadingSpinner />
) : (
  <div>{/* content */}</div>
)}
```

---

## 🐛 Debugging Tips

### Check Store State
```typescript
// In browser console
import { useStore } from '/web/lib/store.ts'
useStore.getState()  // View all state
```

### Debug Polling
```typescript
// Add to useVaultPolling hook
console.log(`[VaultPolling] Fetching vault ${vaultId}`)
console.log(`[VaultPolling] Success:`, vault)
console.log(`[VaultPolling] Next poll in 5s`)
```

### Verify Wallet Connection
```typescript
// In WalletConnect component
console.log('Wallet:', wallet)
console.log('Connected:', wallet.connected)
console.log('PublicKey:', wallet.publicKey?.toString())
```

---

## ❓ FAQ

**Q: Why use Zustand instead of Redux?**  
A: Simpler API, smaller bundle, better for this app's complexity level.

**Q: Why poll instead of WebSocket initially?**  
A: Simpler to implement, sufficient for 5s updates. Can upgrade later.

**Q: Can I use the vault-adapter UI directly?**  
A: Yes! WalletMultiButton is already pre-built. Just wrap it.

**Q: How do I test without a real wallet?**  
A: Use mock adapters, or test against devnet with test wallets.

**Q: What if vault creation fails?**  
A: Show error message, keep form populated, show retry button.

---

## 🚀 Next Steps After MVP

1. **WebSocket real-time updates** (replace polling)
2. **Vault deposit/withdraw UI**
3. **Advanced analytics charts**
4. **Trade history viewer**
5. **Mobile app (React Native)**

---

**Quick Reference Version**: 1.0  
**Last Updated**: 2026-04-14

