const mongoose = require("mongoose");
const { SwapSchema } = require("../models/swap");
require("../models/swap");

exports.getSwaps = async (address, from, to) => {
  if (!(`Swaps_${address}` in mongoose.models))
    mongoose.model(`Swaps_${address}`, SwapSchema);
  const Swap = mongoose.model(`Swaps_${address}`);
  let swaps = await Swap.find({
    pool: address,
    timestamp: {
      $gte: from,
      $lt: to,
    },
  });

  swaps.sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));

  return swaps;
};

exports.addSwaps = async (address, swaps) => {
  if (!(`Swaps_${address}` in mongoose.models))
    mongoose.model(`Swaps_${address}`, SwapSchema);
  const Swap = mongoose.model(`Swaps_${address}`);
  try {
    await Swap.insertMany(
      swaps.map((each) => {
        return { ...each, pool: address };
      })
    );
    return true;
  } catch {
    return false;
  }
};
