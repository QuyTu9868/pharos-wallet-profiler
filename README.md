# 🔍 Pharos Wallet Profiler

> A Node.js skill that analyzes any wallet address on **Pharos Mainnet** and returns rich, structured on-chain intelligence — built for AI agents to consume.
>
> Submission for **Pharos AI Agent Carnival — Phase 1 (Skill Hackathon)**

---

## What it does

Give it a wallet address. It returns a full profile covering balances, transaction history, DeFi activity, gas usage, staking participation, behavioral classification, and two composite scores — all in one call.

```bash
node index.js 0xc70869062be8F8e08FEE5e3a386D5EA48bd708c4
```

### Sample output

```
    ____  __                               ____             _____ __         
   / __ \/ /_  ____ __________  _____     / __ \_________  / __(_) /__  _____
  / /_/ / __ \/ __ `/ ___/ __ \/ ___/    / /_/ / ___/ __ \/ /_/ / / _ \/ ___/
 / ____/ / / / /_/ / /  / /_/ (__  )    / ____/ /  / /_/ / __/ / /  __/ /    
/_/   /_/ /_/\__,_/_/   \____/____/    /_/   /_/   \____/_/ /_/_/\___/_/     

════════════════════════════════════════════════════════════

📌  Address : 0xc70869062be8F8e08FEE5e3a386D5EA48bd708c4
🏷️   Type    : EOA — Externally Owned Account
🔗  Explorer: https://www.pharosscan.xyz/address/0xc70869062be8F8e08FEE5e3a386D5EA48bd708c4

────────────────────────────────────────────────────────────
💰  BALANCES
────────────────────────────────────────────────────────────
  PROS  : 10.0849 PROS
  WPROS : 0  (empty)
  USDC  : 0.0391
  PDOG  : 2398.0000
  pALPHA: 248.2384

────────────────────────────────────────────────────────────
🔒  STAKING POSITION DETECTED
────────────────────────────────────────────────────────────
  pALPHA balance : 248.2384
  Participating in "Stake Before the Stake" — Pharos Port pre-staking program

────────────────────────────────────────────────────────────
📊  TRANSACTION HISTORY
────────────────────────────────────────────────────────────
  Sent (nonce)   : 18
  Total on-chain : 19
  First tx  : 2026-04-28T11:33:47.000Z
              https://www.pharosscan.xyz/tx/0xaa2d19ef5539184235cc832bc5b1974dc92f4f2f6786efd083af03a1c7ce211c
  Latest tx : 2026-06-12T14:35:14.000Z
              https://www.pharosscan.xyz/tx/0xdf735cc6a4080c4f94e37dffaf0012bbcbe5b5fa88ccd633f0673f69a4e6efe2

────────────────────────────────────────────────────────────
⛽  GAS SPENT
────────────────────────────────────────────────────────────
  Total     : 0.032299 PROS
  Avg/tx    : 0.0017 PROS
  Over      : 19 transactions

────────────────────────────────────────────────────────────
🏦  DEFI ACTIVITY
────────────────────────────────────────────────────────────
  ✅  FaroSwap               [DEX]  —  2 tx
       Methods: Multicall
  ✅  USDC Token             [Token]  —  2 tx
       Methods: Approve
  ✅  DODO DEX               [DEX]  —  6 tx
       Methods: Mix Swap
  ❔  Unrecognized Contract  [Unknown]  —  3 tx
       Methods: Add Person, Contract Creation
       Address: 0x9eea188be2edbd566469be082a5e0d416dd7e919
  ✅  PROSPixel              [Game]  —  2 tx
       Methods: Batch Buy Pixels, Register
  ✅  Tiered Airdrop         [Airdrop]  —  1 tx
       Methods: Claim

────────────────────────────────────────────────────────────
⭐  MOST INTERACTED CONTRACT
────────────────────────────────────────────────────────────
  Name      : DODOFeeRouteProxy
  Address   : 0xa5ca5fbe34e444f366b373170541ec6902b0f75c
  Verified  : Yes ✅
  Tx count  : 6

