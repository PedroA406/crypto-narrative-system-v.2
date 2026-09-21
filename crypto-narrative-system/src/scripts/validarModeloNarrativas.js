const fs = require("fs");
const path = require("path");

/*
============================================================
VALIDAÇÃO CRUZADA DO MODELO DE NARRATIVAS
============================================================

Objetivo:

Avaliar a estabilidade do classificador de narrativas
utilizando validação cruzada estratificada em 5 folds.

IMPORTANTE:

- Não altera MongoDB.
- Não altera as notícias.
- Não altera os datasets existentes.
- Não altera o modelo salvo.
- Gera apenas um relatório.
- Cada fold possui dados de treino e validação separados.

Modelo:

TF-IDF + Logistic Regression

Classes:

adoption
general
institutional_investment
market
mining
regulation
security
technology

============================================================
*/


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const CAMINHO_DATASET =
    path.join(
        process.cwd(),
        "dataset",
        "dataset_treino.json"
    );

const CAMINHO_RELATORIO =
    path.join(
        process.cwd(),
        "dataset",
        "relatorio_validacao_cruzada.json"
    );

const NUM_FOLDS = 5;

const MAX_FEATURES = 10000;

const MIN_DOCUMENT_FREQUENCY = 3;

const MAX_DOCUMENT_FREQUENCY_RATIO = 0.95;

const EPOCHS = 12;

const LEARNING_RATE = 0.08;

const REGULARIZACAO = 0.00005;


/* ============================================================
   STOPWORDS
   ============================================================ */

const STOPWORDS = new Set([
    "a",
    "about",
    "above",
    "after",
    "again",
    "against",
    "all",
    "am",
    "an",
    "and",
    "any",
    "are",
    "as",
    "at",
    "be",
    "because",
    "been",
    "before",
    "being",
    "below",
    "between",
    "both",
    "but",
    "by",
    "can",
    "could",
    "did",
    "do",
    "does",
    "doing",
    "down",
    "during",
    "each",
    "few",
    "for",
    "from",
    "further",
    "had",
    "has",
    "have",
    "having",
    "he",
    "her",
    "here",
    "hers",
    "herself",
    "him",
    "himself",
    "his",
    "how",
    "i",
    "if",
    "in",
    "into",
    "is",
    "it",
    "its",
    "itself",
    "just",
    "me",
    "more",
    "most",
    "my",
    "myself",
    "no",
    "nor",
    "not",
    "now",
    "of",
    "off",
    "on",
    "once",
    "only",
    "or",
    "other",
    "our",
    "ours",
    "ourselves",
    "out",
    "over",
    "own",
    "same",
    "she",
    "should",
    "so",
    "some",
    "such",
    "than",
    "that",
    "the",
    "their",
    "theirs",
    "them",
    "themselves",
    "then",
    "there",
    "these",
    "they",
    "this",
    "those",
    "through",
    "to",
    "too",
    "under",
    "until",
    "up",
    "very",
    "was",
    "we",
    "were",
    "what",
    "when",
    "where",
    "which",
    "while",
    "who",
    "whom",
    "why",
    "will",
    "with",
    "would",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves"
]);


/* ============================================================
   CARREGAR JSON
   ============================================================ */

function carregarJSON(caminho) {

    if (!fs.existsSync(caminho)) {

        throw new Error(
            `Arquivo não encontrado: ${caminho}`
        );
    }

    return JSON.parse(
        fs.readFileSync(
            caminho,
            "utf8"
        )
    );
}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }

    let resultado =
        String(texto);

    resultado =
        resultado.toLowerCase();

    resultado =
        resultado.replace(
            /<[^>]*>/g,
            " "
        );

    resultado =
        resultado.replace(
            /https?:\/\/\S+|www\.\S+/g,
            " "
        );

    resultado =
        resultado.replace(
            /&[a-zA-Z0-9#]+;/g,
            " "
        );

    resultado =
        resultado.replace(
            /[^a-z0-9]+/g,
            " "
        );

    resultado =
        resultado.replace(
            /\s+/g,
            " "
        );

    return resultado.trim();
}


