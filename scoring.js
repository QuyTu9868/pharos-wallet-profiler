// scoring.js — Risk Score + Wallet Score
const { getDaysSinceLastTx } = require("./analyzer-utils");

// ─────────────────────────────────────────────
// RISK SCORE — điểm rủi ro (cao = xấu)
// ─────────────────────────────────────────────
function calculateRiskScore(walletData) {
  const { isContract, nonce, txCount, lastTxTimestamp, firstTxTimestamp,
          prosBalance, usdcBalance, wprosBalance, isHistoryCapped } = walletData;

  let score = 0;
  const factors = [];

  const daysSinceLast  = getDaysSinceLastTx(lastTxTimestamp);
  const daysSinceFirst = getDaysSinceLastTx(firstTxTimestamp);

  if (isContract) {
    score += 15;
    factors.push("⚠️  Smart Contract — not a regular user wallet (EOA)");
  } else {
    factors.push("✅  EOA wallet — standard externally owned account");
  }

  if (!txCount || txCount === 0) {
    score += 25;
    factors.push("⚠️  No transaction history — trust level cannot be assessed");
  } else if (isHistoryCapped) {
    // History too large to fully fetch — high tx count itself is a strong trust signal
    score -= 10;
    factors.push(`✅  Very high transaction volume (${txCount} total) — established on-chain presence`);
  } else if (daysSinceFirst !== null && daysSinceFirst > 180) {
    score -= 10;
    factors.push(`✅  Long history (${Math.floor(daysSinceFirst / 30)} months) — reliable track record`);
  } else if (daysSinceFirst !== null && daysSinceFirst < 7) {
    score += 15;
    factors.push("⚠️  Wallet created within last 7 days — insufficient history");
  } else {
    const months = daysSinceFirst !== null ? Math.floor(daysSinceFirst / 30) : 0;
    factors.push(`✅  Has transaction history (wallet age: ${months} month(s))`);
  }

  if (daysSinceLast !== null && daysSinceLast <= 30) {
    score -= 5;
    factors.push("✅  Active in the last 30 days");
  } else if (daysSinceLast !== null && daysSinceLast > 90) {
    score += 10;
    factors.push(`⚠️  Inactive for ${daysSinceLast} days — wallet may be abandoned`);
  }

  if (nonce > 50) {
    score -= 10;
    factors.push(`✅  Highly active wallet (${nonce} outgoing transactions)`);
  } else if (nonce === 0 && txCount > 5) {
    score += 10;
    factors.push("⚠️  Receive-only with many incoming txns — possible collector wallet");
  }

  if (prosBalance === 0 && (usdcBalance > 0 || wprosBalance > 0)) {
    score += 15;
    factors.push("⚠️  Has tokens but no PROS — cannot execute transactions (no gas)");
  }
  if (prosBalance > 0 && prosBalance < 0.01) {
    score += 5;
    factors.push("⚠️  Very low PROS balance — nearly out of gas");
  }

  score = Math.min(100, Math.max(0, score));
  const level = score <= 30 ? "Low Risk 🟢" : score <= 60 ? "Medium Risk 🟡" : "High Risk 🔴";

  return { score, level, factors };
}

