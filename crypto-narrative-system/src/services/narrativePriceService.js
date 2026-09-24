const Coin = require("../models/Coin");
const Post = require("../models/Post");
const axios = require("axios");


/* ============================================================
   CRYPTO NARRATIVE SYSTEM
   ANÁLISE NARRATIVA × PREÇO
   ============================================================

   Esta camada cruza:

   - Notícias históricas
   - Narrativas
   - Sentimento
   - Preço histórico
   - Retorno percentual do ativo

   IMPORTANTE:

   Os resultados representam associação estatística.

   Eles NÃO significam que uma narrativa causou
   determinado movimento de preço.
   ============================================================ */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const CACHE_TIME = 5 * 60 * 1000;

const analysisCache = new Map();


const NARRATIVE_LABELS = {

    market:
        "Mercado",

    general:
        "Geral",

    institutional_investment:
        "Investimento Institucional",

    regulation:
        "Regulação",

    security:
        "Segurança",

    technology:
        "Tecnologia",

    adoption:
        "Adoção",

    mining:
        "Mineração"

};


/* ============================================================
   CONFIGURAÇÃO DE PERÍODO
   ============================================================ */

function getPeriodConfiguration(period) {

    const configurations = {

        "7d": {
            days: 7
        },

        "30d": {
            days: 30
        },

        "60d": {
            days: 60
        }

    };


    return (
        configurations[period] ||
        configurations["30d"]
    );

}


/* ============================================================
   LIMPAR CACHE
   ============================================================ */

function getCacheKey(
    period,
    asset
) {

    return `${period}:${asset}`;

}


/* ============================================================
   DATA INICIAL
   ============================================================ */

function getStartDate(days) {

    const date =
        new Date();

    date.setUTCDate(
        date.getUTCDate() - days
    );

    date.setUTCHours(
        0,
        0,
        0,
        0
    );

    return date;

}


/* ============================================================
   DATA FINAL
   ============================================================ */

function getEndDate() {

    const date =
        new Date();

    date.setUTCHours(
        23,
        59,
        59,
        999
    );

    return date;

}


/* ============================================================
   CHAVE DO DIA
   ============================================================ */

function getDayKey(value) {

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return null;

    }


    return [
        date.getUTCFullYear(),
        String(
            date.getUTCMonth() + 1
        ).padStart(2, "0"),
        String(
            date.getUTCDate()
        ).padStart(2, "0")
    ].join("-");

}


/* ============================================================
   FORMATAÇÃO DO DIA
   ============================================================ */

function formatDayLabel(day) {

    if (!day) {
        return "";
    }


    const [
        year,
        month,
        date
    ] =
        day.split("-");


    return `${date}/${month}`;

}


/* ============================================================
   PEARSON
   ============================================================ */

function calculatePearson(
    xValues,
    yValues
) {

    if (
        !Array.isArray(xValues) ||
        !Array.isArray(yValues)
    ) {

        return null;

    }


    if (
        xValues.length !==
        yValues.length
    ) {

        return null;

    }


    if (
        xValues.length < 3
    ) {

        return null;

    }


    const x =
        xValues
            .map(Number)
            .filter(Number.isFinite);


    const y =
        yValues
            .map(Number)
            .filter(Number.isFinite);


    if (
        x.length !==
        y.length
    ) {

        return null;

    }


    if (
        x.length < 3
    ) {

        return null;

    }


    const meanX =
        x.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        x.length;


    const meanY =
        y.reduce(
            (sum, value) =>
                sum + value,
            0
        ) /
        y.length;


    let numerator = 0;

    let denominatorX = 0;

    let denominatorY = 0;


    for (
        let index = 0;
        index < x.length;
        index++
    ) {

        const differenceX =
            x[index] -
            meanX;

        const differenceY =
            y[index] -
            meanY;


        numerator +=
            differenceX *
            differenceY;


        denominatorX +=
            differenceX *
            differenceX;


        denominatorY +=
            differenceY *
            differenceY;

    }


    const denominator =
        Math.sqrt(
            denominatorX *
            denominatorY
        );


    if (
        denominator === 0
    ) {

        return null;

    }


    const correlation =
        numerator /
        denominator;


    return Math.max(
        -1,
        Math.min(
            1,
            correlation
        )
    );

}


