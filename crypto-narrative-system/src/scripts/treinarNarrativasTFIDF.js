const fs = require("fs");
const path = require("path");


/*
============================================================
 TF-IDF + REGRESSÃO LOGÍSTICA MULTICLASSES
 Crypto Narrative System
============================================================

OBJETIVO:

Classificar automaticamente a narrativa de uma notícia
a partir do seu texto.

Entrada:
    documento.text

Alvo:
    documento.narrative

IMPORTANTE:

- Não altera MongoDB.
- Usa somente os datasets já preparados.
- TF-IDF é construído SOMENTE com o treinamento.
- O teste nunca participa da construção do vocabulário.
- Regressão Logística Multiclasses via Softmax.
- Gera métricas e matriz de confusão.
============================================================
*/


/* ============================================================
   CAMINHOS
   ============================================================ */

const DATASET_DIR =
    path.join(
        process.cwd(),
        "dataset"
    );


const ARQUIVO_TREINO =
    path.join(
        DATASET_DIR,
        "dataset_treino.json"
    );


const ARQUIVO_TESTE =
    path.join(
        DATASET_DIR,
        "dataset_teste.json"
    );


const ARQUIVO_RELATORIO =
    path.join(
        DATASET_DIR,
        "relatorio_tfidf_logistic.json"
    );


const ARQUIVO_MODELO =
    path.join(
        DATASET_DIR,
        "modelo_tfidf_logistic.json"
    );


/* ============================================================
   CONFIGURAÇÕES TF-IDF
   ============================================================ */

const MIN_DOCUMENT_FREQUENCY = 3;

const MAX_DOCUMENT_FREQUENCY_RATIO = 0.95;

const MAX_FEATURES = 10000;


/* ============================================================
   CONFIGURAÇÕES DA REGRESSÃO LOGÍSTICA
   ============================================================ */

const EPOCHS = 12;

const LEARNING_RATE = 0.08;

const REGULARIZATION = 0.00005;


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
    "with",
    "would",
    "you",
    "your",
    "yours",
    "yourself",
    "yourselves"

]);


