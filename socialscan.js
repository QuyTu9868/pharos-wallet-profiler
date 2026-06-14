// socialscan.js
const axios = require("axios");
const config = require("./config");

const apiClient = axios.create({
  baseURL: config.API_BASE,
  headers: { "x-api-key": config.API_KEY },
  timeout: 10000
});

const KNOWN_PROTOCOLS = {
  "0xa5ca5fbe34e444f366b373170541ec6902b0f75c": { name: "DODO DEX",            type: "DEX"      },
  "0xe5bfde2310fa2a315f814dcc0c8b97c159c8062d": { name: "Tiered Airdrop",      type: "Airdrop"  },
  "0xf81fb02f13917db6fa8f5a1f2e39a86ece2a626a": { name: "PROSPixel",           type: "Game"     },
  "0xc879c018db60520f4355c26ed1a6d572cdac1815": { name: "USDC Token",          type: "Token"    },
  "0x52c48d4213107b20bc583832b0d951fb9ca8f0b0": { name: "Wrapped PROS (WPROS)","type": "Token"  },
  "0xc0479219f4feba5a668cff71bf96f4ffe124c3ab": { name: "FaroSwap",            type: "DEX"      },
};

// Safety cap — don't fetch more than this many transactions total,
// to avoid extremely long requests for high-traffic contracts (e.g. 5000+ txns)
const MAX_PAGES = 20;     // 20 pages
const PAGE_SIZE = 25;     // observed: API returns 25 items per page regardless of `limit`

async function getTransactionHistory(address) {
  try {
    const items = await fetchAllTransactions(address);
    const totalCount = items.length > 0 ? (items[0]._total ?? items.length) : 0;

    if (items.length === 0) {
      return {
        firstTx: null, lastTx: null, totalCount: 0,
        defiActivity: [], gasStats: {}, favoriteContract: null,
        fetchedCount: 0
      };
    }

    const sorted = [...items].sort((a, b) => Number(a.block_number) - Number(b.block_number));

    return {
      firstTx:          parseTx(sorted[0]),
      lastTx:           parseTx(sorted[sorted.length - 1]),
      totalCount,
      fetchedCount:     items.length,
      defiActivity:     analyzeDefiActivity(items),
      gasStats:         analyzeGasSpent(items),
      favoriteContract: analyzeFavoriteContract(items, address),
    };

  } catch (err) {
    console.error("SocialScan API error:", err.message);
    return { firstTx: null, lastTx: null, totalCount: null, error: err.message };
  }
}

// ─────────────────────────────────────────────
// Fetch ALL transactions via pagination
// ─────────────────────────────────────────────
// SocialScan returns a fixed page size (~25) regardless of `limit`.
// Use `page` to walk through results until either:
//   - a page comes back empty/shorter than PAGE_SIZE (last page), or
//   - MAX_PAGES is reached (safety cap for very high-traffic addresses)
async function fetchAllTransactions(address) {
  let allItems = [];
  let total = null;

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await apiClient.get("/transactions", {
      params: { address, limit: PAGE_SIZE, page }
    });

    const pageItems = res.data?.data || [];
    if (total === null) total = res.data?.total ?? null;

    if (pageItems.length === 0) break; // no more data

    // Tag each item with the total count for later reference
    for (const item of pageItems) item._total = total;
    allItems = allItems.concat(pageItems);

    if (pageItems.length < PAGE_SIZE) break; // last page reached
  }

  return allItems;
}

// ─────────────────────────────────────────────
// DeFi Activity — protocol nào đã dùng
// ─────────────────────────────────────────────
function analyzeDefiActivity(txs) {
  const protocolMap = {};

  for (const tx of txs) {
    const toAddr = tx.to_address?.toLowerCase();
    if (!toAddr) continue;

    const to = tx.to_addr;
    if (!to?.is_contract) continue;

    const known = KNOWN_PROTOCOLS[toAddr];

    if (!protocolMap[toAddr]) {
      if (known) {
        protocolMap[toAddr] = {
          name: known.name, type: known.type, address: toAddr,
          txCount: 0, methods: new Set(), known: true
        };
      } else {
        const verifiedName = to.name || to.contract?.name;
        protocolMap[toAddr] = {
          name: verifiedName || "Unrecognized Contract",
          type: verifiedName ? "Verified Contract" : "Unknown",
          address: toAddr, txCount: 0, methods: new Set(),
          known: false, verified: !!verifiedName
        };
      }
    }
    protocolMap[toAddr].txCount++;
    if (tx.method) protocolMap[toAddr].methods.add(tx.method);
  }

  return Object.values(protocolMap).map(p => ({ ...p, methods: [...p.methods] }));
}

// ─────────────────────────────────────────────
// Gas Stats
// ─────────────────────────────────────────────
function analyzeGasSpent(txs) {
  const outgoing = txs.filter(tx => tx.receipt_status !== undefined);

  let totalGas = 0;
  for (const tx of outgoing) {
    const fee = parseFloat(tx.transaction_fee || "0");
    if (!isNaN(fee)) totalGas += fee;
  }

  const avgGas = outgoing.length > 0 ? totalGas / outgoing.length : 0;

  return {
    totalPROS: parseFloat(totalGas.toFixed(6)),
    avgPerTx:  parseFloat(avgGas.toFixed(6)),
    txCount:   outgoing.length,
  };
}

// ─────────────────────────────────────────────
// Favorite Contract
// ─────────────────────────────────────────────
function analyzeFavoriteContract(txs, address) {
  const contractMap = {};

  for (const tx of txs) {
    const to = tx.to_addr;
    if (!to?.is_contract || !to?.address) continue;

    const addr = to.address.toLowerCase();
    if (!contractMap[addr]) {
      const creator = to.contract?.transaction_from_address?.toLowerCase()
                   || to.contract?.contract_creator?.toLowerCase();
      const isSelfDeployed = creator && creator === address.toLowerCase();

      const rawName = to.name || to.contract?.name;
      const name = rawName ? rawName : isSelfDeployed ? "Self-deployed Contract" : "Unknown Contract";

      contractMap[addr] = {
        address: addr, name,
        isVerified: to.contract?.is_verified || false,
        isSelfDeployed, txCount: 0,
      };
    }
    contractMap[addr].txCount++;
  }

  const sorted = Object.values(contractMap).sort((a, b) => b.txCount - a.txCount);
  return sorted[0] || null;
}

// ─────────────────────────────────────────────
// Parse 1 transaction
// ─────────────────────────────────────────────
function parseTx(tx) {
  let timestampSeconds = null;
  if (tx.block_timestamp) {
    const ts = Date.parse(tx.block_timestamp);
    timestampSeconds = isNaN(ts) ? Number(tx.block_timestamp) : Math.floor(ts / 1000);
  }

  return {
    hash:           tx.hash         || null,
    blockNumber:    tx.block_number || null,
    timestamp:      timestampSeconds,
    timestampHuman: timestampSeconds ? new Date(timestampSeconds * 1000).toISOString() : null,
    from:           tx.from_address || null,
    to:             tx.to_address   || null,
    value:          tx.value        || "0",
    explorerLink:   tx.hash ? `${config.EXPLORER}/tx/${tx.hash}` : null
  };
}

module.exports = { getTransactionHistory };