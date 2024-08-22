const { Schema } = require("mongoose");

const PoolDayDataSchema = new Schema({
  date: { type: Number },
  pool: { type: String, default: "", trim: true, maxlength: 100 },
  volumeUSD: { type: Number },
  txCount: { type: Number },
  open: { type: Number },
  high: { type: Number },
  low: { type: Number },
  close: { type: Number },
});

module.exports = {
  PoolDayDataSchema,
};