────────────────────────────────────────────────────────────
🔍  BEHAVIOR  [ACTIVE_TRADER]
────────────────────────────────────────────────────────────
  ✅  Active wallet — last transaction 0 day(s) ago
  📤  Mostly sending — 95% of activity is outgoing

────────────────────────────────────────────────────────────
🏆  WALLET SCORE  —  80/100  Excellent ⭐⭐⭐⭐⭐
────────────────────────────────────────────────────────────
  +12  Wallet age: 1 month(s)
  +8   Moderate activity (19 transactions)
  +20  High DeFi diversity (5 protocols used)
  +10  Active staking position detected (248.24 pALPHA)
  +15  Very recently active (within 7 days)
  +10  Healthy PROS balance (10.08)
  +5   Holds 2 token types

────────────────────────────────────────────────────────────
🛡️   RISK SCORE  —  0/100  Low Risk 🟢
────────────────────────────────────────────────────────────
  ✅  EOA wallet — standard externally owned account
  ✅  Has transaction history (wallet age: 1 month(s))
  ✅  Active in the last 30 days

════════════════════════════════════════════════════════════
```

---

## Why this is useful for an AI Agent

Most wallet inspectors just dump raw numbers. This skill adds an **interpretation layer** on top of raw on-chain data, so an agent doesn't need to re-derive meaning itself:

- **Behavioral classification** — is this wallet `fresh_wallet`, `dormant`, `passive_holder`, `active_trader`, or a `contract`?
- **Wallet Score (0-100)** — a single number representing wallet *quality*: age, activity level, DeFi diversity, staking participation, balance health.
- **Risk Score (0-100)** — a single number representing wallet *risk*: contract vs EOA, history depth, gas sufficiency, abnormal patterns.
- **DeFi Activity** — which protocols the wallet has interacted with, including graceful handling of *unrecognized* contracts (still surfaced with their address instead of being silently dropped).
- **Staking detection** — automatically flags participation in Pharos Port's "Stake Before the Stake" program via receipt token balance.
- **Liquidity position detection** — reads on-chain Position NFTs (Uniswap V3-style) to detect active LP positions, including the token pair and active/closed status.

An agent calling this skill can answer questions like *"is this a real user or a fresh airdrop-farming wallet?"*, *"does this wallet have enough PROS to pay gas?"*, or *"has this user staked / used DeFi?"* — without writing any blockchain code itself.

---

## How it works

```
Input: wallet address (0x...)
         │
         ├─► Pharos RPC (https://rpc.pharos.xyz)
         │    ├── eth_getBalance          → native PROS balance
         │    ├── eth_getTransactionCount → nonce
         │    ├── eth_getCode             → EOA vs Contract
         │    └── eth_call (balanceOf)    → ERC20 balances (WPROS, USDC, PDOG, pALPHA)
         │
         ├─► SocialScan Explorer API (https://api.socialscan.io/pharos-mainnet)
         │    └── /transactions (paginated, up to 500 txns) → full tx history, gas fees, contract metadata
         │
         ├─► Analysis layer
         │    ├── analyzer.js   → behavior classification + natural-language insights
         │    └── scoring.js    → Wallet Score + Risk Score
         │
         ▼
Output: formatted terminal report
```

All RPC and API calls run in parallel via `Promise.all` for speed.

---

## Project structure

```
pharos-wallet-profiler/
├── index.js           # entry point — node index.js 0x<address>
├── config.js          # RPC URL, API key, token addresses
├── rpc.js             # on-chain reads via ethers.js (balance, nonce, code, ERC20)
├── socialscan.js       # transaction history, DeFi activity detection, gas stats
├── analyzer.js         # wallet classification + behavior insights
├── analyzer-utils.js   # shared date/time helper
├── scoring.js          # Wallet Score + Risk Score calculation
├── formatter.js         # ASCII banner + report rendering
├── package.json
└── README.md
```

---

## Setup & Usage

```bash
npm install
node index.js 0x<wallet_address>
```

### Requirements
- Node.js >= 16
- Dependencies: `ethers` (v6), `axios`, `figlet`

---

## Configuration

All network and token settings live in `config.js`:

```js
RPC_URL  = "https://rpc.pharos.xyz"
CHAIN_ID = 1672
NATIVE   = "PROS"

TOKENS = {
  WPROS:  "0x52c48d4213107b20bc583832b0d951fb9ca8f0b0",
  USDC:   "0xc879c018db60520f4355c26ed1a6d572cdac1815",
  PDOG:   "0x0a764846f1721feb3fb1e7d79130eb82c324dd64",
  pALPHA: "0xe47e9ba4ea2320a6ed87246d02fd5c38485ed7d1",
}
```

Adding a new ERC20 token only requires adding one entry here.

---

## Scoring Methodology

### Wallet Score (0-100) — "how good is this wallet?"
Points are awarded for: wallet age, transaction count, DeFi protocol diversity, recent activity, staking participation, PROS balance health, and token type diversity. Higher = more established, more active user.

### Risk Score (0-100) — "how risky is this wallet?"
Points are added for risk signals (no history, new wallet, no gas, abandoned wallet) and subtracted for trust signals (long history, recent activity, high transaction count). Lower = safer.

Both scores come with a transparent, line-by-line breakdown — every point is explained.

---

## Known DeFi Protocols (Pharos Mainnet)

| Protocol | Type | Address |
|---|---|---|
| DODO DEX | DEX | `0xa5ca5fbe34e444f366b373170541ec6902b0f75c` |
| FaroSwap | DEX | `0xc0479219f4feba5a668cff71bf96f4ffe124c3ab` |
| PROSPixel | Game | `0xf81fb02f13917db6fa8f5a1f2e39a86ece2a626a` |
| Tiered Airdrop | Airdrop | `0xe5bfde2310fa2a315f814dcc0c8b97c159c8062d` |

This list is easily extensible — add a new entry to `KNOWN_PROTOCOLS` in `socialscan.js`.

For contracts **not** in this list, the skill doesn't drop them — it still reports them as "Unrecognized Contract" with their address, so the agent always has full visibility into wallet activity even for protocols this skill doesn't yet recognize by name.

---

## Known Limitations

- **SocialScan API returns a fixed page size (~25 transactions)** regardless of the `limit` parameter — the skill paginates automatically via the `page` parameter, fetching up to **500 transactions** (20 pages) per wallet.
- **For wallets/contracts with more than 500 transactions**, stats (DeFi activity, gas spent, favorite contract, wallet age) are based on the most recently fetched 500 — this is flagged explicitly in the report (`isHistoryCapped`) so the agent knows the figures may not reflect full history.
- **DeFi protocol names are based on a curated list** (`KNOWN_PROTOCOLS`) — unrecognized contracts are still surfaced (with address and method names) but without a friendly protocol label.
- **Liquidity positions (LP)** are detected for Uniswap V3-style DEXs via `LP_POSITION_MANAGERS` in `config.js` — currently configured for FaroSwap. Any other DEX using the same NonfungiblePositionManager pattern can be added with a single config entry (no code changes needed). DEXs with a different pool model (e.g. DODO's PMM, which doesn't issue position NFTs) are not covered by this detection method and would need a separate approach.
- **Staking positions** are detected via receipt tokens (e.g. `pALPHA` for Pharos Port's "Stake Before the Stake") — adding a new staking program just requires adding its receipt token address to `config.js`.

---

## Author's Note

This project was built as part of a personal learning journey into Web3 and JavaScript — starting from zero blockchain experience. Every function is documented with inline comments explaining both *what* the code does and *why*, covering concepts like ABIs, decimals, Unix timestamps, and async/await patterns along the way.