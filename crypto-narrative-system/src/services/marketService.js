const Coin = require("../models/Coin");
const Post = require("../models/Post");

const axios = require("axios");


/*
|--------------------------------------------------------------------------
| GET ALL COINS
|--------------------------------------------------------------------------
*/

async function getAllCoins() {

    try {

        return await Coin.find()
            .sort({ marketCap: -1 });

    } catch (error) {

        console.log("ERRO AO BUSCAR MOEDAS:");
        console.log(error.message);

        throw new Error(error.message);

    }

}


/*
|--------------------------------------------------------------------------
| GET COIN BY SYMBOL
|--------------------------------------------------------------------------
*/

async function getCoinBySymbol(symbol) {

    try {

        if (!symbol) {
            return null;
        }

        return await Coin.findOne({
            symbol: symbol.toLowerCase()
        });

    } catch (error) {

        console.log("ERRO AO BUSCAR MOEDA:");
        console.log(error.message);

        throw new Error(error.message);

    }

}


/*
|--------------------------------------------------------------------------
| GET COIN HISTORY
|--------------------------------------------------------------------------
|
| Busca o histórico de preço da moeda diretamente na CoinGecko.
|
| Períodos aceitos:
|
| day   → 1 dia
| week  → 7 dias
| month → 30 dias
| year  → 365 dias
|
| Retorno:
|
| {
|     prices: [
|         [timestamp, price],
|         ...
|     ]
| }
|
|---------------------------------------------------------------------------
*/

async function getCoinHistory(
    coinId,
    period = "day"
) {

    try {

        /*
        |----------------------------------------------------------------------
        | Validação
        |----------------------------------------------------------------------
        */

        if (!coinId) {

            throw new Error(
                "ID da moeda não informado."
            );

        }


        /*
        |----------------------------------------------------------------------
        | Define o período
        |----------------------------------------------------------------------
        */

        const periods = {

            day: 1,

            week: 7,

            month: 30,

            year: 365

        };


        const days =
            periods[period];


        if (!days) {

            throw new Error(
                "Período inválido. Use day, week, month ou year."
            );

        }


        /*
        |----------------------------------------------------------------------
        | URL da CoinGecko
        |----------------------------------------------------------------------
        */

        const url =
            `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
                coinId
            )}/market_chart`;


        console.log(
            `BUSCANDO HISTÓRICO: ${coinId} | ${period} | ${days} dias`
        );


        /*
        |----------------------------------------------------------------------
        | Requisição
        |----------------------------------------------------------------------
        */

        const response =
            await axios.get(
                url,
                {
                    params: {

                        vs_currency: "usd",

                        days: days

                    },

                    timeout: 15000
                }
            );


        /*
        |----------------------------------------------------------------------
        | Verifica resposta
        |----------------------------------------------------------------------
        */

        if (
            !response.data ||
            !Array.isArray(
                response.data.prices
            )
        ) {

            throw new Error(
                "A CoinGecko não retornou dados históricos."
            );

        }


        console.log(
            `HISTÓRICO RECEBIDO: ${response.data.prices.length} pontos`
        );


        /*
        |----------------------------------------------------------------------
        | Retorna somente o necessário para o frontend
        |----------------------------------------------------------------------
        */

        return {

            prices:
                response.data.prices

        };


    } catch (error) {

        console.log(
            "ERRO AO BUSCAR HISTÓRICO DA MOEDA:"
        );


        /*
        |----------------------------------------------------------------------
        | Erro da CoinGecko
        |----------------------------------------------------------------------
        */

        if (error.response) {

            console.log(
                "STATUS:",
                error.response.status
            );

            console.log(
                "RESPOSTA:",
                error.response.data
            );

        }


        console.log(
            error.message
        );


        throw new Error(
            "Não foi possível obter o histórico da moeda."
        );

    }

}


/*
|--------------------------------------------------------------------------
| UPDATE MARKET SENTIMENT
|--------------------------------------------------------------------------
|
| Calcula o sentimento utilizando as notícias armazenadas.
|
| Importante:
| As notícias coletadas pela FreeNewsAPI podem ser antigas.
| Por isso NÃO vamos descartar notícias simplesmente porque
| publishedAt é antigo.
|
| O histórico acumulado continua sendo nossa base principal.
|---------------------------------------------------------------------------
*/

async function updateMarketSentiment() {

    try {

        console.log("=================================");
        console.log("ATUALIZANDO SENTIMENTO DAS MOEDAS");
        console.log("=================================");

        const coins = await Coin.find();

        for (const coin of coins) {

            const symbol =
                coin.symbol.toUpperCase();


            /*
            |------------------------------------------------------------------
            | Busca todas as notícias da moeda
            |------------------------------------------------------------------
            */

            const posts = await Post.find({
                coin: symbol
            })
                .sort({
                    publishedAt: -1
                });


            /*
            |------------------------------------------------------------------
            | Nenhuma notícia
            |------------------------------------------------------------------
            */

            if (posts.length === 0) {

                console.log(
                    `Sem posts para ${coin.symbol}`
                );

                continue;

            }


            /*
            |------------------------------------------------------------------
            | HISTÓRICO
            |------------------------------------------------------------------
            */

            let historicalTotal = 0;

            for (const post of posts) {

                historicalTotal +=
                    Number(post.sentimentScore) || 0;

            }


            const historicalAverage =
                historicalTotal /
                posts.length;


            /*
            |------------------------------------------------------------------
            | NOTÍCIAS MAIS RECENTES DENTRO DO BANCO
            |------------------------------------------------------------------
            */

            const recentPosts =
                posts.slice(0, 10);


            let recentTotal = 0;

            for (const post of recentPosts) {

                recentTotal +=
                    Number(post.sentimentScore) || 0;

            }


            const recentAverage =
                recentTotal /
                recentPosts.length;


            /*
            |------------------------------------------------------------------
            | SCORE FINAL
            |------------------------------------------------------------------
            |
            | 40% histórico
            | 60% notícias mais recentes
            |
            |------------------------------------------------------------------
            */

            const finalScore =
                (
                    historicalAverage * 0.4
                ) +
                (
                    recentAverage * 0.6
                );


            /*
            |------------------------------------------------------------------
            | Limita entre -100 e +100
            |------------------------------------------------------------------
            */

            coin.sentimentScore =
                Math.max(
                    -100,
                    Math.min(
                        100,
                        Math.round(finalScore)
                    )
                );


            await coin.save();


            /*
            |------------------------------------------------------------------
            | LOG
            |------------------------------------------------------------------
            */

            console.log(
                `${coin.name} → Sentiment Score: ${coin.sentimentScore}`
            );

            console.log(
                `   📰 Histórico: ${posts.length} notícias`
            );

            console.log(
                `   🕒 Base recente: ${recentPosts.length} notícias`
            );

            console.log(
                `   📊 Média histórica: ${historicalAverage.toFixed(2)}`
            );

            console.log(
                `   📈 Média recente: ${recentAverage.toFixed(2)}`
            );

        }


        console.log("=================================");
        console.log("SENTIMENTOS ATUALIZADOS");
        console.log("=================================");

    } catch (error) {

        console.log(
            "ERRO AO ATUALIZAR SENTIMENTO:"
        );

        console.log(
            error.message
        );

    }

}


/*
|--------------------------------------------------------------------------
| EXPORTS
|--------------------------------------------------------------------------
*/

module.exports = {

    getAllCoins,

    getCoinBySymbol,

    getCoinHistory,

    updateMarketSentiment

};