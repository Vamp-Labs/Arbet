# CLE-130: Wallet Connection & Vault Management - Implementation Plan

**Status**: Design Phase  
**Priority**: High (Foundation for all vault/trading features)  
**Complexity**: Medium  
**Estimated Effort**: 40-60 developer hours  

---

## 1. Executive Summary

CLE-130 implements wallet connection and vault management for the Arbet frontend. This feature enables users to:
- Connect/disconnect Solana wallets (Phantom, Solflare, etc.)
- View wallet address and SOL balance
- Create new vaults with initial balance
- Select and manage multiple vaults
- Monitor real-time vault state (balance, PnL, drawdown, trade count)

### Core Dependencies
- ✅ `@solana/wallet-adapter-react` (installed)
- ✅ `@solana/wallet-adapter-react-ui` (installed)
- ✅ Zustand store (installed)
- ✅ FastAPI backend with vault endpoints (ready)
- ⚙️ Polling service for real-time updates (to build)

---

## 2. Current State Analysis

### Existing Infrastructure
| Component | Status | Details |
|-----------|--------|---------|
| Wallet-Adapter packages | ✅ Installed | Base, React, React-UI, Wallets |
| Zustand | ✅ Installed | Basic WalletStore (publicKey, isConnected only) |
| API Client | ⚠️ Partial | Has getVault(), missing createVault(), createVaultWithSol() |
| Layout | ⚠️ Minimal | No providers configured |
| Styling | ✅ Tailwind | Ready to use |

### Current Store (lib/store.ts)
```typescript
interface WalletStore {
  publicKey: PublicKey | null
  isConnected: boolean
  setPublicKey: (key: PublicKey | null) => void
}
```

### Backend API Endpoints (Ready)
```
GET  /vault/{vault_id}                 → VaultState
POST /vault/{vault_id}/create          → { vault_id, authority }
```

---

## 3. File Structure Design

### New Directory Layout
```
web/
├── app/
│   ├── layout.tsx          (MODIFY: Add providers)
│   ├── page.tsx            (Dashboard - to be extended)
│   ├── globals.css         (Existing)
│   └── providers.tsx       (NEW: Wallet/UI providers wrapper)
│
├── components/
│   ├── wallet/
│   │   ├── WalletConnect.tsx          (Wallet connection UI)
│   │   ├── WalletInfo.tsx             (Display address + balance)
│   │   └── WalletButton.tsx           (Styled wallet button)
│   │
│   ├── vault/
│   │   ├── VaultSelector.tsx          (Dropdown: select vault)
│   │   ├── VaultDisplay.tsx           (Show vault metrics)
│   │   ├── VaultCreateForm.tsx        (Create vault form)
│   │   ├── VaultMetrics.tsx           (Balance, PnL, Drawdown stats)
│   │   └── VaultCard.tsx              (Vault summary card)
│   │
│   ├── common/
│   │   ├── LoadingSpinner.tsx         (Loading state)
│   │   ├── ErrorAlert.tsx             (Error messages)
│   │   └── StatCard.tsx               (Stat display component)
│   │
│   └── layout/
│       ├── Header.tsx                 (Top nav with wallet + vault)
│       └── Sidebar.tsx                (Navigation)
│
├── lib/
│   ├── store.ts                (MODIFY: Extended vault state)
│   ├── api.ts                  (MODIFY: Add createVault methods)
│   ├── hooks.ts                (MODIFY: useWebSocket, add polling hooks)
│   ├── vault.ts                (NEW: Vault utils, calculations)
│   └── constants.ts            (Existing)
│
└── styles/
    └── components.css          (NEW: Component-specific styles)
```

---

## 4. Store Schema (Zustand)

