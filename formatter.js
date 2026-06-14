// formatter.js
const figlet = require("figlet");

const CYAN  = "\x1b[36m";
const RESET = "\x1b[0m";

function formatReport(data) {
  const { address, addressType, nativeBalance, erc20Balances,
          txHistory, analysis, risk, walletScore, nonce } = data;
  const lines = [];

  const banner = figlet.textSync("Pharos  Profiler", { font: "Slant" });
  lines.push("\n" + CYAN + banner + RESET);
  lines.push("═".repeat(60));

  lines.push(`\n📌  Address : ${address}`);
  lines.push(`🏷️   Type    : ${addressType.type} — ${addressType.label}`);
  lines.push(`🔗  Explorer: ${data.explorerLink}`);

  // Balances
  lines.push("\n" + "─".repeat(60));
  lines.push("💰  BALANCES");
  lines.push("─".repeat(60));
  lines.push(`  PROS  : ${Number(nativeBalance.formatted).toFixed(4)} PROS`);
  for (const [symbol, info] of Object.entries(erc20Balances)) {
    const val = Number(info.formatted);
    lines.push(`  ${symbol.padEnd(6)}: ${val === 0 ? "0  (empty)" : val.toFixed(4)}`);
  }

  // Staking Position — detected via receipt token (pALPHA)
  const stakedAmount = Number(erc20Balances.pALPHA?.formatted || 0);
  if (stakedAmount > 0) {
    lines.push("\n" + "─".repeat(60));
    lines.push("🔒  STAKING POSITION DETECTED");
    lines.push("─".repeat(60));
    lines.push(`  pALPHA balance : ${stakedAmount.toFixed(4)}`);
    lines.push(`  Participating in "Stake Before the Stake" — Pharos Port pre-staking program`);
  }

  // Liquidity Positions — detected via Uniswap V3-style Position NFTs
  if (data.liquidityPositions && data.liquidityPositions.length > 0) {
    lines.push("\n" + "─".repeat(60));
    lines.push("💧  LIQUIDITY POSITIONS");
    lines.push("─".repeat(60));
    for (const dex of data.liquidityPositions) {
      for (const pos of dex.positions) {
        const status = pos.isActive ? "Active ✅" : "Closed (empty) ⚪";
        lines.push(`  ${dex.dexName}  —  ${pos.pair}  [#${pos.tokenId}]  —  ${status}`);
      }
    }
  }

  // Transaction History
  lines.push("\n" + "─".repeat(60));
  lines.push("📊  TRANSACTION HISTORY");
  lines.push("─".repeat(60));
  lines.push(`  Sent (nonce)   : ${nonce}`);
  if (txHistory.totalCount !== null) {
    lines.push(`  Total on-chain : ${txHistory.totalCount}`);
  }
  if (txHistory.firstTx) {
    lines.push(`  First tx  : ${txHistory.firstTx.timestampHuman}`);
    lines.push(`              ${txHistory.firstTx.explorerLink}`);
  } else {
    lines.push("  First tx  : N/A");
  }
  if (txHistory.lastTx) {
    lines.push(`  Latest tx : ${txHistory.lastTx.timestampHuman}`);
    lines.push(`              ${txHistory.lastTx.explorerLink}`);
  } else {
    lines.push("  Latest tx : N/A");
  }

  // Gas Stats
  if (txHistory.gasStats && txHistory.gasStats.txCount > 0) {
    lines.push("\n" + "─".repeat(60));
    lines.push("⛽  GAS SPENT");
    lines.push("─".repeat(60));
    lines.push(`  Total     : ${txHistory.gasStats.totalPROS} PROS`);
    lines.push(`  Avg/tx    : ${txHistory.gasStats.avgPerTx} PROS`);
    lines.push(`  Over      : ${txHistory.gasStats.txCount} transactions`);
  }

  // DeFi Activity
  lines.push("\n" + "─".repeat(60));
  lines.push("🏦  DEFI ACTIVITY");
  lines.push("─".repeat(60));
  if (txHistory.defiActivity && txHistory.defiActivity.length > 0) {
    for (const p of txHistory.defiActivity) {
      const icon = p.known ? "✅" : p.verified ? "🔹" : "❔";
      lines.push(`  ${icon}  ${p.name.padEnd(22)} [${p.type}]  —  ${p.txCount} tx`);
      if (p.methods.length > 0) {
        lines.push(`       Methods: ${p.methods.join(", ")}`);
      }
      if (!p.known) {
        lines.push(`       Address: ${p.address}`);
      }
    }
  } else {
    lines.push("  No contract interactions found.");
  }

  // Favorite Contract
  if (txHistory.favoriteContract) {
    const fc = txHistory.favoriteContract;
    lines.push("\n" + "─".repeat(60));
    lines.push("⭐  MOST INTERACTED CONTRACT");
    lines.push("─".repeat(60));
    lines.push(`  Name      : ${fc.name}${fc.isSelfDeployed ? " 🔨" : ""}`);
    lines.push(`  Address   : ${fc.address}`);
    lines.push(`  Verified  : ${fc.isVerified ? "Yes ✅" : "No ❌"}`);
    lines.push(`  Tx count  : ${fc.txCount}`);
  }

  // Behavior
  lines.push("\n" + "─".repeat(60));
  lines.push(`🔍  BEHAVIOR  [${analysis.label.toUpperCase()}]`);
  lines.push("─".repeat(60));
  if (analysis.insights.length > 0) {
    analysis.insights.forEach(i => lines.push("  " + i));
  } else {
    lines.push("  No behavioral signals detected.");
  }

  // Wallet Score
  lines.push("\n" + "─".repeat(60));
  lines.push(`🏆  WALLET SCORE  —  ${walletScore.score}/100  ${walletScore.grade}`);
  lines.push("─".repeat(60));
  walletScore.breakdown.forEach(b => lines.push("  " + b));

  // Risk Score
  lines.push("\n" + "─".repeat(60));
  lines.push(`🛡️   RISK SCORE  —  ${risk.score}/100  ${risk.level}`);
  lines.push("─".repeat(60));
  risk.factors.forEach(f => lines.push("  " + f));

  lines.push("\n" + "═".repeat(60) + "\n");
  return lines.join("\n");
}

module.exports = { formatReport };