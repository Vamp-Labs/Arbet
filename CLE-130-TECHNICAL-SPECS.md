# CLE-130: Technical Specifications & Architecture

## A. State Management Architecture

### Zustand Store Diagram
```
useStore (Single source of truth)
│
├─ Wallet State
│  ├─ publicKey: PublicKey | null
│  ├─ isConnected: boolean
│  ├─ solBalance: bigint
│  └─ Actions: setPublicKey, setSolBalance, setConnected
│
├─ Vault State
│  ├─ vaults: VaultState[]
│  ├─ selectedVaultId: string | null
│  ├─ selectedVault: VaultState | null
│  └─ Actions: setVaults, addVault, selectVault, updateVaultState
│
└─ UI State
   ├─ isLoadingVault: boolean
   ├─ isLoadingBalance: boolean
   ├─ lastVaultUpdate: number | null
   ├─ errorMessage: string | null
   └─ Actions: setIsLoadingVault, setLastVaultUpdate, setErrorMessage

Subscribers (React components):
  WalletConnect → publicKey, isConnected
  WalletInfo → solBalance
  VaultSelector → vaults, selectedVaultId
  VaultDisplay → selectedVault, isLoadingVault
  ErrorAlert → errorMessage
```

### Store Mutation Patterns
```typescript
// Pattern 1: Simple state update
store.setSolBalance(1000000000n)

// Pattern 2: List operation
store.addVault(newVault)

// Pattern 3: Selection + child update
store.selectVault('vault-123')

// Pattern 4: Partial update
store.updateVaultState('vault-123', { balance: 5000000000n })
```

---

## B. Component Tree

```
RootLayout
├─ <Providers>
│  ├─ ConnectionProvider
│  ├─ WalletProvider (with auto-connect)
│  └─ WalletModalProvider
│
└─ children
   ├─ Header
   │  ├─ WalletConnect
   │  │  └─ WalletMultiButton (from @solana/wallet-adapter-react-ui)
   │  │     → Updates: publicKey, isConnected
   │  │
   │  ├─ WalletInfo (if connected)
   │  │  ├─ Address display
   │  │  ├─ Balance display
   │  │  └─ useWalletBalance() hook
   │  │     → Updates: solBalance
   │  │
   │  └─ VaultSelector (if wallet connected)
   │     ├─ Dropdown of user vaults
   │     ├─ useUserVaults() hook
   │     │  → Updates: vaults
   │     └─ "Create New Vault" button
   │
   └─ MainContent
      ├─ CASE 1: Not connected
      │  └─ "Please connect your wallet" message
      │
      ├─ CASE 2: Connected, no vaults
      │  └─ VaultCreateForm
      │     ├─ Initial balance input
      │     ├─ Position limit slider
      │     ├─ Max drawdown slider
      │     └─ useAsyncVaultCreate() hook
      │        → Updates: vaults, selectedVaultId
      │
      └─ CASE 3: Connected, vault selected
         ├─ VaultDisplay
         │  ├─ VaultMetrics
         │  │  ├─ BalanceCard
         │  │  ├─ PnLCard
         │  │  ├─ DrawdownCard
         │  │  └─ TradesCard
         │  │
         │  └─ useVaultPolling() hook
         │     → Updates: selectedVault (every 5s)
         │
         └─ VaultDetails (future)
            ├─ Trade history
            ├─ Agent logs
            └─ Performance charts
```

---

## C. Data Flow Diagrams

### Initialization Flow
```
App Start
  ↓
RootLayout loads <Providers>
  ↓
ConnectionProvider connects to SOLANA_RPC
  ↓
WalletProvider loads wallet adapters
  ↓
WalletModalProvider inits UI
  ↓
Auto-connect triggers (if wallet previously connected)
  ↓
useWallet() detects connection
  ↓
WalletConnect component updates store
  → setPublicKey(wallet.publicKey)
  → setConnected(true)
  ↓
useWalletBalance() hook runs
  → Fetches SOL balance from chain
  → setSolBalance(lamports)
  ↓
useUserVaults() hook runs (if connected)
  → API call: GET /vaults?authority={address}
  → setVaults(response)
  ↓
Auto-select first vault (if available)
  → selectVault(vaults[0].vault_id)
  ↓
useVaultPolling() starts polling
  → Fetch every 5s
  → updateVaultState()
```