### Extended Store Structure
```typescript
// lib/store.ts

import { create } from 'zustand'
import { PublicKey } from '@solana/web3.js'

// Types
interface VaultState {
  vault_id: string
  vault_address: string
  authority: string
  balance: bigint
  initial_balance: bigint
  cumulative_pnl: bigint
  num_trades: number
  position_limit_bps: number
  max_drawdown_bps: number
  is_paused: boolean
  max_balance?: bigint
  min_balance?: bigint
}

interface WalletState {
  // Wallet state
  publicKey: PublicKey | null
  isConnected: boolean
  solBalance: bigint
  
  // Vault state
  vaults: VaultState[]
  selectedVaultId: string | null
  selectedVault: VaultState | null
  
  // UI state
  isLoadingVault: boolean
  isLoadingBalance: boolean
  lastVaultUpdate: number | null
  errorMessage: string | null
}

interface Store extends WalletState {
  // Wallet actions
  setPublicKey: (key: PublicKey | null) => void
  setSolBalance: (balance: bigint) => void
  setConnected: (connected: boolean) => void
  
  // Vault actions
  setVaults: (vaults: VaultState[]) => void
  addVault: (vault: VaultState) => void
  selectVault: (vaultId: string) => void
  updateVaultState: (vaultId: string, state: Partial<VaultState>) => void
  
  // UI state actions
  setIsLoadingVault: (loading: boolean) => void
  setIsLoadingBalance: (loading: boolean) => void
  setLastVaultUpdate: (timestamp: number) => void
  setErrorMessage: (message: string | null) => void
  clearError: () => void
}

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

  // Wallet actions
  setPublicKey: (key) => set({ publicKey: key, isConnected: key !== null }),
  setSolBalance: (balance) => set({ solBalance: balance }),
  setConnected: (connected) => set({ isConnected: connected }),

  // Vault actions
  setVaults: (vaults) => set({ vaults }),
  addVault: (vault) => set((state) => ({ vaults: [...state.vaults, vault] })),
  selectVault: (vaultId) => {
    const { vaults } = get()
    const selectedVault = vaults.find((v) => v.vault_id === vaultId) || null
    set({ selectedVaultId: vaultId, selectedVault })
  },
  updateVaultState: (vaultId, state) => {
    set((prevState) => ({
      vaults: prevState.vaults.map((v) =>
        v.vault_id === vaultId ? { ...v, ...state } : v
      ),
      selectedVault:
        prevState.selectedVaultId === vaultId
          ? { ...prevState.selectedVault!, ...state }
          : prevState.selectedVault,
    }))
  },

  // UI state actions
  setIsLoadingVault: (loading) => set({ isLoadingVault: loading }),
  setIsLoadingBalance: (loading) => set({ isLoadingBalance: loading }),
  setLastVaultUpdate: (timestamp) => set({ lastVaultUpdate: timestamp }),
  setErrorMessage: (message) => set({ errorMessage: message }),
  clearError: () => set({ errorMessage: null }),
}))
```

---

## 5. Component Specifications

### 5.1 Providers Setup (NEW: app/providers.tsx)

**Purpose**: Wrap app with Solana wallet adapters and custom providers

```typescript
'use client'

import { ReactNode } from 'react'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from '@solana/wallet-adapter-wallets'
import { SOLANA_RPC } from '@/lib/constants'
import '@solana/wallet-adapter-react-ui/styles.css'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const wallets = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    // Add more wallets as needed
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

### 5.2 WalletConnect Component

**Purpose**: Primary wallet connection UI  
**Props**:
```typescript
interface WalletConnectProps {
  onConnected?: () => void
  onDisconnected?: () => void
  size?: 'sm' | 'md' | 'lg'
  showBalance?: boolean
}
```

**Features**:
- Wallet button with dropdown (from @solana/wallet-adapter-react-ui)
- Display connected address (truncated)
- Display SOL balance
- Disconnect option
- Error handling for wallet connection failures

**Location**: `components/wallet/WalletConnect.tsx`

### 5.3 WalletInfo Component

**Purpose**: Display wallet details  
**Props**:
```typescript
interface WalletInfoProps {
  address: string
  balance: bigint
  isLoading?: boolean
  showExplorer?: boolean
}
```

**Features**:
- Show full/truncated wallet address
- Format and display SOL balance
- Link to Solana Explorer (optional)
- Copy address to clipboard
- Skeleton loading state

**Location**: `components/wallet/WalletInfo.tsx`

### 5.4 VaultSelector Component

**Purpose**: Select vault from list  
**Props**:
```typescript
interface VaultSelectorProps {
  vaults: VaultState[]
  selectedVaultId: string | null
  onSelect: (vaultId: string) => void
  onCreateNew?: () => void
  isLoading?: boolean
}
```

**Features**:
- Dropdown/combobox showing vault list
- Show vault ID + balance for each
- "Create New Vault" option
- Search filter (optional)
- Loading state while fetching vaults

**Location**: `components/vault/VaultSelector.tsx`

### 5.5 VaultDisplay Component

**Purpose**: Show comprehensive vault metrics  
**Props**:
```typescript
interface VaultDisplayProps {
  vault: VaultState
  isLoading?: boolean
  showChart?: boolean
  refreshInterval?: number
}
```

**Features**:
- Balance (current + initial)
- PnL (absolute + percentage)
- Drawdown (current + max)
- Trade count
- Position limits
- Status badge (active/paused)
- Real-time update indicator

**Location**: `components/vault/VaultDisplay.tsx`

### 5.6 VaultCreateForm Component

**Purpose**: Form to create new vault  
**Props**:
```typescript
interface VaultCreateFormProps {
  walletAddress: string
  onSuccess?: (vault: VaultState) => void
  onCancel?: () => void
  isLoading?: boolean
}
```

**Features**:
- Initial balance input (with validation)
- Position limit and max drawdown sliders
- Form validation (balance > 0, realistic limits)
- Error messages
- Submit and cancel buttons
- Wallet address prefilled

**Location**: `components/vault/VaultCreateForm.tsx`

### 5.7 VaultMetrics Component

**Purpose**: Display stat cards for vault metrics  
**Props**:
```typescript
interface VaultMetricsProps {
  vault: VaultState
  isLoading?: boolean
  compact?: boolean
}
```

**Features**:
- Balance card (current/initial, trend)
- PnL card (with color: green/red)
- Drawdown card (with progress bar)
- Trades card (count + rate)

**Location**: `components/vault/VaultMetrics.tsx`

### 5.8 Common Components

**ErrorAlert.tsx** - Display error messages with dismiss
**LoadingSpinner.tsx** - Reusable loading spinner
**StatCard.tsx** - Stat display with label, value, change

---

## 6. API Client Extensions

### Updated API Methods (lib/api.ts)

```typescript
export class ApiClient {
  // Existing
  async getVault(vaultId: string): Promise<VaultState> { ... }

