const express =
    require("express");


const router =
    express.Router();


const {

    getNarrativeAnalysis,
    getGeneralNarrativeAnalysis

} = require(
    "../controllers/narrativeAnalysisController"
);


/*
|--------------------------------------------------------------------------
| NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| GET
|
| /market/narratives/analysis
|
| Utilizada pela página:
|
| narrative-price.html
|
*/

router.get(
    "/analysis",
    getNarrativeAnalysis
);


/*
|--------------------------------------------------------------------------
| ANÁLISE GERAL DE NARRATIVAS
|--------------------------------------------------------------------------
|
| GET
|
| /market/narratives/general
|
| Utilizada pela página:
|
| narrative-analysis.html
|
*/

router.get(
    "/general",
    getGeneralNarrativeAnalysis
);


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports =
    router;
