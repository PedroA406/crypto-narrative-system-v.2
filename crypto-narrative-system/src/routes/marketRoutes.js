const express =
    require("express");


const router =
    express.Router();


const {

    getCoins,

    getNews,

    getNarratives,

    getCoinHistory,

    getNarrativePrice

} =
    require(
        "../controllers/marketController"
    );


/*
|--------------------------------------------------------------------------
| MOEDAS
|--------------------------------------------------------------------------
*/

router.get(
    "/coins",
    getCoins
);


/*
|--------------------------------------------------------------------------
| HISTÓRICO DE UMA MOEDA
|--------------------------------------------------------------------------
*/

router.get(
    "/coins/:coinId/history",
    getCoinHistory
);


/*
|--------------------------------------------------------------------------
| NOTÍCIAS
|--------------------------------------------------------------------------
*/

router.get(
    "/news",
    getNews
);


/*
|--------------------------------------------------------------------------
| INTELIGÊNCIA NARRATIVA
|--------------------------------------------------------------------------
*/

router.get(
    "/narratives",
    getNarratives
);


/*
|--------------------------------------------------------------------------
| ANÁLISE NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| Exemplos:
|
| /market/narrative-price?period=7d&asset=ALL
| /market/narrative-price?period=30d&asset=ALL
| /market/narrative-price?period=60d&asset=ALL
|
| /market/narrative-price?period=30d&asset=bitcoin
|
|--------------------------------------------------------------------------
*/

router.get(
    "/narrative-price",
    getNarrativePrice
);


module.exports =
    router;