  // NEW: Create vault
  async createVault(
    vaultId: string,
    authority: string,
    initialBalance: bigint
  ): Promise<{ vault_id: string; authority: string }> {
    const response = await this.client.post(`/vault/${vaultId}/create`, {
      authority,
      initial_balance: initialBalance.toString(),
    })
    return response.data
  }

  // NEW: Get user vaults (needs backend endpoint)
  async getUserVaults(authority: string): Promise<VaultState[]> {
    const response = await this.client.get('/vaults', {
      params: { authority },
    })
    return response.data
  }

  // Existing methods
  async getTrades(vaultId: string, limit = 20): Promise<TradeRecord[]> { ... }
  async getOpportunities(): Promise<OpportunityRecord[]> { ... }
  // etc.
}
```

---

## 7. Custom Hooks

### useVaultPolling Hook

```typescript
// lib/hooks.ts

export function useVaultPolling(vaultId: string | null, interval = 5000) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { updateVaultState } = useStore()

  useEffect(() => {
    if (!vaultId) return

    const poll = async () => {
      try {
        setLoading(true)
        const vault = await apiClient.getVault(vaultId)
        updateVaultState(vaultId, vault)
        setError(null)
      } catch (err) {
        setError('Failed to fetch vault state')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    poll() // Initial fetch
    const timer = setInterval(poll, interval)

    return () => clearInterval(timer)
  }, [vaultId, interval, updateVaultState])

  return { loading, error }
}
```

### useWalletBalance Hook

```typescript
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

### useUserVaults Hook

```typescript
export function useUserVaults(authority: string | null) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { setVaults } = useStore()

  useEffect(() => {
    if (!authority) return

    const fetchVaults = async () => {
      try {
        setLoading(true)
        const vaults = await apiClient.getUserVaults(authority)
        setVaults(vaults)
        setError(null)
      } catch (err) {
        setError('Failed to fetch vaults')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchVaults()
  }, [authority, setVaults])

  return { loading, error }
}
```

---

## 8. Utility Functions

### Vault Calculations (lib/vault.ts - NEW)

```typescript
import { VaultState } from '@/lib/store'

export function calculatePnLPercentage(vault: VaultState): number {
  if (vault.initial_balance === 0n) return 0
  return (
    Number(vault.cumulative_pnl) /
    Number(vault.initial_balance) *
    100
  )
}

export function calculateDrawdownPercentage(vault: VaultState): number {
  if (vault.initial_balance === 0n) return 0
  const maxDrawdown = vault.initial_balance - vault.min_balance!
  return (Number(maxDrawdown) / Number(vault.initial_balance)) * 100
}

export function calculateCurrentDrawdown(vault: VaultState): number {
  if (vault.max_balance === 0n) return 0
  const drawdown = vault.max_balance! - vault.balance
  return (Number(drawdown) / Number(vault.max_balance!)) * 100
}

export function formatSol(lamports: bigint): string {
  return (Number(lamports) / 1e9).toFixed(4)
}

export function formatBalance(balance: bigint): string {
  return formatSol(balance)
}

export function truncateAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`
}
```

---

## 9. Integration Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    App Root (layout.tsx)                │
│         - Wrapped with <Providers>                      │
│         - Solana ConnectionProvider                     │
│         - WalletProvider                                │
│         - WalletModalProvider                           │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│            Header Component (layout/Header.tsx)         │
│  ┌────────────────────────────────────────────────────┐ │
│  │ WalletConnect                                      │ │
│  │  → useWallet() from adapter                        │ │
│  │  → Update Zustand store on connect/disconnect     │ │
│  │  → Display: Button, Address, Balance              │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ VaultSelector (if wallet connected)                │ │
│  │  → useUserVaults() hook to fetch vaults            │ │
│  │  → Dropdown to select vault                        │ │
│  │  → "Create New" button                             │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│         Main Content Area (page.tsx or routes)          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ IF wallet NOT connected:                           │ │
│  │  → Show "Please connect wallet" message            │ │
│  │  → Show WalletConnect button                       │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ IF wallet connected BUT no vault:                  │ │
│  │  → Show VaultCreateForm                            │ │
│  │  → On success: Create vault + auto-select          │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │ IF wallet connected AND vault selected:            │ │
│  │  → Show VaultDisplay                               │ │
│  │    - VaultMetrics (balance, PnL, drawdown)         │ │
│  │    - useVaultPolling() hook (5s interval)          │ │
│  │    - WebSocket for real-time updates (later)       │ │
│  │  → Show vault-specific data (trades, logs, etc.)   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

Zustand Store Updates:
├─ WalletConnect → setPublicKey() → setConnected(true)
├─ useWalletBalance → setSolBalance()
├─ useUserVaults → setVaults()
├─ VaultSelector → selectVault()
└─ useVaultPolling → updateVaultState()
```

