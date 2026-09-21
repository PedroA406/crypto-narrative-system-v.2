const Post = require("../models/Post");


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
| OBTER PERÍODO
|--------------------------------------------------------------------------
|
| O eixo temporal da análise é publishedAt.
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

    const resultado =
        await Post.aggregate([

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

    const resultado =
        await Post.aggregate([

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

    const resultado =
        await Post.aggregate([

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
|
| Agrupamento mensal baseado em publishedAt.
|
| Usamos ano + mês para evitar misturar
| meses de anos diferentes.
|
*/

async function obterEvolucaoTemporal() {

    const resultado =
        await Post.aggregate([

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

    const resultado =
        await Post.aggregate([

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

    const resultado =
        await Post.aggregate([

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

    const resultado =
        await Post.aggregate([

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
|
| createdAt:
| momento em que o documento entrou no MongoDB.
|
| publishedAt:
| momento original de publicação.
|
| Latência:
|
| createdAt - publishedAt
|
| Resultado em minutos, horas e dias.
|
*/

async function obterLatenciaColeta() {

    const resultado =
        await Post.aggregate([

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
| ANÁLISE COMPLETA
|--------------------------------------------------------------------------
*/

async function obterAnaliseCompleta() {

    const [

        totalNoticias,

        periodo,

        narrativas,

        confianca,

        sentimentos,

        evolucaoTemporal,

        narrativaSentimento,

        narrativaMoeda,

        concordancia,

        latenciaColeta

    ] = await Promise.all([

        obterTotalNoticias(),

        obterPeriodo(),

        obterDistribuicaoNarrativas(),

        obterConfiancaMedia(),

        obterDistribuicaoSentimentos(),

        obterEvolucaoTemporal(),

        obterNarrativaSentimento(),

        obterNarrativaMoeda(),

        obterConcordancia(),

        obterLatenciaColeta()

    ]);


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

        latenciaColeta

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