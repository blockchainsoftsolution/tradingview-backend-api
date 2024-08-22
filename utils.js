const NodeCache = require("node-cache");
const moment = require("moment");
const { extendMoment } = require("moment-range");

const globalCache = new NodeCache();

const {
  BASESWAP_DEFAULT_TOKEN_LIST_URL,
  TOKEN_LIST_CACHE_TIME,
  SUPPORTED_PAIRS,
  DEFAULT_FETCH_PERIOD,
} = require("./config");
const { BASESWAP_TOKEN_LIST } = require("./constant");
const {
  isPoolExist,
  createPool,
  getPool,
  updatePool,
  getPoolHourData,
  updatePoolHourData,
  getPoolDayData,
  updatePoolDayData,
  getPoolHourDatas,
  getPoolDayDatas,
} = require("./controllers/poolController");
const { fetchData } = require("./theGraph");
const { swapsQuery, swapsReverseQuery } = require("./theGraph/queries/swaps");
const { pairsQuery } = require("./theGraph/queries/pairs");
const { addSwaps, getSwaps } = require("./controllers/swapController");

// get baseswap token list
const getBaseswapTokenList = async () => {
  const tokenList = globalCache.get(BASESWAP_TOKEN_LIST);
  if (tokenList) return tokenList;
  return await fetch(BASESWAP_DEFAULT_TOKEN_LIST_URL)
    .then((response) => response.json())
    .then((data) => {
      globalCache.set(BASESWAP_TOKEN_LIST, data, TOKEN_LIST_CACHE_TIME);
      return data;
    })
    .catch(() => undefined);
};

const updatePairs = async () => {
  for (let pair of SUPPORTED_PAIRS) {
    fetchPairData(pair);
  }
};

const fetchPairData = async (pairAddress) => {
  const _isExist = await isPoolExist(pairAddress);
  if (!_isExist) {
    const response = await fetchData(pairsQuery(pairAddress));
    const pairDetail = response.data.pairs[0];
    await createPool(
      pairAddress,
      Number(pairDetail.createdAtTimestamp) * 1000,
      pairDetail.token0,
      pairDetail.token1
    );
  }
  const pair = await getPool(pairAddress);
  startTime = Math.floor(Number(pair.createdAt) / 1000);
  endTime = Math.floor(Date.now() / 1000);
  if (!pair.from) await fetchSwapData(pairAddress, startTime, endTime);
  if (pair.from > startTime) {
    await fetchSwapDataReverse(pair, startTime, pair.from);
  }
  if (pair.to + 2 < endTime) {
    await fetchSwapData(pairAddress, pair.to, endTime);
  }

  setTimeout(() => {
    fetchPairData(pairAddress);
  }, DEFAULT_FETCH_PERIOD);
};

// get pair prices
const getPairPrices = async (address, timeframe, startTime, endTime) => {
  let timegap = periodLengthSeconds(timeframe);
  console.log("timegap ", timegap);
  if (timegap >= 86400) {
    let dayDatas = await getPoolDayDatas(address, startTime, endTime);
    console.log("get pool day datas, getting ohlcdata");
    return getOHLCDataFromDayDatas(dayDatas, timegap);
  }
  if (timegap >= 3600) {
    let dayDatas = await getPoolHourDatas(address, startTime, endTime);
    console.log("get pool hour datas, getting ohlcdata");
    return getOHLCDataFromHourDatas(dayDatas, timegap);
  }
  let swaps = await getSwaps(address, startTime, endTime);
  console.log("getSwaps, getting ohlcdata");
  return getOHLCData(swaps, timegap, startTime);
};

