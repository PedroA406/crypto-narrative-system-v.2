const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Post = require("../models/Post");


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const ARQUIVO_PREDICOES = path.join(
    process.cwd(),
    "dataset",
    "predicoes_narrativas",
    "predicoes_narrativas_unicas.json"
);

const TAMANHO_LOTE = 500;


/* ============================================================
   FUNÇÕES AUXILIARES
   ============================================================ */

function carregarPredicoes() {

    console.log("\nCarregando arquivo de previsões...");

    if (!fs.existsSync(ARQUIVO_PREDICOES)) {

        throw new Error(
            `Arquivo não encontrado:\n${ARQUIVO_PREDICOES}`
        );
    }

    const conteudo = fs.readFileSync(
        ARQUIVO_PREDICOES,
        "utf8"
    );

    const predicoes = JSON.parse(conteudo);

    if (!Array.isArray(predicoes)) {

        throw new Error(
            "O arquivo de previsões não contém um array."
        );
    }

    console.log(
        `Previsões encontradas: ${predicoes.length}`
    );

    return predicoes;
}


/* ============================================================
   VALIDAÇÃO
   ============================================================ */

function validarPredicao(predicao) {

    if (!predicao) {
        return false;
    }

    if (
        typeof predicao.newsId !== "string" ||
        predicao.newsId.trim() === ""
    ) {
        return false;
    }

    if (
        typeof predicao.narrativeML !== "string" ||
        predicao.narrativeML.trim() === ""
    ) {
        return false;
    }

    if (
        typeof predicao.narrativeMLConfidence !== "number"
    ) {
        return false;
    }

    if (
        predicao.narrativeMLConfidence < 0 ||
        predicao.narrativeMLConfidence > 1
    ) {
        return false;
    }

    return true;
}


/* ============================================================
   VALIDAR TODAS AS PREVISÕES
   ============================================================ */

function validarPredicoes(predicoes) {

    console.log("\nValidando previsões...");

    const validas = [];
    const invalidas = [];

    for (const predicao of predicoes) {

        if (validarPredicao(predicao)) {

            validas.push(predicao);

        } else {

            invalidas.push(predicao);
        }
    }

    console.log(
        `Previsões válidas: ${validas.length}`
    );

    console.log(
        `Previsões inválidas: ${invalidas.length}`
    );

    return {
        validas,
        invalidas
    };
}


/* ============================================================
   ATUALIZAÇÃO DO MONGODB
   ============================================================ */

async function atualizarMongo(predicoes) {

    console.log("\nIniciando atualização do MongoDB...");

    console.log("\nCampos que serão alterados:");
    console.log(" - narrativeML");
    console.log(" - narrativeMLConfidence");

    console.log("\nNenhum outro campo será alterado.");

    let processadas = 0;
    let modificadas = 0;
    let encontradas = 0;
    let naoEncontradas = 0;
    let lotesComErro = 0;

    for (
        let inicio = 0;
        inicio < predicoes.length;
        inicio += TAMANHO_LOTE
    ) {

        const lote = predicoes.slice(
            inicio,
            inicio + TAMANHO_LOTE
        );

        const operacoes = lote.map((predicao) => ({

            updateOne: {

                filter: {
                    newsId: predicao.newsId
                },

                update: {

                    $set: {

                        narrativeML:
                            predicao.narrativeML,

                        narrativeMLConfidence:
                            predicao.narrativeMLConfidence

                    }

                },

                upsert: false

            }

        }));

        try {

            const resultado =
                await Post.bulkWrite(
                    operacoes,
                    {
                        ordered: false
                    }
                );

            modificadas +=
                resultado.modifiedCount || 0;

            encontradas +=
                resultado.matchedCount || 0;

            naoEncontradas +=
                lote.length -
                (resultado.matchedCount || 0);

        } catch (error) {

            lotesComErro++;

            console.error(
                "\nErro ao processar lote:",
                error.message
            );
        }

        processadas += lote.length;

        const percentual =
            (
                processadas /
                predicoes.length
            ) * 100;

        console.log(
            `Processadas: ${processadas}/${predicoes.length} ` +
            `(${percentual.toFixed(2)}%)`
        );
    }

    return {

        processadas,
        modificadas,
        encontradas,
        naoEncontradas,
        lotesComErro

    };
}


/* ============================================================
   VERIFICAÇÃO DOS DADOS
   ============================================================ */