/* ============================================================
   TOKENIZAÇÃO
   ============================================================ */

function tokenizar(texto) {

    const normalizado =
        normalizarTexto(texto);

    if (!normalizado) {
        return [];
    }

    const partes =
        normalizado.split(" ");

    const tokens = [];

    for (const palavra of partes) {

        if (!palavra) {
            continue;
        }

        if (palavra.length < 2) {
            continue;
        }

        if (STOPWORDS.has(palavra)) {
            continue;
        }

        tokens.push(palavra);
    }

    return tokens;
}


/* ============================================================
   OBTER CLASSES
   ============================================================ */

function obterClasses(dataset) {

    const conjunto =
        new Set();

    for (const documento of dataset) {

        if (documento.narrative) {

            conjunto.add(
                documento.narrative
            );
        }
    }

    return Array.from(conjunto)
        .sort();
}


/* ============================================================
   EMBARALHAMENTO DETERMINÍSTICO
   ============================================================ */

function criarGeradorAleatorio(seed) {

    return function () {

        let x =
            Math.sin(seed++) *
            10000;

        return x -
            Math.floor(x);
    };
}


/* ============================================================
   DIVISÃO ESTRATIFICADA
   ============================================================ */

function criarFolds(
    dataset,
    numeroFolds
) {

    const grupos = {};

    for (const documento of dataset) {

        const classe =
            documento.narrative;

        if (!grupos[classe]) {

            grupos[classe] = [];
        }

        grupos[classe].push(
            documento
        );
    }


    const aleatorio =
        criarGeradorAleatorio(20260917);


    /*
    ------------------------------------------------------------
    EMBARALHAR CADA CLASSE
    ------------------------------------------------------------
    */

    for (
        const classe
        of Object.keys(grupos)
    ) {

        const lista =
            grupos[classe];

        for (
            let i = lista.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    aleatorio() *
                    (i + 1)
                );

            const temporario =
                lista[i];

            lista[i] =
                lista[j];

            lista[j] =
                temporario;
        }
    }


    /*
    ------------------------------------------------------------
    DISTRIBUIR DE FORMA ESTRATIFICADA
    ------------------------------------------------------------
    */

    const folds =
        Array.from(
            {
                length:
                    numeroFolds
            },
            () => []
        );


    for (
        const classe
        of Object.keys(grupos)
    ) {

        const lista =
            grupos[classe];

        for (
            let i = 0;
            i < lista.length;
            i++
        ) {

            const indiceFold =
                i % numeroFolds;

            folds[indiceFold]
                .push(
                    lista[i]
                );
        }
    }


    /*
    ------------------------------------------------------------
    EMBARALHAR CADA FOLD
    ------------------------------------------------------------
    */

    for (const fold of folds) {

        for (
            let i = fold.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    aleatorio() *
                    (i + 1)
                );

            const temporario =
                fold[i];

            fold[i] =
                fold[j];

            fold[j] =
                temporario;
        }
    }


    return folds;
}


/* ============================================================
   CONSTRUIR VOCABULÁRIO
   ============================================================ */

