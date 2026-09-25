const Post =
    require("../models/Post");


const Coin =
    require("../models/Coin");


const marketService =
    require("./marketService");


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


const DEFASAGENS = [

    1,
    3,
    7,
    14

];


/*
|--------------------------------------------------------------------------
| CACHE DE HISTÓRICO DE PREÇOS
|--------------------------------------------------------------------------
*/

const PRICE_CACHE_TIME =
    5 * 60 * 1000;


const priceHistoryCache =
    new Map();


/*
|--------------------------------------------------------------------------
| PERÍODOS DA ANÁLISE NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| 7d  → 7 dias
| 30d → 30 dias
| 60d → 60 dias
|
| O histórico de preço será buscado somente para o período necessário.
|
*/

const PERIODOS_ANALISE = {

    "7d": {

        dias: 7,

        preco: "week"

    },


    "30d": {

        dias: 30,

        preco: "month"

    },


    "60d": {

        dias: 60,

        preco: "60d"

    }

};


/*
|--------------------------------------------------------------------------
| NORMALIZAR PERÍODO
|--------------------------------------------------------------------------
*/

function normalizarPeriodoAnalise(
    periodo
) {

    const valor =
        String(
            periodo || "30d"
        )
            .trim()
            .toLowerCase();


    if (
        PERIODOS_ANALISE[
            valor
        ]
    ) {

        return valor;

    }


    if (

        valor === "7" ||

        valor === "week" ||

        valor === "7days"

    ) {

        return "7d";

    }


    if (

        valor === "30" ||

        valor === "month" ||

        valor === "30days"

    ) {

        return "30d";

    }


    if (

        valor === "60" ||

        valor === "60days" ||

        valor === "2months"

    ) {

        return "60d";

    }


    return "30d";

}


/*
|--------------------------------------------------------------------------
| OBTER QUANTIDADE DE DIAS
|--------------------------------------------------------------------------
*/

function obterDiasPeriodo(
    periodo
) {

    return PERIODOS_ANALISE[

        normalizarPeriodoAnalise(
            periodo
        )

    ].dias;

}


/*
|--------------------------------------------------------------------------
| OBTER PERÍODO SOLICITADO
|--------------------------------------------------------------------------
|
| O fim do período é baseado na notícia mais recente existente no MongoDB.
|
*/

async function obterPeriodoAnalise(
    periodo
) {

    const dias =
        obterDiasPeriodo(
            periodo
        );


    const resultado =
        await Post.aggregate([

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

                    fim: {

                        $max:
                            "$publishedAt"

                    }

                }

            }

        ]);


    if (

        !resultado.length ||

        !resultado[0].fim

    ) {

        return {

            inicio: null,

            fim: null

        };

    }


    const fim =
        new Date(
            resultado[0].fim
        );


    const inicio =
        new Date(

            fim.getTime() -

            (
                dias *
                24 *
                60 *
                60 *
                1000
            )

        );


    return {

        inicio,

        fim

    };

}


/*
|--------------------------------------------------------------------------
| NORMALIZAR ATIVO
|--------------------------------------------------------------------------
*/

function normalizarAtivo(
    valor
) {

    if (!valor) {

        return "all";

    }


    const ativo =
        String(
            valor
        )
            .trim()
            .toLowerCase();


    if (

        !ativo ||

        ativo === "all" ||

        ativo === "todos" ||

        ativo === "todas"

    ) {

        return "all";

    }


    return ativo;

}


/*
|--------------------------------------------------------------------------
| FILTRAR MOEDAS
|--------------------------------------------------------------------------
|
| Aceita:
|
| bitcoin
| BTC
| ethereum
| ETH
|
*/

function filtrarMoedasPorAtivo(
    moedas,
    ativo
) {

    const ativoNormalizado =
        normalizarAtivo(
            ativo
        );


    if (
        ativoNormalizado === "all"
    ) {

        return moedas;

    }


    return moedas.filter(
        coin => {

            const coinId =
                String(
                    coin.coinId || ""
                )
                    .toLowerCase();


            const symbol =
                String(
                    coin.symbol || ""
                )
                    .toLowerCase();


            return (

                coinId ===
                ativoNormalizado

                ||

                symbol ===
                ativoNormalizado

            );

        }
    );

}


/*
|--------------------------------------------------------------------------
| EXECUTAR COM LIMITE DE CONCORRÊNCIA
|--------------------------------------------------------------------------
|
| Evita disparar 10 chamadas externas simultaneamente.
|
*/

