const Post = require("../models/Post");
const Coin = require("../models/Coin");
const marketService = require("./marketService");


/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

const NARRATIVAS = [
    "adoption",
    "general",
    "institutional_investment",
    "market",
    "mining",
    "regulation",
    "security",
    "technology"
];

const SENTIMENTOS = [
    "positive",
    "negative",
    "neutral"
];

const DEFASAGENS = [1, 3, 7, 14];


/*
|--------------------------------------------------------------------------
| CACHE DE HISTÓRICO DE PREÇOS
|--------------------------------------------------------------------------
*/

const PRICE_CACHE_TIME = 5 * 60 * 1000;

const priceHistoryCache = new Map();


/*
|--------------------------------------------------------------------------
| FORMATAR PERCENTUAL
|--------------------------------------------------------------------------
*/

function calcularPercentual(valor, total) {

    if (!total) {
        return 0;
    }

    return Number(
        ((valor / total) * 100).toFixed(2)
    );
}


/*
|--------------------------------------------------------------------------
| MÉDIA
|--------------------------------------------------------------------------
*/

function calcularMedia(valores) {

    const validos = valores.filter(
        valor => Number.isFinite(valor)
    );

    if (!validos.length) {
        return 0;
    }

    return (
        validos.reduce(
            (soma, valor) => soma + valor,
            0
        ) / validos.length
    );
}


/*
|--------------------------------------------------------------------------
| CORRELAÇÃO DE PEARSON
|--------------------------------------------------------------------------
*/

function calcularCorrelacao(valoresX, valoresY) {

    if (
        !Array.isArray(valoresX) ||
        !Array.isArray(valoresY) ||
        valoresX.length !== valoresY.length ||
        valoresX.length < 2
    ) {
        return 0;
    }

    const pares = [];

    for (let i = 0; i < valoresX.length; i++) {

        const x = Number(valoresX[i]);
        const y = Number(valoresY[i]);

        if (
            Number.isFinite(x) &&
            Number.isFinite(y)
        ) {
            pares.push({
                x,
                y
            });
        }
    }

    if (pares.length < 2) {
        return 0;
    }

    const mediaX = calcularMedia(
        pares.map(par => par.x)
    );

    const mediaY = calcularMedia(
        pares.map(par => par.y)
    );

    let numerador = 0;
    let somaX = 0;
    let somaY = 0;

    pares.forEach(par => {

        const diferencaX =
            par.x - mediaX;

        const diferencaY =
            par.y - mediaY;

        numerador +=
            diferencaX * diferencaY;

        somaX +=
            diferencaX * diferencaX;

        somaY +=
            diferencaY * diferencaY;
    });

    const denominador =
        Math.sqrt(
            somaX * somaY
        );

    if (
        !denominador ||
        !Number.isFinite(denominador)
    ) {
        return 0;
    }

    return Number(
        (
            numerador /
            denominador
        ).toFixed(4)
    );
}


/*
|--------------------------------------------------------------------------
| INTERPRETAÇÃO DA CORRELAÇÃO
|--------------------------------------------------------------------------
*/

function interpretarCorrelacao(correlacao) {

    const valor =
        Math.abs(correlacao);

    if (valor < 0.10) {
        return "relação linear muito fraca";
    }

    if (valor < 0.30) {
        return "relação linear fraca";
    }

    if (valor < 0.50) {
        return "relação linear moderada";
    }

    if (valor < 0.70) {
        return "relação linear considerável";
    }

    if (valor < 0.90) {
        return "relação linear forte";
    }

    return "relação linear muito forte";
}


/*
|--------------------------------------------------------------------------
| INTERPRETAÇÃO DIRECIONAL
|--------------------------------------------------------------------------
*/

function interpretarDirecao(correlacao) {

    if (correlacao > 0.05) {
        return "positiva";
    }

    if (correlacao < -0.05) {
        return "negativa";
    }

    return "próxima de neutra";
}


/*
|--------------------------------------------------------------------------
| OBTER PERÍODO
|--------------------------------------------------------------------------
*/

async function obterPeriodo() {

    const periodo = await Post.aggregate([

        {
            $match: {
                publishedAt: {
                    $ne: null
                }
            }
        },

        {
            $group: {

                _id: null,

                inicio: {
                    $min: "$publishedAt"
                },

                fim: {
                    $max: "$publishedAt"
                }

            }
        }

    ]);

    if (!periodo.length) {

        return {
            inicio: null,
            fim: null
        };
    }

    return {

        inicio:
            periodo[0].inicio,

        fim:
            periodo[0].fim

    };
}


/*
|--------------------------------------------------------------------------
| DISTRIBUIÇÃO DAS NARRATIVAS ML
|--------------------------------------------------------------------------
*/