function construirVocabulario(
    documentos
) {

    const frequenciaDocumentos =
        new Map();


    /*
    ------------------------------------------------------------
    CONTAR EM QUANTOS DOCUMENTOS CADA PALAVRA APARECE
    ------------------------------------------------------------
    */

    for (const documento of documentos) {

        const tokens =
            tokenizar(
                documento.text
            );

        const palavrasDocumento =
            new Set(tokens);


        for (
            const palavra
            of palavrasDocumento
        ) {

            frequenciaDocumentos.set(
                palavra,
                (
                    frequenciaDocumentos.get(
                        palavra
                    ) || 0
                ) + 1
            );
        }
    }


    const totalDocumentos =
        documentos.length;


    const limiteMaximo =
        totalDocumentos *
        MAX_DOCUMENT_FREQUENCY_RATIO;


    const candidatos = [];


    for (
        const [
            palavra,
            frequencia
        ]
        of frequenciaDocumentos
    ) {

        if (
            frequencia <
            MIN_DOCUMENT_FREQUENCY
        ) {

            continue;
        }

        if (
            frequencia >
            limiteMaximo
        ) {

            continue;
        }


        candidatos.push({

            palavra,

            frequencia

        });
    }


    /*
    ------------------------------------------------------------
    ORDENAR POR FREQUÊNCIA
    ------------------------------------------------------------
    */

    candidatos.sort(
        (a, b) =>
            b.frequencia -
            a.frequencia
    );


    /*
    ------------------------------------------------------------
    LIMITAR VOCABULÁRIO
    ------------------------------------------------------------
    */

    const selecionados =
        candidatos.slice(
            0,
            MAX_FEATURES
        );


    const mapa =
        new Map();


    for (
        let i = 0;
        i < selecionados.length;
        i++
    ) {

        mapa.set(
            selecionados[i].palavra,
            i
        );
    }


    return {

        mapa,

        candidatos: candidatos.length

    };
}


/* ============================================================
   CALCULAR IDF
   ============================================================ */

function calcularIDF(
    documentos,
    vocabulario
) {

    const numeroDocumentos =
        documentos.length;


    const documentFrequency =
        new Array(
            vocabulario.size
        ).fill(0);


    for (const documento of documentos) {

        const tokens =
            tokenizar(
                documento.text
            );


        const palavras =
            new Set();


        for (const token of tokens) {

            if (
                vocabulario.has(token)
            ) {

                palavras.add(token);
            }
        }


        for (
            const palavra
            of palavras
        ) {

            const indice =
                vocabulario.get(
                    palavra
                );

            documentFrequency[indice]++;
        }
    }


    const idf =
        new Array(
            vocabulario.size
        );


    for (
        let i = 0;
        i < vocabulario.size;
        i++
    ) {

        idf[i] =
            Math.log(
                (
                    1 +
                    numeroDocumentos
                ) /
                (
                    1 +
                    documentFrequency[i]
                )
            ) + 1;
    }


    return idf;
}


/* ============================================================
   TRANSFORMAR DOCUMENTO EM TF-IDF
   ============================================================ */

function transformarDocumento(
    documento,
    vocabulario,
    idf
) {

    const tokens =
        tokenizar(
            documento.text
        );


    const frequencias =
        new Map();


    for (const token of tokens) {

        if (
            !vocabulario.has(token)
        ) {

            continue;
        }


        const indice =
            vocabulario.get(
                token
            );


        frequencias.set(
            indice,
            (
                frequencias.get(
                    indice
                ) || 0
            ) + 1
        );
    }


    const vetor =
        new Array(
            idf.length
        ).fill(0);


    for (
        const [
            indice,
            frequencia
        ]
        of frequencias
    ) {

        const tf =
            1 +
            Math.log(
                frequencia
            );


        vetor[indice] =
            tf *
            idf[indice];
    }


    /*
    ------------------------------------------------------------
    NORMALIZAÇÃO L2
    ------------------------------------------------------------
    */

    let somaQuadrados = 0;

    for (const valor of vetor) {

        somaQuadrados +=
            valor * valor;
    }


    const norma =
        Math.sqrt(
            somaQuadrados
        );


    if (norma > 0) {

        for (
            let i = 0;
            i < vetor.length;
            i++
        ) {

            vetor[i] /=
                norma;
        }
    }


    return vetor;
}


/* ============================================================
   TRANSFORMAR DATASET
   ============================================================ */

function transformarDataset(
    documentos,
    vocabulario,
    idf
) {

    const resultado = [];


    for (const documento of documentos) {

        resultado.push({

            vetor:
                transformarDocumento(
                    documento,
                    vocabulario,
                    idf
                ),

            classe:
                documento.narrative

        });
    }


    return resultado;
}


