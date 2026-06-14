// config.js
const config = {
  RPC_URL:  "https://rpc.pharos.xyz",
  CHAIN_ID: 1672,
  NATIVE:   "PROS",
  EXPLORER: "https://www.pharosscan.xyz",

  API_KEY:  "787025fe-09a3-4bf9-80ae-7d8e60e85388",
  API_BASE: "https://api.socialscan.io/pharos-mainnet/v1/explorer",

  TOKENS: {
    WPROS:  { address: "0x52c48d4213107b20bc583832b0d951fb9ca8f0b0", decimals: 18 },
    USDC:   { address: "0xc879c018db60520f4355c26ed1a6d572cdac1815", decimals: 6  },
    PDOG:   { address: "0x0a764846f1721feb3fb1e7d79130eb82c324dd64", decimals: 18 },
    pALPHA: { address: "0xe47e9ba4ea2320a6ed87246d02fd5c38485ed7d1", decimals: 6  },
  },

  // Uniswap V3-style Position Managers — used to detect LP positions
  LP_POSITION_MANAGERS: {
    FaroSwap: "0xc0479219f4feba5a668cff71bf96f4ffe124c3ab",
  }
};

module.exports = config;