---

## 10. Testing Strategy

### Unit Tests

**File**: `web/__tests__/lib/store.test.ts`
```typescript
describe('useStore (Zustand)', () => {
  it('should initialize with correct defaults', () => { ... })
  it('should update wallet state on setPublicKey', () => { ... })
  it('should add vault to list', () => { ... })
  it('should select vault and update selectedVault', () => { ... })
  it('should update vault state preserving others', () => { ... })
  it('should clear error message', () => { ... })
})
```

**File**: `web/__tests__/lib/vault.test.ts`
```typescript
describe('Vault utilities', () => {
  it('should calculate PnL percentage correctly', () => { ... })
  it('should calculate drawdown percentage', () => { ... })
  it('should format Sol amounts correctly', () => { ... })
  it('should truncate addresses', () => { ... })
})
```

### Component Tests

**File**: `web/__tests__/components/vault/VaultMetrics.test.tsx`
```typescript
describe('VaultMetrics component', () => {
  it('should render loading state', () => { ... })
  it('should display vault balance card', () => { ... })
  it('should display PnL in green when positive', () => { ... })
  it('should display PnL in red when negative', () => { ... })
})
```

### Integration Tests

**File**: `web/__tests__/integration/wallet-vault.integration.test.ts`
```typescript
describe('Wallet ↔ Vault integration', () => {
  it('should connect wallet and load user vaults', async () => { ... })
  it('should create vault and auto-select', async () => { ... })
  it('should poll vault state every 5 seconds', async () => { ... })
  it('should handle vault not found error', async () => { ... })
})
```

### E2E Tests (Playwright)

**File**: `web/e2e/wallet-vault.spec.ts`
```typescript
test.describe('Wallet & Vault Management', () => {
  test('complete flow: connect → create vault → view metrics', async ({ page }) => {
    // 1. Navigate to app
    // 2. Click wallet button
    // 3. Select Phantom wallet
    // 4. Approve connection
    // 5. Verify address displays
    // 6. Click "Create Vault"
    // 7. Enter balance
    // 8. Submit form
    // 9. Verify vault appears in selector
    // 10. Verify metrics display
  })
})
```

---

## 11. Implementation Sequence