/* ============================================================
   SOFTMAX
   ============================================================ */

function softmax(scores) {

    const maior =
        Math.max(...scores);


    const exponenciais =
        scores.map(
            score =>
                Math.exp(
                    score - maior
                )
        );


    const soma =
        exponenciais.reduce(
            (total, valor) =>
                total + valor,
            0
        );


    return exponenciais.map(
        valor =>
            valor / soma
    );
}


/* ============================================================
   TREINAR REGRESSÃO LOGÍSTICA
   ============================================================ */

function treinarModelo(
    dadosTreino,
    classes,
    numeroCaracteristicas
) {

    const numeroClasses =
        classes.length;


    const pesos =
        Array.from(
            {
                length:
                    numeroClasses
            },
            () =>
                new Array(
                    numeroCaracteristicas
                ).fill(0)
        );


    const bias =
        new Array(
            numeroClasses
        ).fill(0);


    const indiceClasse =
        new Map();


    for (
        let i = 0;
        i < classes.length;
        i++
    ) {

        indiceClasse.set(
            classes[i],
            i
        );
    }


    /*
    ------------------------------------------------------------
    TREINAMENTO
    ------------------------------------------------------------
    */

    for (
        let epoca = 1;
        epoca <= EPOCHS;
        epoca++
    ) {

        let perdaTotal = 0;


        /*
        --------------------------------------------------------
        EMBARALHAR DADOS

        Utilizamos uma cópia para não modificar
        o dataset original.
        --------------------------------------------------------
        */

        const dados =
            dadosTreino.slice();


        const aleatorio =
            criarGeradorAleatorio(
                1000 + epoca
            );


        for (
            let i = dados.length - 1;
            i > 0;
            i--
        ) {

            const j =
                Math.floor(
                    aleatorio() *
                    (i + 1)
                );


            const temporario =
                dados[i];

            dados[i] =
                dados[j];

            dados[j] =
                temporario;
        }


        /*
        --------------------------------------------------------
        GRADIENTE POR DOCUMENTO
        --------------------------------------------------------
        */

        for (const exemplo of dados) {

            const vetor =
                exemplo.vetor;


            const classeCorreta =
                indiceClasse.get(
                    exemplo.classe
                );


            const scores =
                new Array(
                    numeroClasses
                ).fill(0);


            /*
            SCORE
            */

            for (
                let classe = 0;
                classe < numeroClasses;
                classe++
            ) {

                let score =
                    bias[classe];


                const pesoClasse =
                    pesos[classe];


                for (
                    let caracteristica = 0;
                    caracteristica <
                    numeroCaracteristicas;
                    caracteristica++
                ) {

                    const valor =
                        vetor[
                            caracteristica
                        ];


                    if (valor === 0) {
                        continue;
                    }


                    score +=
                        pesoClasse[
                            caracteristica
                        ] *
                        valor;
                }


                scores[classe] =
                    score;
            }


            const probabilidades =
                softmax(
                    scores
                );


            /*
            PERDA CROSS-ENTROPY
            */

            const probabilidadeCorreta =
                Math.max(
                    probabilidades[
                        classeCorreta
                    ],
                    1e-15
                );


            perdaTotal -=
                Math.log(
                    probabilidadeCorreta
                );


            /*
            ----------------------------------------------------
            ATUALIZAÇÃO DOS PESOS
            ----------------------------------------------------
            */

            for (
                let classe = 0;
                classe < numeroClasses;
                classe++
            ) {

                const alvo =
                    classe ===
                    classeCorreta
                        ? 1
                        : 0;


                const erro =
                    probabilidades[
                        classe
                    ] -
                    alvo;


                /*
                Atualizar bias
                */

                bias[classe] -=
                    LEARNING_RATE *
                    erro;


                /*
                Atualizar características
                */

                const pesoClasse =
                    pesos[classe];


                for (
                    let caracteristica = 0;
                    caracteristica <
                    numeroCaracteristicas;
                    caracteristica++
                ) {

                    const valor =
                        vetor[
                            caracteristica
                        ];


                    if (valor === 0) {
                        continue;
                    }


                    const gradiente =
                        (
                            erro *
                            valor
                        ) +
                        (
                            REGULARIZACAO *
                            pesoClasse[
                                caracteristica
                            ]
                        );


                    pesoClasse[
                        caracteristica
                    ] -=
                        LEARNING_RATE *
                        gradiente;
                }
            }
        }


        const perdaMedia =
            perdaTotal /
            dados.length;


        console.log(
            `      Época ${epoca}/${EPOCHS} - perda: ${perdaMedia.toFixed(6)}`
        );
    }


    return {

        pesos,

        bias

    };
}


