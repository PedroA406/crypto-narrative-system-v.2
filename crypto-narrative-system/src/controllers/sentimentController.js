const Post = require("../models/Post");
const Coin = require("../models/Coin");


/*
|--------------------------------------------------------------------------
| GET MARKET SENTIMENT
|--------------------------------------------------------------------------
| Retorna o sentimento geral do mercado
|--------------------------------------------------------------------------
*/

async function getMarketSentiment(req, res) {

    try {

        const posts = await Post.find();

        if (posts.length === 0) {

            return res.status(200).json({
                sentiment: "neutral",
                score: 0,
                totalNews: 0
            });

        }


        let totalScore = 0;

        posts.forEach(post => {

            totalScore += post.sentimentScore || 0;

        });


        const averageScore =
            totalScore / posts.length;


        let sentiment = "neutral";


        if (averageScore > 0) {

            sentiment = "positive";

        } else if (averageScore < 0) {

            sentiment = "negative";

        }


        res.status(200).json({

            sentiment: sentiment,

            score: Number(
                averageScore.toFixed(2)
            ),

            totalNews: posts.length

        });


    } catch (error) {

        console.log(
            "ERRO AO BUSCAR SENTIMENTO DO MERCADO:"
        );

        console.log(error.message);


        res.status(500).json({

            error: error.message

        });

    }

}


/*
|--------------------------------------------------------------------------
| GET COIN SENTIMENT
|--------------------------------------------------------------------------
| Retorna o sentimento de uma moeda específica
|
| Exemplo:
| /sentiment/BTC
|--------------------------------------------------------------------------
*/

async function getCoinSentiment(req, res) {

    try {

        const symbol =
            req.params.symbol.toUpperCase();


        const coin =
            await Coin.findOne({

                symbol:
                    symbol.toLowerCase()

            });


        if (!coin) {

            return res.status(404).json({

                error:
                    "Moeda não encontrada."

            });

        }


        const posts =
            await Post.find({

                coin: symbol

            });


        let totalScore = 0;


        posts.forEach(post => {

            totalScore +=
                post.sentimentScore || 0;

        });


        const averageScore =
            posts.length > 0
                ? totalScore / posts.length
                : 0;


        let sentiment = "neutral";


        if (averageScore > 0) {

            sentiment = "positive";

        } else if (averageScore < 0) {

            sentiment = "negative";

        }


        res.status(200).json({

            coin: coin.name,

            symbol: symbol,

            sentiment: sentiment,

            score: Number(
                averageScore.toFixed(2)
            ),

            totalNews: posts.length

        });


    } catch (error) {

        console.log(
            "ERRO AO BUSCAR SENTIMENTO DA MOEDA:"
        );

        console.log(error.message);


        res.status(500).json({

            error: error.message

        });

    }

}


module.exports = {

    getMarketSentiment,
    getCoinSentiment

};