/* ============================================================
   INTERPRETAÇÃO
   ============================================================ */

function interpretCorrelation(
    value
) {

    if (
        value === null ||
        !Number.isFinite(value)
    ) {

        return "Dados insuficientes";

    }


    const absolute =
        Math.abs(value);


    if (
        absolute >= 0.80
    ) {

        return value > 0
            ? "Associação positiva muito forte"
            : "Associação negativa muito forte";

    }


    if (
        absolute >= 0.60
    ) {

        return value > 0
            ? "Associação positiva forte"
            : "Associação negativa forte";

    }


    if (
        absolute >= 0.40
    ) {

        return value > 0
            ? "Associação positiva moderada"
            : "Associação negativa moderada";

    }


    if (
        absolute >= 0.20
    ) {

        return value > 0
            ? "Associação positiva fraca"
            : "Associação negativa fraca";

    }


    return "Associação linear baixa";

}


/* ============================================================
   BUSCAR HISTÓRICO DE PREÇO
   ============================================================ */

async function getHistoricalPrices(
    coinId,
    days
) {

    /*
     * Para 60 dias utilizamos 90 dias na CoinGecko
     * e depois filtramos somente o período desejado.
     */

    const apiDays =
        days <= 30
            ? days
            : 90;


    const url =
        `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
            coinId
        )}/market_chart`;


    const response =
        await axios.get(
            url,
            {

                params: {

                    vs_currency:
                        "usd",

                    days:
                        apiDays

                },

                timeout:
                    20000

            }
        );


    if (
        !response.data ||
        !Array.isArray(
            response.data.prices
        )
    ) {

        throw new Error(
            `Histórico de preço indisponível para ${coinId}.`
        );

    }


    return response.data.prices;

}


/* ============================================================
   CONVERTER PREÇOS PARA RETORNOS DIÁRIOS
   ============================================================ */

function buildDailyPrices(
    prices,
    days
) {

    const daily = {};


    if (
        !Array.isArray(prices)
    ) {

        return daily;

    }


    prices.forEach(
        point => {

            if (
                !Array.isArray(point) ||
                point.length < 2
            ) {

                return;

            }


            const timestamp =
                Number(point[0]);

            const price =
                Number(point[1]);


            if (
                !Number.isFinite(timestamp) ||
                !Number.isFinite(price) ||
                price <= 0
            ) {

                return;

            }


            const day =
                getDayKey(
                    timestamp
                );


            if (!day) {
                return;
            }


            /*
             * Mantemos o último preço
             * observado naquele dia.
             */

            daily[day] =
                price;

        }
    );


    const daysList =
        Object.keys(daily)
            .sort();


    const result = [];


    for (
        let index = 1;
        index < daysList.length;
        index++
    ) {

        const previousDay =
            daysList[index - 1];

        const currentDay =
            daysList[index];


        const previousPrice =
            daily[previousDay];

        const currentPrice =
            daily[currentDay];


        if (
            !Number.isFinite(
                previousPrice
            ) ||
            !Number.isFinite(
                currentPrice
            ) ||
            previousPrice === 0
        ) {

            continue;

        }


        const returnPercentage =
            (
                (
                    currentPrice -
                    previousPrice
                ) /
                previousPrice
            ) *
            100;


        result.push({

            day:
                currentDay,

            price:
                currentPrice,

            previousPrice,

            return:
                returnPercentage

        });

    }


    return result;

}


/* ============================================================
   BUSCAR NOTÍCIAS
   ============================================================ */