async function executarComLimite(
    itens,
    limite,
    callback
) {

    const resultados = [];


    let indice = 0;


    async function trabalhador() {

        while (true) {

            const atual =
                indice++;


            if (
                atual >=
                itens.length
            ) {

                return;

            }


            try {

                resultados[atual] =
                    await callback(
                        itens[atual],
                        atual
                    );

            } catch (error) {

                resultados[atual] =
                    null;

            }

        }

    }


    const quantidade =
        Math.min(
            limite,
            itens.length
        );


    await Promise.all(

        Array.from(

            {

                length:
                    quantidade

            },

            () =>
                trabalhador()

        )

    );


    return resultados.filter(
        Boolean
    );

}


/*
|--------------------------------------------------------------------------
| FORMATAR PERCENTUAL
|--------------------------------------------------------------------------
*/

function calcularPercentual(
    valor,
    total
) {

    if (!total) {

        return 0;

    }


    return Number(

        (
            (
                valor /
                total
            ) *
            100
        ).toFixed(2)

    );

}


/*
|--------------------------------------------------------------------------
| MÉDIA
|--------------------------------------------------------------------------
*/

function calcularMedia(
    valores
) {

    const validos =
        valores.filter(
            valor =>
                Number.isFinite(
                    valor
                )
        );


    if (!validos.length) {

        return 0;

    }


    return (

        validos.reduce(

            (
                soma,
                valor
            ) =>
                soma +
                valor,

            0

        ) /
        validos.length

    );

}


/*
|--------------------------------------------------------------------------
| CORRELAÇÃO DE PEARSON
|--------------------------------------------------------------------------
*/

function calcularCorrelacao(
    valoresX,
    valoresY
) {

    if (

        !Array.isArray(
            valoresX
        ) ||

        !Array.isArray(
            valoresY
        ) ||

        valoresX.length !==
        valoresY.length ||

        valoresX.length < 2

    ) {

        return 0;

    }


    const pares = [];


    for (
        let i = 0;
        i < valoresX.length;
        i++
    ) {

        const x =
            Number(
                valoresX[i]
            );


        const y =
            Number(
                valoresY[i]
            );


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


    if (
        pares.length < 2
    ) {

        return 0;

    }


    const mediaX =
        calcularMedia(

            pares.map(
                par =>
                    par.x
            )

        );


    const mediaY =
        calcularMedia(

            pares.map(
                par =>
                    par.y
            )

        );


    let numerador =
        0;


    let somaX =
        0;


    let somaY =
        0;


    pares.forEach(
        par => {

            const diferencaX =
                par.x -
                mediaX;


            const diferencaY =
                par.y -
                mediaY;


            numerador +=

                diferencaX *
                diferencaY;


            somaX +=

                diferencaX *
                diferencaX;


            somaY +=

                diferencaY *
                diferencaY;

        }
    );


    const denominador =
        Math.sqrt(

            somaX *
            somaY

        );


    if (

        !denominador ||

        !Number.isFinite(
            denominador
        )

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

function interpretarCorrelacao(
    correlacao
) {

    const valor =
        Math.abs(
            correlacao
        );


    if (
        valor < 0.10
    ) {

        return (
            "relação linear muito fraca"
        );

    }


    if (
        valor < 0.30
    ) {

        return (
            "relação linear fraca"
        );

    }


    if (
        valor < 0.50
    ) {

        return (
            "relação linear moderada"
        );

    }


    if (
        valor < 0.70
    ) {

        return (
            "relação linear considerável"
        );

    }


    if (
        valor < 0.90
    ) {

        return (
            "relação linear forte"
        );

    }


    return (
        "relação linear muito forte"
    );

}


/*
|--------------------------------------------------------------------------
| INTERPRETAÇÃO DIRECIONAL
|--------------------------------------------------------------------------
*/

function interpretarDirecao(
    correlacao
) {

    if (
        correlacao > 0.05
    ) {

        return "positiva";

    }


    if (
        correlacao < -0.05
    ) {

        return "negativa";

    }


    return "próxima de neutra";

}


/*
|--------------------------------------------------------------------------
| OBTER PERÍODO COMPLETO
|--------------------------------------------------------------------------
|
| Mantido para a análise geral já existente.
|
*/

async function obterPeriodo() {

    const periodo =
        await Post.aggregate([

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

                        $min:
                            "$publishedAt"

                    },

                    fim: {

                        $max:
                            "$publishedAt"

                    }

                }

            }

        ]);


    if (
        !periodo.length
    ) {

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
| TOTAL DE NOTÍCIAS
|--------------------------------------------------------------------------
*/

async function obterTotalNoticias() {

    return await Post.countDocuments();

}


/*
|--------------------------------------------------------------------------
| DISTRIBUIÇÃO DAS NARRATIVAS ML
|--------------------------------------------------------------------------
*/

async function obterDistribuicaoNarrativas() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    narrativeML: {

                        $in:
                            NARRATIVAS

                    }

                }

            },


            {

                $group: {

                    _id:
                        "$narrativeML",

                    total: {

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    total:
                        -1

                }

            }

        ]);


    const total =
        resultado.reduce(

            (
                soma,
                item
            ) =>

                soma +
                item.total,

            0

        );


    return resultado.map(
        item => ({

            narrativa:
                item._id,

            total:
                item.total,

            percentual:
                calcularPercentual(

                    item.total,

                    total

                )

        })
    );

}


