const express =
    require("express");


const router =
    express.Router();


const {

    getNarrativeAnalysis

} = require(
    "../controllers/narrativeAnalysisController"
);


/*
|--------------------------------------------------------------------------
| ANÁLISE COMPLETA
|--------------------------------------------------------------------------
|
| GET
|
| /market/narratives/analysis
|
*/

router.get(
    "/analysis",
    getNarrativeAnalysis
);


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports =
    router;