/* ============================================================
   NORMALIZAÇÃO DO TEXTO
   ============================================================ */

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }


    return String(texto)

        .toLowerCase()

        .replace(
            /<[^>]*>/g,
            " "
        )

        .replace(
            /https?:\/\/\S+/g,
            " "
        )

        .replace(
            /www\.\S+/g,
            " "
        )

        .replace(
            /&[a-z]+;/gi,
            " "
        )

        .replace(
            /[^a-z0-9\s]/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


/* ============================================================
   TOKENIZAÇÃO
   ============================================================ */

function tokenizar(texto) {

    const normalizado =
        normalizarTexto(
            texto
        );


    if (!normalizado) {
        return [];
    }


    return normalizado

        .split(" ")

        .filter(
            token => {

                if (!token) {
                    return false;
                }


                if (
                    STOPWORDS.has(token)
                ) {
                    return false;
                }


                if (
                    token.length < 2
                ) {
                    return false;
                }


                return true;
            }
        );
}


/* ============================================================
   CARREGAR JSON
   ============================================================ */

function carregarJSON(
    arquivo
) {

    if (
        !fs.existsSync(
            arquivo
        )
    ) {

        throw new Error(
            `Arquivo não encontrado: ${arquivo}`
        );
    }


    return JSON.parse(
        fs.readFileSync(
            arquivo,
            "utf8"
        )
    );
}


/* ============================================================
   VALIDAR DATASET
   ============================================================ */

function validarDataset(
    documentos,
    nome
) {

    console.log("");

    console.log(
        `Validando dataset: ${nome}`
    );


    let problemas = 0;


    for (
        let i = 0;
        i < documentos.length;
        i++
    ) {

        const documento =
            documentos[i];


        if (
            !documento.text ||
            typeof documento.text !== "string"
        ) {

            console.log(
                `Documento ${i} sem texto válido.`
            );

            problemas++;
        }


        if (
            !documento.narrative ||
            typeof documento.narrative !== "string"
        ) {

            console.log(
                `Documento ${i} sem narrative válido.`
            );

            problemas++;
        }
    }


    if (
        problemas > 0
    ) {

        throw new Error(
            `Dataset ${nome} possui ${problemas} problemas.`
        );
    }


    console.log(
        `Dataset ${nome}: OK`
    );
}


/* ============================================================
   OBTER CLASSES
   ============================================================ */

function obterClasses(
    documentos
) {

    const conjunto =
        new Set();


    for (
        const documento
        of documentos
    ) {

        /*
        AQUI ESTÁ A CORREÇÃO PRINCIPAL.

        O dataset usa:

            narrative

        e não:

            label
        */

        conjunto.add(
            documento.narrative
        );
    }


    const classes =
        Array.from(
            conjunto
        )
        .sort();


    /*
    Segurança adicional.
    */

    if (
        classes.some(
            classe =>
                !classe ||
                classe === "undefined" ||
                classe === "null"
        )
    ) {

        throw new Error(
            "Foi encontrada uma classe inválida no dataset."
        );
    }


    return classes;
}


/* ============================================================
   CONSTRUIR VOCABULÁRIO
   ============================================================ */

function construirVocabulario(
    documentos
) {

    console.log("");

    console.log(
        "Construindo vocabulário TF-IDF..."
    );


    const documentFrequency =
        new Map();


    const N =
        documentos.length;


    for (
        const documento
        of documentos
    ) {

        const tokens =
            tokenizar(
                documento.text
            );


        const palavrasUnicas =
            new Set(
                tokens
            );


        for (
            const palavra
            of palavrasUnicas
        ) {

            documentFrequency.set(

                palavra,

                (
                    documentFrequency.get(
                        palavra
                    ) || 0
                ) + 1
            );
        }
    }


    const candidatos = [];


    for (
        const [
            palavra,
            frequencia
        ]
        of documentFrequency.entries()
    ) {

        if (
            frequencia <
            MIN_DOCUMENT_FREQUENCY
        ) {
            continue;
        }


        if (
            frequencia >
            N *
            MAX_DOCUMENT_FREQUENCY_RATIO
        ) {
            continue;
        }


        candidatos.push({

            palavra,

            frequencia

        });
    }


    /*
    Palavras mais frequentes primeiro.
    */

    candidatos.sort(

        (a, b) => {

            if (
                b.frequencia !==
                a.frequencia
            ) {

                return (
                    b.frequencia -
                    a.frequencia
                );
            }


            return a.palavra.localeCompare(
                b.palavra
            );
        }
    );


    const selecionados =
        candidatos.slice(
            0,
            MAX_FEATURES
        );


    const vocabulario =
        new Map();


    selecionados.forEach(

        (
            item,
            indice
        ) => {

            vocabulario.set(
                item.palavra,
                indice
            );
        }
    );


    console.log(
        `Vocabulário final: ${vocabulario.size} termos`
    );


    console.log(
        `Termos candidatos antes do limite: ${candidatos.length}`
    );


    return {

        vocabulario,

        documentFrequency,

        tamanho:
            vocabulario.size

    };
}


/* ============================================================
   CALCULAR IDF
   ============================================================ */

function calcularIDF(
    vocabularioInfo,
    quantidadeDocumentos
) {

    const idf =
        new Float64Array(
            vocabularioInfo.tamanho
        );


    for (
        const [
            palavra,
            indice
        ]
        of vocabularioInfo.vocabulario.entries()
    ) {

        const df =
            vocabularioInfo
                .documentFrequency
                .get(
                    palavra
                ) || 0;


        idf[indice] =

            Math.log(

                (
                    1 +
                    quantidadeDocumentos
                )
                /
                (
                    1 +
                    df
                )

            ) + 1;
    }


    return idf;
}


/* ============================================================
   DOCUMENTO -> TF-IDF
   ============================================================ */

function documentoParaTFIDF(
    texto,
    vocabulario,
    idf
) {

    const tokens =
        tokenizar(
            texto
        );


    if (
        tokens.length === 0
    ) {

        return [];
    }


    const frequencias =
        new Map();


    for (
        const token
        of tokens
    ) {

        if (
            !vocabulario.has(
                token
            )
        ) {

            continue;
        }


        frequencias.set(

            token,

            (
                frequencias.get(
                    token
                ) || 0
            ) + 1
        );
    }


    if (
        frequencias.size === 0
    ) {

        return [];
    }


    const vetor = [];


    for (
        const [
            palavra,
            frequencia
        ]
        of frequencias.entries()
    ) {

        const indice =
            vocabulario.get(
                palavra
            );


        /*
        TF sublinear.
        */

        const tf =
            1 +
            Math.log(
                frequencia
            );


        const valor =
            tf *
            idf[indice];


        vetor.push({

            indice,

            valor

        });
    }


    /*
    Normalização L2.
    */

    let norma = 0;


    for (
        const item
        of vetor
    ) {

        norma +=

            item.valor *
            item.valor;
    }


    norma =
        Math.sqrt(
            norma
        );


    if (
        norma > 0
    ) {

        for (
            const item
            of vetor
        ) {

            item.valor /=
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

    console.log(
        `Transformando ${documentos.length} documentos...`
    );


    const resultado = [];


    for (
        const documento
        of documentos
    ) {

        const vetor =
            documentoParaTFIDF(

                documento.text,

                vocabulario,

                idf
            );


        resultado.push({

            vetor,

            /*
            CORREÇÃO PRINCIPAL:

            O alvo da classificação
            é narrative.
            */

            label:
                documento.narrative

        });
    }


    return resultado;
}


/* ============================================================
   SOFTMAX
   ============================================================ */

function softmax(
    logits
) {

    let maior =
        -Infinity;


    for (
        const valor
        of logits
    ) {

        if (
            valor > maior
        ) {

            maior =
                valor;
        }
    }


    const exponenciais =
        new Float64Array(
            logits.length
        );


    let soma = 0;


    for (
        let i = 0;
        i < logits.length;
        i++
    ) {

        const valor =

            Math.exp(
                logits[i] -
                maior
            );


        exponenciais[i] =
            valor;


        soma +=
            valor;
    }


    if (
        soma === 0
    ) {

        return exponenciais;
    }


    for (
        let i = 0;
        i < exponenciais.length;
        i++
    ) {

        exponenciais[i] /=
            soma;
    }


    return exponenciais;
}


/* ============================================================
   TREINAR MODELO
   ============================================================ */

function treinarModelo(

    dadosTreino,

    classes,

    tamanhoVocabulario

) {

    console.log("");

    console.log(
        "Iniciando treinamento da Regressão Logística..."
    );


    const quantidadeClasses =
        classes.length;


    const indiceClasse =
        new Map();


    classes.forEach(

        (
            classe,
            indice
        ) => {

            indiceClasse.set(
                classe,
                indice
            );
        }
    );


    /*
    Pesos:

    pesos[classe][termo]
    */

    const pesos =

        Array.from(

            {
                length:
                    quantidadeClasses
            },

            () =>
                new Float64Array(
                    tamanhoVocabulario
                )
        );


    const bias =
        new Float64Array(
            quantidadeClasses
        );


    for (
        let epoch = 1;
        epoch <= EPOCHS;
        epoch++
    ) {

        /*
        Embaralhamento.
        */

        const indices =
            Array.from(

                {
                    length:
                        dadosTreino.length
                },

                (
                    _,
                    i
                ) => i
            );


        for (
            let i =
                indices.length - 1;

            i > 0;

            i--
        ) {

            const j =
                Math.floor(

                    Math.random() *
                    (
                        i + 1
                    )
                );


            [
                indices[i],
                indices[j]
            ] =

            [
                indices[j],
                indices[i]
            ];
        }


        let perdaTotal = 0;


        for (
            let pos = 0;
            pos < indices.length;
            pos++
        ) {

            const documento =

                dadosTreino[
                    indices[pos]
                ];


            const classeReal =

                indiceClasse.get(
                    documento.label
                );


            if (
                classeReal === undefined
            ) {

                throw new Error(

                    `Classe desconhecida: ${documento.label}`
                );
            }


            const logits =

                new Float64Array(

                    quantidadeClasses
                );


            /*
            Calcula os logits.
            */

            for (
                let classe = 0;

                classe <
                quantidadeClasses;

                classe++
            ) {

                let soma =
                    bias[classe];


                const pesosClasse =
                    pesos[classe];


                for (
                    const item
                    of documento.vetor
                ) {

                    soma +=

                        pesosClasse[
                            item.indice
                        ] *
                        item.valor;
                }


                logits[classe] =
                    soma;
            }


            const probabilidades =
                softmax(
                    logits
                );


            /*
            Cross entropy.
            */

            const probabilidadeReal =

                Math.max(

                    probabilidades[
                        classeReal
                    ],

                    1e-12

                );


            perdaTotal -=

                Math.log(
                    probabilidadeReal
                );


            /*
            Atualização dos pesos.
            */

            for (
                let classe = 0;

                classe <
                quantidadeClasses;

                classe++
            ) {

                const alvo =

                    classe === classeReal
                        ? 1
                        : 0;


                const erro =

                    probabilidades[
                        classe
                    ] -
                    alvo;


                bias[classe] -=

                    LEARNING_RATE *
                    erro;


                const pesosClasse =
                    pesos[classe];


                for (
                    const item
                    of documento.vetor
                ) {

                    const indice =
                        item.indice;


                    const gradiente =

                        erro *
                        item.valor;


                    pesosClasse[indice] -=

                        LEARNING_RATE *
                        (
                            gradiente +

                            REGULARIZATION *
                            pesosClasse[indice]
                        );
                }
            }
        }


        const perdaMedia =

            perdaTotal /
            dadosTreino.length;


        console.log(

            `Época ${epoch}/${EPOCHS} - perda: ${perdaMedia.toFixed(6)}`
        );
    }


    return {

        pesos,

        bias,

        classes

    };
}


/* ============================================================
   PREVER
   ============================================================ */

function prever(
    vetor,
    modelo
) {

    const quantidadeClasses =
        modelo.classes.length;


    const logits =
        new Float64Array(
            quantidadeClasses
        );


    for (
        let classe = 0;
        classe < quantidadeClasses;
        classe++
    ) {

        let soma =
            modelo.bias[
                classe
            ];


        const pesosClasse =
            modelo.pesos[
                classe
            ];


        for (
            const item
            of vetor
        ) {

            soma +=

                pesosClasse[
                    item.indice
                ] *
                item.valor;
        }


        logits[classe] =
            soma;
    }


    const probabilidades =
        softmax(
            logits
        );


    let melhorClasse = 0;


    for (
        let i = 1;
        i < probabilidades.length;
        i++
    ) {

        if (
            probabilidades[i] >
            probabilidades[
                melhorClasse
            ]
        ) {

            melhorClasse =
                i;
        }
    }


    return {

        label:

            modelo.classes[
                melhorClasse
            ],

        probabilidade:

            probabilidades[
                melhorClasse
            ]

    };
}


/* ============================================================
   MATRIZ DE CONFUSÃO
   ============================================================ */

function criarMatrizConfusao(

    classes,

    reais,

    previstos

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
        let i = 0;
        i < reais.length;
        i++
    ) {

        matriz[
            reais[i]
        ][
            previstos[i]
        ]++;
    }


    return matriz;
}


/* ============================================================
   MÉTRICAS
   ============================================================ */

function calcularMetricas(

    classes,

    reais,

    previstos

) {

    let acertos = 0;


    for (
        let i = 0;
        i < reais.length;
        i++
    ) {

        if (
            reais[i] ===
            previstos[i]
        ) {

            acertos++;
        }
    }


    const accuracy =

        acertos /
        reais.length;


    const porClasse = {};


    let somaPrecision = 0;

    let somaRecall = 0;

    let somaF1 = 0;


    for (
        const classe
        of classes
    ) {

        let verdadeiroPositivo = 0;

        let falsoPositivo = 0;

        let falsoNegativo = 0;


        for (
            let i = 0;
            i < reais.length;
            i++
        ) {

            if (
                reais[i] === classe &&
                previstos[i] === classe
            ) {

                verdadeiroPositivo++;
            }

            else if (
                reais[i] !== classe &&
                previstos[i] === classe
            ) {

                falsoPositivo++;
            }

            else if (
                reais[i] === classe &&
                previstos[i] !== classe
            ) {

                falsoNegativo++;
            }
        }


        const precision =

            verdadeiroPositivo +
            falsoPositivo === 0

                ? 0

                :

                verdadeiroPositivo /
                (
                    verdadeiroPositivo +
                    falsoPositivo
                );


        const recall =

            verdadeiroPositivo +
            falsoNegativo === 0

                ? 0

                :

                verdadeiroPositivo /
                (
                    verdadeiroPositivo +
                    falsoNegativo
                );


        const f1 =

            precision +
            recall === 0

                ? 0

                :

                2 *
                precision *
                recall /
                (
                    precision +
                    recall
                );


        const suporte =

            reais.filter(

                item =>
                    item === classe

            ).length;


        porClasse[classe] = {

            suporte,

            verdadeiroPositivo,

            falsoPositivo,

            falsoNegativo,

            precision,

            recall,

            f1

        };


        somaPrecision +=
            precision;


        somaRecall +=
            recall;


        somaF1 +=
            f1;
    }


    return {

        total:
            reais.length,

        acertos,

        erros:
            reais.length -
            acertos,

        accuracy,

        macroPrecision:
            somaPrecision /
            classes.length,

        macroRecall:
            somaRecall /
            classes.length,

        macroF1:
            somaF1 /
            classes.length,

        porClasse,

        matrizConfusao:

            criarMatrizConfusao(

                classes,

                reais,

                previstos

            )

    };
}


/* ============================================================
   PREPARAR MODELO PARA JSON
   ============================================================ */

function prepararModeloParaSalvar(

    modelo,

    vocabulario,

    idf

) {

    const vocabularioArray =

        Array.from(
            vocabulario.entries()
        )

        .map(

            (
                [
                    palavra,
                    indice
                ]
            ) => ({

                palavra,

                indice

            })

        );


    return {

        tipo:
            "TF-IDF + Regressão Logística Multiclasses",

        classes:
            modelo.classes,

        vocabulario:
            vocabularioArray,

        idf:
            Array.from(
                idf
            ),

        bias:
            Array.from(
                modelo.bias
            ),

        pesos:

            modelo.pesos.map(

                pesosClasse =>

                    Array.from(
                        pesosClasse
                    )

            ),

        configuracao: {

            minDocumentFrequency:
                MIN_DOCUMENT_FREQUENCY,

            maxDocumentFrequencyRatio:
                MAX_DOCUMENT_FREQUENCY_RATIO,

            maxFeatures:
                MAX_FEATURES,

            epochs:
                EPOCHS,

            learningRate:
                LEARNING_RATE,

            regularization:
                REGULARIZATION

        }

    };
}


/* ============================================================
   PRINCIPAL
   ============================================================ */

async function main() {

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " TF-IDF + REGRESSÃO LOGÍSTICA"
    );

    console.log(
        " CRYPTO NARRATIVE SYSTEM"
    );

    console.log(
        "============================================================"
    );


    /* --------------------------------------------------------
       1. CARREGAR DATASETS
    -------------------------------------------------------- */

    const treino =
        carregarJSON(
            ARQUIVO_TREINO
        );


    const teste =
        carregarJSON(
            ARQUIVO_TESTE
        );


    console.log("");

    console.log(
        `Registros de treino: ${treino.length}`
    );

    console.log(
        `Registros de teste: ${teste.length}`
    );


    /* --------------------------------------------------------
       2. VALIDAR
    -------------------------------------------------------- */

    validarDataset(
        treino,
        "TREINO"
    );


    validarDataset(
        teste,
        "TESTE"
    );


    /* --------------------------------------------------------
       3. CLASSES
    -------------------------------------------------------- */

    const classes =
        obterClasses(
            treino
        );


    console.log("");

    console.log(
        "Classes:"
    );


    classes.forEach(

        (
            classe,
            indice
        ) => {

            console.log(
                `${indice}: ${classe}`
            );
        }
    );


    /*
    Segurança:

    Precisamos ter as oito narrativas
    esperadas no dataset atual.
    */

    if (
        classes.length < 2
    ) {

        throw new Error(

            `Número inválido de classes: ${classes.length}`
        );
    }


    /* --------------------------------------------------------
       4. VOCABULÁRIO
    -------------------------------------------------------- */

    const vocabularioInfo =

        construirVocabulario(
            treino
        );


    /* --------------------------------------------------------
       5. IDF
    -------------------------------------------------------- */

    console.log("");

    console.log(
        "Calculando IDF..."
    );


    const idf =

        calcularIDF(

            vocabularioInfo,

            treino.length

        );


    /* --------------------------------------------------------
       6. TF-IDF TREINO
    -------------------------------------------------------- */

    const dadosTreino =

        transformarDataset(

            treino,

            vocabularioInfo.vocabulario,

            idf

        );


    /* --------------------------------------------------------
       7. TF-IDF TESTE
    -------------------------------------------------------- */

    const dadosTeste =

        transformarDataset(

            teste,

            vocabularioInfo.vocabulario,

            idf

        );


    /* --------------------------------------------------------
       8. TREINAMENTO
    -------------------------------------------------------- */

    const modelo =

        treinarModelo(

            dadosTreino,

            classes,

            vocabularioInfo.tamanho

        );


    /* --------------------------------------------------------
       9. AVALIAÇÃO
    -------------------------------------------------------- */

    console.log("");

    console.log(
        "Avaliando conjunto de teste..."
    );


    const reais = [];

    const previstos = [];


    for (
        let i = 0;
        i < dadosTeste.length;
        i++
    ) {

        const resultado =

            prever(

                dadosTeste[i].vetor,

                modelo

            );


        reais.push(
            dadosTeste[i].label
        );


        previstos.push(
            resultado.label
        );
    }


    /* --------------------------------------------------------
       10. MÉTRICAS
    -------------------------------------------------------- */

    const metricas =

        calcularMetricas(

            classes,

            reais,

            previstos

        );


    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " RESULTADO FINAL"
    );

    console.log(
        "============================================================"
    );


    console.log(
        `Total avaliado: ${metricas.total}`
    );


    console.log(
        `Acertos: ${metricas.acertos}`
    );


    console.log(
        `Erros: ${metricas.erros}`
    );


    console.log(
        `Accuracy: ${(metricas.accuracy * 100).toFixed(2)}%`
    );


    console.log(
        `Macro Precision: ${(metricas.macroPrecision * 100).toFixed(2)}%`
    );


    console.log(
        `Macro Recall: ${(metricas.macroRecall * 100).toFixed(2)}%`
    );


    console.log(
        `Macro F1: ${(metricas.macroF1 * 100).toFixed(2)}%`
    );


    /* --------------------------------------------------------
       11. MÉTRICAS POR CLASSE
    -------------------------------------------------------- */

    console.log("");

    console.log(
        "MÉTRICAS POR CLASSE"
    );


    for (
        const classe
        of classes
    ) {

        const dados =
            metricas.porClasse[
                classe
            ];


        console.log("");

        console.log(
            classe
        );


        console.log(
            `  Suporte: ${dados.suporte}`
        );


        console.log(
            `  Precision: ${(dados.precision * 100).toFixed(2)}%`
        );


        console.log(
            `  Recall: ${(dados.recall * 100).toFixed(2)}%`
        );


        console.log(
            `  F1: ${(dados.f1 * 100).toFixed(2)}%`
        );
    }


    /* --------------------------------------------------------
       12. MATRIZ
    -------------------------------------------------------- */

    console.log("");

    console.log(
        "MATRIZ DE CONFUSÃO"
    );


    console.log("");

    console.log(

        JSON.stringify(

            metricas.matrizConfusao,

            null,

            2

        )
    );


    /* --------------------------------------------------------
       13. RELATÓRIO
    -------------------------------------------------------- */

    const relatorio = {

        modelo:
            "TF-IDF + Regressão Logística Multiclasses",

        dataExecucao:
            new Date().toISOString(),

        treinamento: {

            registros:
                treino.length,

            documentos:
                dadosTreino.length

        },

        teste: {

            registros:
                teste.length,

            documentos:
                dadosTeste.length

        },

        classes,

        tfidf: {

            vocabulario:
                vocabularioInfo.tamanho,

            minDocumentFrequency:
                MIN_DOCUMENT_FREQUENCY,

            maxDocumentFrequencyRatio:
                MAX_DOCUMENT_FREQUENCY_RATIO,

            maxFeatures:
                MAX_FEATURES

        },

        treinamentoModelo: {

            epochs:
                EPOCHS,

            learningRate:
                LEARNING_RATE,

            regularization:
                REGULARIZATION

        },

        metricas

    };


    fs.writeFileSync(

        ARQUIVO_RELATORIO,

        JSON.stringify(

            relatorio,

            null,

            2

        ),

        "utf8"

    );


    /* --------------------------------------------------------
       14. SALVAR MODELO
    -------------------------------------------------------- */

    console.log("");

    console.log(
        "Salvando modelo..."
    );


    const modeloSalvavel =

        prepararModeloParaSalvar(

            modelo,

            vocabularioInfo.vocabulario,

            idf

        );


    fs.writeFileSync(

        ARQUIVO_MODELO,

        JSON.stringify(
            modeloSalvavel
        ),

        "utf8"

    );


    console.log("");

    console.log(
        `Relatório salvo em: ${ARQUIVO_RELATORIO}`
    );


    console.log(
        `Modelo salvo em: ${ARQUIVO_MODELO}`
    );


    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " PROCESSO CONCLUÍDO"
    );

    console.log(
        "============================================================"
    );
}


/* ============================================================
   ERRO
   ============================================================ */

main()

    .catch(

        erro => {

            console.error("");

            console.error(
                "ERRO:"
            );

            console.error(
                erro.message
            );

            console.error("");

            process.exit(1);
        }

    );