async function obterDistribuicaoNarrativas() {

    const resultado = await Post.aggregate([

        {
            $match: {

                narrativeML: {
                    $in: NARRATIVAS
                }

            }
        },

        {
            $group: {

                _id: "$narrativeML",

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {
                total: -1
            }
        }

    ]);

    const total =
        resultado.reduce(
            (soma, item) =>
                soma + item.total,
            0
        );

    return resultado.map(item => ({

        narrativa:
            item._id,

        total:
            item.total,

        percentual:
            calcularPercentual(
                item.total,
                total
            )

    }));
}


/*
|--------------------------------------------------------------------------
| CONFIANÇA MÉDIA
|--------------------------------------------------------------------------
*/

async function obterConfiancaMedia() {

    const resultado = await Post.aggregate([

        {
            $match: {

                narrativeMLConfidence: {
                    $gte: 0
                }

            }
        },

        {
            $group: {

                _id: null,

                media: {
                    $avg:
                        "$narrativeMLConfidence"
                },

                minimo: {
                    $min:
                        "$narrativeMLConfidence"
                },

                maximo: {
                    $max:
                        "$narrativeMLConfidence"
                },

                total: {
                    $sum: 1
                }

            }
        }

    ]);

    if (!resultado.length) {

        return {

            media: 0,
            minimo: 0,
            maximo: 0,
            total: 0

        };
    }

    return {

        media:
            Number(
                resultado[0].media.toFixed(4)
            ),

        minimo:
            Number(
                resultado[0].minimo.toFixed(4)
            ),

        maximo:
            Number(
                resultado[0].maximo.toFixed(4)
            ),

        total:
            resultado[0].total

    };
}


/*
|--------------------------------------------------------------------------
| DISTRIBUIÇÃO DE SENTIMENTO
|--------------------------------------------------------------------------
*/

async function obterDistribuicaoSentimentos() {

    const resultado = await Post.aggregate([

        {
            $match: {

                sentiment: {
                    $in: SENTIMENTOS
                }

            }
        },

        {
            $group: {

                _id: "$sentiment",

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {
                total: -1
            }

        }

    ]);

    const total =
        resultado.reduce(
            (soma, item) =>
                soma + item.total,
            0
        );

    return resultado.map(item => ({

        sentimento:
            item._id,

        total:
            item.total,

        percentual:
            calcularPercentual(
                item.total,
                total
            )

    }));
}


/*
|--------------------------------------------------------------------------
| EVOLUÇÃO TEMPORAL DAS NARRATIVAS
|--------------------------------------------------------------------------
*/

async function obterEvolucaoTemporal() {

    const resultado = await Post.aggregate([

        {
            $match: {

                publishedAt: {
                    $ne: null
                },

                narrativeML: {
                    $in: NARRATIVAS
                }

            }
        },

        {
            $group: {

                _id: {

                    ano: {
                        $year:
                            "$publishedAt"
                    },

                    mes: {
                        $month:
                            "$publishedAt"
                    },

                    narrativa:
                        "$narrativeML"

                },

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {

                "_id.ano": 1,
                "_id.mes": 1

            }

        }

    ]);

    return resultado.map(item => ({

        ano:
            item._id.ano,

        mes:
            item._id.mes,

        periodo:
            `${item._id.ano}-${String(
                item._id.mes
            ).padStart(2, "0")}`,

        narrativa:
            item._id.narrativa,

        total:
            item.total

    }));
}


/*
|--------------------------------------------------------------------------
| NARRATIVA × SENTIMENTO
|--------------------------------------------------------------------------
*/

async function obterNarrativaSentimento() {

    const resultado = await Post.aggregate([

        {
            $match: {

                narrativeML: {
                    $in: NARRATIVAS
                },

                sentiment: {
                    $in: SENTIMENTOS
                }

            }
        },

        {
            $group: {

                _id: {

                    narrativa:
                        "$narrativeML",

                    sentimento:
                        "$sentiment"

                },

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {

                "_id.narrativa": 1,
                "_id.sentimento": 1

            }

        }

    ]);

    return resultado.map(item => ({

        narrativa:
            item._id.narrativa,

        sentimento:
            item._id.sentimento,

        total:
            item.total

    }));
}


/*
|--------------------------------------------------------------------------
| NARRATIVA × MOEDA
|--------------------------------------------------------------------------
*/

async function obterNarrativaMoeda() {

    const resultado = await Post.aggregate([

        {
            $match: {

                narrativeML: {
                    $in: NARRATIVAS
                }

            }
        },

        {
            $group: {

                _id: {

                    narrativa:
                        "$narrativeML",

                    moeda:
                        "$coin"

                },

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {

                "_id.narrativa": 1,
                total: -1

            }

        }

    ]);

    return resultado.map(item => ({

        narrativa:
            item._id.narrativa,

        moeda:
            item._id.moeda,

        total:
            item.total

    }));
}


/*
|--------------------------------------------------------------------------
| CONCORDÂNCIA NARRATIVE × NARRATIVE ML
|--------------------------------------------------------------------------
*/

async function obterConcordancia() {

    const resultado = await Post.aggregate([

        {
            $match: {

                narrative: {
                    $in: NARRATIVAS
                },

                narrativeML: {
                    $in: NARRATIVAS
                }

            }
        },

        {
            $group: {

                _id: {

                    original:
                        "$narrative",

                    ml:
                        "$narrativeML"

                },

                total: {
                    $sum: 1
                }

            }
        },

        {
            $sort: {

                "_id.original": 1,
                "_id.ml": 1

            }

        }

    ]);

    let totalComparacoes = 0;

    let totalConcordancias = 0;

    resultado.forEach(item => {

        totalComparacoes +=
            item.total;

        if (
            item._id.original ===
            item._id.ml
        ) {

            totalConcordancias +=
                item.total;

        }

    });

    const totalDivergencias =
        totalComparacoes -
        totalConcordancias;

    return {

        totalComparacoes,

        concordancias:
            totalConcordancias,

        divergencias:
            totalDivergencias,

        percentualConcordancia:
            calcularPercentual(
                totalConcordancias,
                totalComparacoes
            ),

        percentualDivergencia:
            calcularPercentual(
                totalDivergencias,
                totalComparacoes
            ),

        matriz:
            resultado.map(item => ({

                narrativaOriginal:
                    item._id.original,

                narrativaML:
                    item._id.ml,

                total:
                    item.total

            }))

    };
}


/*
|--------------------------------------------------------------------------
| LATÊNCIA DE COLETA
|--------------------------------------------------------------------------
*/

async function obterLatenciaColeta() {

    const resultado = await Post.aggregate([

        {
            $match: {

                publishedAt: {
                    $ne: null
                },

                createdAt: {
                    $ne: null
                }

            }
        },

        {
            $project: {

                latenciaMs: {

                    $subtract: [
                        "$createdAt",
                        "$publishedAt"
                    ]

                }

            }
        },

        {
            $match: {

                latenciaMs: {
                    $gte: 0
                }

            }
        },

        {
            $group: {

                _id: null,

                mediaMs: {
                    $avg:
                        "$latenciaMs"
                },

                minimoMs: {
                    $min:
                        "$latenciaMs"
                },

                maximoMs: {
                    $max:
                        "$latenciaMs"
                },

                total: {
                    $sum: 1
                }

            }
        }

    ]);

    if (!resultado.length) {

        return {

            mediaMinutos: 0,
            mediaHoras: 0,
            mediaDias: 0,
            minimoMinutos: 0,
            maximoMinutos: 0,
            total: 0

        };
    }

    const dados =
        resultado[0];

    return {

        mediaMinutos:
            Number(
                (
                    dados.mediaMs /
                    1000 /
                    60
                ).toFixed(2)
            ),

        mediaHoras:
            Number(
                (
                    dados.mediaMs /
                    1000 /
                    60 /
                    60
                ).toFixed(2)
            ),

        mediaDias:
            Number(
                (
                    dados.mediaMs /
                    1000 /
                    60 /
                    60 /
                    24
                ).toFixed(2)
            ),

        minimoMinutos:
            Number(
                (
                    dados.minimoMs /
                    1000 /
                    60
                ).toFixed(2)
            ),

        maximoMinutos:
            Number(
                (
                    dados.maximoMs /
                    1000 /
                    60
                ).toFixed(2)
            ),

        total:
            dados.total

    };
}


/*
|--------------------------------------------------------------------------
| TOTAL DE NOTÍCIAS
|--------------------------------------------------------------------------
*/

async function obterTotalNoticias() {

    return await Post.countDocuments({

        narrativeML: {
            $in: NARRATIVAS
        }

    });
}


/*
|--------------------------------------------------------------------------
| NOTÍCIAS DIÁRIAS
|--------------------------------------------------------------------------
*/

async function obterNoticiasDiarias(
    inicio,
    fim
) {

    if (!inicio || !fim) {
        return [];
    }

    const resultado = await Post.aggregate([

        {
            $match: {

                publishedAt: {

                    $gte: inicio,
                    $lte: fim

                },

                narrativeML: {
                    $in: NARRATIVAS
                },

                sentiment: {
                    $in: SENTIMENTOS
                }

            }
        },

        {
            $group: {

                _id: {

                    moeda:
                        "$coin",

                    data: {

                        $dateToString: {

                            format:
                                "%Y-%m-%d",

                            date:
                                "$publishedAt"

                        }

                    },

                    narrativa:
                        "$narrativeML",

                    sentimento:
                        "$sentiment"

                },

                total: {
                    $sum: 1
                },

                sentimentScoreMedio: {
                    $avg:
                        "$sentimentScore"
                }

            }
        },

        {
            $sort: {

                "_id.data": 1

            }

        }

    ]);

    return resultado.map(item => ({

        moeda:
            String(
                item._id.moeda
            ).toUpperCase(),

        data:
            item._id.data,

        narrativa:
            item._id.narrativa,

        sentimento:
            item._id.sentimento,

        total:
            item.total,

        sentimentScoreMedio:
            Number(
                (
                    item.sentimentScoreMedio ||
                    0
                ).toFixed(2)
            )

    }));
}


/*
|--------------------------------------------------------------------------
| HISTÓRICO DE PREÇOS
|--------------------------------------------------------------------------
*/

async function obterHistoricoPreco(
    coinId
) {

    const agora =
        Date.now();

    const cache =
        priceHistoryCache.get(
            coinId
        );

    if (
        cache &&
        agora - cache.timestamp <
        PRICE_CACHE_TIME
    ) {

        return cache.data;
    }

    try {

        const resultado =
            await marketService.getCoinHistory(
                coinId,
                "year"
            );

        const prices =
            resultado?.prices || [];

        const data =
            prices
                .map(item => ({

                    timestamp:
                        Number(item[0]),

                    price:
                        Number(item[1])

                }))
                .filter(item =>

                    Number.isFinite(
                        item.timestamp
                    ) &&

                    Number.isFinite(
                        item.price
                    ) &&

                    item.price > 0

                );

        priceHistoryCache.set(
            coinId,
            {

                timestamp:
                    agora,

                data

            }
        );

        return data;

    } catch (error) {

        console.error(
            `Erro ao obter histórico de ${coinId}:`,
            error.message
        );

        return [];
    }
}


/*
|--------------------------------------------------------------------------
| TRANSFORMAR PREÇOS EM SÉRIE DIÁRIA
|--------------------------------------------------------------------------
*/

function transformarPrecosDiarios(
    prices
) {

    const mapa =
        new Map();

    prices.forEach(item => {

        const data =
            new Date(
                item.timestamp
            )
                .toISOString()
                .slice(
                    0,
                    10
                );

        mapa.set(
            data,
            item.price
        );

    });

    return Array.from(
        mapa.entries()
    )
        .map(
            ([data, price]) => ({

                data,

                price:
                    Number(price)

            })
        )
        .sort(
            (a, b) =>
                a.data.localeCompare(
                    b.data
                )
        );
}


/*
|--------------------------------------------------------------------------
| CRIAR MAPA DE NOTÍCIAS
|--------------------------------------------------------------------------
*/

function criarMapaNoticias(
    noticias
) {

    const mapa =
        new Map();

    noticias.forEach(noticia => {

        const chave =
            `${noticia.moeda}|${noticia.data}`;

        if (!mapa.has(chave)) {

            mapa.set(
                chave,
                {

                    totalNoticias: 0,

                    sentimentScoreSoma: 0,

                    sentimentScorePeso: 0,

                    sentimentos: {

                        positive: 0,
                        negative: 0,
                        neutral: 0

                    },

                    narrativas: {}

                }
            );
        }

        const dia =
            mapa.get(chave);

        dia.totalNoticias +=
            noticia.total;

        dia.sentimentScoreSoma +=
            noticia.sentimentScoreMedio *
            noticia.total;

        dia.sentimentScorePeso +=
            noticia.total;

        if (
            dia.sentimentos[
                noticia.sentimento
            ] !== undefined
        ) {

            dia.sentimentos[
                noticia.sentimento
            ] +=
                noticia.total;
        }

        if (
            !dia.narrativas[
                noticia.narrativa
            ]
        ) {

            dia.narrativas[
                noticia.narrativa
            ] = {

                total: 0,

                sentimentScoreSoma: 0,

                sentimentScorePeso: 0

            };
        }

        dia.narrativas[
            noticia.narrativa
        ].total +=
            noticia.total;

        dia.narrativas[
            noticia.narrativa
        ].sentimentScoreSoma +=
            noticia.sentimentScoreMedio *
            noticia.total;

        dia.narrativas[
            noticia.narrativa
        ].sentimentScorePeso +=
            noticia.total;

    });

    return mapa;
}


/*
|--------------------------------------------------------------------------
| CONSTRUIR SÉRIE DE ANÁLISE DA MOEDA
|--------------------------------------------------------------------------
*/

function construirSerieMoeda(
    symbol,
    prices,
    mapaNoticias,
    inicio,
    fim
) {

    const precosDiarios =
        transformarPrecosDiarios(
            prices
        );

    const inicioData =
        new Date(inicio)
            .toISOString()
            .slice(
                0,
                10
            );

    const fimData =
        new Date(fim)
            .toISOString()
            .slice(
                0,
                10
            );

    const precosFiltrados =
        precosDiarios.filter(item =>

            item.data >= inicioData &&
            item.data <= fimData

        );

    const precoAnterior =
        precosDiarios.find(
            item =>
                item.data <
                inicioData
        );

    const serie = [];

    precosFiltrados.forEach(
        (preco, indice) => {

            const noticia =
                mapaNoticias.get(
                    `${symbol}|${preco.data}`
                ) || {

                    totalNoticias: 0,

                    sentimentScoreSoma: 0,

                    sentimentScorePeso: 0,

                    sentimentos: {

                        positive: 0,
                        negative: 0,
                        neutral: 0

                    },

                    narrativas: {}

                };

            let precoBase = null;

            if (indice > 0) {

                precoBase =
                    precosFiltrados[
                        indice - 1
                    ].price;

            } else if (
                precoAnterior
            ) {

                precoBase =
                    precoAnterior.price;

            }

            let retorno = null;

            if (
                precoBase &&
                precoBase > 0
            ) {

                retorno =
                    (
                        (
                            preco.price -
                            precoBase
                        ) /
                        precoBase
                    ) *
                    100;
            }

            const sentimentScore =
                noticia.sentimentScorePeso
                    ? (
                        noticia.sentimentScoreSoma /
                        noticia.sentimentScorePeso
                    )
                    : 0;

            const volatilidade =
                retorno !== null
                    ? Math.abs(retorno)
                    : 0;

            const narrativas =
                Object.entries(
                    noticia.narrativas
                )
                    .map(
                        ([nome, dados]) => ({

                            narrativa:
                                nome,

                            total:
                                dados.total,

                            sentimentScore:
                                dados.sentimentScorePeso
                                    ? Number(
                                        (
                                            dados.sentimentScoreSoma /
                                            dados.sentimentScorePeso
                                        ).toFixed(2)
                                    )
                                    : 0

                        })
                    );

            serie.push({

                data:
                    preco.data,

                price:
                    Number(
                        preco.price.toFixed(8)
                    ),

                retornoPercentual:
                    retorno === null
                        ? null
                        : Number(
                            retorno.toFixed(4)
                        ),

                volatilidade:
                    Number(
                        volatilidade.toFixed(4)
                    ),

                noticias:
                    noticia.totalNoticias,

                sentimentScore:
                    Number(
                        sentimentScore.toFixed(2)
                    ),

                sentimentos:
                    noticia.sentimentos,

                narrativas

            });
        }
    );

    return serie;
}


/*
|--------------------------------------------------------------------------
| ANÁLISE SENTIMENTO × PREÇO
|--------------------------------------------------------------------------
*/

function analisarSentimentoPreco(
    serie
) {

    const dados =
        serie.filter(
            item =>
                item.retornoPercentual !== null
        );

    const retorno =
        dados.map(
            item =>
                item.retornoPercentual
        );

    const sentimento =
        dados.map(
            item =>
                item.sentimentScore
        );

    const noticias =
        dados.map(
            item =>
                item.noticias
        );

    const volatilidade =
        dados.map(
            item =>
                item.volatilidade
        );

    const correlacaoSentimentoRetorno =
        calcularCorrelacao(
            sentimento,
            retorno
        );

    const correlacaoNoticiasRetorno =
        calcularCorrelacao(
            noticias,
            retorno
        );

    const correlacaoSentimentoVolatilidade =
        calcularCorrelacao(
            sentimento,
            volatilidade
        );

    return {

        observacoes:
            dados.length,

        correlacaoSentimentoRetorno,

        interpretacaoSentimentoRetorno:
            interpretarCorrelacao(
                correlacaoSentimentoRetorno
            ),

        direcaoSentimentoRetorno:
            interpretarDirecao(
                correlacaoSentimentoRetorno
            ),

        correlacaoNoticiasRetorno,

        interpretacaoNoticiasRetorno:
            interpretarCorrelacao(
                correlacaoNoticiasRetorno
            ),

        correlacaoSentimentoVolatilidade:
            correlacaoSentimentoVolatilidade,

        interpretacaoSentimentoVolatilidade:
            interpretarCorrelacao(
                correlacaoSentimentoVolatilidade
            )

    };
}


/*
|--------------------------------------------------------------------------
| ANÁLISE NARRATIVA × PREÇO
|--------------------------------------------------------------------------
*/

function analisarNarrativasPreco(
    serie
) {

    const resultado = [];

    NARRATIVAS.forEach(
        narrativa => {

            const dados =
                serie
                    .map(dia => {

                        const narrativaDia =
                            dia.narrativas.find(
                                item =>
                                    item.narrativa ===
                                    narrativa
                            );

                        return {

                            data:
                                dia.data,

                            intensidade:
                                narrativaDia
                                    ? narrativaDia.total
                                    : 0,

                            sentimentScore:
                                narrativaDia
                                    ? narrativaDia.sentimentScore
                                    : 0,

                            retorno:
                                dia.retornoPercentual,

                            volatilidade:
                                dia.volatilidade

                        };

                    })
                    .filter(
                        item =>
                            item.retorno !== null
                    );

            const intensidade =
                dados.map(
                    item =>
                        item.intensidade
                );

            const retornos =
                dados.map(
                    item =>
                        item.retorno
                );

            const sentimentos =
                dados.map(
                    item =>
                        item.sentimentScore
                );

            const volatilidades =
                dados.map(
                    item =>
                        item.volatilidade
                );

            const diasComNarrativa =
                dados.filter(
                    item =>
                        item.intensidade > 0
                );

            const retornosComNarrativa =
                diasComNarrativa.map(
                    item =>
                        item.retorno
                );

            const volatilidadesComNarrativa =
                diasComNarrativa.map(
                    item =>
                        item.volatilidade
                );

            const mediaRetorno =
                calcularMedia(
                    retornosComNarrativa
                );

            const mediaVolatilidade =
                calcularMedia(
                    volatilidadesComNarrativa
                );

            const correlacaoNarrativaRetorno =
                calcularCorrelacao(
                    intensidade,
                    retornos
                );

            const correlacaoNarrativaVolatilidade =
                calcularCorrelacao(
                    intensidade,
                    volatilidades
                );

            const correlacaoNarrativaSentimento =
                calcularCorrelacao(
                    intensidade,
                    sentimentos
                );

            resultado.push({

                narrativa,

                diasAnalisados:
                    dados.length,

                diasComNarrativa:
                    diasComNarrativa.length,

                totalNoticias:
                    intensidade.reduce(
                        (
                            soma,
                            valor
                        ) =>
                            soma + valor,
                        0
                    ),

                mediaRetornoQuandoPresente:
                    Number(
                        mediaRetorno.toFixed(4)
                    ),

                mediaVolatilidadeQuandoPresente:
                    Number(
                        mediaVolatilidade.toFixed(4)
                    ),

                correlacaoNarrativaRetorno,

                correlacaoNarrativaVolatilidade,

                correlacaoNarrativaSentimento,

                interpretacaoRetorno:
                    interpretarCorrelacao(
                        correlacaoNarrativaRetorno
                    ),

                direcaoRetorno:
                    interpretarDirecao(
                        correlacaoNarrativaRetorno
                    )

            });

        }
    );

    return resultado.sort(
        (a, b) =>
            b.totalNoticias -
            a.totalNoticias
    );
}


/*
|--------------------------------------------------------------------------
| ANÁLISE DE DEFASAGEM
|--------------------------------------------------------------------------
*/

function analisarDefasagens(
    serie
) {

    const resultado = [];

    const mapaDias =
        new Map(
            serie.map(
                item =>
                    [
                        item.data,
                        item
                    ]
            )
        );

    NARRATIVAS.forEach(
        narrativa => {

            DEFASAGENS.forEach(
                lag => {

                    const intensidades = [];
                    const retornosFuturos = [];

                    serie.forEach(
                        dia => {

                            const narrativaDia =
                                dia.narrativas.find(
                                    item =>
                                        item.narrativa ===
                                        narrativa
                                );

                            const dataAtual =
                                new Date(
                                    `${dia.data}T00:00:00Z`
                                );

                            dataAtual.setUTCDate(
                                dataAtual.getUTCDate() +
                                lag
                            );

                            const dataFutura =
                                dataAtual
                                    .toISOString()
                                    .slice(
                                        0,
                                        10
                                    );

                            const diaFuturo =
                                mapaDias.get(
                                    dataFutura
                                );

                            if (
                                !diaFuturo ||
                                diaFuturo.retornoPercentual ===
                                    null
                            ) {

                                return;
                            }

                            intensidades.push(
                                narrativaDia
                                    ? narrativaDia.total
                                    : 0
                            );

                            retornosFuturos.push(
                                diaFuturo.retornoPercentual
                            );

                        }
                    );

                    const correlacao =
                        calcularCorrelacao(
                            intensidades,
                            retornosFuturos
                        );

                    resultado.push({

                        narrativa,

                        defasagemDias:
                            lag,

                        observacoes:
                            intensidades.length,

                        correlacao,

                        interpretacao:
                            interpretarCorrelacao(
                                correlacao
                            ),

                        direcao:
                            interpretarDirecao(
                                correlacao
                            )

                    });

                }
            );

        }
    );

    return resultado;
}


/*
|--------------------------------------------------------------------------
| ANÁLISE DE VOLATILIDADE DAS NARRATIVAS
|--------------------------------------------------------------------------
*/

function analisarVolatilidadeNarrativas(
    serie
) {

    return NARRATIVAS
        .map(
            narrativa => {

                const diasComNarrativa =
                    serie.filter(
                        dia =>
                            dia.narrativas.some(
                                item =>
                                    item.narrativa ===
                                        narrativa &&
                                    item.total > 0
                            )
                    );

                const volatilidades =
                    diasComNarrativa.map(
                        dia =>
                            dia.volatilidade
                    );

                const retornos =
                    diasComNarrativa
                        .map(
                            dia =>
                                dia.retornoPercentual
                        )
                        .filter(
                            valor =>
                                valor !== null
                        );

                const mediaVolatilidade =
                    calcularMedia(
                        volatilidades
                    );

                const mediaRetorno =
                    calcularMedia(
                        retornos
                    );

                return {

                    narrativa,

                    dias:
                        diasComNarrativa.length,

                    mediaVolatilidade:
                        Number(
                            mediaVolatilidade
                                .toFixed(4)
                        ),

                    mediaRetorno:
                        Number(
                            mediaRetorno
                                .toFixed(4)
                        )

                };

            }
        )
        .sort(
            (a, b) =>
                b.mediaVolatilidade -
                a.mediaVolatilidade
        );
}


/*
|--------------------------------------------------------------------------
| ANÁLISE INDIVIDUAL POR MOEDA
|--------------------------------------------------------------------------
*/

async function obterAnalisePorMoeda(
    moedas,
    noticias,
    periodo
) {

    if (
        !periodo.inicio ||
        !periodo.fim
    ) {

        return [];
    }

    const mapaNoticias =
        criarMapaNoticias(
            noticias
        );

    const resultados =
        await Promise.allSettled(

            moedas.map(
                async coin => {

                    const symbol =
                        String(
                            coin.symbol || ""
                        ).toUpperCase();

                    const prices =
                        await obterHistoricoPreco(
                            coin.coinId
                        );

                    const serie =
                        construirSerieMoeda(
                            symbol,
                            prices,
                            mapaNoticias,
                            periodo.inicio,
                            periodo.fim
                        );

                    const dadosComPreco =
                        serie.filter(
                            item =>
                                item.price !==
                                null
                        );

                    const analiseSentimento =
                        analisarSentimentoPreco(
                            serie
                        );

                    const analiseNarrativas =
                        analisarNarrativasPreco(
                            serie
                        );

                    const defasagens =
                        analisarDefasagens(
                            serie
                        );

                    const volatilidade =
                        analisarVolatilidadeNarrativas(
                            serie
                        );

                    const totalNoticias =
                        serie.reduce(
                            (
                                soma,
                                item
                            ) =>
                                soma +
                                item.noticias,
                            0
                        );

                    const sentimentoMedio =
                        calcularMedia(
                            serie.map(
                                item =>
                                    item.sentimentScore
                            )
                        );

                    const retornoMedio =
                        calcularMedia(
                            serie
                                .map(
                                    item =>
                                        item.retornoPercentual
                                )
                                .filter(
                                    valor =>
                                        valor !== null
                                )
                        );

                    const volatilidadeMedia =
                        calcularMedia(
                            serie.map(
                                item =>
                                    item.volatilidade
                            )
                        );

                    const primeiroPreco =
                        dadosComPreco.length
                            ? dadosComPreco[0].price
                            : 0;

                    const ultimoPreco =
                        dadosComPreco.length
                            ? dadosComPreco[
                                dadosComPreco.length - 1
                            ].price
                            : 0;

                    let variacaoPeriodo = 0;

                    if (
                        primeiroPreco > 0
                    ) {

                        variacaoPeriodo =
                            (
                                (
                                    ultimoPreco -
                                    primeiroPreco
                                ) /
                                primeiroPreco
                            ) *
                            100;
                    }

                    return {

                        coinId:
                            coin.coinId,

                        nome:
                            coin.name,

                        simbolo:
                            symbol,

                        precoAtual:
                            Number(
                                coin.price || 0
                            ),

                        precoInicialPeriodo:
                            Number(
                                primeiroPreco.toFixed(8)
                            ),

                        precoFinalPeriodo:
                            Number(
                                ultimoPreco.toFixed(8)
                            ),

                        variacaoPeriodo:
                            Number(
                                variacaoPeriodo.toFixed(4)
                            ),

                        totalNoticias,

                        sentimentoMedio:
                            Number(
                                sentimentoMedio.toFixed(4)
                            ),

                        retornoMedioDiario:
                            Number(
                                retornoMedio.toFixed(4)
                            ),

                        volatilidadeMedia:
                            Number(
                                volatilidadeMedia.toFixed(4)
                            ),

                        sentimentoPreco:
                            analiseSentimento,

                        narrativasPreco:
                            analiseNarrativas,

                        defasagens,

                        volatilidadeNarrativas:
                            volatilidade,

                        serieTemporal:
                            serie

                    };
                }
            )

        );

    return resultados
        .filter(
            resultado =>
                resultado.status ===
                "fulfilled"
        )
        .map(
            resultado =>
                resultado.value
        );
}


/*
|--------------------------------------------------------------------------
| RESUMO GLOBAL DA RELAÇÃO NARRATIVA × PREÇO
|--------------------------------------------------------------------------
*/

function obterResumoRelacaoPreco(
    analises
) {

    if (!analises.length) {

        return {

            moedasAnalisadas: 0,

            totalNoticiasRelacionadas: 0,

            correlacaoMediaSentimentoRetorno: 0,

            correlacaoMediaNoticiasRetorno: 0,

            volatilidadeMedia: 0

        };
    }

    const correlacoesSentimento =
        analises.map(
            item =>
                item.sentimentoPreco
                    .correlacaoSentimentoRetorno
        );

    const correlacoesNoticias =
        analises.map(
            item =>
                item.sentimentoPreco
                    .correlacaoNoticiasRetorno
        );

    const volatilidades =
        analises.map(
            item =>
                item.volatilidadeMedia
        );

    return {

        moedasAnalisadas:
            analises.length,

        totalNoticiasRelacionadas:
            analises.reduce(
                (
                    soma,
                    item
                ) =>
                    soma +
                    item.totalNoticias,
                0
            ),

        correlacaoMediaSentimentoRetorno:
            Number(
                calcularMedia(
                    correlacoesSentimento
                ).toFixed(4)
            ),

        correlacaoMediaNoticiasRetorno:
            Number(
                calcularMedia(
                    correlacoesNoticias
                ).toFixed(4)
            ),

        volatilidadeMedia:
            Number(
                calcularMedia(
                    volatilidades
                ).toFixed(4)
            )

    };
}


/*
|--------------------------------------------------------------------------
| ANÁLISE COMPLETA
|--------------------------------------------------------------------------
*/

async function obterAnaliseCompleta() {

    console.log(
        "=============================================="
    );

    console.log(
        "INICIANDO ANÁLISE NARRATIVA × PREÇO"
    );

    console.log(
        "=============================================="
    );

    const periodo =
        await obterPeriodo();

    const [

        totalNoticias,

        narrativas,

        confianca,

        sentimentos,

        evolucaoTemporal,

        narrativaSentimento,

        narrativaMoeda,

        concordancia,

        latenciaColeta,

        noticiasDiarias,

        moedas

    ] = await Promise.all([

        obterTotalNoticias(),

        obterDistribuicaoNarrativas(),

        obterConfiancaMedia(),

        obterDistribuicaoSentimentos(),

        obterEvolucaoTemporal(),

        obterNarrativaSentimento(),

        obterNarrativaMoeda(),

        obterConcordancia(),

        obterLatenciaColeta(),

        obterNoticiasDiarias(
            periodo.inicio,
            periodo.fim
        ),

        Coin.find()
            .sort({
                marketCap: -1
            })
            .lean()

    ]);

    console.log(
        `Notícias encontradas: ${totalNoticias}`
    );

    console.log(
        `Moedas encontradas: ${moedas.length}`
    );

    console.log(
        "Buscando históricos de preços..."
    );

    const analisePorMoeda =
        await obterAnalisePorMoeda(
            moedas,
            noticiasDiarias,
            periodo
        );

    console.log(
        `Moedas analisadas: ${analisePorMoeda.length}`
    );

    const resumoPreco =
        obterResumoRelacaoPreco(
            analisePorMoeda
        );

    const relacaoNarrativaPreco = [];

    const sentimentoPreco = [];

    const volatilidadeNarrativa = [];

    const defasagemNarrativa = [];

    analisePorMoeda.forEach(
        moeda => {

            moeda.narrativasPreco.forEach(
                narrativa => {

                    relacaoNarrativaPreco.push({

                        moeda:
                            moeda.simbolo,

                        nomeMoeda:
                            moeda.nome,

                        ...narrativa

                    });

                }
            );

            sentimentoPreco.push({

                moeda:
                    moeda.simbolo,

                nomeMoeda:
                    moeda.nome,

                ...moeda.sentimentoPreco

            });

            moeda.volatilidadeNarrativas.forEach(
                item => {

                    volatilidadeNarrativa.push({

                        moeda:
                            moeda.simbolo,

                        nomeMoeda:
                            moeda.nome,

                        ...item

                    });

                }
            );

            moeda.defasagens.forEach(
                item => {

                    defasagemNarrativa.push({

                        moeda:
                            moeda.simbolo,

                        nomeMoeda:
                            moeda.nome,

                        ...item

                    });

                }
            );

        }
    );

    console.log(
        "=============================================="
    );

    console.log(
        "ANÁLISE NARRATIVA × PREÇO CONCLUÍDA"
    );

    console.log(
        "=============================================="
    );

    return {

        geradoEm:
            new Date(),

        resumo: {

            totalNoticias,

            periodo,

            quantidadeNarrativas:
                NARRATIVAS.length,

            confiancaMedia:
                confianca.media,

            latenciaMediaMinutos:
                latenciaColeta.mediaMinutos,

            latenciaMediaHoras:
                latenciaColeta.mediaHoras,

            latenciaMediaDias:
                latenciaColeta.mediaDias

        },

        confianca: {

            media:
                confianca.media,

            minimo:
                confianca.minimo,

            maximo:
                confianca.maximo,

            total:
                confianca.total

        },

        narrativas,

        sentimentos,

        evolucaoTemporal,

        narrativaSentimento,

        narrativaMoeda,

        concordancia,

        latenciaColeta,

        /*
        |--------------------------------------------------------------------------
        | ANÁLISES DE PREÇO
        |--------------------------------------------------------------------------
        */

        resumoPreco,

        sentimentoPreco,

        relacaoNarrativaPreco,

        volatilidadeNarrativa,

        defasagemNarrativa,

        analisePorMoeda

    };
}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {

    obterAnaliseCompleta

};