// ─────────────────────────────────────────────
// WALLET SCORE — điểm chất lượng (cao = tốt)
// ─────────────────────────────────────────────
function calculateWalletScore(walletData) {
  const { nonce, txCount, firstTxTimestamp, lastTxTimestamp,
          prosBalance, usdcBalance, defiActivity, gasStats, isHistoryCapped, liquidityPositions } = walletData;

  let score = 0;
  const breakdown = [];

  const daysSinceFirst = getDaysSinceLastTx(firstTxTimestamp);
  const daysSinceLast  = getDaysSinceLastTx(lastTxTimestamp);

  // Tuổi ví — max 20 điểm
  if (isHistoryCapped) {
    // History too large to fully fetch — high volume implies an established wallet/contract
    score += 20;
    breakdown.push(`+20  Very high transaction volume (${txCount}) — established presence`);
  } else if (daysSinceFirst !== null) {
    if (daysSinceFirst > 180)     { score += 20; breakdown.push("+20  Established wallet (6+ months old)"); }
    else if (daysSinceFirst > 30) { score += 12; breakdown.push(`+12  Wallet age: ${Math.floor(daysSinceFirst / 30)} month(s)`); }
    else if (daysSinceFirst > 7)  { score += 6;  breakdown.push("+6   Wallet age: less than 1 month"); }
    else                          { score += 2;  breakdown.push("+2   Very new wallet (< 7 days)"); }
  }

  // Số giao dịch — max 20 điểm
  if (txCount >= 50)      { score += 20; breakdown.push(`+20  High activity (${txCount} transactions)`); }
  else if (txCount >= 20) { score += 15; breakdown.push(`+15  Good activity (${txCount} transactions)`); }
  else if (txCount >= 5)  { score += 8;  breakdown.push(`+8   Moderate activity (${txCount} transactions)`); }
  else if (txCount > 0)   { score += 3;  breakdown.push(`+3   Low activity (${txCount} transactions)`); }

  // DeFi diversity — max 20 điểm
  const protocolCount = (defiActivity || []).filter(p => p.known).length;
  if (protocolCount >= 3)      { score += 20; breakdown.push(`+20  High DeFi diversity (${protocolCount} protocols used)`); }
  else if (protocolCount === 2) { score += 12; breakdown.push(`+12  Moderate DeFi usage (${protocolCount} protocols)`); }
  else if (protocolCount === 1) { score += 6;  breakdown.push(`+6   Used 1 DeFi protocol`); }

  // Staking — bonus 10 điểm
  if ((walletData.stakedBalance || 0) > 0) {
    score += 10;
    breakdown.push(`+10  Active staking position detected (${walletData.stakedBalance.toFixed(2)} pALPHA)`);
  }

  // Liquidity Provider — bonus 10 điểm
  // Đếm số position còn "active" (liquidity > 0), bỏ qua position đã rút hết
  const activeLpCount = (liquidityPositions || [])
    .flatMap(dex => dex.positions)
    .filter(pos => pos.isActive).length;
  if (activeLpCount > 0) {
    score += 10;
    breakdown.push(`+10  Active liquidity provider (${activeLpCount} position${activeLpCount > 1 ? "s" : ""})`);
  }

  // Giao dịch gần đây — max 15 điểm
  if (daysSinceLast !== null) {
    if (daysSinceLast <= 7)       { score += 15; breakdown.push("+15  Very recently active (within 7 days)"); }
    else if (daysSinceLast <= 30) { score += 10; breakdown.push("+10  Active in the last 30 days"); }
    else if (daysSinceLast <= 90) { score += 5;  breakdown.push("+5   Active in the last 90 days"); }
  }

  // Số dư — max 15 điểm
  if (prosBalance > 100)     { score += 15; breakdown.push(`+15  Strong PROS balance (${prosBalance.toFixed(2)})`); }
  else if (prosBalance > 10) { score += 10; breakdown.push(`+10  Healthy PROS balance (${prosBalance.toFixed(2)})`); }
  else if (prosBalance > 0)  { score += 5;  breakdown.push(`+5   Has PROS balance (${prosBalance.toFixed(4)})`); }

  // Token diversity — max 10 điểm
  const hasUsdc  = usdcBalance > 0;
  const hasWpros = (walletData.wprosBalance || 0) > 0;
  const tokenCount = [prosBalance > 0, hasUsdc, hasWpros].filter(Boolean).length;
  if (tokenCount >= 3)      { score += 10; breakdown.push("+10  Holds multiple token types"); }
  else if (tokenCount === 2) { score += 5;  breakdown.push("+5   Holds 2 token types"); }

  score = Math.min(100, Math.max(0, score));

  let grade;
  if (score >= 80)      grade = "Excellent ⭐⭐⭐⭐⭐";
  else if (score >= 60) grade = "Good ⭐⭐⭐⭐";
  else if (score >= 40) grade = "Average ⭐⭐⭐";
  else if (score >= 20) grade = "Low ⭐⭐";
  else                  grade = "Very Low ⭐";

  return { score, grade, breakdown };
}

module.exports = { calculateRiskScore, calculateWalletScore };