/*
|--------------------------------------------------------------------------
| CONFIANÇA MÉDIA
|--------------------------------------------------------------------------
*/

async function obterConfiancaMedia() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    narrativeMLConfidence: {

                        $gte:
                            0

                    }

                }

            },


            {

                $group: {

                    _id:
                        null,

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

                        $sum:
                            1

                    }

                }

            }

        ]);


    if (
        !resultado.length
    ) {

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

                resultado[0]
                    .media
                    .toFixed(4)

            ),

        minimo:
            Number(

                resultado[0]
                    .minimo
                    .toFixed(4)

            ),

        maximo:
            Number(

                resultado[0]
                    .maximo
                    .toFixed(4)

            ),

        total:
            resultado[0]
                .total

    };

}


/*
|--------------------------------------------------------------------------
| DISTRIBUIÇÃO DE SENTIMENTO
|--------------------------------------------------------------------------
*/

async function obterDistribuicaoSentimentos() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    sentiment: {

                        $in:
                            SENTIMENTOS

                    }

                }

            },


            {

                $group: {

                    _id:
                        "$sentiment",

                    total: {

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    total:
                        -1

                }

            }

        ]);


    const total =
        resultado.reduce(

            (
                soma,
                item
            ) =>

                soma +
                item.total,

            0

        );


    return resultado.map(
        item => ({

            sentimento:
                item._id,

            total:
                item.total,

            percentual:
                calcularPercentual(

                    item.total,

                    total

                )

        })
    );

}


/*
|--------------------------------------------------------------------------
| EVOLUÇÃO TEMPORAL DAS NARRATIVAS
|--------------------------------------------------------------------------
*/

async function obterEvolucaoTemporal() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    publishedAt: {

                        $ne:
                            null

                    },

                    narrativeML: {

                        $in:
                            NARRATIVAS

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

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    "_id.ano":
                        1,

                    "_id.mes":
                        1

                }

            }

        ]);


    return resultado.map(
        item => ({

            ano:
                item._id.ano,

            mes:
                item._id.mes,

            periodo:

                `${item._id.ano}-${String(

                    item._id.mes

                ).padStart(

                    2,
                    "0"

                )}`,

            narrativa:
                item._id.narrativa,

            total:
                item.total

        })
    );

}


/*
|--------------------------------------------------------------------------
| NARRATIVA × SENTIMENTO
|--------------------------------------------------------------------------
*/

async function obterNarrativaSentimento() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    narrativeML: {

                        $in:
                            NARRATIVAS

                    },

                    sentiment: {

                        $in:
                            SENTIMENTOS

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

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    "_id.narrativa":
                        1,

                    "_id.sentimento":
                        1

                }

            }

        ]);


    return resultado.map(
        item => ({

            narrativa:
                item._id.narrativa,

            sentimento:
                item._id.sentimento,

            total:
                item.total

        })
    );

}


/*
|--------------------------------------------------------------------------
| NARRATIVA × MOEDA
|--------------------------------------------------------------------------
*/

async function obterNarrativaMoeda() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    narrativeML: {

                        $in:
                            NARRATIVAS

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

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    "_id.narrativa":
                        1,

                    total:
                        -1

                }

            }

        ]);


    return resultado.map(
        item => ({

            narrativa:
                item._id.narrativa,

            moeda:
                item._id.moeda,

            total:
                item.total

        })
    );

}


/*
|--------------------------------------------------------------------------
| CONCORDÂNCIA NARRATIVE × NARRATIVE ML
|--------------------------------------------------------------------------
*/

async function obterConcordancia() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    narrative: {

                        $in:
                            NARRATIVAS

                    },

                    narrativeML: {

                        $in:
                            NARRATIVAS

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

                        $sum:
                            1

                    }

                }

            },


            {

                $sort: {

                    "_id.original":
                        1,

                    "_id.ml":
                        1

                }

            }

        ]);


    let totalComparacoes =
        0;


    let totalConcordancias =
        0;


    resultado.forEach(
        item => {

            totalComparacoes +=
                item.total;


            if (

                item._id.original ===
                item._id.ml

            ) {

                totalConcordancias +=
                    item.total;

            }

        }
    );


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

            resultado.map(
                item => ({

                    narrativaOriginal:
                        item._id.original,

                    narrativaML:
                        item._id.ml,

                    total:
                        item.total

                })
            )

    };

}


