const marketService =
    require("../services/marketService");

const Post =
    require("../models/Post");


/* ============================================================
   OBTER MOEDAS
   ============================================================ */

async function getCoins(req, res) {

    try {

        const coins =
            await marketService.getAllCoins();

        res.status(200).json(coins);

    } catch (error) {

        console.error(
            "ERRO AO OBTER MOEDAS:",
            error
        );

        res.status(500).json({
            error: error.message
        });

    }

}


/* ============================================================
   OBTER NOTÍCIAS
   ============================================================ */

async function getNews(req, res) {

    try {

        /*
        |------------------------------------------------------------------
        | BUSCAR TODO O HISTÓRICO DE NOTÍCIAS
        |------------------------------------------------------------------
        |
        | Não utilizamos .limit(10) aqui.
        |
        | O MongoDB possui o histórico completo das notícias coletadas.
        | Portanto, a Inteligência Narrativa receberá todas as notícias
        | armazenadas para realizar a análise temporal e estatística.
        |
        */

        const news =
            await Post
                .find()
                .sort({
                    publishedAt: -1
                });

        res.status(200).json(news);

    } catch (error) {

        console.error(
            "ERRO AO OBTER NOTÍCIAS:",
            error
        );

        res.status(500).json({
            error: error.message
        });

    }

}


/* ============================================================
   OBTER HISTÓRICO DA MOEDA
   ============================================================ */

async function getCoinHistory(req, res) {

    try {

        const { coinId } =
            req.params;

        const { period = "day" } =
            req.query;


        if (!coinId) {

            return res.status(400).json({

                error:
                    "ID da moeda não informado."

            });

        }


        const history =
            await marketService.getCoinHistory(
                coinId,
                period
            );


        res.status(200).json(
            history
        );


    } catch (error) {

        console.error(
            "ERRO AO OBTER HISTÓRICO:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

}


/* ============================================================
   EXPORTAÇÕES
   ============================================================ */

module.exports = {

    getCoins,
    getNews,
    getCoinHistory

};