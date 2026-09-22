const express = require("express");
const cors = require("cors");
const path = require("path");

const marketRoutes = require("./routes/marketRoutes");
const sentimentRoutes = require("./routes/sentimentRoutes");
const narrativeAnalysisRoutes = require("./routes/narrativeAnalysisRoutes");

const app = express();


// ============================================================
// CONFIGURAÇÕES
// ============================================================

app.use(cors());

app.use(express.json());


// ============================================================
// FRONTEND
// ============================================================

// Disponibiliza a pasta assets
app.use(
    "/assets",
    express.static(
        path.join(__dirname, "../frontend/assets")
    )
);


// ============================================================
// ROTAS DA API
// ============================================================

app.use(
    "/market",
    marketRoutes
);

app.use(
    "/sentiment",
    sentimentRoutes
);

app.use(
    "/market/narratives",
    narrativeAnalysisRoutes
);


// ============================================================
// PÁGINA INICIAL
// ============================================================

app.get(
    "/",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/pages/dashboard.html"
            )
        );

    }
);


// ============================================================
// PÁGINA DO DASHBOARD
// ============================================================

app.get(
    "/dashboard",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/pages/dashboard.html"
            )
        );

    }
);


// ============================================================
// PÁGINA DE INTELIGÊNCIA DE NARRATIVAS
// ============================================================

app.get(
    "/narrative-analysis",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/pages/narrative-analysis.html"
            )
        );

    }
);


// ============================================================
// EXPORTAÇÃO
// ============================================================

module.exports = app;