### Phase 1: Foundation (Days 1-2)
1. **Setup Providers** (`app/providers.tsx`)
   - Create Providers component
   - Update layout.tsx to use Providers
   - Test wallet connection modal appears

2. **Extend Zustand Store** (`lib/store.ts`)
   - Add VaultState interface
   - Extend WalletStore with vault fields
   - Add vault action creators
   - Write unit tests

3. **Create WalletConnect Component** (`components/wallet/WalletConnect.tsx`)
   - Use @solana/wallet-adapter-react-ui WalletMultiButton
   - Integrate with store
   - Add error handling

### Phase 2: Wallet & Balance (Days 3-4)
4. **Create WalletInfo Component** (`components/wallet/WalletInfo.tsx`)
   - Display address + balance
   - Add copy-to-clipboard
   - Add loading state

5. **Implement useWalletBalance Hook** (`lib/hooks.ts`)
   - Fetch SOL balance from chain
   - Store in Zustand
   - Poll every 30s

6. **Create Header Component** (`components/layout/Header.tsx`)
   - Combine WalletConnect + WalletInfo
   - Responsive design
   - Test wallet connection flow

### Phase 3: Vault Selection (Days 5-6)
7. **Extend API Client** (`lib/api.ts`)
   - Add createVault() method
   - Add getUserVaults() method
   - Add error handling

8. **Implement useUserVaults Hook** (`lib/hooks.ts`)
   - Fetch vaults for connected wallet
   - Update Zustand store

9. **Create VaultSelector Component** (`components/vault/VaultSelector.tsx`)
   - Dropdown showing user's vaults
   - "Create New" option
   - Test with mock data

### Phase 4: Vault Creation (Days 7-8)
10. **Create VaultCreateForm Component** (`components/vault/VaultCreateForm.tsx`)
    - Form with initial balance input
    - Validation rules
    - Submit and cancel buttons
    - Error handling

11. **Implement Form Logic**
    - Hook form with react-hook-form
    - API call to createVault
    - Update store on success
    - Redirect to vault details

12. **Test Vault Creation**
    - Unit tests for form validation
    - Integration test: create → select → display

### Phase 5: Vault Display & Polling (Days 9-10)
13. **Create Vault Utilities** (`lib/vault.ts`)
    - PnL calculation
    - Drawdown calculation
    - Formatting utilities
    - Write tests

14. **Create VaultMetrics Component** (`components/vault/VaultMetrics.tsx`)
    - Display balance, PnL, drawdown, trades
    - Color coding (green/red for PnL)
    - Progress bars for drawdown
    - Responsive layout

15. **Create VaultDisplay Component** (`components/vault/VaultDisplay.tsx`)
    - Main vault overview
    - Combine VaultMetrics
    - Show metadata (limits, status)

16. **Implement useVaultPolling Hook** (`lib/hooks.ts`)
    - Poll vault state every 5s
    - Update Zustand on changes
    - Handle errors gracefully

### Phase 6: Integration & Polish (Days 11-12)
17. **Create Dashboard/Main Page** (`app/page.tsx`)
    - Show wallet connection state
    - Show vault list/selector
    - Show vault details if selected
    - Responsive layout

18. **Add Common Components**
    - ErrorAlert, LoadingSpinner, StatCard
    - Add to lib/components/common/

19. **Styling & Theming**
    - Tailwind styling
    - Consistent colors and spacing
    - Mobile responsive
    - Dark mode support (optional)

20. **Error Handling & Edge Cases**
    - Network errors
    - Wallet connection errors
    - Vault not found
    - Balance update failures
    - Proper user feedback

21. **Testing Suite**
    - Unit tests for all utilities
    - Component tests
    - Integration tests
    - E2E tests with Playwright

22. **Documentation & Code Review**
    - JSDoc comments
    - TypeScript types
    - README updates
    - PR review and merge

---

## 12. Error Handling Strategy

### Network Errors
- **Vault fetch fails**: Show error alert, retry button, fallback to cached data
- **Wallet balance fetch fails**: Use last known balance, show warning
- **Vault create fails**: Show error message with reason, keep form populated

### Wallet Errors
- **Connection rejected**: "User rejected wallet connection"
- **Network mismatch**: "Please switch to Devnet in wallet"
- **Wallet not installed**: Show installation link for Phantom/Solflare

### Validation Errors
- **Initial balance ≤ 0**: "Balance must be greater than 0"
- **Position limit > 10000**: "Position limit cannot exceed 100%"
- **Max drawdown < 0**: "Drawdown must be positive"