async function getHistoricalNews(
    startDate,
    endDate,
    asset
) {

    const query = {

        publishedAt: {

            $gte:
                startDate,

            $lte:
                endDate

        }

    };


    if (
        asset &&
        asset !== "ALL"
    ) {

        const coin =
            await Coin.findOne({
                coinId:
                    asset
            }).lean();


        if (coin) {

            query.coin =
                String(
                    coin.symbol
                ).toUpperCase();

        } else {

            query.coin =
                String(
                    asset
                ).toUpperCase();

        }

    }


    return Post.find(
        query
    )
        .select(
            "coin narrative sentimentScore publishedAt"
        )
        .sort({
            publishedAt: 1
        })
        .lean();

}


/* ============================================================
   AGRUPAR NOTÍCIAS
   ============================================================ */

function buildNewsMatrix(
    news
) {

    const matrix = {};


    const assetTotals = {};


    news.forEach(
        post => {

            const coin =
                String(
                    post.coin ||
                    "GENERAL"
                ).toUpperCase();


            const narrative =
                post.narrative ||
                "general";


            const day =
                getDayKey(
                    post.publishedAt
                );


            if (!day) {
                return;
            }


            if (
                !matrix[coin]
            ) {

                matrix[coin] = {};

            }


            if (
                !matrix[coin][narrative]
            ) {

                matrix[coin][narrative] = {};

            }


            if (
                !matrix[coin][narrative][day]
            ) {

                matrix[coin][narrative][day] = {

                    count:
                        0,

                    sentimentTotal:
                        0

                };

            }


            const bucket =
                matrix[coin][narrative][day];


            bucket.count +=
                1;


            bucket.sentimentTotal +=
                Number(
                    post.sentimentScore
                ) || 0;


            if (
                !assetTotals[coin]
            ) {

                assetTotals[coin] = {};

            }


            if (
                !assetTotals[coin][day]
            ) {

                assetTotals[coin][day] = {

                    totalNews:
                        0

                };

            }


            assetTotals[coin][day]
                .totalNews += 1;

        }
    );


    return {

        matrix,

        assetTotals

    };

}


/* ============================================================
   CRIAR SÉRIE NARRATIVA
   ============================================================ */

function buildNarrativeSeries(
    matrix,
    assetTotals,
    coin,
    narrative,
    priceReturns
) {

    const buckets =
        matrix?.[coin]?.[narrative] ||
        {};


    const dates =
        priceReturns.map(
            item =>
                item.day
        );


    const priceLookup = {};


    priceReturns.forEach(
        item => {

            priceLookup[item.day] =
                item;

        }
    );


    const series = [];


    dates.forEach(
        day => {

            const bucket =
                buckets[day];


            const totalNews =
                assetTotals?.[coin]?.[day]
                    ?.totalNews ||
                0;


            let count = 0;

            let averageSentiment = 0;


            if (bucket) {

                count =
                    bucket.count;

                averageSentiment =
                    bucket.count > 0
                        ? bucket.sentimentTotal /
                          bucket.count
                        : 0;

            }


            /*
             * Intensidade narrativa:

             * participação da narrativa no dia
             * × sentimento médio

             * O resultado fica aproximadamente
             * entre -100 e +100.
             */

            const share =
                totalNews > 0
                    ? count /
                      totalNews
                    : 0;


            const narrativeScore =
                share *
                averageSentiment;


            const price =
                priceLookup[day];


            series.push({

                day,

                newsCount:
                    count,

                totalNews,

                narrativeShare:
                    share * 100,

                averageSentiment,

                narrativeScore,

                priceReturn:
                    price
                        ? price.return
                        : null

            });

        }
    );


    return series;

}


/* ============================================================
   CRIAR ANÁLISE DE UMA NARRATIVA
   ============================================================ */

