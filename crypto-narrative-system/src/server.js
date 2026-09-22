require("dotenv").config();

const mongoose = require("mongoose");

const app = require("./app");

const collectCoins =
    require("./collectors/coinGeckoCollector");

const collectNews =
    require("./collectors/newsCollector");

const {
    updateMarketSentiment
} = require("./services/marketService");

const PORT =
    process.env.PORT || 3000;


/* ===================================================== */
/* CONFIGURAÇÃO DOS COLETORES */
/* ===================================================== */

/*
 * Por segurança, os coletores ficam DESATIVADOS
 * quando ENABLE_COLLECTORS não estiver explicitamente
 * configurado como "true" no ambiente.
 *
 * Para ativar:
 *
 * ENABLE_COLLECTORS=true
 *
 */

const ENABLE_COLLECTORS =
    process.env.ENABLE_COLLECTORS === "true";


/* ===================================================== */
/* START SYSTEM */
/* ===================================================== */

async function startServer() {

    try {

        console.log("=================================");
        console.log("CONECTANDO AO MONGODB...");
        console.log("=================================");

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log("=================================");
        console.log("MONGODB CONECTADO");
        console.log("=================================");


        /* ===================================================== */
        /* VERIFICAÇÃO DOS COLETORES */
        /* ===================================================== */

        if (ENABLE_COLLECTORS) {

            console.log("=================================");
            console.log("COLETORES: ATIVADOS");
            console.log("=================================");


            /* ===================================================== */
            /* PRIMEIRA COLETA */
            /* ===================================================== */

            console.log("=================================");
            console.log("INICIANDO COLETA INICIAL...");
            console.log("=================================");

            await collectCoins();

            await collectNews();

            await updateMarketSentiment();

            console.log("=================================");
            console.log("COLETA INICIAL FINALIZADA");
            console.log("=================================");


            /* ===================================================== */
            /* ATUALIZAÇÃO DE MERCADO */
            /* ===================================================== */

            setInterval(async () => {

                try {

                    console.log("=================================");
                    console.log("ATUALIZANDO MERCADO...");
                    console.log("=================================");

                    await collectCoins();

                    await updateMarketSentiment();

                    console.log("=================================");
                    console.log("MERCADO ATUALIZADO");
                    console.log("=================================");

                } catch (error) {

                    console.log(
                        "ERRO AO ATUALIZAR MERCADO"
                    );

                    console.log(
                        error.message
                    );

                }

            }, 1000 * 60 * 2);


            /* ===================================================== */
            /* ATUALIZAÇÃO DE NOTÍCIAS */
            /* ===================================================== */

            setInterval(async () => {

                try {

                    console.log("=================================");
                    console.log("ATUALIZANDO NOTÍCIAS...");
                    console.log("=================================");

                    await collectNews();

                    await updateMarketSentiment();

                    console.log("=================================");
                    console.log("NOTÍCIAS ATUALIZADAS");
                    console.log("=================================");

                } catch (error) {

                    console.log(
                        "ERRO AO ATUALIZAR NOTÍCIAS"
                    );

                    console.log(
                        error.message
                    );

                }

            }, 1000 * 60);

        } else {

            console.log("=================================");
            console.log("COLETORES: DESATIVADOS");
            console.log("=================================");

            console.log(
                "Nenhuma coleta será executada."
            );

            console.log(
                "O MongoDB será utilizado somente para consulta."
            );

        }


        /* ===================================================== */
        /* HEARTBEAT SISTEMA */
        /* ===================================================== */

        setInterval(() => {

            console.log("=================================");
            console.log("SISTEMA ONLINE");

            console.log(
                `HORÁRIO: ${
                    new Date()
                        .toLocaleString("pt-BR")
                }`
            );

            console.log(
                `COLETORES: ${
                    ENABLE_COLLECTORS
                        ? "ATIVADOS"
                        : "DESATIVADOS"
                }`
            );

            console.log("=================================");

        }, 1000 * 30);


        /* ===================================================== */
        /* START API */
        /* ===================================================== */

        app.listen(
            PORT,
            "0.0.0.0",
            () => {

                console.log("=================================");

                console.log(
                    `SERVIDOR RODANDO NA PORTA ${PORT}`
                );

                console.log(
                    `AMBIENTE: ${
                        process.env.NODE_ENV ||
                        "development"
                    }`
                );

                console.log(
                    `COLETORES: ${
                        ENABLE_COLLECTORS
                            ? "ATIVADOS"
                            : "DESATIVADOS"
                    }`
                );

                console.log("=================================");

            }
        );

    } catch (error) {

        console.log("=================================");
        console.log("ERRO AO INICIAR SISTEMA");
        console.log("=================================");

        console.log(error);

    }

}

startServer();
