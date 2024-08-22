const DEFAULT_PORT = 8000;
const API_KEY = "c91fab3cd50e63287fcf1c7547adf989";
const SUBGRAPH_ID = "BWHCfpXMHFDx3u4E14hEwv4ST7SUyN89FKJ2RjzWKgA9";
const BASESWAP_DEFAULT_TOKEN_LIST_URL =
  "https://raw.githubusercontent.com/baseswapfi/default-token-list/main/src/tokens/base.json";
const BSWAP = "0x78a087d713Be963Bf307b18F2Ff8122EF9A63ae9";
const BASESWAP_FACTORY = "0xFDa619b6d20975be80A10332cD39b9a4b0FAa8BB";
const BASESWAP_ROUTER = "0x327Df1E6de05895d2ab08513aaDD9313Fe505d86";
const BASESWAP_V3_FACTORY = "0x38015D05f4fEC8AFe15D7cc0386a126574e8077B";
const BASESWAP_V3_ROUTER = "0x1B8eea9315bE495187D873DA7773a874545D9D48";

const SUPPORTED_PAIRS = [
  "0x41d160033c222e6f3722ec97379867324567d883", // WETH-USDbC
  "0xaa6a81a7df94dab346e2d677225cad47220540c5", // WETH-SEED
]
const DEFAULT_FETCH_PERIOD = 10000

// web3
const BASE_PROVIDER = 'https://mainnet.base.org'

// cache
const TOKEN_LIST_CACHE_TIME = 3600000; // 1 hour

module.exports = {
  DEFAULT_PORT,
  API_KEY,
  SUBGRAPH_ID,
  BASESWAP_DEFAULT_TOKEN_LIST_URL,
  BSWAP,
  BASESWAP_FACTORY,
  BASESWAP_ROUTER,
  BASESWAP_V3_FACTORY,
  BASESWAP_V3_ROUTER,

  // web3
  BASE_PROVIDER,

  // cache
  TOKEN_LIST_CACHE_TIME,

  SUPPORTED_PAIRS,
  DEFAULT_FETCH_PERIOD
};