/* ============================================================
   FAZER PREVISÃO
   ============================================================ */

function prever(
    vetor,
    modelo,
    classes
) {

    const scores =
        new Array(
            classes.length
        ).fill(0);


    for (
        let classe = 0;
        classe < classes.length;
        classe++
    ) {

        let score =
            modelo.bias[classe];


        const pesoClasse =
            modelo.pesos[classe];


        for (
            let i = 0;
            i < vetor.length;
            i++
        ) {

            const valor =
                vetor[i];


            if (valor === 0) {
                continue;
            }


            score +=
                pesoClasse[i] *
                valor;
        }


        scores[classe] =
            score;
    }


    const probabilidades =
        softmax(scores);


    let melhorIndice = 0;


    for (
        let i = 1;
        i < probabilidades.length;
        i++
    ) {

        if (
            probabilidades[i] >
            probabilidades[
                melhorIndice
            ]
        ) {

            melhorIndice = i;
        }
    }


    return {

        indice:
            melhorIndice,

        classe:
            classes[
                melhorIndice
            ],

        confianca:
            probabilidades[
                melhorIndice
            ]

    };
}


/* ============================================================
   MÉTRICAS
   ============================================================ */

function calcularMetricas(
    resultados,
    classes
) {

    const matriz = {};


    for (
        const real
        of classes
    ) {

        matriz[real] = {};


        for (
            const previsto
            of classes
        ) {

            matriz[real][previsto] =
                0;
        }
    }


    for (
        const resultado
        of resultados
    ) {

        matriz[
            resultado.real
        ][
            resultado.previsto
        ]++;
    }


    const metricasClasses = [];


    let somaPrecision = 0;

    let somaRecall = 0;

    let somaF1 = 0;


    for (
        const classe
        of classes
    ) {

        const verdadeiroPositivo =
            matriz[classe][classe];


        let falsoPositivo = 0;

        let falsoNegativo = 0;


        for (
            const outraClasse
            of classes
        ) {

            if (
                outraClasse !==
                classe
            ) {

                falsoPositivo +=
                    matriz[
                        outraClasse
                    ][
                        classe
                    ];


                falsoNegativo +=
                    matriz[
                        classe
                    ][
                        outraClasse
                    ];
            }
        }


        const precision =
            (
                verdadeiroPositivo +
                falsoPositivo
            ) > 0

                ? verdadeiroPositivo /
                  (
                      verdadeiroPositivo +
                      falsoPositivo
                  )

                : 0;


        const recall =
            (
                verdadeiroPositivo +
                falsoNegativo
            ) > 0

                ? verdadeiroPositivo /
                  (
                      verdadeiroPositivo +
                      falsoNegativo
                  )

                : 0;


        const f1 =
            (
                precision +
                recall
            ) > 0

                ? (
                    2 *
                    precision *
                    recall
                ) /
                (
                    precision +
                    recall
                )

                : 0;


        const suporte =
            classes.length > 0
                ? resultados.filter(
                    resultado =>
                        resultado.real ===
                        classe
                ).length
                : 0;


        metricasClasses.push({

            classe,

            suporte,

            precision:
                Number(
                    (
                        precision *
                        100
                    ).toFixed(2)
                ),

            recall:
                Number(
                    (
                        recall *
                        100
                    ).toFixed(2)
                ),

            f1:
                Number(
                    (
                        f1 *
                        100
                    ).toFixed(2)
                )

        });


        somaPrecision +=
            precision;

        somaRecall +=
            recall;

        somaF1 +=
            f1;
    }


    const total =
        resultados.length;


    let acertos = 0;


    for (
        const resultado
        of resultados
    ) {

        if (
            resultado.real ===
            resultado.previsto
        ) {

            acertos++;
        }
    }


    const accuracy =
        total > 0
            ? acertos / total
            : 0;


    return {

        total,

        acertos,

        erros:
            total - acertos,

        accuracy:
            Number(
                (
                    accuracy *
                    100
                ).toFixed(2)
            ),

        macroPrecision:
            Number(
                (
                    (
                        somaPrecision /
                        classes.length
                    ) *
                    100
                ).toFixed(2)
            ),

        macroRecall:
            Number(
                (
                    (
                        somaRecall /
                        classes.length
                    ) *
                    100
                ).toFixed(2)
            ),

        macroF1:
            Number(
                (
                    (
                        somaF1 /
                        classes.length
                    ) *
                    100
                ).toFixed(2)
            ),

        porClasse:
            metricasClasses,

        matriz

    };
}


