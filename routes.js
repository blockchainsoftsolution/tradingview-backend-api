const routes = require("express").Router();

const { getBaseswapTokenList, getPairPrices } = require("./utils");

routes.get("/", (req, res) => {
  res.status(200).json({ message: "Connected!" });
});

routes.get("/baseswap/tokenList", async (req, res) => {
  const tokenList = await getBaseswapTokenList();
  if (tokenList) res.status(200).json({ tokenList });
  else res.status(500).json({ err: "internal server error" });
});

// get route between two tokens. query: {token0: address, token1: address}
routes.get("/history", async (req, res) => {
  const currentTime = Math.floor(Date.now() / 1000)
  let { symbol, resolution, from, to } = req.query;
  if (to > currentTime) to = currentTime
  console.log(symbol, resolution, from, to)
  const priceData = await getPairPrices(symbol, resolution, Number(from), Number(to))
  res.status(200).json(priceData);
});

module.exports = routes;

// getBars

// {
//   "time": 1697241600000,
//   "low": 26820,
//   "high": 26995,
//   "open": 26875,
//   "close": 26871,
//   "isLastBar": false,
//   "isBarClosed": true
// }