### Vault Creation Flow
```
User fills VaultCreateForm
  ↓
Validate form
  - balance > 0
  - position_limit_bps > 0 && < 10000
  - max_drawdown_bps > 0 && < 10000
  ↓
Form valid?
  ├─ NO → Show error message
  └─ YES → Continue
  ↓
Call API: POST /vault/{vaultId}/create
  - vaultId: generated (e.g., timestamp or UUID)
  - authority: wallet address
  - initial_balance: form input
  ↓
API returns: { vault_id, authority }
  ↓
Add to vaults list
  → addVault(newVault)
  ↓
Auto-select new vault
  → selectVault(vault_id)
  ↓
Polling starts for new vault
  → useVaultPolling fetches updated state
  ↓
Show success toast
  ↓
Redirect to vault dashboard
```

### Vault Polling Flow
```
useVaultPolling() activated
  ↓
selectedVaultId exists?
  ├─ NO → Exit hook
  └─ YES → Continue
  ↓
Initial fetch: getVault(selectedVaultId)
  ↓
Success?
  ├─ YES → updateVaultState(vault_id, response)
  └─ NO → setErrorMessage(), increment retry counter
  ↓
Set interval: 5000ms
  ↓
Repeat fetch
  ↓
Component unmounts?
  ├─ YES → clearInterval(), cleanup
  └─ NO → Continue polling
  ↓
selectedVaultId changes?
  ├─ YES → Clear interval, restart with new vault_id
  └─ NO → Continue
```

---

## D. API Contract

### Backend Endpoints Used

#### 1. Get Vault State
```http
GET /vault/{vault_id}

Response (200):
{
  "vault_id": "vault-123",
  "vault_address": "SomeAddress1",
  "authority": "WalletAddress",
  "balance": 5000000000,           // in lamports
  "initial_balance": 4000000000,
  "cumulative_pnl": 1000000000,
  "num_trades": 25,
  "position_limit_bps": 500,
  "max_drawdown_bps": 1000,
  "is_paused": false,
  "max_balance": 5200000000,
  "min_balance": 3800000000
}

Error (404):
{
  "detail": "Vault {vault_id} not found"
}
```

#### 2. Create Vault (TO IMPLEMENT)
```http
POST /vault/{vault_id}/create

Body:
{
  "authority": "WalletAddress",
  "initial_balance": 4000000000,
  "position_limit_bps": 500,       // optional
  "max_drawdown_bps": 1000         // optional
}

Response (200):
{
  "vault_id": "vault-123",
  "authority": "WalletAddress"
}

Error (400):
{
  "detail": "Invalid vault parameters"
}
```

#### 3. Get User Vaults (TO IMPLEMENT)
```http
GET /vaults?authority={wallet_address}

Response (200):
[
  {
    "vault_id": "vault-123",
    "vault_address": "SomeAddress1",
    "authority": "WalletAddress",
    "balance": 5000000000,
    ...
  },
  ...
]
```

### API Client Implementation
```typescript
export class ApiClient {
  // Existing
  async getVault(vaultId: string): Promise<VaultState>
  async getTrades(vaultId: string, limit?: number): Promise<TradeRecord[]>
  async getOpportunities(): Promise<OpportunityRecord[]>
  async getAgentLogs(vaultId: string): Promise<AgentLogEntry[]>
  
  // NEW for CLE-130
  async createVault(
    vaultId: string,
    authority: string,
    initialBalance: bigint,
    positionLimitBps?: number,
    maxDrawdownBps?: number
  ): Promise<{ vault_id: string; authority: string }>
  
  async getUserVaults(authority: string): Promise<VaultState[]>
}
```

