const fs = require("fs");
const path = require("path");

/*
============================================================
ANÁLISE DOS ERROS DO MODELO DE NARRATIVAS
============================================================

Este script:

1. Carrega o dataset de teste.
2. Carrega o modelo TF-IDF + Logistic Regression.
3. Reproduz o mesmo pré-processamento usado no treinamento.
4. Faz novamente as previsões.
5. Identifica os erros.
6. Agrupa os erros por:
      narrativa real -> narrativa prevista
7. Calcula a confiança da previsão.
8. Salva exemplos dos erros.

IMPORTANTE:
- NÃO altera MongoDB.
- NÃO altera os datasets.
- NÃO treina novamente o modelo.
- Serve somente para análise científica dos erros.
============================================================
*/

const CAMINHO_TESTE = path.join(
    process.cwd(),
    "dataset",
    "dataset_teste.json"
);

const CAMINHO_MODELO = path.join(
    process.cwd(),
    "dataset",
    "modelo_tfidf_logistic.json"
);

const CAMINHO_RELATORIO = path.join(
    process.cwd(),
    "dataset",
    "relatorio_erros_narrativas.json"
);


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
   NORMALIZAÇÃO DO TEXTO
   ============================================================ */

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }

    let resultado = String(texto);

    resultado = resultado.toLowerCase();

    resultado = resultado.replace(
        /<[^>]*>/g,
        " "
    );

    resultado = resultado.replace(
        /https?:\/\/\S+|www\.\S+/g,
        " "
    );

    resultado = resultado.replace(
        /&[a-zA-Z0-9#]+;/g,
        " "
    );

    resultado = resultado.replace(
        /[^a-z0-9]+/g,
        " "
    );

    resultado = resultado.replace(
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
   CARREGAR ARQUIVO JSON
   ============================================================ */

function carregarJSON(caminho) {

    if (!fs.existsSync(caminho)) {

        throw new Error(
            `Arquivo não encontrado: ${caminho}`
        );
    }

    const conteudo =
        fs.readFileSync(
            caminho,
            "utf8"
        );

    return JSON.parse(conteudo);
}


/* ============================================================
   CRIA MAPA DO VOCABULÁRIO
   ============================================================ */

function criarMapaVocabulario(modelo) {

    const mapa =
        new Map();

    for (
        const item
        of modelo.vocabulario
    ) {

        mapa.set(
            item.palavra,
            item.indice
        );
    }

    return mapa;
}


/* ============================================================
   CRIAR VETOR TF-IDF
   ============================================================ */

function criarVetorTfidf(
    texto,
    mapaVocabulario,
    idf
) {

    const tokens =
        tokenizar(texto);

    const frequencias =
        new Map();

    for (const token of tokens) {

        if (
            !mapaVocabulario.has(token)
        ) {
            continue;
        }

        const indice =
            mapaVocabulario.get(token);

        frequencias.set(
            indice,
            (frequencias.get(indice) || 0) + 1
        );
    }


    const vetor =
        new Array(idf.length).fill(0);


    /*
    ------------------------------------------------------------
    TF SUBLINEAR

    Mesmo cálculo utilizado no treinamento:

        TF = 1 + log(frequência)
    ------------------------------------------------------------
    */

    for (
        const [indice, frequencia]
        of frequencias
    ) {

        const tf =
            1 + Math.log(frequencia);

        vetor[indice] =
            tf * idf[indice];
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
        Math.sqrt(somaQuadrados);

    if (norma > 0) {

        for (
            let i = 0;
            i < vetor.length;
            i++
        ) {

            vetor[i] =
                vetor[i] / norma;
        }
    }

    return vetor;
}


/* ============================================================
   SOFTMAX
   ============================================================ */

function softmax(valores) {

    const maior =
        Math.max(...valores);

    const exponenciais =
        valores.map(
            valor =>
                Math.exp(valor - maior)
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
   PREVER NARRATIVA
   ============================================================ */

function prever(
    texto,
    modelo,
    mapaVocabulario
) {

    const vetor =
        criarVetorTfidf(
            texto,
            mapaVocabulario,
            modelo.idf
        );


    const scores = [];


    /*
    ------------------------------------------------------------
    SCORE DE CADA CLASSE

    score =
        bias +
        soma(peso * característica)
    ------------------------------------------------------------
    */

    for (
        let classe = 0;
        classe < modelo.classes.length;
        classe++
    ) {

        let score =
            modelo.bias[classe];


        const pesos =
            modelo.pesos[classe];


        for (
            let i = 0;
            i < vetor.length;
            i++
        ) {

            if (vetor[i] === 0) {
                continue;
            }

            score +=
                pesos[i] * vetor[i];
        }

        scores.push(score);
    }


    const probabilidades =
        softmax(scores);


    let indiceMelhor = 0;

    for (
        let i = 1;
        i < probabilidades.length;
        i++
    ) {

        if (
            probabilidades[i]
            >
            probabilidades[indiceMelhor]
        ) {

            indiceMelhor = i;
        }
    }


    /*
    ------------------------------------------------------------
    RANKING DAS CLASSES

    Útil para saber quais classes ficaram próximas.
    ------------------------------------------------------------
    */

    const ranking =
        probabilidades
            .map(
                (
                    probabilidade,
                    indice
                ) => ({

                    narrativa:
                        modelo.classes[indice],

                    probabilidade

                })
            )
            .sort(
                (a, b) =>
                    b.probabilidade -
                    a.probabilidade
            );


    return {

        narrativa:
            modelo.classes[indiceMelhor],

        confianca:
            probabilidades[indiceMelhor],

        ranking

    };
}


/* ============================================================
   CRIAR CHAVE DE CONFUSÃO
   ============================================================ */

function chaveConfusao(
    real,
    previsto
) {

    return `${real} -> ${previsto}`;
}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

function executar() {

    console.log("");
    console.log("============================================================");
    console.log("ANÁLISE DOS ERROS DO MODELO DE NARRATIVAS");
    console.log("============================================================");
    console.log("");


    /*
    ------------------------------------------------------------
    CARREGAR DADOS
    ------------------------------------------------------------
    */

    console.log("Carregando dataset de teste...");

    const dataset =
        carregarJSON(
            CAMINHO_TESTE
        );


    console.log(
        `Dataset de teste: ${dataset.length} registros`
    );


    console.log("");

    console.log("Carregando modelo...");

    const modelo =
        carregarJSON(
            CAMINHO_MODELO
        );


    console.log(
        `Classes: ${modelo.classes.join(", ")}`
    );

    console.log(
        `Vocabulário: ${modelo.vocabulario.length} palavras`
    );

    console.log("");


    /*
    ------------------------------------------------------------
    MAPA DO VOCABULÁRIO
    ------------------------------------------------------------
    */

    const mapaVocabulario =
        criarMapaVocabulario(
            modelo
        );


    /*
    ------------------------------------------------------------
    VARIÁVEIS DA ANÁLISE
    ------------------------------------------------------------
    */

    let total =
        dataset.length;

    let acertos = 0;

    let erros = 0;


    const matrizConfusao = {};

    const errosPorPar = {};

    const errosDetalhados = [];


    let somaConfiancaErros = 0;

    let somaConfiancaAcertos = 0;


    /*
    ------------------------------------------------------------
    PROCESSAR DATASET
    ------------------------------------------------------------
    */

    console.log(
        "Executando previsões..."
    );

    console.log("");


    for (
        let i = 0;
        i < dataset.length;
        i++
    ) {

        const documento =
            dataset[i];


        const narrativaReal =
            documento.narrative;


        const resultado =
            prever(
                documento.text,
                modelo,
                mapaVocabulario
            );


        const narrativaPrevista =
            resultado.narrativa;


        /*
        --------------------------------------------------------
        MATRIZ DE CONFUSÃO
        --------------------------------------------------------
        */

        if (
            !matrizConfusao[narrativaReal]
        ) {

            matrizConfusao[narrativaReal] = {};
        }

        if (
            !matrizConfusao[narrativaReal][narrativaPrevista]
        ) {

            matrizConfusao[narrativaReal][narrativaPrevista] = 0;
        }

        matrizConfusao[narrativaReal][narrativaPrevista]++;


        /*
        --------------------------------------------------------
        ACERTO
        --------------------------------------------------------
        */

        if (
            narrativaReal ===
            narrativaPrevista
        ) {

            acertos++;

            somaConfiancaAcertos +=
                resultado.confianca;

            continue;
        }


        /*
        --------------------------------------------------------
        ERRO
        --------------------------------------------------------
        */

        erros++;

        somaConfiancaErros +=
            resultado.confianca;


        const chave =
            chaveConfusao(
                narrativaReal,
                narrativaPrevista
            );


        if (!errosPorPar[chave]) {

            errosPorPar[chave] = {

                real:
                    narrativaReal,

                previsto:
                    narrativaPrevista,

                quantidade:
                    0,

                exemplos: []

            };
        }


        errosPorPar[chave].quantidade++;


        /*
        --------------------------------------------------------
        TEXTO DE AMOSTRA

        O dataset contém o texto completo.
        Para o relatório usamos apenas os primeiros
        600 caracteres para não deixar o JSON gigantesco.
        --------------------------------------------------------
        */

        const textoCompleto =
            documento.text || "";


        const trecho =
            textoCompleto
                .replace(/\s+/g, " ")
                .trim()
                .substring(
                    0,
                    600
                );


        /*
        --------------------------------------------------------
        TOP 3 PREVISÕES
        --------------------------------------------------------
        */

        const top3 =
            resultado.ranking
                .slice(0, 3)
                .map(
                    item => ({

                        narrativa:
                            item.narrativa,

                        probabilidade:
                            Number(
                                item.probabilidade.toFixed(6)
                            )

                    })
                );


        const exemplo = {

            newsId:
                documento.newsId,

            coin:
                documento.coin,

            source:
                documento.source,

            publishedAt:
                documento.publishedAt,

            sentiment:
                documento.sentiment,

            narrativaReal,

            narrativaPrevista,

            confianca:
                Number(
                    resultado.confianca.toFixed(6)
                ),

            top3,

            trecho

        };


        /*
        --------------------------------------------------------
        LIMITAR EXEMPLOS POR GRUPO

        Até 10 exemplos para cada tipo
        de confusão.
        --------------------------------------------------------
        */

        if (
            errosPorPar[chave]
                .exemplos
                .length < 10
        ) {

            errosPorPar[chave]
                .exemplos
                .push(
                    exemplo
                );
        }


        /*
        --------------------------------------------------------
        TAMBÉM GUARDAMOS UMA LISTA GERAL

        Limitada a 500 erros para manter
        o relatório manejável.
        --------------------------------------------------------
        */

        if (
            errosDetalhados.length < 500
        ) {

            errosDetalhados.push(
                exemplo
            );
        }
    }


    /*
    ------------------------------------------------------------
    MÉTRICAS
    ------------------------------------------------------------
    */

    const acuracia =
        total > 0
            ? acertos / total
            : 0;


    const taxaErro =
        total > 0
            ? erros / total
            : 0;


    const confiancaMediaAcertos =
        acertos > 0
            ? somaConfiancaAcertos / acertos
            : 0;


    const confiancaMediaErros =
        erros > 0
            ? somaConfiancaErros / erros
            : 0;


    /*
    ------------------------------------------------------------
    ORDENAR CONFUSÕES
    ------------------------------------------------------------
    */

    const principaisConfusoes =
        Object.values(
            errosPorPar
        )
            .sort(
                (a, b) =>
                    b.quantidade -
                    a.quantidade
            );


    /*
    ------------------------------------------------------------
    RELATÓRIO
    ------------------------------------------------------------
    */

    const relatorio = {

        geradoEm:
            new Date().toISOString(),

        modelo: {

            tipo:
                "TF-IDF + Logistic Regression",

            arquivo:
                "modelo_tfidf_logistic.json",

            classes:
                modelo.classes,

            tamanhoVocabulario:
                modelo.vocabulario.length

        },


        dataset: {

            arquivo:
                "dataset_teste.json",

            total

        },


        metricas: {

            total,

            acertos,

            erros,

            acuracia:
                Number(
                    (acuracia * 100)
                        .toFixed(2)
                ),

            taxaErro:
                Number(
                    (taxaErro * 100)
                        .toFixed(2)
                ),

            confiancaMediaAcertos:
                Number(
                    confiancaMediaAcertos
                        .toFixed(4)
                ),

            confiancaMediaErros:
                Number(
                    confiancaMediaErros
                        .toFixed(4)
                )

        },


        principaisConfusoes,


        matrizConfusao,


        errosDetalhados

    };


    /*
    ------------------------------------------------------------
    SALVAR
    ------------------------------------------------------------
    */

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
    RESULTADO NO TERMINAL
    ============================================================
    */

    console.log("");
    console.log("============================================================");
    console.log("RESULTADO DA ANÁLISE");
    console.log("============================================================");

    console.log(
        `Total analisado: ${total}`
    );

    console.log(
        `Acertos: ${acertos}`
    );

    console.log(
        `Erros: ${erros}`
    );

    console.log(
        `Acurácia: ${(acuracia * 100).toFixed(2)}%`
    );

    console.log(
        `Taxa de erro: ${(taxaErro * 100).toFixed(2)}%`
    );

    console.log(
        `Confiança média nos acertos: ${(confiancaMediaAcertos * 100).toFixed(2)}%`
    );

    console.log(
        `Confiança média nos erros: ${(confiancaMediaErros * 100).toFixed(2)}%`
    );


    console.log("");
    console.log("============================================================");
    console.log("PRINCIPAIS CONFUSÕES");
    console.log("============================================================");


    const limite =
        Math.min(
            15,
            principaisConfusoes.length
        );


    for (
        let i = 0;
        i < limite;
        i++
    ) {

        const item =
            principaisConfusoes[i];


        console.log(
            `${i + 1}. ${item.real} -> ${item.previsto}: ${item.quantidade}`
        );
    }


    console.log("");
    console.log("============================================================");
    console.log("ARQUIVO GERADO");
    console.log("============================================================");

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
        "ERRO DURANTE A ANÁLISE:"
    );

    console.error(
        erro.message
    );

    console.error("");

    process.exit(1);
}