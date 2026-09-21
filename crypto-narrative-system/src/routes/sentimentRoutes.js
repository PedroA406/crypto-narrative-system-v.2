const express = require("express");

const router = express.Router();

const {
    getMarketSentiment,
    getCoinSentiment
} = require("../controllers/sentimentController");


/*
|--------------------------------------------------------------------------
| MARKET SENTIMENT
|--------------------------------------------------------------------------
| Retorna o sentimento geral do mercado.
|--------------------------------------------------------------------------
*/

router.get("/market", getMarketSentiment);


/*
|--------------------------------------------------------------------------
| COIN SENTIMENT
|--------------------------------------------------------------------------
| Retorna o sentimento de uma moeda específica.
|
| Exemplo:
| /sentiment/coin/BTC
| /sentiment/coin/ETH
|--------------------------------------------------------------------------
*/

router.get("/coin/:symbol", getCoinSentiment);


module.exports = router;