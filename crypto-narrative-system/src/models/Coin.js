const mongoose = require("mongoose");

const CoinSchema = new mongoose.Schema({

    coinId: {
        type: String,
        required: true,
        unique: true
    },

    name: String,

    symbol: String,

    price: Number,

    marketCap: Number,

    volume: Number,

    change24h: Number,

    image: String,

    sentimentScore: {
        type: Number,
        default: 0
    },

    lastUpdated: Date

});

module.exports = mongoose.model("Coin", CoinSchema);