const fetchSwapData = async (address, startTime, endTime) => {
  while (true) {
    const newSwapData = await fetchData(
      swapsQuery(address, startTime, endTime)
    );
    if (!newSwapData) return
    let swaps = newSwapData.data.swaps;
    if (swaps.length === 1000) {
      swaps.sort((a, b) =>
        Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
      );
      let newStartTime = Number(swaps[999].timestamp);
      await updatePool(address, startTime, newStartTime);
      await addSwaps(address, swaps);
      await addHourDatas(address, swaps, startTime, newStartTime);
      await addDayDatas(address, swaps, startTime, newStartTime);
      startTime = newStartTime;
    } else {
      await updatePool(address, startTime, endTime);
      await addSwaps(address, swaps);
      await addHourDatas(address, swaps, startTime, endTime);
      await addDayDatas(address, swaps, startTime, endTime);
      break;
    }
  }
  return true;
};

const fetchSwapDataReverse = async (address, startTime, endTime) => {
  while (true) {
    const newSwapData = await fetchData(
      swapsReverseQuery(address, startTime, endTime)
    );
    let swaps = newSwapData.data.swaps;
    if (swaps.length === 1000) {
      swaps.sort((a, b) =>
        Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
      );
      let newEndTime = Number(swaps[0].timestamp);
      await updatePool(address, newEndTime, endTime);
      await addSwaps(address, swaps);
      await addHourDatasReverse(address, swaps, newEndTime, endTime);
      await addDayDatasReverse(address, swaps, newEndTime, endTime);
      endTime = newEndTime;
    } else {
      await updatePool(address, startTime, endTime);
      await addHourDatasReverse(address, swaps, startTime, endTime);
      await addDayDatasReverse(address, swaps, startTime, endTime);
      await addSwaps(address, swaps);
      break;
    }
  }
  return true;
};

const periodLengthSeconds = (resolution) => {
  let daysCount = 0;

  if (resolution === "D" || resolution === "1D") {
    daysCount = 1;
  } else {
    daysCount = parseInt(resolution) / (24 * 60);
  }

  return daysCount * 24 * 60 * 60;
};

const getOHLCData = (swapData, timeGap, startTime) => {
  let t = [],
    c = [],
    o = [],
    h = [],
    l = [];
  for (let data of swapData) {
    let index = Math.ceil((data.timestamp - startTime) / timeGap);
    if (Number(data.amountUSD) < 0.001) continue;
    const price =
      Number(data.amount0In) !== 0
        ? Number(data.amount1Out) / Number(data.amount0In)
        : Number(data.amount1In) / Number(data.amount0Out);
    if (t.length < index + 1) {
      while (t.length < index + 1) {
        if (t.length === 0) {
          t.push(startTime + t.length * timeGap);
          c.push(price);
          o.push(price);
          h.push(price);
          l.push(price);
        } else {
          t.push(startTime + t.length * timeGap);
          o.push(c[c.length - 1]);
          h.push(c[c.length - 1]);
          l.push(c[c.length - 1]);
          c.push(c[c.length - 1]);
        }
      }
    }
    if (h[index] < price) h[index] = price;
    if (l[index] > price) l[index] = price;
    c[index] = price;
  }
  let s = "ok";
  if (t.length === 0) s = "no_data";
  return {
    s,
    t,
    o,
    h,
    l,
    c,
  };
};

const getOHLCDataFromHourDatas = (hourDatas, timeGap) => {
  let t = [],
    c = [],
    o = [],
    h = [],
    l = [];
  let s = "ok";
  if (hourDatas.length === 0) {
    s = "no_data";
    return { s, t, o, h, l, c };
  }
  let datas = hourDatas.sort((a, b) => (a.date < b.date ? -1 : 1));
  let startTime = datas[0].periodStartUnix;
  for (let data of datas) {
    let index = Math.ceil((data.periodStartUnix - startTime) / timeGap);
    if (c.length === index) {
      t.push(data.periodStartUnix);
      c.push(data.close);
      o.push(data.open);
      h.push(data.high);
      l.push(data.low);
    } else {
      if (h[index] < data.high) h[index] = data.high;
      if (l[index] > data.low) l[index] = data.low;
      c[index] = data.close;
    }
  }
  return {
    s,
    t,
    o,
    h,
    l,
    c,
  };
};

