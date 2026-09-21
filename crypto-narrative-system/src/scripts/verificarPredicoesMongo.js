const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const Post = require("../models/Post");

const ARQUIVO_PREDICOES = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/predicoes_narrativas.json"
);

const NARRATIVAS_VALIDAS = [
    "adoption",
    "general",
    "institutional_investment",
    "market",
    "mining",
    "regulation",
    "security",
    "technology"
];


async function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" VERIFICAÇÃO DAS PREDIÇÕES NO MONGODB");
    console.log("============================================================");
    console.log("");

    try {

        /*
        |--------------------------------------------------------------------------
        | CONECTAR
        |--------------------------------------------------------------------------
        */

        if (!process.env.MONGO_URI) {

            throw new Error(
                "MONGO_URI não encontrada no arquivo .env."
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log("MongoDB conectado.");
        console.log("");


        /*
        |--------------------------------------------------------------------------
        | CARREGAR PREVISÕES
        |--------------------------------------------------------------------------
        */

        const predicoes =
            JSON.parse(
                fs.readFileSync(
                    ARQUIVO_PREDICOES,
                    "utf8"
                )
            );

        console.log(
            `Previsões no arquivo: ${predicoes.length}`
        );


        /*
        |--------------------------------------------------------------------------
        | PEGAR SOMENTE PREVISÕES VÁLIDAS
        |--------------------------------------------------------------------------
        */

        const validas =
            predicoes.filter(
                previsao =>
                    previsao.newsId &&
                    NARRATIVAS_VALIDAS.includes(
                        previsao.narrativeML
                    ) &&
                    typeof previsao.narrativeMLConfidence === "number"
            );


        console.log(
            `Previsões válidas: ${validas.length}`
        );

        console.log("");


        /*
        |--------------------------------------------------------------------------
        | BUSCAR OS NEWSIDS NO MONGODB
        |--------------------------------------------------------------------------
        */

        const newsIds =
            validas.map(
                previsao => previsao.newsId
            );


        const documentos =
            await Post.find({

                newsId: {
                    $in: newsIds
                }

            })
            .select(
                "newsId narrativeML narrativeMLConfidence"
            )
            .lean();


        console.log(
            `Documentos encontrados no MongoDB: ${documentos.length}`
        );


        /*
        |--------------------------------------------------------------------------
        | CRIAR MAPA
        |--------------------------------------------------------------------------
        */

        const mapaMongo =
            new Map();

        for (const documento of documentos) {

            mapaMongo.set(
                documento.newsId,
                documento
            );
        }


        /*
        |--------------------------------------------------------------------------
        | ANALISAR
        |--------------------------------------------------------------------------
        */

        let semNarrativaML = 0;
        let semConfianca = 0;
        let narrativaDiferente = 0;
        let confiancaDiferente = 0;
        let totalmenteIguais = 0;


        const problemas = [];


        for (const previsao of validas) {

            const documento =
                mapaMongo.get(
                    previsao.newsId
                );


            /*
            |--------------------------------------------------------------------------
            | DOCUMENTO NÃO ENCONTRADO
            |--------------------------------------------------------------------------
            */

            if (!documento) {

                problemas.push({

                    tipo: "NAO_ENCONTRADO",

                    newsId:
                        previsao.newsId

                });

                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | SEM NARRATIVA
            |--------------------------------------------------------------------------
            */

            if (!documento.narrativeML) {

                semNarrativaML++;

                problemas.push({

                    tipo: "SEM_NARRATIVA_ML",

                    newsId:
                        previsao.newsId

                });

                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | SEM CONFIANÇA
            |--------------------------------------------------------------------------
            */

            if (
                documento.narrativeMLConfidence === null ||
                documento.narrativeMLConfidence === undefined
            ) {

                semConfianca++;

                problemas.push({

                    tipo: "SEM_CONFIANCA",

                    newsId:
                        previsao.newsId

                });

                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | COMPARAR NARRATIVA
            |--------------------------------------------------------------------------
            */

            const narrativaIgual =
                documento.narrativeML ===
                previsao.narrativeML;


            /*
            |--------------------------------------------------------------------------
            | COMPARAR CONFIANÇA
            |--------------------------------------------------------------------------
            */

            const confiancaIgual =
                Math.abs(
                    documento.narrativeMLConfidence -
                    previsao.narrativeMLConfidence
                ) < 0.000001;


            if (!narrativaIgual) {

                narrativaDiferente++;

                problemas.push({

                    tipo: "NARRATIVA_DIFERENTE",

                    newsId:
                        previsao.newsId,

                    arquivo:
                        previsao.narrativeML,

                    mongo:
                        documento.narrativeML

                });
            }


            if (!confiancaIgual) {

                confiancaDiferente++;

                problemas.push({

                    tipo: "CONFIANCA_DIFERENTE",

                    newsId:
                        previsao.newsId,

                    arquivo:
                        previsao.narrativeMLConfidence,

                    mongo:
                        documento.narrativeMLConfidence

                });
            }


            if (
                narrativaIgual &&
                confiancaIgual
            ) {

                totalmenteIguais++;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | CONTAGENS DIRETAS NO MONGODB
        |--------------------------------------------------------------------------
        */

        const totalComNarrativa =
            await Post.countDocuments({

                narrativeML: {
                    $in: NARRATIVAS_VALIDAS
                }

            });


        const totalComConfianca =
            await Post.countDocuments({

                narrativeMLConfidence: {
                    $ne: null
                }

            });


        /*
        |--------------------------------------------------------------------------
        | DISTRIBUIÇÃO
        |--------------------------------------------------------------------------
        */

        const distribuicao =
            await Post.aggregate([

                {
                    $match: {

                        narrativeML: {
                            $in: NARRATIVAS_VALIDAS
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


        /*
        |--------------------------------------------------------------------------
        | RESULTADO
        |--------------------------------------------------------------------------
        */

        console.log("");
        console.log("============================================================");
        console.log(" RESULTADO DA VERIFICAÇÃO");
        console.log("============================================================");
        console.log("");

        console.log(
            `Total com narrativeML: ${totalComNarrativa}`
        );

        console.log(
            `Total com confiança: ${totalComConfianca}`
        );

        console.log(
            `Sem narrativeML: ${semNarrativaML}`
        );

        console.log(
            `Sem confiança: ${semConfianca}`
        );

        console.log(
            `Narrativa diferente do arquivo: ${narrativaDiferente}`
        );

        console.log(
            `Confiança diferente do arquivo: ${confiancaDiferente}`
        );

        console.log(
            `Completamente iguais: ${totalmenteIguais}`
        );


        console.log("");
        console.log("Distribuição encontrada no MongoDB:");
        console.log("");


        for (const item of distribuicao) {

            console.log(
                `${item._id.padEnd(25)} ${item.quantidade}`
            );
        }


        console.log("");
        console.log(
            `Problemas identificados: ${problemas.length}`
        );


        /*
        |--------------------------------------------------------------------------
        | MOSTRAR ALGUNS PROBLEMAS
        |--------------------------------------------------------------------------
        */

        if (problemas.length > 0) {

            console.log("");
            console.log("Primeiros problemas encontrados:");
            console.log("");

            for (
                const problema of problemas.slice(0, 20)
            ) {

                console.log(
                    JSON.stringify(
                        problema
                    )
                );
            }
        }


        console.log("");
        console.log("============================================================");
        console.log(" VERIFICAÇÃO FINALIZADA");
        console.log("============================================================");
        console.log("");

    } catch (error) {

        console.error("");
        console.error("ERRO:");
        console.error(error.message);
        console.error("");

    } finally {

        if (
            mongoose.connection.readyState !== 0
        ) {

            await mongoose.connection.close();

            console.log(
                "Conexão com MongoDB encerrada."
            );
        }
    }
}


executar();