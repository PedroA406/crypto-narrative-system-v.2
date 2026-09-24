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
| API pública utilizada para consultar:
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
| Evita fazer uma requisição à CoinGecko toda vez que o Dashboard
| atualizar os dados.
|
| O Dashboard atualiza a cada 30 segundos.
|
| Utilizamos um intervalo de 30 segundos para permitir atualização
| contínua sem gerar chamadas desnecessárias.
|
*/

const MARKET_CACHE_TIME =
    30000;


let ultimoUpdateMercado = 0;


/* ============================================================
   GET ALL COINS
   ============================================================ */

/*
|--------------------------------------------------------------------------
| Busca as moedas
|--------------------------------------------------------------------------
|
| Antes:
|
| MongoDB → Dashboard
|
| Agora:
|
| CoinGecko → MongoDB → Dashboard
|
| Dessa maneira os preços não ficam congelados no banco.
|
*/

async function getAllCoins() {

    try {

        /*
        |--------------------------------------------------------------------------
        | Verifica se precisamos atualizar
        |--------------------------------------------------------------------------
        */

        const agora =
            Date.now();


        const tempoDesdeUltimaAtualizacao =
            agora - ultimoUpdateMercado;


        /*
        |--------------------------------------------------------------------------
        | Atualiza somente quando necessário
        |--------------------------------------------------------------------------
        */

        if (
            tempoDesdeUltimaAtualizacao >=
            MARKET_CACHE_TIME
        ) {

            await updateMarketData();

            ultimoUpdateMercado =
                agora;

        } else {

            console.log(
                "MERCADO: utilizando dados atualizados recentemente."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | Retorna as moedas do MongoDB
        |--------------------------------------------------------------------------
        */

        return await Coin.find()
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
        |
        | Se a CoinGecko estiver indisponível, ainda tentamos entregar
        | os dados existentes no MongoDB.
        |
        | Isso evita que o Dashboard fique completamente indisponível
        | por causa de uma falha temporária da API externa.
        |
        */

        try {

            const coins =
                await Coin.find()
                    .sort({
                        marketCap: -1
                    });


            if (coins.length > 0) {

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

/*
|--------------------------------------------------------------------------
| Atualiza os dados de mercado
|--------------------------------------------------------------------------
|
| A CoinGecko permite buscar várias moedas em uma única requisição.
|
| Isso é muito melhor do que fazer uma requisição individual para
| cada moeda.
|
*/

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
        | Busca moedas existentes
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
        |
        | A API retorna todas as moedas solicitadas em uma única chamada.
        |
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
                        15000

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


                /*
                |--------------------------------------------------------------------------
                | Localiza a moeda no MongoDB
                |--------------------------------------------------------------------------
                */

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
                | Atualiza dados de mercado
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
                | Data da atualização
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
                | Salva no MongoDB
                |--------------------------------------------------------------------------
                |
                | Não alteramos:
                |
                | sentimentScore
                |
                | porque ele é calculado pelo nosso sistema de análise
                | de notícias.
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


        /*
        |--------------------------------------------------------------------------
        | Erro HTTP da CoinGecko
        |--------------------------------------------------------------------------
        */

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

/*
|--------------------------------------------------------------------------
| Busca histórico de preço
|--------------------------------------------------------------------------
|
| Períodos:
|
| day   → 1 dia
| week  → 7 dias
| month → 30 dias
| year  → 365 dias
|
*/

async function getCoinHistory(coinId, period = "day") {

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

        const days = periods[period];

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

        const response =
            await axios.get(
                url,
                {
                    params: {
                        vs_currency: "usd",
                        days: days
                    },
                    timeout: 20000,
                    headers: {
                        "Accept": "application/json",
                        "User-Agent":
                            "Crypto-Narrative-System/1.0"
                    }
                }
            );

        console.log(
            "CoinGecko respondeu:",
            response.status
        );

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

        if (error.response) {

            console.log(
                "STATUS DA COINGECKO:",
                error.response.status
            );

            console.log(
                "DADOS DA COINGECKO:",
                error.response.data
            );

        }

        if (error.request) {

            console.log(
                "A requisição foi enviada, mas não houve resposta."
            );

        }

        console.log(
            "================================="
        );

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

/*
|--------------------------------------------------------------------------
| Atualiza o sentimento das moedas
|--------------------------------------------------------------------------
|
| O cálculo utiliza:
|
| 40% → histórico completo
| 60% → 10 notícias mais recentes
|
| Não descartamos notícias antigas.
|
*/

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


        /*
        |--------------------------------------------------------------------------
        | Busca moedas
        |--------------------------------------------------------------------------
        */

        const coins =
            await Coin.find();


        /*
        |--------------------------------------------------------------------------
        | Processa cada moeda
        |--------------------------------------------------------------------------
        */

        for (
            const coin
            of coins
        ) {

            const symbol =
                coin.symbol.toUpperCase();


            /*
            |--------------------------------------------------------------------------
            | Busca notícias da moeda
            |--------------------------------------------------------------------------
            */

            const posts =
                await Post.find({

                    coin:
                        symbol

                })
                .sort({

                    publishedAt:
                        -1

                });


            /*
            |--------------------------------------------------------------------------
            | Nenhuma notícia
            |--------------------------------------------------------------------------
            */

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
            | HISTÓRICO
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
            | NOTÍCIAS MAIS RECENTES
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
            |
            | 40% histórico
            | 60% notícias recentes
            |
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
            | Limita entre -100 e +100
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


            /*
            |--------------------------------------------------------------------------
            | Salva
            |--------------------------------------------------------------------------
            */

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
            "=================================");


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
   EXPORTS
   ============================================================ */

module.exports = {

    getAllCoins,

    getCoinBySymbol,

    getCoinHistory,

    updateMarketSentiment,

    updateMarketData

};
