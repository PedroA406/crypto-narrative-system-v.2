require("dotenv").config();

const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

const Post = require("../models/Post");


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

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
        "relatorio_dataset_ml.json"
    );


/* ============================================================
   GARANTIR PASTA
   ============================================================ */

if (!fs.existsSync(DATASET_DIR)) {

    fs.mkdirSync(
        DATASET_DIR,
        {
            recursive: true
        }
    );

}


/* ============================================================
   NORMALIZAR TEXTO
   ============================================================ */

function prepararTexto(
    titulo,
    conteudo
) {

    const texto =
        `${titulo || ""} ${conteudo || ""}`;

    return texto

        .replace(
            /<[^>]*>/g,
            " "
        )

        .replace(
            /&nbsp;/gi,
            " "
        )

        .replace(
            /&amp;/gi,
            "&"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();

}


/* ============================================================
   EMBARALHAR ARRAY
   ============================================================ */

function embaralhar(array) {

    const copia =
        [...array];

    for (
        let i = copia.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );

        [
            copia[i],
            copia[j]
        ] =
        [
            copia[j],
            copia[i]
        ];

    }

    return copia;

}


/* ============================================================
   DIVIDIR ESTRATIFICADO
   ============================================================ */

function dividirEstratificado(
    registros,
    percentualTeste = 0.20
) {

    const grupos = {};


    /*
        Separar por narrativa.
    */

    for (
        const registro of registros
    ) {

        const narrativa =
            registro.narrative ||
            "general";


        if (!grupos[narrativa]) {

            grupos[narrativa] = [];

        }


        grupos[narrativa].push(
            registro
        );

    }


    const treino = [];
    const teste = [];


    /*
        Fazer a divisão dentro de cada narrativa.
    */

    for (
        const narrativa of Object.keys(grupos)
    ) {

        const grupo =
            embaralhar(
                grupos[narrativa]
            );


        let quantidadeTeste =
            Math.floor(
                grupo.length *
                percentualTeste
            );


        /*
            Se houver pelo menos 5 registros,
            garantir pelo menos 1 no teste.
        */

        if (
            grupo.length >= 5 &&
            quantidadeTeste < 1
        ) {

            quantidadeTeste = 1;

        }


        const registrosTeste =
            grupo.slice(
                0,
                quantidadeTeste
            );

        const registrosTreino =
            grupo.slice(
                quantidadeTeste
            );


        treino.push(
            ...registrosTreino
        );

        teste.push(
            ...registrosTeste
        );

    }


    return {

        treino:
            embaralhar(treino),

        teste:
            embaralhar(teste)

    };

}


/* ============================================================
   ESTATÍSTICAS
   ============================================================ */

function gerarDistribuicao(
    registros
) {

    const distribuicao = {};


    for (
        const registro of registros
    ) {

        const narrativa =
            registro.narrative ||
            "general";


        if (!distribuicao[narrativa]) {

            distribuicao[narrativa] = 0;

        }


        distribuicao[narrativa]++;

    }


    return Object.fromEntries(

        Object.entries(
            distribuicao
        )
        .sort(
            (a, b) =>
                b[1] - a[1]
        )

    );

}


/* ============================================================
   EXECUÇÃO
   ============================================================ */

