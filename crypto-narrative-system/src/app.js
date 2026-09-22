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
// ARQUIVOS ESTÁTICOS
// ============================================================

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
// DASHBOARD
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
// DASHBOARD - ROTA DIRETA
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
// NARRATIVE INTELLIGENCE
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
// NARRATIVE INTELLIGENCE - ARQUIVO DIRETO
// ============================================================

app.get(
    "/narrative-analysis.html",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "../frontend/pages/narrative-analysis.html"
            )
        );

    }
);


module.exports = app;
