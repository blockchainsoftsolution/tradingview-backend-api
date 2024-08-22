const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const SwapSchema = new Schema({
    pool: {type: String, default: "", trim: true},
    timestamp: { type: Number, default: 0 },
    logIndex: { type: Number, default: 0 },
    from: { type: String, default: "", trim: true, maxlength: 100 },
    amount0In: { type: String, default: "", trim: true, maxlength: 100 },
    amount1In: { type: String, default: "", trim: true, maxlength: 100 },
    amount0Out: { type: String, default: "", trim: true, maxlength: 100 },
    amount1Out: { type: String, default: "", trim: true, maxlength: 100 },
    amountUSD: { type: String, default: "", trim: true, maxlength: 100 },
  });

module.exports = {
    SwapSchema
}