function analyzeNarrative(
    series
) {

    const valid =
        series.filter(
            item =>
                Number.isFinite(
                    item.narrativeScore
                ) &&
                Number.isFinite(
                    item.priceReturn
                )
        );


    const current =
        series.length
            ? series[
                series.length - 1
            ]
            : null;


    const correlation =
        calculatePearson(
            valid.map(
                item =>
                    item.narrativeScore
            ),
            valid.map(
                item =>
                    item.priceReturn
            )
        );


    /*
     * Relação no dia seguinte.
     */

    const nextDayPairs = [];


    for (
        let index = 0;
        index < series.length - 1;
        index++
    ) {

        const currentItem =
            series[index];

        const nextItem =
            series[index + 1];


        if (
            Number.isFinite(
                currentItem.narrativeScore
            ) &&
            Number.isFinite(
                nextItem.priceReturn
            )
        ) {

            nextDayPairs.push({

                narrative:
                    currentItem.narrativeScore,

                return:
                    nextItem.priceReturn

            });

        }

    }


    const nextDayCorrelation =
        calculatePearson(
            nextDayPairs.map(
                item =>
                    item.narrative
            ),
            nextDayPairs.map(
                item =>
                    item.return
            )
        );


    const averageReturn =
        valid.length
            ? valid.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.priceReturn,
                0
            ) /
            valid.length
            : null;


    const averageNarrativeScore =
        series.length
            ? series.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    (
                        Number(
                            item.narrativeScore
                        ) || 0
                    ),
                0
            ) /
            series.length
            : 0;


    const totalNews =
        series.reduce(
            (
                total,
                item
            ) =>
                total +
                (
                    item.newsCount ||
                    0
                ),
            0
        );


    return {

        correlation,

        correlationLabel:
            interpretCorrelation(
                correlation
            ),

        nextDayCorrelation,

        nextDayLabel:
            interpretCorrelation(
                nextDayCorrelation
            ),

        observations:
            valid.length,

        totalNews,

        averageReturn,

        averageNarrativeScore,

        currentNarrativeScore:
            current
                ? current.narrativeScore
                : null,

        currentNews:
            current
                ? current.newsCount
                : 0

    };

}


/* ============================================================
   GERAR ANÁLISE
   ============================================================ */