/* ============================================================
   EXECUTAR UM FOLD
   ============================================================ */

function executarFold(
    numeroFold,
    folds,
    classes
) {

    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        `FOLD ${numeroFold}/${NUM_FOLDS}`
    );

    console.log(
        "============================================================"
    );


    /*
    ------------------------------------------------------------
    CRIAR TREINO E VALIDAÇÃO
    ------------------------------------------------------------
    */

    const validacao =
        folds[
            numeroFold - 1
        ];


    const treino = [];


    for (
        let i = 0;
        i < folds.length;
        i++
    ) {

        if (
            i ===
            numeroFold - 1
        ) {

            continue;
        }


        treino.push(
            ...folds[i]
        );
    }


    console.log(
        `Treino: ${treino.length}`
    );

    console.log(
        `Validação: ${validacao.length}`
    );


    /*
    ------------------------------------------------------------
    VOCABULÁRIO

    IMPORTANTE:

    O vocabulário é construído somente
    com os dados de treinamento do fold.

    Isso evita vazamento de dados.
    ------------------------------------------------------------
    */

    console.log(
        "Construindo vocabulário..."
    );


    const vocabulario =
        construirVocabulario(
            treino
        );


    console.log(
        `Candidatos: ${vocabulario.candidatos}`
    );

    console.log(
        `Vocabulário final: ${vocabulario.mapa.size}`
    );


    /*
    ------------------------------------------------------------
    IDF
    ------------------------------------------------------------
    */

    console.log(
        "Calculando IDF..."
    );


    const idf =
        calcularIDF(
            treino,
            vocabulario.mapa
        );


    /*
    ------------------------------------------------------------
    TRANSFORMAR TREINO
    ------------------------------------------------------------
    */

    console.log(
        "Transformando dados de treino..."
    );


    const dadosTreino =
        transformarDataset(
            treino,
            vocabulario.mapa,
            idf
        );


    /*
    ------------------------------------------------------------
    TRANSFORMAR VALIDAÇÃO
    ------------------------------------------------------------
    */

    console.log(
        "Transformando dados de validação..."
    );


    const dadosValidacao =
        transformarDataset(
            validacao,
            vocabulario.mapa,
            idf
        );


    /*
    ------------------------------------------------------------
    TREINAR
    ------------------------------------------------------------
    */

    console.log(
        "Treinando Logistic Regression..."
    );


    const modelo =
        treinarModelo(
            dadosTreino,
            classes,
            vocabulario.mapa.size
        );


    /*
    ------------------------------------------------------------
    PREDIÇÕES
    ------------------------------------------------------------
    */

    console.log(
        "Executando validação..."
    );


    const resultados = [];


    for (
        let i = 0;
        i < dadosValidacao.length;
        i++
    ) {

        const exemplo =
            dadosValidacao[i];


        const previsao =
            prever(
                exemplo.vetor,
                modelo,
                classes
            );


        resultados.push({

            real:
                exemplo.classe,

            previsto:
                previsao.classe,

            confianca:
                previsao.confianca

        });
    }


    /*
    ------------------------------------------------------------
    MÉTRICAS
    ------------------------------------------------------------
    */

    const metricas =
        calcularMetricas(
            resultados,
            classes
        );


    console.log("");

    console.log(
        `Accuracy: ${metricas.accuracy}%`
    );

    console.log(
        `Macro Precision: ${metricas.macroPrecision}%`
    );

    console.log(
        `Macro Recall: ${metricas.macroRecall}%`
    );

    console.log(
        `Macro F1: ${metricas.macroF1}%`
    );


    return {

        fold:
            numeroFold,

        tamanhoTreino:
            treino.length,

        tamanhoValidacao:
            validacao.length,

        candidatosVocabulario:
            vocabulario.candidatos,

        tamanhoVocabulario:
            vocabulario.mapa.size,

        metricas

    };
}


