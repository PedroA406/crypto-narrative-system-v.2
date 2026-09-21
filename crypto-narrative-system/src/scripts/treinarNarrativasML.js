require("dotenv").config();

const fs = require("fs");
const path = require("path");
const natural = require("natural");


/* ============================================================
   CONFIGURAÇÕES
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
        "relatorio_ml_baseline.json"
    );

const ARQUIVO_MODELO =
    path.join(
        DATASET_DIR,
        "modelo_narrativas_bayes.json"
    );


/* ============================================================
   NARRATIVAS
   ============================================================ */

const NARRATIVAS = [

    "market",
    "institutional_investment",
    "general",
    "regulation",
    "security",
    "technology",
    "adoption",
    "mining"

];


/* ============================================================
   TOKENIZER
   ============================================================ */

const tokenizer =
    new natural.WordTokenizer();


/* ============================================================
   NORMALIZAR TEXTO
   ============================================================ */

function prepararTexto(
    texto
) {

    if (!texto) {

        return "";

    }


    return String(texto)

        .toLowerCase()

        .normalize("NFD")

        .replace(
            /[\u0300-\u036f]/g,
            ""
        )

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
            /[^a-z0-9#$%.-]+/g,
            " "
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ============================================================
   REMOVER PALAVRAS MUITO COMUNS
   ============================================================ */

const STOPWORDS = new Set([

    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "of",
    "to",
    "in",
    "on",
    "for",
    "from",
    "with",
    "by",
    "as",
    "at",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "into",
    "than",
    "then",
    "their",
    "there",
    "they",
    "them",
    "he",
    "she",
    "his",
    "her",
    "you",
    "your",
    "we",
    "our",
    "i",
    "will",
    "would",
    "could",
    "should",
    "has",
    "have",
    "had",
    "do",
    "does",
    "did",
    "not",
    "no",
    "more",
    "most",
    "also",
    "about",
    "over",
    "after",
    "before",
    "during",
    "new",
    "news",
    "said",
    "says",
    "according"

]);


/* ============================================================
   TRANSFORMAR TEXTO EM TOKENS
   ============================================================ */

function tokenizar(
    texto
) {

    const textoNormalizado =
        prepararTexto(
            texto
        );


    if (!textoNormalizado) {

        return [];

    }


    const tokens =
        tokenizer.tokenize(
            textoNormalizado
        );


    return tokens.filter(
        token => {

            if (
                token.length < 2
            ) {

                return false;

            }


            if (
                STOPWORDS.has(
                    token
                )
            ) {

                return false;

            }


            return true;

        }
    );

}


/* ============================================================
   CRIAR CLASSIFICADOR
   ============================================================ */

function criarClassificador() {

    return new natural.BayesClassifier();

}


/* ============================================================
   TREINAR
   ============================================================ */

function treinar(
    classificador,
    registros
) {

    console.log("");
    console.log(
        "Preparando dados de treinamento..."
    );


    let contador = 0;


    for (
        const registro of registros
    ) {

        const tokens =
            tokenizar(
                registro.text
            );


        if (
            tokens.length === 0
        ) {

            continue;

        }


        classificador.addDocument(

            tokens,

            registro.narrative

        );


        contador++;


        if (
            contador % 1000 === 0
        ) {

            console.log(
                `Documentos preparados: ${contador}`
            );

        }

    }


    console.log("");
    console.log(
        `Documentos utilizados no treinamento: ${contador}`
    );


    console.log("");
    console.log(
        "Treinando Naive Bayes..."
    );


    classificador.train();


    console.log(
        "Treinamento concluído."
    );

}


/* ============================================================
   MATRIZ DE CONFUSÃO
   ============================================================ */

function criarMatrizConfusao() {

    const matriz = {};


    for (
        const real of NARRATIVAS
    ) {

        matriz[real] = {};


        for (
            const previsto of NARRATIVAS
        ) {

            matriz[real][previsto] = 0;

        }

    }


    return matriz;

}


/* ============================================================
   CALCULAR MÉTRICAS
   ============================================================ */

function calcularMetricas(
    matriz,
    total
) {

    const metricas = {};


    let somaPrecisao = 0;
    let somaRecall = 0;
    let somaF1 = 0;


    for (
        const classe of NARRATIVAS
    ) {

        let verdadeiroPositivo =
            matriz[classe][classe];


        let falsoPositivo = 0;

        let falsoNegativo = 0;


        /*
            Falso positivo:
            outra classe real foi prevista
            como esta classe.
        */

        for (
            const real of NARRATIVAS
        ) {

            if (
                real !== classe
            ) {

                falsoPositivo +=
                    matriz[real][classe];

            }

        }


        /*
            Falso negativo:
            esta classe era a verdadeira,
            mas foi prevista como outra.
        */

        for (
            const previsto of NARRATIVAS
        ) {

            if (
                previsto !== classe
            ) {

                falsoNegativo +=
                    matriz[classe][previsto];

            }

        }


        const precisao =
            (
                verdadeiroPositivo +
                falsoPositivo
            ) === 0

                ? 0

                : verdadeiroPositivo /
                  (
                      verdadeiroPositivo +
                      falsoPositivo
                  );


        const recall =
            (
                verdadeiroPositivo +
                falsoNegativo
            ) === 0

                ? 0

                : verdadeiroPositivo /
                  (
                      verdadeiroPositivo +
                      falsoNegativo
                  );


        const f1 =
            (
                precisao +
                recall
            ) === 0

                ? 0

                : 2 *
                  (
                      precisao *
                      recall
                  ) /
                  (
                      precisao +
                      recall
                  );


        metricas[classe] = {

            verdadeiroPositivo,

            falsoPositivo,

            falsoNegativo,

            precisao:

                Number(
                    precisao.toFixed(4)
                ),

            recall:

                Number(
                    recall.toFixed(4)
                ),

            f1:

                Number(
                    f1.toFixed(4)
                )

        };


        somaPrecisao +=
            precisao;

        somaRecall +=
            recall;

        somaF1 +=
            f1;

    }


    const quantidadeClasses =
        NARRATIVAS.length;


    return {

        porClasse:
            metricas,

        macroPrecision:
            Number(
                (
                    somaPrecisao /
                    quantidadeClasses
                ).toFixed(4)
            ),

        macroRecall:
            Number(
                (
                    somaRecall /
                    quantidadeClasses
                ).toFixed(4)
            ),

        macroF1:
            Number(
                (
                    somaF1 /
                    quantidadeClasses
                ).toFixed(4)
            )

    };

}


/* ============================================================
   CALCULAR ACCURACY
   ============================================================ */

function calcularAccuracy(
    matriz,
    total
) {

    let acertos = 0;


    for (
        const classe of NARRATIVAS
    ) {

        acertos +=
            matriz[classe][classe];

    }


    return total === 0

        ? 0

        : Number(
            (
                acertos /
                total
            ).toFixed(4)
        );

}


/* ============================================================
   MOSTRAR MATRIZ
   ============================================================ */

function mostrarMatriz(
    matriz
) {

    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "MATRIZ DE CONFUSÃO"
    );

    console.log(
        "============================================================"
    );


    console.log("");

    console.log(
        "REAL \\ PREVISTO"
    );


    console.log(
        NARRATIVAS
            .map(
                narrativa =>
                    narrativa.substring(
                        0,
                        12
                    )
                    .padStart(14)
            )
            .join("")
    );


    for (
        const real of NARRATIVAS
    ) {

        let linha =
            real
                .substring(
                    0,
                    12
                )
                .padEnd(14);


        for (
            const previsto of NARRATIVAS
        ) {

            linha +=
                String(
                    matriz[real][previsto]
                )
                .padStart(14);

        }


        console.log(
            linha
        );

    }

}


/* ============================================================
   OBTER PROBABILIDADES
   ============================================================ */

function obterProbabilidades(
    classificador,
    tokens
) {

    try {

        const probabilidades =
            classificador.getClassifications(
                tokens
            );


        return probabilidades
            .slice(
                0,
                3
            )
            .map(
                item => ({

                    classe:
                        item.label,

                    valor:
                        Number(
                            item.value.toFixed(6)
                        )

                })
            );

    } catch (
        erro
    ) {

        return [];

    }

}


/* ============================================================
   EXECUTAR TESTE
   ============================================================ */

function avaliar(
    classificador,
    registros
) {

    const matriz =
        criarMatrizConfusao();


    const erros = [];

    let avaliados = 0;
    let acertos = 0;


    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "AVALIAÇÃO DO MODELO"
    );

    console.log(
        "============================================================"
    );

    console.log("");


    for (
        const registro of registros
    ) {

        const tokens =
            tokenizar(
                registro.text
            );


        if (
            tokens.length === 0
        ) {

            continue;

        }


        const previsto =
            classificador.classify(
                tokens
            );


        const real =
            registro.narrative;


        if (
            matriz[real] &&
            matriz[real][previsto] !== undefined
        ) {

            matriz[real][previsto]++;

        }


        avaliados++;


        if (
            previsto === real
        ) {

            acertos++;

        } else {

            /*
                Guardar somente os primeiros erros
                para inspeção.
            */

            if (
                erros.length < 100
            ) {

                erros.push({

                    newsId:
                        registro.newsId,

                    titulo:
                        registro.text
                            .substring(
                                0,
                                300
                            ),

                    real,

                    previsto,

                    probabilidades:
                        obterProbabilidades(
                            classificador,
                            tokens
                        )

                });

            }

        }


        if (
            avaliados % 500 === 0
        ) {

            console.log(
                `Testadas: ${avaliados}`
            );

        }

    }


    const accuracy =
        calcularAccuracy(
            matriz,
            avaliados
        );


    const metricas =
        calcularMetricas(
            matriz,
            avaliados
        );


    console.log("");
    console.log(
        `Total avaliado: ${avaliados}`
    );

    console.log(
        `Acertos: ${acertos}`
    );

    console.log(
        `Erros: ${avaliados - acertos}`
    );

    console.log(
        `Accuracy: ${(accuracy * 100).toFixed(2)}%`
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


    mostrarMatriz(
        matriz
    );


    return {

        totalAvaliados:
            avaliados,

        acertos,

        errosQuantidade:
            avaliados - acertos,

        accuracy,

        metricas,

        matrizConfusao:
            matriz,

        exemplosErros:
            erros

    };

}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

async function executar() {

    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "       MACHINE LEARNING - NARRATIVAS CRIPTO"
    );

    console.log(
        "       BASELINE: NAIVE BAYES"
    );

    console.log(
        "============================================================"
    );

    console.log("");


    if (
        !fs.existsSync(
            ARQUIVO_TREINO
        )
    ) {

        throw new Error(
            `Arquivo não encontrado: ${ARQUIVO_TREINO}`
        );

    }


    if (
        !fs.existsSync(
            ARQUIVO_TESTE
        )
    ) {

        throw new Error(
            `Arquivo não encontrado: ${ARQUIVO_TESTE}`
        );

    }


    const treino =
        JSON.parse(
            fs.readFileSync(
                ARQUIVO_TREINO,
                "utf8"
            )
        );


    const teste =
        JSON.parse(
            fs.readFileSync(
                ARQUIVO_TESTE,
                "utf8"
            )
        );


    console.log(
        `Registros de treino: ${treino.length}`
    );

    console.log(
        `Registros de teste: ${teste.length}`
    );


    /*
        Criar modelo.
    */

    const classificador =
        criarClassificador();


    /*
        Treinar.
    */

    treinar(
        classificador,
        treino
    );


    /*
        Avaliar.
    */

    const resultado =
        avaliar(
            classificador,
            teste
        );


    /*
        Salvar modelo.
    */

    classificador.save(
        ARQUIVO_MODELO,
        erro => {

            if (erro) {

                console.error(
                    "Não foi possível salvar o modelo:"
                );

                console.error(
                    erro.message
                );

            } else {

                console.log("");
                console.log(
                    "Modelo salvo em:"
                );

                console.log(
                    ARQUIVO_MODELO
                );

            }

        }
    );


    /*
        Relatório final.
    */

    const relatorio = {

        dataExecucao:
            new Date().toISOString(),

        modelo:
            "Naive Bayes",

        biblioteca:
            "natural",

        versaoBiblioteca:
            "8.1.1",

        treinamento: {

            quantidade:
                treino.length

        },

        teste: {

            quantidade:
                teste.length

        },

        metricas: {

            accuracy:
                resultado.accuracy,

            macroPrecision:
                resultado
                    .metricas
                    .macroPrecision,

            macroRecall:
                resultado
                    .metricas
                    .macroRecall,

            macroF1:
                resultado
                    .metricas
                    .macroF1,

            porNarrativa:
                resultado
                    .metricas
                    .porClasse

        },

        matrizConfusao:
            resultado
                .matrizConfusao,

        erros: {

            quantidade:
                resultado
                    .errosQuantidade,

            exemplos:
                resultado
                    .exemplosErros

        },

        observacao:
            "Modelo baseline treinado com os rótulos narrativos existentes. O MongoDB não foi alterado."

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


    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        "RELATÓRIO SALVO"
    );

    console.log(
        "============================================================"
    );

    console.log(
        ARQUIVO_RELATORIO
    );

    console.log("");

    console.log(
        "MongoDB não foi alterado."
    );

    console.log("");

}


/* ============================================================
   INICIAR
   ============================================================ */

executar()

    .catch(
        erro => {

            console.error("");
            console.error(
                "ERRO DURANTE O TREINAMENTO:"
            );
            console.error(
                erro.message
            );
            console.error("");

            process.exit(1);

        }
    );