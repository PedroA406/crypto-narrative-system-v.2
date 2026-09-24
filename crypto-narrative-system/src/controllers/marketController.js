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
        | NOTÍCIAS EXIBIDAS NO DASHBOARD
        |------------------------------------------------------------------
        |
        | O MongoDB mantém todo o histórico de notícias.
        |
        | Porém, o Dashboard não precisa receber milhares de documentos
        | em cada atualização.
        |
        | Aqui buscamos somente as 100 notícias mais recentes.
        |
        | Isso reduz:
        |
        | - processamento do MongoDB;
        | - tamanho da resposta HTTP;
        | - consumo de memória do Render;
        | - tráfego entre servidor e navegador;
        | - tempo de carregamento do Dashboard.
        |
        | O histórico completo continua preservado no banco e continua
        | disponível para as análises estatísticas e científicas.
        |
        */

        const news =
            await Post
                .find()
                .sort({
                    publishedAt: -1
                })
                .limit(100)
                .lean();


        res.status(200).json(
            news
        );

    } catch (error) {

        console.error(
            "ERRO AO OBTER NOTÍCIAS:",
            error
        );

        res.status(500).json({
            error:
                error.message
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