async function verificarDados() {

    console.log(
        "\nVerificando dados gravados..."
    );

    const totalNarrativeML =
        await Post.countDocuments({
            narrativeML: {
                $exists: true,
                $ne: ""
            }
        });

    const totalConfidence =
        await Post.countDocuments({
            narrativeMLConfidence: {
                $exists: true,
                $ne: null
            }
        });

    console.log(
        `Notícias com narrativeML: ${totalNarrativeML}`
    );

    console.log(
        `Notícias com confiança ML: ${totalConfidence}`
    );


    /* ========================================================
       DISTRIBUIÇÃO
       ======================================================== */

    const distribuicao =
        await Post.aggregate([

            {
                $match: {

                    narrativeML: {
                        $exists: true,
                        $ne: ""
                    }

                }
            },

            {
                $group: {

                    _id: "$narrativeML",

                    quantidade: {
                        $sum: 1
                    }

                }
            },

            {
                $sort: {
                    quantidade: -1
                }
            }

        ]);


    console.log(
        "\nDistribuição das narrativas ML:\n"
    );

    for (const item of distribuicao) {

        console.log(
            `${item._id.padEnd(26)} ${item.quantidade}`
        );
    }


    /* ========================================================
       CONFIANÇA MÉDIA
       ======================================================== */

    const confianca =
        await Post.aggregate([

            {
                $match: {

                    narrativeMLConfidence: {
                        $exists: true,
                        $ne: null
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
                    }

                }
            }

        ]);


    if (confianca.length > 0) {

        const resultado = confianca[0];

        console.log(
            "\nConfiança do modelo:"
        );

        console.log(
            `Média: ${(resultado.media * 100).toFixed(2)}%`
        );

        console.log(
            `Mínima: ${(resultado.minimo * 100).toFixed(2)}%`
        );

        console.log(
            `Máxima: ${(resultado.maximo * 100).toFixed(2)}%`
        );
    }
}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

async function executar() {

    console.log(
        "\n============================================================"
    );

    console.log(
        " IMPORTAÇÃO DAS PREDIÇÕES DE NARRATIVAS"
    );

    console.log(
        "============================================================"
    );


    try {

        /* ----------------------------------------------------
           1. CARREGAR ARQUIVO
           ---------------------------------------------------- */

        const predicoes =
            carregarPredicoes();


        /* ----------------------------------------------------
           2. VALIDAR
           ---------------------------------------------------- */

        const resultadoValidacao =
            validarPredicoes(predicoes);


        const predicoesValidas =
            resultadoValidacao.validas;


        /* ----------------------------------------------------
           3. CONECTAR AO MONGODB
           ---------------------------------------------------- */

        console.log(
            "\nConectando ao MongoDB..."
        );

        if (!process.env.MONGO_URI) {

            throw new Error(
                "A variável MONGO_URI não foi encontrada no arquivo .env."
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB conectado."
        );


        /* ----------------------------------------------------
           4. ATUALIZAR
           ---------------------------------------------------- */

        const resultado =
            await atualizarMongo(
                predicoesValidas
            );


        /* ----------------------------------------------------
           5. VERIFICAR
           ---------------------------------------------------- */

        await verificarDados();


        /* ----------------------------------------------------
           6. RESULTADO FINAL
           ---------------------------------------------------- */

        console.log(
            "\n============================================================"
        );

        console.log(
            " IMPORTAÇÃO CONCLUÍDA"
        );

        console.log(
            "============================================================"
        );

        console.log(
            `\nTotal de previsões no arquivo: ${predicoes.length}`
        );

        console.log(
            `Previsões válidas: ${predicoesValidas.length}`
        );

        console.log(
            `Processadas: ${resultado.processadas}`
        );

        console.log(
            `Documentos encontrados: ${resultado.encontradas}`
        );

        console.log(
            `Documentos modificados: ${resultado.modificadas}`
        );

        console.log(
            `Não encontradas: ${resultado.naoEncontradas}`
        );

        console.log(
            `Lotes com erro: ${resultado.lotesComErro}`
        );


        console.log(
            "\nIMPORTANTE:"
        );

        console.log(
            "As classificações originais em 'narrative' foram preservadas."
        );

        console.log(
            "Somente 'narrativeML' e 'narrativeMLConfidence' foram atualizados."
        );

        console.log(
            "\nConexão com MongoDB encerrada."
        );


    } catch (error) {

        console.error(
            "\nERRO:"
        );

        console.error(
            error.message
        );

        process.exitCode = 1;

    } finally {

        if (mongoose.connection.readyState !== 0) {

            await mongoose.connection.close();
        }
    }
}


/* ============================================================
   INICIAR
   ============================================================ */

executar();