---

## E. Hook Specifications

### useWalletBalance()
```typescript
function useWalletBalance(publicKey: PublicKey | null): {
  balance: bigint
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```
**Behavior**:
- Fetches SOL balance from chain when publicKey changes
- Polls every 30 seconds
- Updates Zustand store
- Returns current balance + loading/error state

### useUserVaults()
```typescript
function useUserVaults(authority: string | null): {
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```
**Behavior**:
- Fetches user's vaults from API when authority changes
- Populates Zustand store with vaults list
- No polling (one-time fetch on mount/authority change)

### useVaultPolling()
```typescript
function useVaultPolling(
  vaultId: string | null,
  interval?: number  // default 5000ms
): {
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}
```
**Behavior**:
- Polls vault state every 5 seconds
- Updates selectedVault in Zustand store
- Handles errors gracefully
- Cleans up interval on unmount
- Restarts if vaultId changes

---

## F. Type Definitions

### VaultState (from backend)
```typescript
interface VaultState {
  vault_id: string
  vault_address: string
  authority: string                 // wallet address
  balance: bigint                    // current balance in lamports
  initial_balance: bigint            // starting balance
  cumulative_pnl: bigint             // total P&L
  num_trades: number
  position_limit_bps: number         // 0-10000 (basis points)
  max_drawdown_bps: number           // 0-10000
  is_paused: boolean
  max_balance?: bigint               // highest balance reached
  min_balance?: bigint               // lowest balance reached
}
```

### Store Types
```typescript
interface WalletState {
  publicKey: PublicKey | null
  isConnected: boolean
  solBalance: bigint
}

interface VaultStateInStore {
  vaults: VaultState[]
  selectedVaultId: string | null
  selectedVault: VaultState | null
}

interface UIState {
  isLoadingVault: boolean
  isLoadingBalance: boolean
  lastVaultUpdate: number | null      // timestamp
  errorMessage: string | null
}

type Store = WalletState & VaultStateInStore & UIState & Actions
```

---

## G. Error Handling Matrix

| Scenario | Error | User Message | Recovery |
|----------|-------|--------------|----------|
| Wallet not installed | N/A | "Phantom/Solflare not installed. [Install]" | Link to install |
| Wallet connection rejected | UserRejectedRequestError | "Wallet connection rejected" | Retry button |
| Network RPC fail | RpcError | "Failed to connect to Solana network" | Retry with backoff |
| Vault not found | HTTP 404 | "Vault not found. It may have been deleted." | Return to vault list |
| Create vault fails | HTTP 400/500 | "Failed to create vault: {reason}" | Show form again |
| Balance fetch fails | RpcError | "Unable to fetch balance" | Use cached balance |
| Insufficient balance | N/A | "Your SOL balance is too low" | Show required amount |

---

## H. Performance Metrics & Targets

| Metric | Target | Method |
|--------|--------|--------|
| Initial load time | < 2s | Lighthouse |
| Wallet connection | < 1s | User perceived time |
| Balance fetch | < 500ms | Network timing |
| Vault polling latency | < 200ms p99 | API response time |
| Component render | < 16ms | React profiler |
| Store updates | < 5ms | Zustand perf tools |

---

## I. Security Considerations

### Wallet Security
- ✅ Use official @solana/wallet-adapter packages
- ✅ Never ask for private keys (use wallet-adapter)
- ✅ Verify wallet connection before sensitive operations
- ✅ Implement session timeout for inactivity

### Data Validation
- ✅ Validate all form inputs client-side
- ✅ Validate API responses match expected schema
- ✅ Check vault authority matches wallet address

### API Security
- ✅ All API calls go through secure HTTPS
- ✅ Use CORS headers appropriately
- ✅ Rate limit API calls (implement if needed)
- ✅ Validate vault_id format (prevent injection)

