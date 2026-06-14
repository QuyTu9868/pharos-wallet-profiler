// analyzer.js
const { getDaysSinceLastTx } = require("./analyzer-utils");

function classifyWallet(walletData) {
  const { isContract, nonce, txCount, lastTxTimestamp } = walletData;

  if (isContract) return "contract";
  if (nonce === 0 && (!txCount || txCount === 0)) return "fresh_wallet";

  const daysSinceLast = getDaysSinceLastTx(lastTxTimestamp);
  if (daysSinceLast !== null && daysSinceLast > 90) return "dormant";
  if (nonce === 0 && txCount > 0) return "passive_holder";

  return "active_trader";
}

function generateInsights(walletData) {
  const insights = [];
  const { isContract, nonce, txCount, lastTxTimestamp, firstTxTimestamp, prosBalance, usdcBalance, walletLabel, isHistoryCapped } = walletData;

  const daysSinceLast  = getDaysSinceLastTx(lastTxTimestamp);
  const daysSinceFirst = getDaysSinceLastTx(firstTxTimestamp);

  // Activity status
  if (walletLabel === "fresh_wallet") {
    insights.push("🆕  New wallet — no transactions found");
  } else if (walletLabel === "dormant") {
    insights.push(`😴  Dormant wallet — inactive for ${daysSinceLast} days`);
  } else if (daysSinceLast !== null && daysSinceLast <= 7) {
    insights.push(`✅  Active wallet — last transaction ${daysSinceLast} day(s) ago`);
  } else if (daysSinceLast !== null) {
    insights.push(`🕐  Last transaction: ${daysSinceLast} days ago`);
  }

  // Send/receive behavior — not meaningful for contracts
  // (contracts don't "send" transactions themselves, they receive calls)
  if (!isContract) {
    if (nonce === 0 && txCount > 0) {
      insights.push("📥  Receive-only — this wallet has never sent a transaction");
      insights.push("🔍  Behavior: likely a cold storage or airdrop wallet");
    } else if (nonce > 0 && txCount > 0) {
      const sendRatio = Math.round((nonce / txCount) * 100);
      if (sendRatio > 70) {
        insights.push(`📤  Mostly sending — ${sendRatio}% of activity is outgoing`);
      } else if (sendRatio < 30) {
        insights.push(`📥  Mostly receiving — only ${sendRatio}% of activity is outgoing`);
      } else {
        insights.push(`⚖️   Balanced activity — ${sendRatio}% outgoing transactions`);
      }
    }
  }

  // Wallet age — note: history fetch has a safety cap (MAX_PAGES).
  // For extremely high-traffic addresses, "first tx" may reflect the
  // oldest tx within the fetched window, not the true deployment date.
  if (firstTxTimestamp && daysSinceFirst !== null) {
    if (isHistoryCapped) {
      insights.push(`ℹ️  Transaction history is very large — stats based on the most recently fetched transactions; true wallet age may be older than shown`);
    } else if (daysSinceFirst < 7) {
      insights.push("🆕  Very new wallet — first transaction within the last 7 days");
    } else if (daysSinceFirst > 365) {
      insights.push(`🏛️   Established wallet — active for ${Math.floor(daysSinceFirst / 30)} months`);
    }
  }

  // Balance anomalies
  if (prosBalance === 0 && usdcBalance > 0) {
    insights.push("⚠️  Has USDC but no PROS — cannot pay for gas fees!");
  }
  if (prosBalance > 10000) {
    insights.push(`💰  Large PROS balance (${prosBalance.toFixed(2)}) — possible whale or treasury wallet`);
  }

  return insights;
}

function analyzeWallet(walletData) {
  const label = classifyWallet(walletData);
  const dataWithLabel = { ...walletData, walletLabel: label };
  const insights = generateInsights(dataWithLabel);
  return { label, insights };
}

module.exports = { analyzeWallet };