const getOHLCDataFromDayDatas = (dayDatas, timeGap) => {
  let t = [],
    c = [],
    o = [],
    h = [],
    l = [];
  let s = "ok";
  if (dayDatas.length === 0) {
    s = "no_data";
    return { s, t, o, h, l, c };
  }
  let datas = dayDatas.sort((a, b) => (a.date < b.date ? -1 : 1));
  let startTime = datas[0].date;
  for (let data of datas) {
    let index = Math.ceil((data.date - startTime) / timeGap);
    if (c.length === index) {
      t.push(data.date);
      c.push(data.close);
      o.push(data.open);
      h.push(data.high);
      l.push(data.low);
    } else {
      if (h[index] < data.high) h[index] = data.high;
      if (l[index] > data.low) l[index] = data.low;
      c[index] = data.close;
    }
  }
  return {
    s,
    t,
    o,
    h,
    l,
    c,
  };
};

const getStartOfHour = (timestamp) => {
  return moment.unix(timestamp).startOf("hour").unix();
};

const getStartOfDay = (timestamp) => {
  return moment.unix(timestamp).startOf("day").unix();
};

const addHourDatas = async (address, swaps, start, end) => {
  let hourStart = getStartOfHour(start);
  let startHourData = await getPoolHourData(address, hourStart);
  let prevHourData = await getPoolHourData(address, hourStart - 3600);
  let swapDatas = swaps.sort((a, b) =>
    Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
  );
  let currentHour = hourStart;
  let open = undefined,
    high = undefined,
    low = undefined,
    close = undefined;
  let volumeUSD = 0,
    txCount = 0;
  if (prevHourData) {
    open = prevHourData.close;
    high = prevHourData.close;
    low = prevHourData.close;
    close = prevHourData.close;
  }
  if (startHourData) {
    high = high > startHourData.high ? high : startHourData.high;
    low = low < startHourData.low ? low : startHourData.low;
    close = startHourData.close;
    volumeUSD = Number(startHourData.volumeUSD);
    txCount = Number(startHourData.txCount);
  }
  for (let swapData of swapDatas) {
    if (Number(swapData.amountUSD) < 0.001) continue;
    const price =
      Number(swapData.amount0In) !== 0
        ? Number(swapData.amount1Out) / Number(swapData.amount0In)
        : Number(swapData.amount1In) / Number(swapData.amount0Out);
    let timestamp = Number(swapData.timestamp);
    if (timestamp - currentHour < 3600) {
      if (open === undefined) open = price;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
    if (timestamp - currentHour >= 3600) {
      await updatePoolHourData(address, currentHour, {
        periodStartUnix: currentHour,
        pool: address,
        volumeUSD,
        txCount,
        open,
        high,
        low,
        close,
      });
      open = close;
      high = close;
      low = close;
      volumeUSD = 0;
      txCount = 0;
      currentHour += 3600;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
  }
  // let lastHourData = await getPoolHourData(address, currentHour);
  // if (lastHourData) {
  //   high = high > lastHourData.high ? high : lastHourData.high;
  //   low = low < lastHourData.low ? low : lastHourData.low;
  //   close = lastHourData.close;
  //   volumeUSD += Number(lastHourData.volumeUSD);
  //   txCount += Number(lastHourData.txCount);
  // }
  await updatePoolHourData(address, currentHour, {
    periodStartUnix: currentHour,
    pool: address,
    volumeUSD,
    txCount,
    open,
    high,
    low,
    close,
  });
  if (end - currentHour >= 3600) {
    await updatePoolHourData(address, currentHour + 3600, {
      periodStartUnix: currentHour + 3600,
      pool: address,
      volumeUSD: 0,
      txCount: 0,
      open: close,
      high: close,
      low: close,
      close: close,
    });
  }
};

const addDayDatas = async (address, swaps, start, end) => {
  let dayStart = getStartOfDay(start);
  let startDayData = await getPoolDayData(address, dayStart);
  let prevDayData = await getPoolDayData(address, dayStart - 86400);
  let swapDatas = swaps.sort((a, b) =>
    Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
  );
  let currentDay = dayStart;
  let open = undefined,
    high = undefined,
    low = undefined,
    close = undefined;
  let volumeUSD = 0,
    txCount = 0;
  if (prevDayData) {
    open = prevDayData.close;
    high = prevDayData.close;
    low = prevDayData.close;
    close = prevDayData.close;
  }
  if (startDayData) {
    high = high > startDayData.high ? high : startDayData.high;
    low = low < startDayData.low ? low : startDayData.low;
    close = startDayData.close;
    volumeUSD = Number(startDayData.volumeUSD);
    txCount = Number(startDayData.txCount);
  }
  for (let swapData of swapDatas) {
    if (Number(swapData.amountUSD) < 0.001) continue;
    const price =
      Number(swapData.amount0In) !== 0
        ? Number(swapData.amount1Out) / Number(swapData.amount0In)
        : Number(swapData.amount1In) / Number(swapData.amount0Out);
    let timestamp = Number(swapData.timestamp);
    if (timestamp - currentDay < 86400) {
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
    if (timestamp - currentDay >= 86400) {
      await updatePoolDayData(address, currentDay, {
        date: currentDay,
        pool: address,
        volumeUSD,
        txCount,
        open,
        high,
        low,
        close,
      });
      open = close;
      high = close;
      low = close;
      volumeUSD = 0;
      txCount = 0;
      currentDay += 86400;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
  }
  // let lastDayData = await getPoolDayData(address, currentDay);
  // if (lastDayData) {
  //   high = high > lastDayData.high ? high : lastDayData.high;
  //   low = low < lastDayData.low ? low : lastDayData.low;
  //   close = lastDayData.close;
  //   volumeUSD += Number(lastDayData.volumeUSD);
  //   txCount += Number(lastDayData.txCount);
  // }
  await updatePoolDayData(address, currentDay, {
    date: currentDay,
    pool: address,
    volumeUSD,
    txCount,
    open,
    high,
    low,
    close,
  });
  if (end - currentDay >= 86400) {
    await updatePoolDayData(address, currentDay + 86400, {
      periodStartUnix: currentDay + 86400,
      pool: address,
      volumeUSD: 0,
      txCount: 0,
      open: close,
      high: close,
      low: close,
      close: close,
    });
  }
};

const addHourDatasReverse = async (address, swaps, start, end) => {
  let hourStart = getStartOfHour(start);
  // let startHourData = await getPoolHourData(address, hourStart);
  // let prevHourData = await getPoolHourData(address, hourStart - 3600);
  let swapDatas = swaps.sort((a, b) =>
    Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
  );
  let currentHour = hourStart;
  let open = undefined,
    high = undefined,
    low = undefined,
    close = undefined;
  let volumeUSD = 0,
    txCount = 0;
  // if (prevHourData) {
  //   open = prevHourData.close;
  //   high = prevHourData.close;
  //   low = prevHourData.close;
  //   close = prevHourData.close;
  // }
  // if (startHourData) {
  //   high = high > startHourData.high ? high : startHourData.high;
  //   low = low < startHourData.low ? low : startHourData.low;
  //   close = startHourData.close;
  //   volumeUSD = Number(startHourData.volumeUSD);
  //   txCount = Number(startHourData.txCount);
  // }
  for (let swapData of swapDatas) {
    if (Number(swapData.amountUSD) < 0.001) continue;
    const price =
      Number(swapData.amount0In) !== 0
        ? Number(swapData.amount1Out) / Number(swapData.amount0In)
        : Number(swapData.amount1In) / Number(swapData.amount0Out);
    let timestamp = Number(swapData.timestamp);
    if (timestamp - currentHour < 3600) {
      if (open === undefined) open = price;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
    if (timestamp - currentHour >= 3600) {
      await updatePoolHourData(address, currentHour, {
        periodStartUnix: currentHour,
        pool: address,
        volumeUSD,
        txCount,
        open,
        high,
        low,
        close,
      });
      open = close;
      high = close;
      low = close;
      volumeUSD = 0;
      txCount = 0;
      currentHour += 3600;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
  }
  let lastHourData = await getPoolHourData(address, currentHour);
  if (lastHourData) {
    high = high > lastHourData.high ? high : lastHourData.high;
    low = low < lastHourData.low ? low : lastHourData.low;
    close = lastHourData.close;
    volumeUSD += Number(lastHourData.volumeUSD);
    txCount += Number(lastHourData.txCount);
  }
  await updatePoolHourData(address, currentHour, {
    periodStartUnix: currentHour,
    pool: address,
    volumeUSD,
    txCount,
    open,
    high,
    low,
    close,
  });
  if (end - currentHour >= 3600) {
    await updatePoolHourData(address, currentHour + 3600, {
      periodStartUnix: currentHour + 3600,
      pool: address,
      volumeUSD: 0,
      txCount: 0,
      open: close,
      high: close,
      low: close,
      close: close,
    });
  }
};

const addDayDatasReverse = async (address, swaps, start, end) => {
  let dayStart = getStartOfDay(start);
  // let startDayData = await getPoolDayData(address, dayStart);
  // let prevDayData = await getPoolDayData(address, dayStart - 86400);
  let swapDatas = swaps.sort((a, b) =>
    Number(a.timestamp) < Number(b.timestamp) ? -1 : 1
  );
  let currentDay = dayStart;
  let open = undefined,
    high = undefined,
    low = undefined,
    close = undefined;
  let volumeUSD = 0,
    txCount = 0;
  // if (prevDayData) {
  //   open = prevDayData.close;
  //   high = prevDayData.close;
  //   low = prevDayData.close;
  //   close = prevDayData.close;
  // }
  // if (startDayData) {
  //   high = high > startDayData.high ? high : startDayData.high;
  //   low = low < startDayData.low ? low : startDayData.low;
  //   close = startDayData.close;
  //   volumeUSD = Number(startDayData.volumeUSD);
  //   txCount = Number(startDayData.txCount);
  // }
  for (let swapData of swapDatas) {
    if (Number(swapData.amountUSD) < 0.001) continue;
    const price =
      Number(swapData.amount0In) !== 0
        ? Number(swapData.amount1Out) / Number(swapData.amount0In)
        : Number(swapData.amount1In) / Number(swapData.amount0Out);
    let timestamp = Number(swapData.timestamp);
    if (timestamp - currentDay < 86400) {
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
    if (timestamp - currentDay >= 86400) {
      await updatePoolDayData(address, currentDay, {
        date: currentDay,
        pool: address,
        volumeUSD,
        txCount,
        open,
        high,
        low,
        close,
      });
      open = close;
      high = close;
      low = close;
      volumeUSD = 0;
      txCount = 0;
      currentDay += 86400;
      high = high > price ? high : price;
      low = low < price ? low : price;
      close = price;
      volumeUSD += Number(swapData.amountUSD);
      txCount++;
    }
  }
  let lastDayData = await getPoolDayData(address, currentDay);
  if (lastDayData) {
    high = high > lastDayData.high ? high : lastDayData.high;
    low = low < lastDayData.low ? low : lastDayData.low;
    close = lastDayData.close;
    volumeUSD += Number(lastDayData.volumeUSD);
    txCount += Number(lastDayData.txCount);
  }
  await updatePoolDayData(address, currentDay, {
    date: currentDay,
    pool: address,
    volumeUSD,
    txCount,
    open,
    high,
    low,
    close,
  });
  if (end - currentDay >= 86400) {
    await updatePoolDayData(address, currentDay + 86400, {
      periodStartUnix: currentDay + 86400,
      pool: address,
      volumeUSD: 0,
      txCount: 0,
      open: close,
      high: close,
      low: close,
      close: close,
    });
  }
};

module.exports = {
  globalCache,
  getBaseswapTokenList,
  getPairPrices,
  updatePairs,
};
