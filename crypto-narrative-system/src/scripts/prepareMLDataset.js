const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Post = require("../models/Post");


/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
*/

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

const LIMITE_TEXTO = 12000;

const DIRETORIO_DATASET =
    path.join(process.cwd(), "dataset");

const ARQUIVO_DATASET =
    path.join(
        DIRETORIO_DATASET,
        "dataset_ml_preparado.json"
    );

const ARQUIVO_RELATORIO =
    path.join(
        DIRETORIO_DATASET,
        "relatorio_preparacao.json"
    );


/*
|--------------------------------------------------------------------------
| VALIDAR CONEXÃO
|--------------------------------------------------------------------------
*/

if (!MONGODB_URI) {

    console.error(
        "\nERRO: MONGODB_URI ou MONGO_URI não foi encontrado no .env.\n"
    );

    process.exit(1);
}


/*
|--------------------------------------------------------------------------
| LIMPAR TEXTO
|--------------------------------------------------------------------------
|
| Essa função prepara o texto da notícia para o Machine Learning.
|
*/

function limparTexto(texto) {

    if (!texto) {
        return "";
    }

    let textoLimpo = String(texto);


    /*
    |--------------------------------------------------------------------------
    | REMOVER HTML
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo.replace(
            /<[^>]*>/g,
            " "
        );


    /*
    |--------------------------------------------------------------------------
    | REMOVER ALGUNS ELEMENTOS DE SCRIPT E STYLE
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo.replace(
            /javascript:/gi,
            " "
        );


    /*
    |--------------------------------------------------------------------------
    | DECODIFICAR ALGUMAS ENTIDADES HTML COMUNS
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo
            .replace(/&nbsp;/gi, " ")
            .replace(/&amp;/gi, "&")
            .replace(/&quot;/gi, '"')
            .replace(/&#39;/gi, "'")
            .replace(/&lt;/gi, "<")
            .replace(/&gt;/gi, ">");


    /*
    |--------------------------------------------------------------------------
    | NORMALIZAR QUEBRAS DE LINHA
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo.replace(
            /[\r\n\t]+/g,
            " "
        );


    /*
    |--------------------------------------------------------------------------
    | REMOVER ESPAÇOS DUPLICADOS
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo.replace(
            /\s+/g,
            " "
        );


    /*
    |--------------------------------------------------------------------------
    | REMOVER ESPAÇOS NAS EXTREMIDADES
    |--------------------------------------------------------------------------
    */

    textoLimpo =
        textoLimpo.trim();


    /*
    |--------------------------------------------------------------------------
    | LIMITAR TEXTOS EXTREMAMENTE GRANDES
    |--------------------------------------------------------------------------
    |
    | Algumas notícias da base possuem centenas de milhares
    | de caracteres.
    |
    | Para o dataset de ML vamos trabalhar com um tamanho
    | controlado.
    |
    */

    if (textoLimpo.length > LIMITE_TEXTO) {

        textoLimpo =
            textoLimpo.substring(
                0,
                LIMITE_TEXTO
            );
    }


    return textoLimpo;
}


/*
|--------------------------------------------------------------------------
| CRIAR TEXTO PARA O MACHINE LEARNING
|--------------------------------------------------------------------------
|
| Regra:
|
| 1. título + conteúdo
| 2. somente título se conteúdo estiver vazio
|
*/

function criarTextoML(title, content) {

    const tituloLimpo =
        limparTexto(title);

    const conteudoLimpo =
        limparTexto(content);


    if (
        tituloLimpo &&
        conteudoLimpo
    ) {

        return `${tituloLimpo}. ${conteudoLimpo}`;
    }


    if (tituloLimpo) {
        return tituloLimpo;
    }


    return conteudoLimpo;
}


/*
|--------------------------------------------------------------------------
| VERIFICAR DATA
|--------------------------------------------------------------------------
*/

function dataValida(data) {

    if (!data) {
        return false;
    }

    const dataConvertida =
        new Date(data);

    return !isNaN(
        dataConvertida.getTime()
    );
}


/*
|--------------------------------------------------------------------------
| VERIFICAR SENTIMENTO
|--------------------------------------------------------------------------
*/

function sentimentoValido(sentiment) {

    return [
        "positive",
        "negative",
        "neutral"
    ].includes(sentiment);
}


/*
|--------------------------------------------------------------------------
| PREPARAR DATASET
|--------------------------------------------------------------------------
*/

