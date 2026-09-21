const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const Post = require("../models/Post");


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const MODELO_PATH = path.join(
    process.cwd(),
    "dataset",
    "modelo_tfidf_logistic.json"
);

const SAIDA_DIR = path.join(
    process.cwd(),
    "dataset",
    "predicoes_narrativas"
);

const SAIDA_PATH = path.join(
    SAIDA_DIR,
    "predicoes_narrativas.json"
);

const RELATORIO_PATH = path.join(
    SAIDA_DIR,
    "relatorio_predicoes.json"
);


/* ============================================================
   NORMALIZAÇÃO DO TEXTO
   ============================================================ */

function normalizarTexto(texto) {

    return String(texto || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/www\.\S+/g, " ")
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* ============================================================
   TOKENIZAÇÃO
   ============================================================ */

function tokenizar(texto) {

    const textoNormalizado = normalizarTexto(texto);

    if (!textoNormalizado) {
        return [];
    }

    return textoNormalizado
        .split(/\s+/)
        .filter(Boolean);
}


/* ============================================================
   SOFTMAX
   ============================================================ */

function softmax(valores) {

    const maior = Math.max(...valores);

    const exponenciais = valores.map(
        valor => Math.exp(valor - maior)
    );

    const soma = exponenciais.reduce(
        (total, valor) => total + valor,
        0
    );

    return exponenciais.map(
        valor => valor / soma
    );
}


/* ============================================================
   CRIAR MAPA DO VOCABULÁRIO
   ============================================================ */

function criarMapaVocabulario(vocabulario) {

    const mapa = new Map();

    for (const item of vocabulario) {

        mapa.set(
            item.palavra,
            item.indice
        );
    }

    return mapa;
}


/* ============================================================
   GERAR VETOR TF-IDF
   ============================================================ */

function gerarVetorTFIDF(
    texto,
    mapaVocabulario,
    idf
) {

    const tokens = tokenizar(texto);

    const frequencias = new Map();


    /* --------------------------------------------------------
       CONTAR FREQUÊNCIA DAS PALAVRAS
       -------------------------------------------------------- */

    for (const token of tokens) {

        if (!mapaVocabulario.has(token)) {
            continue;
        }

        const frequenciaAtual =
            frequencias.get(token) || 0;

        frequencias.set(
            token,
            frequenciaAtual + 1
        );
    }


    /* --------------------------------------------------------
       CRIAR VETOR
       -------------------------------------------------------- */

    const vetor = new Array(idf.length).fill(0);


    /* --------------------------------------------------------
       CALCULAR TF-IDF
       -------------------------------------------------------- */

    for (const [palavra, frequencia] of frequencias) {

        const indice =
            mapaVocabulario.get(palavra);

        const tf =
            1 + Math.log(frequencia);

        vetor[indice] =
            tf * idf[indice];
    }


    /* --------------------------------------------------------
       NORMALIZAÇÃO L2
       -------------------------------------------------------- */

    let norma = 0;

    for (const valor of vetor) {

        norma += valor * valor;
    }

    norma = Math.sqrt(norma);

    if (norma > 0) {

        for (let i = 0; i < vetor.length; i++) {

            vetor[i] /= norma;
        }
    }

    return vetor;
}


/* ============================================================
   REALIZAR PREDIÇÃO
   ============================================================ */

function prever(
    texto,
    modelo,
    mapaVocabulario
) {

    const vetor = gerarVetorTFIDF(
        texto,
        mapaVocabulario,
        modelo.idf
    );

    const logits = [];


    /* --------------------------------------------------------
       CALCULAR SCORE DE CADA CLASSE
       -------------------------------------------------------- */

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

            if (vetor[i] !== 0) {

                score +=
                    pesos[i] * vetor[i];
            }
        }

        logits.push(score);
    }


    /* --------------------------------------------------------
       CONVERTER SCORES PARA PROBABILIDADES
       -------------------------------------------------------- */

    const probabilidades =
        softmax(logits);


    /* --------------------------------------------------------
       ENCONTRAR A MAIOR PROBABILIDADE
       -------------------------------------------------------- */

    let indiceMelhor = 0;

    for (
        let i = 1;
        i < probabilidades.length;
        i++
    ) {

        if (
            probabilidades[i] >
            probabilidades[indiceMelhor]
        ) {

            indiceMelhor = i;
        }
    }


    return {

        narrativa:
            modelo.classes[indiceMelhor],

        confianca:
            probabilidades[indiceMelhor],

        probabilidades
    };
}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