/* ============================================================
   MÉDIA
   ============================================================ */

function calcularMedia(
    resultadosFolds
) {

    const campos = [
        "accuracy",
        "macroPrecision",
        "macroRecall",
        "macroF1"
    ];


    const media = {};

    const desvio = {};


    for (
        const campo
        of campos
    ) {

        const valores =
            resultadosFolds.map(
                fold =>
                    fold.metricas[
                        campo
                    ]
            );


        const soma =
            valores.reduce(
                (
                    total,
                    valor
                ) =>
                    total + valor,
                0
            );


        const mediaCampo =
            soma /
            valores.length;


        media[campo] =
            Number(
                mediaCampo.toFixed(2)
            );


        /*
        --------------------------------------------------------
        DESVIO PADRÃO
        --------------------------------------------------------
        */

        const somaQuadrados =
            valores.reduce(
                (
                    total,
                    valor
                ) =>
                    total +
                    Math.pow(
                        valor -
                        mediaCampo,
                        2
                    ),
                0
            );


        const variancia =
            somaQuadrados /
            valores.length;


        desvio[campo] =
            Number(
                Math.sqrt(
                    variancia
                ).toFixed(2)
            );
    }


    return {

        media,

        desvioPadrao:
            desvio

    };
}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

function executar() {

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "VALIDAÇÃO CRUZADA - NARRATIVAS"
    );
    console.log(
        "============================================================"
    );
    console.log("");


    /*
    ------------------------------------------------------------
    CARREGAR DATASET
    ------------------------------------------------------------
    */

    console.log(
        "Carregando dataset..."
    );


    const dataset =
        carregarJSON(
            CAMINHO_DATASET
        );


    console.log(
        `Registros carregados: ${dataset.length}`
    );


    /*
    ------------------------------------------------------------
    VERIFICAR CLASSES
    ------------------------------------------------------------
    */

    const classes =
        obterClasses(
            dataset
        );


    console.log("");

    console.log(
        `Classes encontradas: ${classes.join(", ")}`
    );


    /*
    ------------------------------------------------------------
    CRIAR FOLDS
    ------------------------------------------------------------
    */

    console.log("");

    console.log(
        `Criando ${NUM_FOLDS} folds estratificados...`
    );


    const folds =
        criarFolds(
            dataset,
            NUM_FOLDS
        );


    for (
        let i = 0;
        i < folds.length;
        i++
    ) {

        console.log(
            `Fold ${i + 1}: ${folds[i].length} registros`
        );
    }


    /*
    ------------------------------------------------------------
    EXECUTAR FOLDS
    ------------------------------------------------------------
    */

    const resultadosFolds = [];


    const inicio =
        Date.now();


    for (
        let i = 0;
        i < NUM_FOLDS;
        i++
    ) {

        const resultado =
            executarFold(
                i + 1,
                folds,
                classes
            );


        resultadosFolds.push(
            resultado
        );
    }


    /*
    ------------------------------------------------------------
    MÉDIA FINAL
    ------------------------------------------------------------
    */

    const resumo =
        calcularMedia(
            resultadosFolds
        );


    const tempoSegundos =
        (
            Date.now() -
            inicio
        ) / 1000;


    /*
    ------------------------------------------------------------
    RELATÓRIO
    ------------------------------------------------------------
    */

    const relatorio = {

        geradoEm:
            new Date().toISOString(),

        metodologia: {

            modelo:
                "TF-IDF + Logistic Regression",

            validacao:
                "5-fold cross-validation estratificada",

            numeroFolds:
                NUM_FOLDS,

            totalDocumentos:
                dataset.length,

            classes,

            configuracao: {

                maxFeatures:
                    MAX_FEATURES,

                minDocumentFrequency:
                    MIN_DOCUMENT_FREQUENCY,

                maxDocumentFrequencyRatio:
                    MAX_DOCUMENT_FREQUENCY_RATIO,

                epochs:
                    EPOCHS,

                learningRate:
                    LEARNING_RATE,

                regularizacao:
                    REGULARIZACAO

            }

        },


        folds:
            resultadosFolds,


        resumoFinal: {

            media:
                resumo.media,

            desvioPadrao:
                resumo.desvioPadrao

        },


        tempoExecucaoSegundos:
            Number(
                tempoSegundos.toFixed(2)
            )

    };


    fs.writeFileSync(
        CAMINHO_RELATORIO,
        JSON.stringify(
            relatorio,
            null,
            2
        ),
        "utf8"
    );


    /*
    ============================================================
    RESULTADO FINAL
    ============================================================
    */

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "RESULTADO FINAL DA VALIDAÇÃO CRUZADA"
    );
    console.log(
        "============================================================"
    );


    console.log("");

    console.log(
        `Accuracy média: ${resumo.media.accuracy}%`
    );

    console.log(
        `Desvio padrão Accuracy: ±${resumo.desvioPadrao.accuracy}%`
    );


    console.log("");

    console.log(
        `Macro Precision média: ${resumo.media.macroPrecision}%`
    );

    console.log(
        `Desvio padrão Macro Precision: ±${resumo.desvioPadrao.macroPrecision}%`
    );


    console.log("");

    console.log(
        `Macro Recall média: ${resumo.media.macroRecall}%`
    );

    console.log(
        `Desvio padrão Macro Recall: ±${resumo.desvioPadrao.macroRecall}%`
    );


    console.log("");

    console.log(
        `Macro F1 média: ${resumo.media.macroF1}%`
    );

    console.log(
        `Desvio padrão Macro F1: ±${resumo.desvioPadrao.macroF1}%`
    );


    console.log("");

    console.log(
        `Tempo de execução: ${tempoSegundos.toFixed(2)} segundos`
    );


    console.log("");

    console.log(
        "============================================================"
    );
    console.log(
        "ARQUIVO GERADO"
    );
    console.log(
        "============================================================"
    );


    console.log(
        CAMINHO_RELATORIO
    );


    console.log("");
}


/* ============================================================
   EXECUTAR
   ============================================================ */

try {

    executar();

} catch (erro) {

    console.error("");
    console.error(
        "============================================================"
    );

    console.error(
        "ERRO DURANTE A VALIDAÇÃO"
    );

    console.error(
        "============================================================"
    );

    console.error(
        erro.message
    );

    console.error("");

    process.exit(1);
}