async function getNarrativePriceAnalysis(
    period = "30d",
    asset = "ALL"
) {

    const configuration =
        getPeriodConfiguration(
            period
        );


    const normalizedPeriod =
        [
            "7d",
            "30d",
            "60d"
        ].includes(period)
            ? period
            : "30d";


    const normalizedAsset =
        asset
            ? String(
                asset
            ).toLowerCase()
            : "ALL";


    const cacheKey =
        getCacheKey(
            normalizedPeriod,
            normalizedAsset
        );


    const cached =
        analysisCache.get(
            cacheKey
        );


    if (
        cached &&
        Date.now() -
        cached.timestamp <
        CACHE_TIME
    ) {

        return cached.data;

    }


    const startDate =
        getStartDate(
            configuration.days
        );


    const endDate =
        getEndDate();


    const coins =
        await Coin.find()
            .sort({
                marketCap:
                    -1
            })
            .lean();


    let selectedCoins =
        coins;


    if (
        normalizedAsset !== "all"
    ) {

        selectedCoins =
            coins.filter(
                coin =>
                    String(
                        coin.coinId ||
                        coin.id ||
                        ""
                    ).toLowerCase() ===
                    normalizedAsset
            );


        if (
            !selectedCoins.length
        ) {

            throw new Error(
                "Ativo não encontrado."
            );

        }

    }


    const news =
        await getHistoricalNews(
            startDate,
            endDate,
            normalizedAsset === "all"
                ? "ALL"
                : normalizedAsset
        );


    const {
        matrix,
        assetTotals
    } =
        buildNewsMatrix(
            news
        );


    const assetAnalyses = [];

    const narrativeAnalyses = [];

    const timelineMap = {};


    /*
     * Processa cada ativo.
     *
     * As requisições são sequenciais para
     * reduzir o risco de limite da CoinGecko.
     */

    for (
        const coin of selectedCoins
    ) {

        const coinId =
            coin.coinId ||
            coin.id;


        if (!coinId) {
            continue;
        }


        let prices;


        try {

            prices =
                await getHistoricalPrices(
                    coinId,
                    configuration.days
                );

        } catch (error) {

            console.error(
                `ERRO HISTÓRICO ${coinId}:`,
                error.message
            );

            continue;

        }


        const priceReturns =
            buildDailyPrices(
                prices,
                configuration.days
            );


        const coinSymbol =
            String(
                coin.symbol ||
                ""
            ).toUpperCase();


        const narratives =
            Object.keys(
                NARRATIVE_LABELS
            );


        const coinNarratives = [];


        for (
            const narrative
            of narratives
        ) {

            const series =
                buildNarrativeSeries(
                    matrix,
                    assetTotals,
                    coinSymbol,
                    narrative,
                    priceReturns
                );


            const analysis =
                analyzeNarrative(
                    series
                );


            if (
                analysis.totalNews === 0
            ) {

                continue;

            }


            const item = {

                asset:
                    coinId,

                assetName:
                    coin.name,

                symbol:
                    coinSymbol,

                narrative,

                narrativeLabel:
                    NARRATIVE_LABELS[
                        narrative
                    ],

                ...analysis,

                series

            };


            coinNarratives.push(
                item
            );


            narrativeAnalyses.push(
                item
            );


            series.forEach(
                point => {

                    const key =
                        point.day;


                    if (
                        !timelineMap[key]
                    ) {

                        timelineMap[key] = {

                            day:
                                key,

                            assets:
                                0,

                            narrativeScoreTotal:
                                0,

                            returnTotal:
                                0,

                            returnCount:
                                0,

                            news:
                                0

                        };

                    }


                    if (
                        point.newsCount >
                        0
                    ) {

                        timelineMap[key]
                            .assets +=
                            1;

                        timelineMap[key]
                            .narrativeScoreTotal +=
                            point.narrativeScore;

                        timelineMap[key]
                            .news +=
                            point.newsCount;

                    }


                    if (
                        Number.isFinite(
                            point.priceReturn
                        )
                    ) {

                        timelineMap[key]
                            .returnTotal +=
                            point.priceReturn;

                        timelineMap[key]
                            .returnCount +=
                            1;

                    }

                }
            );

        }


        const validCoinRelations =
            coinNarratives.filter(
                item =>
                    item.correlation !==
                    null
            );


        const coinCorrelation =
            validCoinRelations.length
                ? validCoinRelations.reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        item.correlation,
                    0
                ) /
                validCoinRelations.length
                : null;


        const coinNews =
            coinNarratives.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.totalNews,
                0
            );


        assetAnalyses.push({

            asset:
                coinId,

            name:
                coin.name,

            symbol:
                coinSymbol,

            news:
                coinNews,

            narratives:
                coinNarratives.length,

            averageCorrelation:
                coinCorrelation,

            correlationLabel:
                interpretCorrelation(
                    coinCorrelation
                ),

            priceChange:
                priceReturns.length
                    ? (
                        (
                            priceReturns[
                                priceReturns.length - 1
                            ].price -
                            priceReturns[0]
                                .previousPrice
                        ) /
                        priceReturns[0]
                            .previousPrice
                    ) *
                    100
                    : null

        });

    }


    const timeline =
        Object.values(
            timelineMap
        )
            .sort(
                (
                    a,
                    b
                ) =>
                    a.day.localeCompare(
                        b.day
                    )
            )
            .map(
                item => ({

                    day:
                        item.day,

                    label:
                        formatDayLabel(
                            item.day
                        ),

                    narrativeScore:
                        item.assets
                            ? item.narrativeScoreTotal /
                              item.assets
                            : 0,

                    marketReturn:
                        item.returnCount
                            ? item.returnTotal /
                              item.returnCount
                            : null,

                    news:
                        item.news

                })
            );


    /*
     * Resumo das narrativas.
     */

    const narrativeSummaryMap = {};


    narrativeAnalyses.forEach(
        item => {

            if (
                !narrativeSummaryMap[
                    item.narrative
                ]
            ) {

                narrativeSummaryMap[
                    item.narrative
                ] = {

                    narrative:
                        item.narrative,

                    narrativeLabel:
                        item.narrativeLabel,

                    news:
                        0,

                    correlations: [],

                    nextDayCorrelations: [],

                    averageReturns: []

                };

            }


            const summary =
                narrativeSummaryMap[
                    item.narrative
                ];


            summary.news +=
                item.totalNews;


            if (
                item.correlation !==
                null
            ) {

                summary.correlations.push(
                    item.correlation
                );

            }


            if (
                item.nextDayCorrelation !==
                null
            ) {

                summary.nextDayCorrelations.push(
                    item.nextDayCorrelation
                );

            }


            if (
                item.averageReturn !==
                null
            ) {

                summary.averageReturns.push(
                    item.averageReturn
                );

            }

        }
    );


    const narratives =
        Object.values(
            narrativeSummaryMap
        )
            .map(
                item => ({

                    narrative:
                        item.narrative,

                    narrativeLabel:
                        item.narrativeLabel,

                    news:
                        item.news,

                    averageCorrelation:
                        item.correlations.length
                            ? item.correlations.reduce(
                                (
                                    total,
                                    value
                                ) =>
                                    total +
                                    value,
                                0
                            ) /
                            item.correlations.length
                            : null,

                    averageNextDayCorrelation:
                        item.nextDayCorrelations.length
                            ? item.nextDayCorrelations.reduce(
                                (
                                    total,
                                    value
                                ) =>
                                    total +
                                    value,
                                0
                            ) /
                            item.nextDayCorrelations.length
                            : null,

                    averageReturn:
                        item.averageReturns.length
                            ? item.averageReturns.reduce(
                                (
                                    total,
                                    value
                                ) =>
                                    total +
                                    value,
                                0
                            ) /
                            item.averageReturns.length
                            : null

                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.news -
                    a.news
            );


    const validRelations =
        narrativeAnalyses.filter(
            item =>
                item.correlation !==
                null
        );


    const overallCorrelation =
        validRelations.length
            ? validRelations.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    item.correlation,
                0
            ) /
            validRelations.length
            : null;


    const totalNews =
        news.length;


    const dominantNarrative =
        narratives.length
            ? narratives[0]
            : null;


    const result = {

        generatedAt:
            new Date().toISOString(),

        period:
            normalizedPeriod,

        asset:
            normalizedAsset,

        startDate:
            startDate.toISOString(),

        endDate:
            endDate.toISOString(),

        methodology: {

            narrativeScore:
                "Participação diária da narrativa × sentimento médio das notícias.",

            priceReturn:
                "Retorno percentual diário do preço.",

            correlation:
                "Correlação de Pearson entre intensidade narrativa e retorno diário.",

            nextDayCorrelation:
                "Correlação entre intensidade narrativa de um dia e retorno do dia seguinte.",

            interpretation:
                "As associações não representam causalidade."

        },

        summary: {

            assets:
                assetAnalyses.length,

            news:
                totalNews,

            narratives:
                narratives.length,

            overallCorrelation,

            overallCorrelationLabel:
                interpretCorrelation(
                    overallCorrelation
                ),

            dominantNarrative:
                dominantNarrative
                    ? dominantNarrative.narrativeLabel
                    : null

        },

        assets:
            assetAnalyses,

        narratives,

        correlations:
            narrativeAnalyses.map(
                item => ({

                    asset:
                        item.asset,

                    assetName:
                        item.assetName,

                    symbol:
                        item.symbol,

                    narrative:
                        item.narrative,

                    narrativeLabel:
                        item.narrativeLabel,

                    news:
                        item.totalNews,

                    correlation:
                        item.correlation,

                    correlationLabel:
                        item.correlationLabel,

                    nextDayCorrelation:
                        item.nextDayCorrelation,

                    nextDayLabel:
                        item.nextDayLabel,

                    observations:
                        item.observations,

                    averageReturn:
                        item.averageReturn,

                    averageNarrativeScore:
                        item.averageNarrativeScore

                })
            ),

        timeline,

        series:
            narrativeAnalyses

    };


    analysisCache.set(
        cacheKey,
        {

            timestamp:
                Date.now(),

            data:
                result

        }
    );


    return result;

}


/* ============================================================
   EXPORTAÇÃO
   ============================================================ */

module.exports = {

    getNarrativePriceAnalysis

};
