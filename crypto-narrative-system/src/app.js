const express = require("express");
const cors = require("cors");
const path = require("path");

const marketRoutes = require("./routes/marketRoutes");
const sentimentRoutes = require("./routes/sentimentRoutes");
const narrativeAnalysisRoutes = require("./routes/narrativeAnalysisRoutes");

const app = express();

app.use(cors());

app.use(express.json());


/*
|--------------------------------------------------------------------------
| FRONTEND
|--------------------------------------------------------------------------
|
| O frontend está na pasta:
|
| /frontend
|
| Como este arquivo está em:
|
| /src/app.js
|
| o caminho correto é:
|
| ../frontend
|
*/

app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


/*
|--------------------------------------------------------------------------
| ROTAS DO MERCADO
|--------------------------------------------------------------------------
*/

app.use(
    "/market",
    marketRoutes
);


/*
|--------------------------------------------------------------------------
| ROTAS DE SENTIMENTO
|--------------------------------------------------------------------------
*/

app.use(
    "/sentiment",
    sentimentRoutes
);


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


/*
|--------------------------------------------------------------------------
| ROTA PRINCIPAL
|--------------------------------------------------------------------------
|
| Ao acessar a URL principal do sistema:
|
| https://crypto-narrative-system.onrender.com
|
| o Dashboard será carregado.
|
*/

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/dashboard.html"
            )
        );

    }
);


module.exports = app;