async function executar() {

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "          PREPARAÇÃO DO DATASET PARA MACHINE LEARNING"
    );
    console.log(
        "============================================================"
    );
    console.log("");


    if (!MONGODB_URI) {

        throw new Error(
            "MONGODB_URI ou MONGO_URI não encontrado no .env"
        );

    }


    await mongoose.connect(
        MONGODB_URI
    );


    console.log(
        "MongoDB conectado."
    );


    /*
        Buscar somente os campos necessários.
    */

    const noticias =
        await Post.find({})
            .select(
                "newsId title content coin sentiment narrative publishedAt source"
            )
            .lean();


    console.log(
        `Notícias encontradas: ${noticias.length}`
    );


    const registros = [];


    /*
        Preparar registros.
    */

    for (
        const noticia of noticias
    ) {

        const texto =
            prepararTexto(
                noticia.title,
                noticia.content
            );


        if (!texto) {

            continue;

        }


        const narrativa =
            noticia.narrative ||
            "general";


        registros.push({

            newsId:
                noticia.newsId || null,

            text:
                texto,

            narrative:
                narrativa,

            sentiment:
                noticia.sentiment || "neutral",

            coin:
                noticia.coin || "GENERAL",

            publishedAt:
                noticia.publishedAt || null,

            source:
                noticia.source || ""

        });

    }


    console.log(
        `Registros utilizáveis: ${registros.length}`
    );


    /*
        Divisão estratificada:
        80% treino
        20% teste
    */

    const resultado =
        dividirEstratificado(
            registros,
            0.20
        );


    const datasetTreino =
        resultado.treino;

    const datasetTeste =
        resultado.teste;


    console.log(
        `Dataset de treino: ${datasetTreino.length}`
    );

    console.log(
        `Dataset de teste: ${datasetTeste.length}`
    );


    /*
        Distribuições.
    */

    const distribuicaoTotal =
        gerarDistribuicao(
            registros
        );

    const distribuicaoTreino =
        gerarDistribuicao(
            datasetTreino
        );

    const distribuicaoTeste =
        gerarDistribuicao(
            datasetTeste
        );


    /*
        Salvar treino.
    */

    fs.writeFileSync(

        ARQUIVO_TREINO,

        JSON.stringify(
            datasetTreino,
            null,
            2
        ),

        "utf8"

    );


    /*
        Salvar teste.
    */

    fs.writeFileSync(

        ARQUIVO_TESTE,

        JSON.stringify(
            datasetTeste,
            null,
            2
        ),

        "utf8"

    );


    /*
        Relatório.
    */

    const relatorio = {

        dataExecucao:
            new Date().toISOString(),

        totalMongoDB:
            noticias.length,

        totalUtilizavel:
            registros.length,

        totalTreino:
            datasetTreino.length,

        totalTeste:
            datasetTeste.length,

        percentualTreino:
            Number(
                (
                    datasetTreino.length /
                    registros.length *
                    100
                ).toFixed(2)
            ),

        percentualTeste:
            Number(
                (
                    datasetTeste.length /
                    registros.length *
                    100
                ).toFixed(2)
            ),

        distribuicaoTotal,

        distribuicaoTreino,

        distribuicaoTeste,

        observacao:
            "Dataset preparado sem alterar os documentos do MongoDB."

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
        "------------------------------------------------------------"
    );
    console.log(
        "DISTRIBUIÇÃO TOTAL"
    );
    console.log(
        "------------------------------------------------------------"
    );


    for (
        const [narrativa, quantidade]
        of Object.entries(
            distribuicaoTotal
        )
    ) {

        console.log(
            `${narrativa.padEnd(30)} ${quantidade}`
        );

    }


    console.log("");
    console.log(
        "------------------------------------------------------------"
    );
    console.log(
        "DISTRIBUIÇÃO TREINO"
    );
    console.log(
        "------------------------------------------------------------"
    );


    for (
        const [narrativa, quantidade]
        of Object.entries(
            distribuicaoTreino
        )
    ) {

        console.log(
            `${narrativa.padEnd(30)} ${quantidade}`
        );

    }


    console.log("");
    console.log(
        "------------------------------------------------------------"
    );
    console.log(
        "DISTRIBUIÇÃO TESTE"
    );
    console.log(
        "------------------------------------------------------------"
    );


    for (
        const [narrativa, quantidade]
        of Object.entries(
            distribuicaoTeste
        )
    ) {

        console.log(
            `${narrativa.padEnd(30)} ${quantidade}`
        );

    }


    console.log("");
    console.log(
        "------------------------------------------------------------"
    );

    console.log(
        "ARQUIVOS GERADOS:"
    );

    console.log(
        ARQUIVO_TREINO
    );

    console.log(
        ARQUIVO_TESTE
    );

    console.log(
        ARQUIVO_RELATORIO
    );

    console.log(
        "------------------------------------------------------------"
    );

    console.log("");

    console.log(
        "Dataset preparado com sucesso."
    );

    console.log(
        "MongoDB não foi alterado."
    );

    console.log("");


    await mongoose.disconnect();

}


executar()

    .catch(
        async erro => {

            console.error("");
            console.error(
                "ERRO:"
            );
            console.error(
                erro.message
            );
            console.error("");

            try {

                await mongoose.disconnect();

            } catch (_) {}

            process.exit(1);

        }
    );