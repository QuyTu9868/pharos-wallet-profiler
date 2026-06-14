// rpc.js
// All functions for communicating with Pharos Blockchain via RPC
// RPC = Remote Procedure Call = asking the blockchain for data

const { ethers } = require("ethers");
const config = require("./config");

// Create provider once, shared across all functions
// Provider = the connection bridge between JS and the blockchain
const provider = new ethers.JsonRpcProvider(config.RPC_URL);


// ─────────────────────────────────────────────
// FUNCTION 1: Get native PROS balance
// ─────────────────────────────────────────────
async function getNativeBalance(address) {
  const balanceWei = await provider.getBalance(address);
  const balanceEther = ethers.formatEther(balanceWei);

  return {
    raw: balanceWei.toString(),
    formatted: balanceEther,
    symbol: config.NATIVE  // "PROS"
  };
}


// ─────────────────────────────────────────────
// FUNCTION 2: Get total number of sent transactions (nonce)
// ─────────────────────────────────────────────
async function getTransactionCount(address) {
  const count = await provider.getTransactionCount(address);
  return count;
}


// ─────────────────────────────────────────────
// FUNCTION 3: Classify address — EOA or Contract?
// ─────────────────────────────────────────────
async function getAddressType(address) {
  const code = await provider.getCode(address);

  if (code === "0x") {
    return { type: "EOA", label: "Externally Owned Account", hasCode: false };
  } else {
    return { type: "Contract", label: "Smart Contract", hasCode: true };
  }
}


// ─────────────────────────────────────────────
// FUNCTION 4: Get ERC20 token balances
// ─────────────────────────────────────────────
//
// ERC20 token là gì? Giống như "thẻ quà tặng" trong siêu thị —
// mỗi token (USDC, WETH...) là 1 smart contract riêng.
// Để hỏi "ví này có bao nhiêu USDC?", ta phải GỌI HÀM vào
// smart contract của USDC và hỏi: balanceOf(địa_chỉ_ví)
//
// ABI là gì? Application Binary Interface — bản mô tả các hàm
// của smart contract. Giống như "menu" của nhà hàng —
// ta cần biết món nào có trước khi gọi.
// Ở đây chỉ cần 1 hàm duy nhất: balanceOf()

const ERC20_ABI = [
  // Chỉ khai báo hàm mình cần dùng, không cần toàn bộ ABI
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

async function getERC20Balances(walletAddress) {
  const results = {};

  // Object.entries() biến { WPROS: {...}, USDC: {...} }
  // thành mảng: [ ["WPROS", {...}], ["USDC", {...}], ... ]
  // để dùng vòng lặp for...of
  for (const [symbol, tokenInfo] of Object.entries(config.TOKENS)) {
    try {
      // Tạo "đối tượng đại diện" cho smart contract của token đó
      // Giống như tạo "phiên dịch viên" biết nói chuyện với contract này
      const contract = new ethers.Contract(
        tokenInfo.address,  // địa chỉ smart contract của token
        ERC20_ABI,          // danh sách hàm contract có
        provider            // kết nối blockchain
      );

      // Gọi hàm balanceOf() trên contract
      // Trả về BigInt — ví dụ: 5000000n (USDC có 6 decimals → = 5.0 USDC)
      const rawBalance = await contract.balanceOf(walletAddress);

      // Chia cho 10^decimals để ra số người đọc được
      // ethers.formatUnits(rawBalance, 6) → "5.0" cho USDC (6 decimals)
      // ethers.formatUnits(rawBalance, 18) → "1.5" cho WPROS (18 decimals)
      const formatted = ethers.formatUnits(rawBalance, tokenInfo.decimals);

      results[symbol] = {
        raw: rawBalance.toString(),
        formatted: formatted,
        decimals: tokenInfo.decimals,
        address: tokenInfo.address
      };

    } catch (err) {
      // Nếu token contract không phản hồi → ghi lại lỗi, không crash toàn bộ
      results[symbol] = {
        raw: "0",
        formatted: "0",
        decimals: tokenInfo.decimals,
        address: tokenInfo.address,
        error: err.message
      };
    }
  }

  return results;
}


// ─────────────────────────────────────────────
// FUNCTION 5: Get Liquidity Positions (Uniswap V3 style LP NFTs)
// ─────────────────────────────────────────────
//
// Khi add liquidity vào 1 pool kiểu Uniswap V3 (ví dụ FaroSwap),
// bạn không nhận về ERC20 LP token thông thường — bạn nhận về
// 1 NFT (ERC721) gọi là "Position NFT". Mỗi NFT đại diện cho
// 1 vị thế thanh khoản (LP position) cụ thể — gồm 2 token (token0/token1)
// và lượng "liquidity" (thanh khoản) đã góp vào.
//
// ERC721 = chuẩn NFT, giống ERC20 nhưng đại diện cho vật phẩm
// duy nhất (không thể chia nhỏ), ví dụ: 1 NFT = 1 position cụ thể.
//
// balanceOf(address) → bao nhiêu NFT position ví này đang giữ
// tokenOfOwnerByIndex(address, i) → lấy tokenId của NFT thứ i
// positions(tokenId) → chi tiết vị thế: token0, token1, liquidity, ...

const POSITION_MANAGER_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)",
  "function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)"
];

// Map địa chỉ token → symbol, dựa trên config.TOKENS
// Giúp hiện "WPROS/USDC" thay vì 2 địa chỉ hex dài
function getTokenSymbol(address) {
  const target = address.toLowerCase();
  for (const [symbol, info] of Object.entries(config.TOKENS)) {
    if (info.address.toLowerCase() === target) return symbol;
  }
  return address.slice(0, 6) + "..." + address.slice(-4); // fallback: rút gọn địa chỉ
}

async function getLiquidityPositions(walletAddress, positionManagerAddress) {
  try {
    const contract = new ethers.Contract(positionManagerAddress, POSITION_MANAGER_ABI, provider);

    const balance = await contract.balanceOf(walletAddress);
    const count = Number(balance);

    if (count === 0) return [];

    const positions = [];
    for (let i = 0; i < count; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(walletAddress, i);
      const pos = await contract.positions(tokenId);

      positions.push({
        tokenId:     tokenId.toString(),
        pair:        `${getTokenSymbol(pos.token0)}/${getTokenSymbol(pos.token1)}`,
        liquidity:   pos.liquidity.toString(),
        // Liquidity > 0 nghĩa là vẫn đang có thanh khoản trong pool
        // Liquidity = 0 nghĩa là đã rút hết (chỉ còn lại NFT "rỗng")
        isActive:    pos.liquidity > 0n,
        tokensOwed0: pos.tokensOwed0.toString(), // phí chưa claim (token0)
        tokensOwed1: pos.tokensOwed1.toString(), // phí chưa claim (token1)
      });
    }

    return positions;

  } catch (err) {
    // Nếu địa chỉ không phải position manager hợp lệ → trả về rỗng, không crash
    return [];
  }
}


// Export tất cả 5 hàm
module.exports = {
  getNativeBalance,
  getTransactionCount,
  getAddressType,
  getERC20Balances,
  getLiquidityPositions   // ← hàm mới thêm
};