async function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" APLICAÇÃO DO MODELO DE NARRATIVAS");
    console.log("============================================================");
    console.log("");


    try {

        /* ====================================================
           CARREGAR MODELO
           ==================================================== */

        console.log("Carregando modelo...");

        const modelo = JSON.parse(
            fs.readFileSync(
                MODELO_PATH,
                "utf8"
            )
        );

        console.log("Modelo carregado.");
        console.log("");


        /* ====================================================
           VALIDAR MODELO
           ==================================================== */

        if (!Array.isArray(modelo.classes)) {

            throw new Error(
                "O modelo não possui o campo 'classes'."
            );
        }

        if (!Array.isArray(modelo.vocabulario)) {

            throw new Error(
                "O modelo não possui o campo 'vocabulario'."
            );
        }

        if (!Array.isArray(modelo.idf)) {

            throw new Error(
                "O modelo não possui o campo 'idf'."
            );
        }

        if (!Array.isArray(modelo.pesos)) {

            throw new Error(
                "O modelo não possui o campo 'pesos'."
            );
        }

        if (!Array.isArray(modelo.bias)) {

            throw new Error(
                "O modelo não possui o campo 'bias'."
            );
        }


        /* ====================================================
           VALIDAR DIMENSÕES
           ==================================================== */

        if (
            modelo.vocabulario.length !==
            modelo.idf.length
        ) {

            throw new Error(
                "O tamanho do vocabulário é diferente do tamanho do IDF."
            );
        }

        if (
            modelo.pesos.length !==
            modelo.classes.length
        ) {

            throw new Error(
                "A quantidade de pesos não corresponde às classes."
            );
        }

        if (
            modelo.bias.length !==
            modelo.classes.length
        ) {

            throw new Error(
                "A quantidade de bias não corresponde às classes."
            );
        }

        for (
            let i = 0;
            i < modelo.pesos.length;
            i++
        ) {

            if (
                modelo.pesos[i].length !==
                modelo.vocabulario.length
            ) {

                throw new Error(
                    `A matriz de pesos da classe ${i} possui tamanho incorreto.`
                );
            }
        }


        /* ====================================================
           MOSTRAR ESTRUTURA
           ==================================================== */

        console.log(
            "Classes:",
            modelo.classes.length
        );

        console.log(
            "Vocabulário:",
            modelo.vocabulario.length
        );

        console.log(
            "IDF:",
            modelo.idf.length
        );

        console.log(
            "Pesos:",
            modelo.pesos.length,
            "x",
            modelo.pesos[0].length
        );

        console.log(
            "Bias:",
            modelo.bias.length
        );

        console.log("");


        /* ====================================================
           PREPARAR VOCABULÁRIO
           ==================================================== */

        console.log(
            "Preparando vocabulário..."
        );

        const mapaVocabulario =
            criarMapaVocabulario(
                modelo.vocabulario
            );

        console.log(
            "Termos carregados:",
            mapaVocabulario.size
        );

        console.log("");


        /* ====================================================
           CONECTAR AO MONGODB
           ==================================================== */

        console.log(
            "Conectando ao MongoDB..."
        );

        if (!process.env.MONGO_URI) {

            throw new Error(
                "MONGO_URI não encontrada no arquivo .env."
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB conectado."
        );

        console.log("");


        /* ====================================================
           BUSCAR NOTÍCIAS
           ==================================================== */

        console.log(
            "Buscando notícias históricas..."
        );

        const posts =
            await Post.find({})
                .select(
                    "_id newsId title content source coin sentiment narrative publishedAt"
                )
                .lean();

        console.log(
            "Notícias encontradas:",
            posts.length
        );

        console.log("");


        /* ====================================================
           PROCESSAR NOTÍCIAS
           ==================================================== */

        const resultados = [];

        const distribuicao = {};

        let somaConfianca = 0;

        const inicio = Date.now();


        for (
            let i = 0;
            i < posts.length;
            i++
        ) {

            const post = posts[i];


            /* ------------------------------------------------
               JUNTAR TÍTULO E CONTEÚDO
               ------------------------------------------------ */

            const texto = [
                post.title || "",
                post.content || ""
            ].join(" ");


            /* ------------------------------------------------
               FAZER PREDIÇÃO
               ------------------------------------------------ */

            const resultado =
                prever(
                    texto,
                    modelo,
                    mapaVocabulario
                );


            /* ------------------------------------------------
               GUARDAR RESULTADO
               ------------------------------------------------ */

            const registro = {

                _id: post._id,

                newsId: post.newsId,

                title: post.title,

                source: post.source,

                coin: post.coin,

                sentiment: post.sentiment,

                publishedAt: post.publishedAt,

                narrativeOriginal:
                    post.narrative || null,

                narrativeML:
                    resultado.narrativa,

                narrativeMLConfidence:
                    resultado.confianca,

                probabilidades:
                    Object.fromEntries(
                        modelo.classes.map(
                            (classe, indice) => [
                                classe,
                                resultado.probabilidades[indice]
                            ]
                        )
                    )
            };


            resultados.push(registro);


            /* ------------------------------------------------
               CONTABILIZAR DISTRIBUIÇÃO
               ------------------------------------------------ */

            if (
                !distribuicao[
                    resultado.narrativa
                ]
            ) {

                distribuicao[
                    resultado.narrativa
                ] = 0;
            }

            distribuicao[
                resultado.narrativa
            ]++;


            somaConfianca +=
                resultado.confianca;


            /* ------------------------------------------------
               MOSTRAR PROGRESSO
               ------------------------------------------------ */

            if (
                (i + 1) % 500 === 0 ||
                i + 1 === posts.length
            ) {

                const percentual =
                    (
                        ((i + 1) / posts.length) *
                        100
                    ).toFixed(2);

                console.log(
                    `Processadas: ${i + 1}/${posts.length} (${percentual}%)`
                );
            }
        }


        /* ====================================================
           TEMPO DE PROCESSAMENTO
           ==================================================== */

        const tempo =
            (
                (Date.now() - inicio) /
                1000
            ).toFixed(2);


        /* ====================================================
           CONFIANÇA MÉDIA
           ==================================================== */

        const confiancaMedia =
            resultados.length > 0
                ? somaConfianca / resultados.length
                : 0;


        /* ====================================================
           ORDENAR DISTRIBUIÇÃO
           ==================================================== */

        const distribuicaoOrdenada =
            Object.entries(distribuicao)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                )
                .map(
                    ([narrativa, quantidade]) => {

                        return {

                            narrativa,

                            quantidade,

                            percentual:
                                Number(
                                    (
                                        quantidade /
                                        resultados.length *
                                        100
                                    ).toFixed(2)
                                )
                        };
                    }
                );


        /* ====================================================
           CRIAR DIRETÓRIO DE SAÍDA
           ==================================================== */

        fs.mkdirSync(
            SAIDA_DIR,
            {
                recursive: true
            }
        );


        /* ====================================================
           SALVAR PREVISÕES
           ==================================================== */

        fs.writeFileSync(
            SAIDA_PATH,
            JSON.stringify(
                resultados,
                null,
                2
            ),
            "utf8"
        );


        /* ====================================================
           CRIAR RELATÓRIO
           ==================================================== */

        const relatorio = {

            modelo: {

                tipo:
                    modelo.tipo,

                classes:
                    modelo.classes,

                tamanhoVocabulario:
                    modelo.vocabulario.length,

                tamanhoIDF:
                    modelo.idf.length,

                dimensoesPesos: [

                    modelo.pesos.length,

                    modelo.pesos[0].length

                ]
            },

            dataset: {

                totalNoticias:
                    resultados.length,

                confiancaMedia:
                    Number(
                        confiancaMedia.toFixed(6)
                    )
            },

            distribuicao:
                distribuicaoOrdenada,

            tempoProcessamentoSegundos:
                Number(tempo),

            mongoModificado:
                false,

            observacao:
                "As previsões foram geradas separadamente. O campo narrative original não foi alterado."
        };


        /* ====================================================
           SALVAR RELATÓRIO
           ==================================================== */

        fs.writeFileSync(
            RELATORIO_PATH,
            JSON.stringify(
                relatorio,
                null,
                2
            ),
            "utf8"
        );


        /* ====================================================
           RESULTADO FINAL
           ==================================================== */

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " PROCESSAMENTO CONCLUÍDO"
        );

        console.log(
            "============================================================"
        );

        console.log("");

        console.log(
            "Total processado:",
            resultados.length
        );

        console.log(
            "Confiança média:",
            `${(confiancaMedia * 100).toFixed(2)}%`
        );

        console.log(
            "Tempo:",
            `${tempo} segundos`
        );

        console.log("");

        console.log(
            "Distribuição das narrativas:"
        );

        console.log("");


        for (
            const item of distribuicaoOrdenada
        ) {

            console.log(
                `${item.narrativa.padEnd(25)} ` +
                `${String(item.quantidade).padStart(5)} ` +
                `(${item.percentual.toFixed(2)}%)`
            );
        }


        console.log("");

        console.log(
            "Arquivo de previsões:",
            SAIDA_PATH
        );

        console.log(
            "Relatório:",
            RELATORIO_PATH
        );

        console.log("");

        console.log(
            "MongoDB NÃO foi alterado."
        );

        console.log("");


        /* ====================================================
           ENCERRAR CONEXÃO
           ==================================================== */

        await mongoose.disconnect();

    } catch (error) {

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " ERRO AO APLICAR MODELO"
        );

        console.log(
            "============================================================"
        );

        console.log("");

        console.error(
            error
        );

        console.log("");

        await mongoose
            .disconnect()
            .catch(() => {});

        process.exit(1);
    }
}


/* ============================================================
   INICIAR
   ============================================================ */

executar();