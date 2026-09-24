const marketService =
    require("../services/marketService");


const narrativePriceService =
    require("../services/narrativePriceService");


/*
|--------------------------------------------------------------------------
| OBTER MOEDAS
|--------------------------------------------------------------------------
*/

async function getCoins(
    req,
    res
) {

    try {

        const coins =
            await marketService.getAllCoins();


        res.status(200).json(
            coins
        );


    } catch (error) {

        console.error(
            "ERRO AO OBTER MOEDAS:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

}


/*
|--------------------------------------------------------------------------
| OBTER NOTÍCIAS
|--------------------------------------------------------------------------
*/

async function getNews(
    req,
    res
) {

    try {

        const requestedLimit =
            Number(
                req.query.limit
            );


        const limit =
            Number.isFinite(
                requestedLimit
            )
                ? Math.min(
                    100,
                    Math.max(
                        1,
                        Math.floor(
                            requestedLimit
                        )
                    )
                )
                : 30;


        const Post =
            require("../models/Post");


        const news =
            await Post.find()
                .sort({

                    publishedAt:
                        -1,

                    createdAt:
                        -1

                })
                .limit(
                    limit
                )
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


/*
|--------------------------------------------------------------------------
| INTELIGÊNCIA NARRATIVA
|--------------------------------------------------------------------------
*/

async function getNarratives(
    req,
    res
) {

    try {

        const period =
            String(
                req.query.period ||
                "30d"
            );


        const analysis =
            await marketService.getNarrativeAnalysis(
                period
            );


        res.status(200).json(
            analysis
        );


    } catch (error) {

        console.error(
            "ERRO AO GERAR INTELIGÊNCIA NARRATIVA:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

}


/*
|--------------------------------------------------------------------------
| HISTÓRICO DA MOEDA
|--------------------------------------------------------------------------
*/

async function getCoinHistory(
    req,
    res
) {

    try {

        const {
            coinId
        } =
            req.params;


        const {
            period = "day"
        } =
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


/*
|--------------------------------------------------------------------------
| NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| Exemplos:
|
| /market/narrative-price
| /market/narrative-price?period=7d
| /market/narrative-price?period=30d
| /market/narrative-price?period=60d
|
| /market/narrative-price?period=30d&asset=bitcoin
| /market/narrative-price?period=30d&asset=ethereum
|
|--------------------------------------------------------------------------
*/

async function getNarrativePrice(
    req,
    res
) {

    try {

        const period =
            String(
                req.query.period ||
                "30d"
            );


        const asset =
            String(
                req.query.asset ||
                "ALL"
            );


        const analysis =
            await narrativePriceService
                .getNarrativePriceAnalysis(
                    period,
                    asset
                );


        res.status(200).json(
            analysis
        );


    } catch (error) {

        console.error(
            "ERRO AO GERAR ANÁLISE NARRATIVA × PREÇO:",
            error
        );


        res.status(500).json({

            error:
                error.message

        });

    }

}


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {

    getCoins,

    getNews,

    getNarratives,

    getCoinHistory,

    getNarrativePrice

};