---

## J. Accessibility Standards

### WCAG 2.1 Compliance
- [ ] All form inputs have associated labels
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Color not the only indicator (also use text)
- [ ] Loading states announced to screen readers
- [ ] Error messages linked to form fields
- [ ] Sufficient color contrast (4.5:1)
- [ ] Focus visible on interactive elements

### Keyboard Navigation
- Tab: Move between wallet/vault buttons
- Enter: Activate button or open dropdown
- Escape: Close modal or dropdown
- Arrow keys: Navigate dropdown options

---

## K. Mobile Responsiveness

### Breakpoints
- xs: < 640px (mobile)
- sm: 640px (tablet)
- md: 768px (tablet landscape)
- lg: 1024px (desktop)
- xl: 1280px (large desktop)

### Layout Changes
```
Mobile (xs):
├─ Header: stacked vertical
├─ Vault selector: full width dropdown
├─ Vault metrics: single column cards
└─ Form: full width inputs

Desktop (lg):
├─ Header: horizontal layout
├─ Sidebar: vault selector + nav
├─ Vault metrics: grid layout (2-4 columns)
└─ Form: two column layout
```

---

## L. Development Workflow

### Branch Strategy
```
main (production)
  ↓
develop (staging)
  ↓
feature/CLE-130-wallet-vault
  ├─ feature/CLE-130-store-setup
  ├─ feature/CLE-130-wallet-components
  ├─ feature/CLE-130-vault-selection
  ├─ feature/CLE-130-vault-creation
  └─ feature/CLE-130-vault-polling
```

### Commit Message Format
```
[CLE-130] Short description

Detailed explanation of changes
- Bullet point 1
- Bullet point 2

Closes #issue-number
```

### Code Review Checklist
- [ ] All TypeScript errors resolved
- [ ] Unit tests added/updated
- [ ] Component tests added
- [ ] Integration tests added
- [ ] No console errors/warnings
- [ ] Accessibility checked
- [ ] Mobile responsive verified
- [ ] Error handling complete
- [ ] Comments/JSDoc added
- [ ] Performance acceptable

---

## M. Monitoring & Debugging

### Console Logging Pattern
```typescript
const debug = true  // Set to false in production

if (debug) {
  console.log('[CLE-130:WalletConnect] Wallet connected:', publicKey)
  console.log('[CLE-130:VaultPolling] Vault updated:', vault)
  console.log('[CLE-130:Store] State:', store.getState())
}
```

### Error Tracking
```typescript
// Use error boundary for component errors
<ErrorBoundary>
  <VaultDisplay />
</ErrorBoundary>

// Track API errors
try {
  const vault = await apiClient.getVault(id)
} catch (err) {
  console.error('[API_ERROR] getVault failed:', err)
  // Send to error tracking service (Sentry, etc.)
  reportError(err)
}
```

### Performance Monitoring
```typescript
// Track render times
const { totalRenderTime } = useRenderMetrics()

// Track API latency
const startTime = performance.now()
const vault = await apiClient.getVault(id)
const latency = performance.now() - startTime
console.log(`Vault fetch latency: ${latency}ms`)
```

---

## N. Deployment Strategy

### Environment Configuration
```bash
# .env.local (development)
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_API_URL=http://localhost:8000

# .env.staging
NEXT_PUBLIC_RPC_ENDPOINT=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_API_URL=https://staging-api.example.com

# .env.production
NEXT_PUBLIC_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_NETWORK=mainnet-beta
NEXT_PUBLIC_API_URL=https://api.example.com
```

### Build & Test Before Deploy
```bash
npm run type-check    # TypeScript check
npm run lint          # ESLint
npm run test          # Unit tests
npm run build         # Build
npm run test:e2e      # E2E tests
npm start             # Test in production mode
```

---

**Version**: 1.0  
**Last Updated**: 2026-04-14  
**Author**: Development Team

