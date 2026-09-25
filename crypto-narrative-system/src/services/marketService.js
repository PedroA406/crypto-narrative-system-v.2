const Coin =
    require("../models/Coin");

const Post =
    require("../models/Post");

const axios =
    require("axios");


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */


/*
|--------------------------------------------------------------------------
| CoinGecko
|--------------------------------------------------------------------------
|
| API utilizada para consultar:
|
| - preço atual;
| - valor de mercado;
| - volume;
| - variação de 24 horas;
| - imagem;
| - histórico.
|
*/

const COINGECKO_API =
    "https://api.coingecko.com/api/v3";


/*
|--------------------------------------------------------------------------
| CACHE DE MERCADO
|--------------------------------------------------------------------------
|
| Evita consultar a CoinGecko toda vez que o Dashboard atualizar.
|
*/

const MARKET_CACHE_TIME =
    30000;


let ultimoUpdateMercado = 0;


/* ============================================================
   GET ALL COINS
   ============================================================ */

async function getAllCoins() {

    try {

        const agora =
            Date.now();

        const tempoDesdeUltimaAtualizacao =
            agora - ultimoUpdateMercado;


        /*
        |--------------------------------------------------------------------------
        | Atualiza os dados quando o cache expirar
        |--------------------------------------------------------------------------
        */

        if (
            tempoDesdeUltimaAtualizacao >=
            MARKET_CACHE_TIME
        ) {

            try {

                await updateMarketData();

                ultimoUpdateMercado =
                    Date.now();

            } catch (marketError) {

                console.log(
                    "AVISO: não foi possível atualizar o mercado."
                );

                console.log(
                    marketError.message
                );

                console.log(
                    "O sistema utilizará os dados existentes no MongoDB."
                );

            }

        } else {

            console.log(
                "MERCADO: utilizando dados atualizados recentemente."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Retorna os dados do MongoDB
        |--------------------------------------------------------------------------
        */

        return await Coin
            .find()
            .sort({
                marketCap: -1
            });

    } catch (error) {

        console.log(
            "ERRO AO BUSCAR MOEDAS:"
        );

        console.log(
            error.message
        );


        /*
        |--------------------------------------------------------------------------
        | FALLBACK
        |--------------------------------------------------------------------------
        */

        try {

            const coins =
                await Coin
                    .find()
                    .sort({
                        marketCap: -1
                    });


            if (
                coins.length > 0
            ) {

                console.log(
                    "MERCADO: utilizando dados existentes no MongoDB."
                );

                return coins;

            }

        } catch (databaseError) {

            console.log(
                "ERRO AO BUSCAR DADOS DO MONGODB:"
            );

            console.log(
                databaseError.message
            );

        }


        throw new Error(
            "Não foi possível obter os dados das moedas."
        );

    }

}


/* ============================================================
   UPDATE MARKET DATA
   ============================================================ */

async function updateMarketData() {

    try {

        console.log(
            "================================="
        );

        console.log(
            "ATUALIZANDO DADOS DO MERCADO"
        );

        console.log(
            "================================="
        );


        /*
        |--------------------------------------------------------------------------
        | Busca moedas cadastradas
        |--------------------------------------------------------------------------
        */

        const coins =
            await Coin.find();


        if (
            !coins ||
            coins.length === 0
        ) {

            console.log(
                "Nenhuma moeda cadastrada no MongoDB."
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | Monta lista de IDs
        |--------------------------------------------------------------------------
        */

        const coinIds =
            coins
                .map(
                    coin =>
                        coin.coinId
                )
                .filter(
                    coinId =>
                        coinId
                );


        if (
            coinIds.length === 0
        ) {

            console.log(
                "Nenhum coinId válido encontrado."
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | Consulta CoinGecko
        |--------------------------------------------------------------------------
        */

        const response =
            await axios.get(
                `${COINGECKO_API}/coins/markets`,
                {

                    params: {

                        vs_currency:
                            "usd",

                        ids:
                            coinIds.join(","),

                        order:
                            "market_cap_desc",

                        per_page:
                            coinIds.length,

                        page:
                            1,

                        sparkline:
                            false

                    },

                    timeout:
                        15000,

                    headers: {

                        "Accept":
                            "application/json",

                        "User-Agent":
                            "Crypto-Narrative-System/1.0"

                    }

                }
            );


        /*
        |--------------------------------------------------------------------------
        | Validação
        |--------------------------------------------------------------------------
        */

        if (
            !response.data ||
            !Array.isArray(
                response.data
            )
        ) {

            throw new Error(
                "A CoinGecko não retornou dados válidos."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Atualiza cada moeda
        |--------------------------------------------------------------------------
        */

        for (
            const marketCoin
            of response.data
        ) {

            try {

                if (
                    !marketCoin.id
                ) {

                    continue;

                }


                const coin =
                    await Coin.findOne({
                        coinId:
                            marketCoin.id
                    });


                if (!coin) {

                    console.log(
                        `Moeda não encontrada no MongoDB: ${marketCoin.id}`
                    );

                    continue;

                }


                /*
                |--------------------------------------------------------------------------
                | Dados de mercado
                |--------------------------------------------------------------------------
                */

                coin.price =
                    Number(
                        marketCoin.current_price
                    ) || 0;


                coin.marketCap =
                    Number(
                        marketCoin.market_cap
                    ) || 0;


                coin.volume =
                    Number(
                        marketCoin.total_volume
                    ) || 0;


                coin.change24h =
                    Number(
                        marketCoin.price_change_percentage_24h
                    ) || 0;


                /*
                |--------------------------------------------------------------------------
                | Imagem
                |--------------------------------------------------------------------------
                */

                if (
                    marketCoin.image
                ) {

                    coin.image =
                        marketCoin.image;

                }


                /*
                |--------------------------------------------------------------------------
                | Última atualização
                |--------------------------------------------------------------------------
                */

                coin.lastUpdated =
                    marketCoin.last_updated
                        ? new Date(
                            marketCoin.last_updated
                        )
                        : new Date();


                /*
                |--------------------------------------------------------------------------
                | IMPORTANTE
                |--------------------------------------------------------------------------
                |
                | Não alteramos sentimentScore.
                |
                */

                await coin.save();


                console.log(
                    `${coin.name} → $${coin.price}`
                );

            } catch (coinError) {

                console.log(
                    `ERRO AO ATUALIZAR ${marketCoin.id}:`
                );

                console.log(
                    coinError.message
                );

            }

        }


        console.log(
            "================================="
        );

        console.log(
            "MERCADO ATUALIZADO COM SUCESSO"
        );

        console.log(
            "================================="
        );

    } catch (error) {

        console.log(
            "ERRO AO ATUALIZAR MERCADO:"
        );


        if (
            error.response
        ) {

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
            "Não foi possível atualizar os dados do mercado."
        );

    }

}


/* ============================================================
   GET COIN BY SYMBOL
   ============================================================ */

async function getCoinBySymbol(
    symbol
) {

    try {

        if (!symbol) {

            return null;

        }


        return await Coin.findOne({

            symbol:
                symbol.toLowerCase()

        });

    } catch (error) {

        console.log(
            "ERRO AO BUSCAR MOEDA:"
        );

        console.log(
            error.message
        );


        throw new Error(
            error.message
        );

    }

}


/* ============================================================
   GET COIN HISTORY
   ============================================================ */

async function getCoinHistory(
    coinId,
    period = "day"
) {

    try {

        if (!coinId) {

            throw new Error(
                "ID da moeda não informado."
            );

        }


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


        const url =
            `${COINGECKO_API}/coins/` +
            `${encodeURIComponent(coinId)}` +
            `/market_chart`;


        console.log(
            "================================="
        );

        console.log(
            "BUSCANDO HISTÓRICO DA MOEDA"
        );

        console.log(
            "Coin ID:",
            coinId
        );

        console.log(
            "Período:",
            period
        );

        console.log(
            "Dias:",
            days
        );

        console.log(
            "URL:",
            url
        );

        console.log(
            "================================="
        );


        /*
        |--------------------------------------------------------------------------
        | Consulta histórico
        |--------------------------------------------------------------------------
        */

        const response =
            await axios.get(
                url,
                {

                    params: {

                        vs_currency:
                            "usd",

                        days:
                            days

                    },

                    timeout:
                        20000,

                    headers: {

                        "Accept":
                            "application/json",

                        "User-Agent":
                            "Crypto-Narrative-System/1.0"

                    }

                }
            );


        console.log(
            "CoinGecko respondeu:",
            response.status
        );


        /*
        |--------------------------------------------------------------------------
        | Validação
        |--------------------------------------------------------------------------
        */

        if (
            !response.data ||
            !Array.isArray(
                response.data.prices
            )
        ) {

            throw new Error(
                "A CoinGecko não retornou o array de preços."
            );

        }


        console.log(
            "Quantidade de preços:",
            response.data.prices.length
        );


        return {

            prices:
                response.data.prices

        };

    } catch (error) {

        console.log(
            "================================="
        );

        console.log(
            "ERRO AO BUSCAR HISTÓRICO"
        );

        console.log(
            "================================="
        );

        console.log(
            "Coin ID:",
            coinId
        );

        console.log(
            "Período:",
            period
        );

        console.log(
            "Mensagem:",
            error.message
        );


        if (
            error.response
        ) {

            console.log(
                "STATUS DA COINGECKO:",
                error.response.status
            );

            console.log(
                "DADOS DA COINGECKO:",
                error.response.data
            );

        }


        if (
            error.request &&
            !error.response
        ) {

            console.log(
                "A requisição foi enviada, mas não houve resposta da CoinGecko."
            );

        }


        console.log(
            "================================="
        );


        /*
        |--------------------------------------------------------------------------
        | Preserva a mensagem original
        |--------------------------------------------------------------------------
        */

        throw new Error(
            error.response?.data?.error ||
            error.response?.data?.status?.error_message ||
            error.message ||
            "Não foi possível obter o histórico da moeda."
        );

    }

}


/* ============================================================
   UPDATE MARKET SENTIMENT
   ============================================================ */

async function updateMarketSentiment() {

    try {

        console.log(
            "================================="
        );

        console.log(
            "ATUALIZANDO SENTIMENTO DAS MOEDAS"
        );

        console.log(
            "================================="
        );


        const coins =
            await Coin.find();


        for (
            const coin
            of coins
        ) {

            const symbol =
                coin.symbol.toUpperCase();


            const posts =
                await Post
                    .find({
                        coin:
                            symbol
                    })
                    .sort({
                        publishedAt:
                            -1
                    });


            if (
                posts.length === 0
            ) {

                console.log(
                    `Sem posts para ${coin.symbol}`
                );

                continue;

            }


            /*
            |--------------------------------------------------------------------------
            | MÉDIA HISTÓRICA
            |--------------------------------------------------------------------------
            */

            let historicalTotal =
                0;


            for (
                const post
                of posts
            ) {

                historicalTotal +=
                    Number(
                        post.sentimentScore
                    ) || 0;

            }


            const historicalAverage =
                historicalTotal /
                posts.length;


            /*
            |--------------------------------------------------------------------------
            | MÉDIA RECENTE
            |--------------------------------------------------------------------------
            */

            const recentPosts =
                posts.slice(
                    0,
                    10
                );


            let recentTotal =
                0;


            for (
                const post
                of recentPosts
            ) {

                recentTotal +=
                    Number(
                        post.sentimentScore
                    ) || 0;

            }


            const recentAverage =
                recentTotal /
                recentPosts.length;


            /*
            |--------------------------------------------------------------------------
            | SCORE FINAL
            |--------------------------------------------------------------------------
            */

            const finalScore =
                (
                    historicalAverage *
                    0.4
                )
                +
                (
                    recentAverage *
                    0.6
                );


            /*
            |--------------------------------------------------------------------------
            | LIMITA SCORE
            |--------------------------------------------------------------------------
            */

            coin.sentimentScore =
                Math.max(
                    -100,
                    Math.min(
                        100,
                        Math.round(
                            finalScore
                        )
                    )
                );


            await coin.save();


            /*
            |--------------------------------------------------------------------------
            | LOG
            |--------------------------------------------------------------------------
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


        console.log(
            "================================="
        );

        console.log(
            "SENTIMENTOS ATUALIZADOS"
        );

        console.log(
            "================================="
        );

    } catch (error) {

        console.log(
            "ERRO AO ATUALIZAR SENTIMENTO:"
        );

        console.log(
            error.message
        );

    }

}


/* ============================================================
   EXPORTAÇÕES
   ============================================================ */

module.exports = {

    getAllCoins,

    getCoinBySymbol,

    getCoinHistory,

    updateMarketSentiment,

    updateMarketData

};
