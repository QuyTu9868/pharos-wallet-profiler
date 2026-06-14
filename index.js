// index.js — run: node index.js 0x<wallet_address>

const config = require("./config");
const { getNativeBalance, getTransactionCount, getAddressType, getERC20Balances, getLiquidityPositions } = require("./rpc");
const { getTransactionHistory } = require("./socialscan");
const { analyzeWallet } = require("./analyzer");
const { calculateRiskScore, calculateWalletScore } = require("./scoring");
const { formatReport } = require("./formatter");

async function profileWallet(address) {
  if (!address || !address.startsWith("0x") || address.length !== 42) {
    console.error("Invalid address. Must be 0x... with 42 characters.");
    process.exit(1);
  }

  console.log(`\nFetching data for: ${address} ...`);

  const [nativeBalance, nonce, addressType, erc20Balances, txHistory] = await Promise.all([
    getNativeBalance(address),
    getTransactionCount(address),
    getAddressType(address),
    getERC20Balances(address),
    getTransactionHistory(address)
  ]);

  // Check for LP positions on each known DEX (Uniswap V3-style position managers)
  const lpResults = await Promise.all(
    Object.entries(config.LP_POSITION_MANAGERS).map(async ([dexName, managerAddr]) => {
      const positions = await getLiquidityPositions(address, managerAddr);
      return { dexName, managerAddr, positions };
    })
  );
  // Chỉ giữ lại DEX nào có ít nhất 1 position
  const liquidityPositions = lpResults.filter(r => r.positions.length > 0);

  const walletData = {
    isContract:       addressType.hasCode,
    nonce,
    txCount:          txHistory.totalCount,
    lastTxTimestamp:  txHistory.lastTx?.timestamp  || null,
    firstTxTimestamp: txHistory.firstTx?.timestamp || null,
    prosBalance:      Number(nativeBalance.formatted),
    usdcBalance:      Number(erc20Balances.USDC?.formatted  || 0),
    wprosBalance:     Number(erc20Balances.WPROS?.formatted || 0),
    stakedBalance:    Number(erc20Balances.pALPHA?.formatted || 0),
    defiActivity:     txHistory.defiActivity  || [],
    gasStats:         txHistory.gasStats      || {},
    fetchedCount:     txHistory.fetchedCount  || 0,
    isHistoryCapped:  (txHistory.totalCount || 0) > (txHistory.fetchedCount || 0),
    liquidityPositions,
  };

  const analysis    = analyzeWallet(walletData);
  const risk        = calculateRiskScore(walletData);
  const walletScore = calculateWalletScore(walletData);

  console.log(formatReport({
    address, addressType, nativeBalance, erc20Balances,
    txHistory, nonce, analysis, risk, walletScore, liquidityPositions,
    explorerLink: `${config.EXPLORER}/address/${address}`
  }));
}

const walletAddress = process.argv[2];
if (!walletAddress) {
  console.error("Usage: node index.js 0x<address>");
  process.exit(1);
}

profileWallet(walletAddress).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});