async function prepararDataset() {

    console.log("\n");
    console.log(
        "============================================================"
    );
    console.log(
        " PREPARAÇÃO DO DATASET PARA MACHINE LEARNING"
    );
    console.log(
        "============================================================"
    );

    console.log(
        "\nIMPORTANTE: este processo NÃO altera o MongoDB."
    );


    /*
    |--------------------------------------------------------------------------
    | CONECTAR AO MONGODB
    |--------------------------------------------------------------------------
    */

    console.log(
        "\nConectando ao MongoDB..."
    );

    await mongoose.connect(
        MONGODB_URI
    );

    console.log(
        "MongoDB conectado."
    );


    /*
    |--------------------------------------------------------------------------
    | BUSCAR NOTÍCIAS
    |--------------------------------------------------------------------------
    */

    console.log(
        "\nLendo notícias existentes..."
    );

    const noticias =
        await Post.find({})
            .select({
                newsId: 1,
                title: 1,
                content: 1,
                source: 1,
                coin: 1,
                sentiment: 1,
                sentimentScore: 1,
                narrative: 1,
                url: 1,
                publishedAt: 1,
                createdAt: 1,
                updatedAt: 1
            })
            .lean();


    console.log(
        `Total encontrado: ${noticias.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | ESTATÍSTICAS
    |--------------------------------------------------------------------------
    */

    const estatisticas = {

        totalRegistros: noticias.length,

        utilizadosNoDataset: 0,

        ignorados: 0,

        semNewsId: 0,

        semTitulo: 0,

        semConteudo: 0,

        somenteTitulo: 0,

        semTexto: 0,

        dataInvalida: 0,

        sentimentoInvalido: 0,

        narrativaGeneral: 0,

        narrativaVazia: 0,

        textosAcimaDoLimite: 0,

        tamanhoTextoTotal: 0,

        tamanhoTextoMedio: 0,

        menorTexto: null,

        maiorTexto: 0
    };


    /*
    |--------------------------------------------------------------------------
    | ARRAY FINAL
    |--------------------------------------------------------------------------
    */

    const dataset = [];


    /*
    |--------------------------------------------------------------------------
    | PROCESSAR CADA NOTÍCIA
    |--------------------------------------------------------------------------
    */

    for (
        let i = 0;
        i < noticias.length;
        i++
    ) {

        const noticia =
            noticias[i];


        /*
        |--------------------------------------------------------------------------
        | CAMPOS ORIGINAIS
        |--------------------------------------------------------------------------
        */

        const newsId =
            noticia.newsId
                ? String(noticia.newsId).trim()
                : "";

        const title =
            noticia.title
                ? String(noticia.title).trim()
                : "";

        const content =
            noticia.content
                ? String(noticia.content)
                : "";

        const source =
            noticia.source
                ? String(noticia.source).trim()
                : "";

        const coin =
            noticia.coin
                ? String(noticia.coin).trim()
                : "";

        const sentiment =
            noticia.sentiment
                ? String(noticia.sentiment).trim()
                : "";

        const narrative =
            noticia.narrative
                ? String(noticia.narrative).trim()
                : "";


        /*
        |--------------------------------------------------------------------------
        | ESTATÍSTICAS DOS CAMPOS
        |--------------------------------------------------------------------------
        */

        if (!newsId) {
            estatisticas.semNewsId++;
        }

        if (!title) {
            estatisticas.semTitulo++;
        }

        if (!content.trim()) {

            estatisticas.semConteudo++;
        }


        if (
            title &&
            !content.trim()
        ) {

            estatisticas.somenteTitulo++;
        }


        if (!sentimentoValido(sentiment)) {

            estatisticas.sentimentoInvalido++;
        }


        if (!narrative) {

            estatisticas.narrativaVazia++;

        } else if (
            narrative.toLowerCase() ===
            "general"
        ) {

            estatisticas.narrativaGeneral++;
        }


        if (
            !dataValida(
                noticia.publishedAt
            )
        ) {

            estatisticas.dataInvalida++;
        }


        /*
        |--------------------------------------------------------------------------
        | CRIAR TEXTO DO ML
        |--------------------------------------------------------------------------
        */

        const textoML =
            criarTextoML(
                title,
                content
            );


        /*
        |--------------------------------------------------------------------------
        | VERIFICAR TEXTO
        |--------------------------------------------------------------------------
        */

        if (!textoML) {

            estatisticas.semTexto++;

            estatisticas.ignorados++;

            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | TAMANHO
        |--------------------------------------------------------------------------
        */

        const tamanhoTexto =
            textoML.length;


        estatisticas.tamanhoTextoTotal +=
            tamanhoTexto;


        if (
            estatisticas.menorTexto === null ||
            tamanhoTexto <
            estatisticas.menorTexto
        ) {

            estatisticas.menorTexto =
                tamanhoTexto;
        }


        if (
            tamanhoTexto >
            estatisticas.maiorTexto
        ) {

            estatisticas.maiorTexto =
                tamanhoTexto;
        }


        /*
        |--------------------------------------------------------------------------
        | VERIFICAR SE O TEXTO FOI CORTADO
        |--------------------------------------------------------------------------
        */

        const textoOriginal =
            `${title} ${content}`.trim();


        if (
            textoOriginal.length >
            LIMITE_TEXTO
        ) {

            estatisticas.textosAcimaDoLimite++;
        }


        /*
        |--------------------------------------------------------------------------
        | ADICIONAR AO DATASET
        |--------------------------------------------------------------------------
        */

        dataset.push({

            newsId: newsId,

            text: textoML,

            title: title,

            source: source,

            coin: coin || "GENERAL",

            sentiment:
                sentimentoValido(sentiment)
                    ? sentiment
                    : "neutral",

            sentimentScore:
                typeof noticia.sentimentScore === "number"
                    ? noticia.sentimentScore
                    : 0,

            narrative:
                narrative || "general",

            publishedAt:
                dataValida(
                    noticia.publishedAt
                )
                    ? new Date(
                        noticia.publishedAt
                    ).toISOString()
                    : null
        });


        estatisticas.utilizadosNoDataset++;


        /*
        |--------------------------------------------------------------------------
        | PROGRESSO
        |--------------------------------------------------------------------------
        */

        if (
            (i + 1) % 1000 === 0
        ) {

            console.log(
                `Processados: ${i + 1}/${noticias.length}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CALCULAR MÉDIA
    |--------------------------------------------------------------------------
    */

    if (
        estatisticas.utilizadosNoDataset >
        0
    ) {

        estatisticas.tamanhoTextoMedio =
            estatisticas.tamanhoTextoTotal /
            estatisticas.utilizadosNoDataset;

        estatisticas.tamanhoTextoMedio =
            Number(
                estatisticas.tamanhoTextoMedio.toFixed(2)
            );
    }


    /*
    |--------------------------------------------------------------------------
    | CRIAR DIRETÓRIO
    |--------------------------------------------------------------------------
    */

    if (
        !fs.existsSync(
            DIRETORIO_DATASET
        )
    ) {

        fs.mkdirSync(
            DIRETORIO_DATASET,
            {
                recursive: true
            }
        );
    }


    /*
    |--------------------------------------------------------------------------
    | SALVAR DATASET
    |--------------------------------------------------------------------------
    */

    fs.writeFileSync(

        ARQUIVO_DATASET,

        JSON.stringify(
            dataset,
            null,
            2
        ),

        "utf8"
    );


    /*
    |--------------------------------------------------------------------------
    | CRIAR RELATÓRIO
    |--------------------------------------------------------------------------
    */

    const relatorio = {

        geradoEm:
            new Date().toISOString(),

        observacao:
            "Dataset gerado a partir dos registros históricos existentes. Nenhum documento foi alterado no MongoDB.",

        limiteTexto:
            LIMITE_TEXTO,

        estatisticas
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


    /*
    |--------------------------------------------------------------------------
    | MOSTRAR RESULTADO
    |--------------------------------------------------------------------------
    */

    console.log("\n");
    console.log(
        "============================================================"
    );
    console.log(
        " RESULTADO DA PREPARAÇÃO"
    );
    console.log(
        "============================================================"
    );

    console.log(
        `Total de registros: ${estatisticas.totalRegistros}`
    );

    console.log(
        `Utilizados no dataset: ${estatisticas.utilizadosNoDataset}`
    );

    console.log(
        `Ignorados: ${estatisticas.ignorados}`
    );

    console.log(
        `Sem newsId: ${estatisticas.semNewsId}`
    );

    console.log(
        `Sem título: ${estatisticas.semTitulo}`
    );

    console.log(
        `Sem conteúdo: ${estatisticas.semConteudo}`
    );

    console.log(
        `Somente título: ${estatisticas.somenteTitulo}`
    );

    console.log(
        `Sem texto utilizável: ${estatisticas.semTexto}`
    );

    console.log(
        `Datas inválidas: ${estatisticas.dataInvalida}`
    );

    console.log(
        `Sentimentos inválidos: ${estatisticas.sentimentoInvalido}`
    );

    console.log(
        `Narrativa general: ${estatisticas.narrativaGeneral}`
    );

    console.log(
        `Narrativa vazia: ${estatisticas.narrativaVazia}`
    );

    console.log(
        `Textos acima de ${LIMITE_TEXTO} caracteres: ${estatisticas.textosAcimaDoLimite}`
    );

    console.log(
        `Tamanho médio do texto: ${estatisticas.tamanhoTextoMedio}`
    );

    console.log(
        `Menor texto: ${estatisticas.menorTexto}`
    );

    console.log(
        `Maior texto utilizado: ${estatisticas.maiorTexto}`
    );


    console.log("\n");
    console.log(
        "Dataset criado em:"
    );

    console.log(
        ARQUIVO_DATASET
    );


    console.log(
        "\nRelatório criado em:"
    );

    console.log(
        ARQUIVO_RELATORIO
    );


    console.log("\n");
    console.log(
        "============================================================"
    );
    console.log(
        " FIM DA PREPARAÇÃO"
    );
    console.log(
        "============================================================"
    );
}


/*
|--------------------------------------------------------------------------
| EXECUÇÃO
|--------------------------------------------------------------------------
*/

prepararDataset()

    .then(async () => {

        await mongoose.disconnect();

        console.log(
            "\nMongoDB desconectado."
        );

        process.exit(0);
    })

    .catch(async (error) => {

        console.error(
            "\nERRO DURANTE A PREPARAÇÃO:"
        );

        console.error(
            error
        );


        try {

            await mongoose.disconnect();

        } catch (erro) {

            console.error(
                "Erro ao desconectar do MongoDB:",
                erro.message
            );
        }


        process.exit(1);
    });