### User Feedback Patterns
```typescript
// Success
toast.success('Vault created successfully!')

// Error
alert.error('Failed to create vault: insufficient balance')

// Loading
<LoadingSpinner /> with message

// Retry
<ErrorAlert withRetry onRetry={() => refetch()} />
```

---

## 13. Performance Considerations

### Polling Strategy
- **Initial vault fetch**: On component mount or vault selection
- **Balance polling**: Every 30 seconds (Solana chain is ~400ms per block)
- **Vault state polling**: Every 5 seconds (real-time requirement)
- **Debounce**: Vault selector changes (300ms)
- **Memoization**: Zustand selectors to prevent unnecessary re-renders

### Optimization Patterns
```typescript
// Memoize vault selector
const vault = useShallow(
  (state) => state.selectedVault
)

// useCallback for event handlers
const handleSelectVault = useCallback((id: string) => {
  selectVault(id)
}, [selectVault])

// useMemo for computed values
const pnlPercentage = useMemo(
  () => calculatePnLPercentage(vault),
  [vault]
)
```

### Bundle Size
- Use tree-shaking: only import what's needed
- Lazy load routes if needed (optional)
- Monitor with `next/bundle-analyzer`

---

## 14. Deployment Checklist

- [ ] All TypeScript errors resolved (`tsc --noEmit`)
- [ ] All tests passing (`npm test`)
- [ ] Environment variables configured (.env.local)
- [ ] API endpoints verified (backend running)
- [ ] Wallet connection tested (Phantom + Solflare)
- [ ] Form validation working
- [ ] Polling updates in real-time
- [ ] Error handling for all scenarios
- [ ] Mobile responsive layout
- [ ] Accessibility: keyboard navigation, ARIA labels
- [ ] Performance: Lighthouse score > 80
- [ ] No console errors/warnings
- [ ] Staging deployment successful
- [ ] Production deployment

---

## 15. Future Enhancements (Post-MVP)

### Phase 2 Features
- WebSocket real-time updates (replace polling)
- Vault deposit/withdraw
- Multi-vault comparison
- Advanced analytics charts (Recharts)
- Trade history view
- Agent logs viewer
- Vault settings/configuration

### Phase 3 Features
- Risk management dashboard
- Automated rebalancing
- Performance analytics
- Vault snapshots/history
- Notifications (email, in-app)
- Mobile app (React Native)
- Advanced charting (TradingView)

---

## 16. Key Dependencies Review

| Package | Version | Purpose | Status |
|---------|---------|---------|--------|
| @solana/wallet-adapter-react | ^0.15.35 | Wallet state mgmt | ✅ |
| @solana/wallet-adapter-react-ui | ^0.9.35 | Pre-built UI | ✅ |
| @solana/wallet-adapter-wallets | ^0.19.18 | Wallet implementations | ✅ |
| @solana/web3.js | ^1.91.0 | RPC client | ✅ |
| zustand | ^4.4.1 | Store management | ✅ |
| react-hook-form | ^7.48.0 | Form handling | ✅ |
| axios | ^1.6.2 | HTTP client | ✅ |
| tailwindcss | ^3.4.1 | Styling | ✅ |
| dayjs | ^1.11.10 | Date formatting | ✅ |

**No new dependencies required!** All necessary packages are already installed.

---

## 17. Success Criteria

- ✅ User can connect Phantom/Solflare wallet
- ✅ Wallet address and SOL balance displayed
- ✅ User can create vault with initial balance
- ✅ Vault appears in selector and can be selected
- ✅ Vault metrics (balance, PnL, drawdown) displayed in real-time
- ✅ Polling updates vault state every 5 seconds
- ✅ All error cases handled gracefully
- ✅ Mobile responsive layout
- ✅ Accessibility standards met
- ✅ Test coverage > 80%
- ✅ Zero TypeScript errors

---

## 18. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|-----------|
| Wallet connection fails | High | Low | Test with multiple wallets early |
| RPC rate limits | Medium | Medium | Implement backoff, use WebSocket later |
| Form validation bugs | Medium | Medium | Comprehensive testing |
| Store state sync issues | High | Low | Use Zustand dev tools, test carefully |
| Chain state inconsistencies | Medium | Low | Implement checksums, retry logic |

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-14  
**Owner**: Development Team  
**Review Date**: Before implementation start

