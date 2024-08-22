const { Schema } = require("mongoose");

const PoolHourDataSchema = new Schema({
  periodStartUnix: { type: Number },
  pool: { type: String, default: "", trim: true, maxlength: 100 },
  volumeUSD: { type: Number },
  txCount: { type: Number },
  open: { type: Number },
  high: { type: Number },
  low: { type: Number },
  close: { type: Number },
});

module.exports = {
  PoolHourDataSchema,
};
