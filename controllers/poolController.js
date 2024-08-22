const mongoose = require("mongoose");
const { PoolHourDataSchema } = require("../models/poolHourData");
const { PoolDayDataSchema } = require("../models/poolDayData");
require("../models/pool");

const Pool = mongoose.model("Pool");

exports.isPoolExist = async (address) => {
  let pool = await Pool.findOne({ address });
  return !!pool;
};

exports.getPool = async (address) => {
  let pool = await Pool.findOne({ address }).select("-swaps");
  return pool;
};

exports.lastSwapTimestamp = async (address) => {
  let pool = await Pool.findOne({ address }).select("to");

  if (!pool) {
    console.log("Pool not found");
    return;
  }

  return pool.to;
};

exports.firstSwapTimestamp = async (address) => {
  let pool = await Pool.findOne({ address }).select("from");

  if (!pool) {
    console.log("Pool not found");
    return;
  }

  return pool.from;
};

exports.createPool = async (address, createdAt, token0, token1) => {
  const _isExist = await this.isPoolExist(address);
  if (_isExist) return false;
  const newPool = new Pool({
    address,
    createdAt,
    token0,
    token1,
  });
  await newPool.save();
};

exports.updatePool = async (address, from, to) => {
  let pool = await Pool.findOne({ address });
  if (pool.from && pool.to && pool.from !== to && pool.to !== from)
  {
    console.error("Can't update pool", pool.from, pool.to, from, to);
    return undefined
  }
  if (!pool.from || pool.from === to) pool.from = from;
  if (!pool.to || pool.to === from) pool.to = to;
  await Pool.updateOne({ address }, { $set: { from: pool.from, to: pool.to } });
  return pool;
};

exports.getPoolHourData = async (address, time) => {
  if (!(`PoolHourData_${address}` in mongoose.models))
    mongoose.model(`PoolHourData_${address}`, PoolHourDataSchema);
  const PoolHourData = mongoose.model(`PoolHourData_${address}`);
  let poolHourData = await PoolHourData.findOne({ pool:address, periodStartUnix: time })
  return poolHourData
};

exports.getPoolDayData = async (address, time) => {
  if (!(`PoolDayData_${address}` in mongoose.models))
    mongoose.model(`PoolDayData_${address}`, PoolDayDataSchema);
  const PoolDayData = mongoose.model(`PoolDayData_${address}`);
  let poolDayData = await PoolDayData.findOne({ pool:address, date: time })
  return poolDayData
};

exports.getPoolHourDatas = async (address, from, to) => {
  if (!(`PoolHourData_${address}` in mongoose.models))
    mongoose.model(`PoolHourData_${address}`, PoolHourDataSchema);
  const PoolHourData = mongoose.model(`PoolHourData_${address}`);
  let poolHourDatas = await PoolHourData.find({ pool:address, periodStartUnix: {
    $gte: from, $lt: to
  } })
  return poolHourDatas
};

exports.getPoolDayDatas = async (address, from, to) => {
  if (!(`PoolDayData_${address}` in mongoose.models))
    mongoose.model(`PoolDayData_${address}`, PoolDayDataSchema);
  const PoolDayData = mongoose.model(`PoolDayData_${address}`);
  let poolDayDatas = await PoolDayData.find({ pool:address, date: {
    $gte: from, $lt: to
  } })
  return poolDayDatas
};

exports.updatePoolHourData = async (address, time, data) => {
    if (!(`PoolHourData_${address}` in mongoose.models))
      mongoose.model(`PoolHourData_${address}`, PoolHourDataSchema);
    const PoolHourData = mongoose.model(`PoolHourData_${address}`);
    let poolHourData = await PoolHourData.findOneAndUpdate(
        {pool: address, periodStartUnix: time},
        data,
        {new: true, upsert: true}
    );
    return poolHourData
}

exports.updatePoolDayData = async (address, time, data) => {
    if (!(`PoolDayData_${address}` in mongoose.models))
      mongoose.model(`PoolDayData_${address}`, PoolDayDataSchema);
    const PoolDayData = mongoose.model(`PoolDayData_${address}`);
    let poolDayData = await PoolDayData.findOneAndUpdate(
        {pool: address, date: time},
        data,
        {new: true, upsert: true}
    );
    return poolDayData
}
