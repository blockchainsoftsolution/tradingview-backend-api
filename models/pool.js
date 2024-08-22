const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const TokenSchema = new Schema({
  name: { type: String, default: "", trim: true, maxlength: 100 },
  symbol: { type: String, default: "", trim: true, maxlength: 100 },
  id: { type: String, default: "", trim: true, maxlength: 100 },
  decimals: { type: Number, default: 18 },
});

const PoolSchema = new Schema({
  address: {
    type: String,
    default: "",
    trim: true,
    maxlength: 100,
  },
  createdAt: {
    type: Date,
  },
  token0: TokenSchema,
  token1: TokenSchema,
  from: {
    type: Number,
  },
  to: {
    type: Number,
  },
});

mongoose.model("Pool", PoolSchema);
