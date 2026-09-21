const express = require("express");

const router = express.Router();

const {
    getCoins,
    getNews,
    getCoinHistory
} = require("../controllers/marketController");


/* ============================================================
   MOEDAS
   ============================================================ */

router.get(
    "/coins",
    getCoins
);


/* ============================================================
   HISTÓRICO DE UMA MOEDA
   ============================================================ */

router.get(
    "/coins/:coinId/history",
    getCoinHistory
);


/* ============================================================
   NOTÍCIAS
   ============================================================ */

router.get(
    "/news",
    getNews
);


module.exports = router;