const express = require("express");
const cors = require("cors");

const marketRoutes = require("./routes/marketRoutes");
const sentimentRoutes = require("./routes/sentimentRoutes");
const narrativeAnalysisRoutes = require("./routes/narrativeAnalysisRoutes");

const app = express();

app.use(cors());

app.use(express.json());


/*
|--------------------------------------------------------------------------
| ROTAS DO MERCADO
|--------------------------------------------------------------------------
*/

app.use("/market", marketRoutes);


/*
|--------------------------------------------------------------------------
| ROTAS DE SENTIMENTO
|--------------------------------------------------------------------------
*/

app.use("/sentiment", sentimentRoutes);


/*
|--------------------------------------------------------------------------
| ROTAS DE ANÁLISE DE NARRATIVAS
|--------------------------------------------------------------------------
|
| Endpoint principal:
|
| GET /market/narratives/analysis
|
*/

app.use(
    "/market/narratives",
    narrativeAnalysisRoutes
);


module.exports = app;