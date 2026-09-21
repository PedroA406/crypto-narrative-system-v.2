const mongoose = require("mongoose");

const NewsSchema = new mongoose.Schema({

    title: String,

    description: String,

    url: String,

    source: String,

    sentiment: {
        type: String,
        default: "neutral"
    },

    impactScore: {
        type: Number,
        default: 0
    },

    publishedAt: Date

});

module.exports =
    mongoose.model("News", NewsSchema);