/*
|--------------------------------------------------------------------------
| LATÊNCIA DE COLETA
|--------------------------------------------------------------------------
*/

async function obterLatenciaColeta() {

    const resultado =
        await Post.aggregate([

            {

                $match: {

                    publishedAt: {

                        $ne:
                            null

                    },

                    createdAt: {

                        $ne:
                            null

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

                        $gte:
                            0

                    }

                }

            },


            {

                $group: {

                    _id:
                        null,

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

                        $sum:
                            1

                    }

                }

            }

        ]);


    if (
        !resultado.length
    ) {

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
| NOTÍCIAS DIÁRIAS
|--------------------------------------------------------------------------
*/

async function obterNoticiasDiarias(
    inicio,
    fim
) {

    if (
        !inicio ||
        !fim
    ) {

        return [];

    }


    const resultado =
        await Post.aggregate([

            {

                $match: {

                    publishedAt: {

                        $gte:
                            inicio,

                        $lte:
                            fim

                    },

                    narrativeML: {

                        $in:
                            NARRATIVAS

                    },

                    sentiment: {

                        $in:
                            SENTIMENTOS

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

                        $sum:
                            1

                    },

                    sentimentScoreMedio: {

                        $avg:
                            "$sentimentScore"

                    }

                }

            },


            {

                $sort: {

                    "_id.data":
                        1

                }

            }

        ]);


    return resultado.map(
        item => ({

            moeda:
                String(
                    item._id.moeda || ""
                )
                    .toUpperCase(),

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

        })
    );

}


/*
|--------------------------------------------------------------------------
| HISTÓRICO DE PREÇOS
|--------------------------------------------------------------------------
|
| Agora o cache considera também o período.
|
*/

async function obterHistoricoPreco(
    coinId,
    periodo = "30d"
) {

    const periodoNormalizado =
        normalizarPeriodoAnalise(
            periodo
        );


    const configuracao =
        PERIODOS_ANALISE[
            periodoNormalizado
        ];


    const chaveCache =
        `${coinId}:${periodoNormalizado}`;


    const agora =
        Date.now();


    const cache =
        priceHistoryCache.get(
            chaveCache
        );


    if (

        cache &&

        agora -
        cache.timestamp <
        PRICE_CACHE_TIME

    ) {

        return cache.data;

    }


    try {

        /*
        |--------------------------------------------------------------------------
        | CORREÇÃO DE ALINHAMENTO TEMPORAL
        |--------------------------------------------------------------------------
        |
        | As notícias são analisadas pelo publishedAt.
        | O CoinGecko, porém, interpreta week/month/60d a partir da
        | data atual. Como o período das notícias pode ser histórico,
        | buscamos um histórico amplo e deixamos construirSerieMoeda()
        | recortar exatamente periodo.inicio -> periodo.fim.
        |
        */

        const periodoPreco =
            "year";


        console.log(

            `[PREÇO] ${coinId}: buscando histórico ${periodoPreco} ` +
            `para análise ${periodoNormalizado}`

        );


        const resultado =
            await marketService.getCoinHistory(

                coinId,

                periodoPreco

            );


        const prices =
            resultado?.prices || [];


        console.log(
            "=================================================="
        );

        console.log(
            "[NARRATIVE PRICE] HISTÓRICO RECEBIDO"
        );

        console.log(
            "Moeda:",
            coinId
        );

        console.log(
            "Período:",
            periodoNormalizado
        );

        console.log(
            "Quantidade de pontos:",
            prices.length
        );

        if (prices.length > 0) {

            console.log(
                "Primeiro ponto:",
                prices[0]
            );

            console.log(
                "Último ponto:",
                prices[prices.length - 1]
            );

        }

        console.log(
            "=================================================="
        );


        const data =
            prices

                .map(
                    item => ({

                        timestamp:
                            Number(
                                item[0]
                            ),

                        price:
                            Number(
                                item[1]
                            )

                    })
                )

                .filter(
                    item =>

                        Number.isFinite(
                            item.timestamp
                        )

                        &&

                        Number.isFinite(
                            item.price
                        )

                        &&

                        item.price > 0

                );


        priceHistoryCache.set(

            chaveCache,

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


    prices.forEach(
        item => {

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

        }
    );


    return Array.from(

        mapa.entries()

    )

        .map(

            ([data, price]) => ({

                data,

                price:
                    Number(
                        price
                    )

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


    noticias.forEach(
        noticia => {

            const chave =
                `${noticia.moeda}|${noticia.data}`;


            if (
                !mapa.has(chave)
            ) {

                mapa.set(

                    chave,

                    {

                        totalNoticias:
                            0,

                        sentimentScoreSoma:
                            0,

                        sentimentScorePeso:
                            0,

                        sentimentos: {

                            positive:
                                0,

                            negative:
                                0,

                            neutral:
                                0

                        },

                        narrativas:
                            {}

                    }

                );

            }


            const dia =
                mapa.get(
                    chave
                );


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

                    total:
                        0,

                    sentimentScoreSoma:
                        0,

                    sentimentScorePeso:
                        0

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

        }
    );


    return mapa;

}


/*
|--------------------------------------------------------------------------
| CONSTRUIR SÉRIE DA MOEDA
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


    console.log(
        "=================================================="
    );

    console.log(
        "[NARRATIVE PRICE] FILTRO DA SÉRIE"
    );

    console.log(
        "Moeda:",
        symbol
    );

    console.log(
        "Início da análise:",
        inicio
    );

    console.log(
        "Fim da análise:",
        fim
    );

    console.log(
        "Quantidade de preços diários:",
        precosDiarios.length
    );

    if (precosDiarios.length > 0) {

        console.log(
            "Primeira data disponível:",
            precosDiarios[0].data
        );

        console.log(
            "Última data disponível:",
            precosDiarios[precosDiarios.length - 1].data
        );

    }

    console.log(
        "=================================================="
    );


    const inicioData =
        new Date(
            inicio
        )
            .toISOString()
            .slice(
                0,
                10
            );


    const fimData =
        new Date(
            fim
        )
            .toISOString()
            .slice(
                0,
                10
            );


    const precosFiltrados =
        precosDiarios.filter(
            item =>

                item.data >=
                inicioData &&

                item.data <=
                fimData

        );


    let precoAnterior =
        null;


    const precoAntesInicio =
        precosDiarios
            .filter(
                item =>
                    item.data <
                    inicioData
            );


    if (
        precoAntesInicio.length
    ) {

        precoAnterior =
            precoAntesInicio[
                precoAntesInicio.length - 1
            ].price;

    }


    return precosFiltrados.map(
        item => {

            const chave =
                `${symbol}|${item.data}`;


            const noticia =
                mapaNoticias.get(
                    chave
                ) || {

                    totalNoticias:
                        0,

                    sentimentScoreSoma:
                        0,

                    sentimentScorePeso:
                        0,

                    sentimentos: {

                        positive:
                            0,

                        negative:
                            0,

                        neutral:
                            0

                    },

                    narrativas:
                        {}

                };


            const sentimentScore =

                noticia.sentimentScorePeso >

                0

                    ?

                    noticia.sentimentScoreSoma /
                    noticia.sentimentScorePeso

                    :

                    0;


            let retornoPercentual =
                null;


            if (

                precoAnterior !== null &&

                precoAnterior > 0

            ) {

                retornoPercentual =

                    (

                        (
                            item.price -
                            precoAnterior
                        ) /
                        precoAnterior

                    ) * 100;

            }


            const volatilidade =

                retornoPercentual !== null

                    ?

                    Math.abs(
                        retornoPercentual
                    )

                    :

                    0;


            const narrativas = {};


            NARRATIVAS.forEach(
                narrativa => {

                    const dados =
                        noticia.narrativas[
                            narrativa
                        ];


                    if (
                        dados
                    ) {

                        narrativas[
                            narrativa
                        ] = {

                            total:
                                dados.total,

                            intensidade:

                                Number(

                                    (
                                        dados.total /
                                        noticia.totalNoticias

                                    ).toFixed(4)

                                ),

                            sentimentScore:

                                dados.sentimentScorePeso >

                                0

                                    ?

                                    Number(

                                        (

                                            dados.sentimentScoreSoma /
                                            dados.sentimentScorePeso

                                        ).toFixed(4)

                                    )

                                    :

                                    0

                        };

                    } else {

                        narrativas[
                            narrativa
                        ] = {

                            total:
                                0,

                            intensidade:
                                0,

                            sentimentScore:
                                0

                        };

                    }

                }
            );


            precoAnterior =
                item.price;


            return {

                data:
                    item.data,

                price:
                    item.price,

                retornoPercentual,

                volatilidade,

                noticias:
                    noticia.totalNoticias,

                sentimentScore:
                    Number(
                        sentimentScore.toFixed(4)
                    ),

                sentimentos:
                    noticia.sentimentos,

                narrativas

            };

        }
    );

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

                item.retornoPercentual !==
                null

        );


    const correlacaoSentimentoRetorno =

        calcularCorrelacao(

            dados.map(
                item =>
                    item.sentimentScore
            ),

            dados.map(
                item =>
                    item.retornoPercentual
            )

        );


    const correlacaoNoticiasRetorno =

        calcularCorrelacao(

            dados.map(
                item =>
                    item.noticias
            ),

            dados.map(
                item =>
                    item.retornoPercentual
            )

        );


    const correlacaoSentimentoVolatilidade =

        calcularCorrelacao(

            dados.map(
                item =>
                    item.sentimentScore
            ),

            dados.map(
                item =>
                    item.volatilidade
            )

        );


    return {

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

        direcaoNoticiasRetorno:

            interpretarDirecao(
                correlacaoNoticiasRetorno
            ),


        correlacaoSentimentoVolatilidade,

        interpretacaoSentimentoVolatilidade:

            interpretarCorrelacao(
                correlacaoSentimentoVolatilidade
            ),

        direcaoSentimentoVolatilidade:

            interpretarDirecao(
                correlacaoSentimentoVolatilidade
            )

    };

}


/*
|--------------------------------------------------------------------------
| ANÁLISE NARRATIVAS × PREÇO
|--------------------------------------------------------------------------
*/

function analisarNarrativasPreco(
    serie
) {

    return NARRATIVAS.map(
        narrativa => {

            const dados =
                serie.map(
                    item => {

                        const dadosNarrativa =
                            item.narrativas[
                                narrativa
                            ];


                        return {

                            intensidade:
                                dadosNarrativa
                                    ?.intensidade ||
                                0,

                            retorno:
                                item.retornoPercentual,

                            volatilidade:
                                item.volatilidade,

                            sentimento:
                                dadosNarrativa
                                    ?.sentimentScore ||
                                0,

                            noticias:
                                dadosNarrativa
                                    ?.total ||
                                0

                        };

                    }
                );


            const dadosComRetorno =
                dados.filter(
                    item =>
                        item.retorno !==
                        null
                );


            const diasComNarrativa =
                dados.filter(
                    item =>
                        item.intensidade >
                        0
                );


            const totalNoticias =
                dados.reduce(

                    (
                        soma,
                        item
                    ) =>

                        soma +
                        item.noticias,

                    0

                );


            const mediaRetorno =
                calcularMedia(

                    diasComNarrativa.map(
                        item =>
                            item.retorno
                    )
                        .filter(
                            valor =>
                                valor !==
                                null
                        )

                );


            const mediaVolatilidade =
                calcularMedia(

                    diasComNarrativa.map(
                        item =>
                            item.volatilidade
                    )

                );


            const correlacaoIntensidadeRetorno =

                calcularCorrelacao(

                    dadosComRetorno.map(
                        item =>
                            item.intensidade
                    ),

                    dadosComRetorno.map(
                        item =>
                            item.retorno
                    )

                );


            const correlacaoIntensidadeVolatilidade =

                calcularCorrelacao(

                    dadosComRetorno.map(
                        item =>
                            item.intensidade
                    ),

                    dadosComRetorno.map(
                        item =>
                            item.volatilidade
                    )

                );


            const correlacaoIntensidadeSentimento =

                calcularCorrelacao(

                    dados.map(
                        item =>
                            item.intensidade
                    ),

                    dados.map(
                        item =>
                            item.sentimento
                    )

                );


            return {

                narrativa,

                diasAnalisados:
                    serie.length,

                diasComNarrativa:
                    diasComNarrativa.length,

                totalNoticias,

                mediaRetorno:
                    Number(
                        mediaRetorno.toFixed(4)
                    ),

                mediaVolatilidade:
                    Number(
                        mediaVolatilidade.toFixed(4)
                    ),

                correlacaoIntensidadeRetorno,

                interpretacaoIntensidadeRetorno:

                    interpretarCorrelacao(
                        correlacaoIntensidadeRetorno
                    ),

                direcaoIntensidadeRetorno:

                    interpretarDirecao(
                        correlacaoIntensidadeRetorno
                    ),


                correlacaoIntensidadeVolatilidade,

                interpretacaoIntensidadeVolatilidade:

                    interpretarCorrelacao(
                        correlacaoIntensidadeVolatilidade
                    ),

                direcaoIntensidadeVolatilidade:

                    interpretarDirecao(
                        correlacaoIntensidadeVolatilidade
                    ),


                correlacaoIntensidadeSentimento,

                interpretacaoIntensidadeSentimento:

                    interpretarCorrelacao(
                        correlacaoIntensidadeSentimento
                    ),

                direcaoIntensidadeSentimento:

                    interpretarDirecao(
                        correlacaoIntensidadeSentimento
                    )

            };

        }
    );

}


/*
|--------------------------------------------------------------------------
| ANÁLISE DE DEFASAGENS
|--------------------------------------------------------------------------
*/

function analisarDefasagens(
    serie
) {

    const resultado = [];


    DEFASAGENS.forEach(
        dias => {

            const narrativas = [];


            NARRATIVAS.forEach(
                narrativa => {

                    const intensidades = [];

                    const retornosFuturos = [];


                    for (

                        let i = 0;

                        i <
                        serie.length - dias;

                        i++

                    ) {

                        const atual =
                            serie[i];


                        const futuro =
                            serie[
                                i + dias
                            ];


                        const narrativaAtual =
                            atual.narrativas[
                                narrativa
                            ];


                        intensidades.push(

                            narrativaAtual
                                ?.intensidade ||
                            0

                        );


                        retornosFuturos.push(

                            futuro.retornoPercentual

                        );

                    }


                    const pares = [];


                    for (

                        let i = 0;

                        i <
                        intensidades.length;

                        i++

                    ) {

                        if (

                            retornosFuturos[i] !==
                            null

                        ) {

                            pares.push({

                                intensidade:
                                    intensidades[i],

                                retorno:
                                    retornosFuturos[i]

                            });

                        }

                    }


                    const correlacao =

                        calcularCorrelacao(

                            pares.map(
                                item =>
                                    item.intensidade
                            ),

                            pares.map(
                                item =>
                                    item.retorno
                            )

                        );


                    narrativas.push({

                        narrativa,

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


            resultado.push({

                dias,

                narrativas

            });

        }
    );


    return resultado;

}


/*
|--------------------------------------------------------------------------
| VOLATILIDADE POR NARRATIVA
|--------------------------------------------------------------------------
*/

function analisarVolatilidadeNarrativas(
    serie
) {

    return NARRATIVAS.map(
        narrativa => {

            const dados =
                serie.filter(
                    item =>

                        (
                            item.narrativas[
                                narrativa
                            ]?.intensidade ||
                            0
                        ) > 0

                );


            const volatilidades =
                dados.map(
                    item =>
                        item.volatilidade
                );


            const retornos =
                dados

                    .map(
                        item =>
                            item.retornoPercentual
                    )

                    .filter(
                        valor =>
                            valor !==
                            null
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
                    dados.length,

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
    periodo,
    periodoPreco = "30d"
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
        await executarComLimite(

            moedas,

            3,

            async coin => {

                const symbol =

                    String(
                        coin.symbol ||
                        ""
                    )
                        .toUpperCase();


                const prices =

                    await obterHistoricoPreco(

                        coin.coinId,

                        periodoPreco

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
                                    valor !==
                                    null

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

                        ?

                        dadosComPreco[0].price

                        :

                        0;


                const ultimoPreco =

                    dadosComPreco.length

                        ?

                        dadosComPreco[
                            dadosComPreco.length - 1
                        ].price

                        :

                        0;


                let variacaoPeriodo =
                    0;


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
                            coin.price ||
                            0
                        ),


                    precoInicialPeriodo:

                        Number(

                            primeiroPreco
                                .toFixed(8)

                        ),


                    precoFinalPeriodo:

                        Number(

                            ultimoPreco
                                .toFixed(8)

                        ),


                    variacaoPeriodo:

                        Number(

                            variacaoPeriodo
                                .toFixed(4)

                        ),


                    totalNoticias,


                    sentimentoMedio:

                        Number(

                            sentimentoMedio
                                .toFixed(4)

                        ),


                    retornoMedioDiario:

                        Number(

                            retornoMedio
                                .toFixed(4)

                        ),


                    volatilidadeMedia:

                        Number(

                            volatilidadeMedia
                                .toFixed(4)

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

        );


    return resultados;

}


/*
|--------------------------------------------------------------------------
| RESUMO GLOBAL DA RELAÇÃO NARRATIVA × PREÇO
|--------------------------------------------------------------------------
*/

function obterResumoRelacaoPreco(
    analises
) {

    if (
        !analises.length
    ) {

        return {

            moedasAnalisadas:
                0,

            totalNoticiasRelacionadas:
                0,

            correlacaoMediaSentimentoRetorno:
                0,

            correlacaoMediaNoticiasRetorno:
                0,

            volatilidadeMedia:
                0

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
| ANÁLISE OTIMIZADA PARA A PÁGINA NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| Esta versão não executa todas as análises históricas da página geral.
|
| Ela busca somente:
|
| - notícias do período selecionado;
| - moedas selecionadas;
| - histórico de preço compatível com o período;
| - relação narrativa × preço.
|
*/

async function obterAnaliseNarrativaPreco(

    periodoSolicitado =
        "30d",

    ativoSolicitado =
        "all"

) {

    const periodoChave =

        normalizarPeriodoAnalise(

            periodoSolicitado

        );


    const ativo =

        normalizarAtivo(

            ativoSolicitado

        );


    console.log(

        "=============================================="

    );


    console.log(

        "INICIANDO ANÁLISE NARRATIVA × PREÇO OTIMIZADA"

    );


    console.log(

        `Período: ${periodoChave} | Ativo: ${ativo}`

    );


    console.log(

        "=============================================="

    );


    const periodo =

        await obterPeriodoAnalise(

            periodoChave

        );


    if (

        !periodo.inicio ||

        !periodo.fim

    ) {

        return {

            geradoEm:
                new Date(),

            filtros: {

                periodo:
                    periodoChave,

                ativo

            },

            resumo: {

                totalNoticias:
                    0,

                periodo,

                quantidadeNarrativas:
                    NARRATIVAS.length

            },

            resumoPreco:

                obterResumoRelacaoPreco(
                    []
                ),

            sentimentoPreco:
                [],

            relacaoNarrativaPreco:
                [],

            volatilidadeNarrativa:
                [],

            defasagemNarrativa:
                [],

            analisePorMoeda:
                []

        };

    }


    /*
    |--------------------------------------------------------------------------
    | NOTÍCIAS DO PERÍODO
    |--------------------------------------------------------------------------
    */

    const noticiasDiarias =

        await obterNoticiasDiarias(

            periodo.inicio,

            periodo.fim

        );


    /*
    |--------------------------------------------------------------------------
    | MOEDAS
    |--------------------------------------------------------------------------
    |
    | Busca somente os campos necessários.
    |
    */

    const moedas =

        await Coin.find()

            .select({

                coinId:
                    1,

                name:
                    1,

                symbol:
                    1,

                price:
                    1,

                marketCap:
                    1

            })

            .sort({

                marketCap:
                    -1

            })

            .lean();


    const moedasSelecionadas =

        filtrarMoedasPorAtivo(

            moedas,

            ativo

        );


    console.log(

        `Notícias agregadas: ${noticiasDiarias.length}`

    );


    console.log(

        `Moedas selecionadas: ${moedasSelecionadas.length}`

    );


    /*
    |--------------------------------------------------------------------------
    | ANÁLISE DE PREÇOS
    |--------------------------------------------------------------------------
    |
    | Apenas 3 requisições externas simultâneas.
    |
    */

    const analisePorMoeda =

        await obterAnalisePorMoeda(

            moedasSelecionadas,

            noticiasDiarias,

            periodo,

            periodoChave

        );


    const resumoPreco =

        obterResumoRelacaoPreco(

            analisePorMoeda

        );


    const relacaoNarrativaPreco =
        [];


    const sentimentoPreco =
        [];


    const volatilidadeNarrativa =
        [];


    const defasagemNarrativa =
        [];


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


    const totalNoticias =

        noticiasDiarias.reduce(

            (
                soma,
                item
            ) =>

                soma +
                Number(
                    item.total || 0
                ),

            0

        );


    console.log(

        `Moedas analisadas: ${analisePorMoeda.length}`

    );


    console.log(

        "ANÁLISE NARRATIVA × PREÇO OTIMIZADA CONCLUÍDA"

    );


    return {

        geradoEm:
            new Date(),


        filtros: {

            periodo:
                periodoChave,

            ativo

        },


        resumo: {

            totalNoticias,

            periodo,

            quantidadeNarrativas:
                NARRATIVAS.length

        },


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
| ANÁLISE COMPLETA
|--------------------------------------------------------------------------
|
| Mantida para não quebrar a página de análise geral.
|
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

                marketCap:
                    -1

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

            periodo,

            "30d"

        );


    console.log(

        `Moedas analisadas: ${analisePorMoeda.length}`

    );


    const resumoPreco =

        obterResumoRelacaoPreco(

            analisePorMoeda

        );


    const relacaoNarrativaPreco =
        [];


    const sentimentoPreco =
        [];


    const volatilidadeNarrativa =
        [];


    const defasagemNarrativa =
        [];


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

    obterAnaliseCompleta,

    obterAnaliseNarrativaPreco

};
