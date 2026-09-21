const axios = require("axios");

const mongoose = require("mongoose");

const Post = require("../models/Post");

const {
    analyzeSentiment
} = require("../services/sentimentService");


/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES DA API
|--------------------------------------------------------------------------
*/

const API_URL =
    "https://api.freenewsapi.io/v1";

const API_KEY =
    process.env.FREE_NEWS_API_KEY;


/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES DA COLETA
|--------------------------------------------------------------------------
|
| TOTAL_NEWS
|
| Quantidade máxima de notícias que serão processadas
| nesta execução.
|
| PAGE_SIZE
|
| Quantidade de notícias solicitadas por página.
|
| REQUEST_DELAY
|
| Pausa entre requisições para respeitar o limite
| da FreeNewsAPI.
|
*/

const TOTAL_NEWS = 100;

const PAGE_SIZE = 10;

const REQUEST_DELAY = 550;


/*
|--------------------------------------------------------------------------
| PERÍODO DA COLETA
|--------------------------------------------------------------------------
|
| Neste momento o coletor continua configurado para
| a coleta histórica que estamos utilizando no projeto.
|
| No final do desenvolvimento, essas variáveis poderão
| ser alteradas para o modo de coleta contínua.
|
*/

const PUBLISHED_AFTER =
    process.env.NEWS_PUBLISHED_AFTER ||
    "2026-08-01T00:00:00Z";

const PUBLISHED_BEFORE =
    process.env.NEWS_PUBLISHED_BEFORE ||
    "2026-08-26T23:59:59Z";


/*
|--------------------------------------------------------------------------
| TÓPICO DA PESQUISA
|--------------------------------------------------------------------------
*/

const NEWS_TOPIC =
    "digital currencies";


/*
|--------------------------------------------------------------------------
| IDENTIFICAÇÃO DA COLETA
|--------------------------------------------------------------------------
|
| Esta chave identifica exatamente qual pesquisa
| está sendo realizada.
|
| O cursor de uma pesquisa não deve ser reutilizado
| quando o período ou o tópico forem alterados.
|
*/

const COLLECTOR_ID =
    "historical_news_" +
    Buffer.from(
        `${NEWS_TOPIC}|${PUBLISHED_AFTER}|${PUBLISHED_BEFORE}`
    ).toString("base64");


/*
|--------------------------------------------------------------------------
| PAUSA
|--------------------------------------------------------------------------
*/

function sleep(ms) {

    return new Promise(resolve => {

        setTimeout(resolve, ms);

    });

}


/*
|--------------------------------------------------------------------------
| ACESSAR ESTADO DO COLETOR
|--------------------------------------------------------------------------
|
| O estado é armazenado em uma coleção separada:
|
| newscollectorstates
|
| Assim não misturamos informações de controle
| com os documentos de notícias.
|
*/

function getCollectorStateCollection() {

    if (
        !mongoose.connection ||
        mongoose.connection.readyState !== 1
    ) {

        throw new Error(
            "MongoDB não está conectado para acessar o estado do coletor."
        );

    }

    return mongoose.connection.db.collection(
        "newscollectorstates"
    );

}


/*
|--------------------------------------------------------------------------
| RECUPERAR ESTADO
|--------------------------------------------------------------------------
*/

async function getCollectorState() {

    const collection =
        getCollectorStateCollection();

    const state =
        await collection.findOne({

            collectorId:
                COLLECTOR_ID

        });

    return state || null;

}


/*
|--------------------------------------------------------------------------
| SALVAR ESTADO
|--------------------------------------------------------------------------
|
| O cursor salvo representa a PRÓXIMA página.
|
| Exemplo:
|
| Página processada: 10
| Próxima página: 11
| Cursor: cursor-da-pagina-11
|
*/

async function saveCollectorState({

    nextCursor,

    nextPage,

    hasMore

}) {

    const collection =
        getCollectorStateCollection();

    await collection.updateOne(

        {
            collectorId:
                COLLECTOR_ID
        },

        {

            $set: {

                collectorId:
                    COLLECTOR_ID,

                topic:
                    NEWS_TOPIC,

                publishedAfter:
                    PUBLISHED_AFTER,

                publishedBefore:
                    PUBLISHED_BEFORE,

                nextCursor:
                    nextCursor,

                nextPage:
                    nextPage,

                hasMore:
                    hasMore,

                updatedAt:
                    new Date()

            },

            $setOnInsert: {

                createdAt:
                    new Date()

            }

        },

        {
            upsert: true
        }

    );

}


/*
|--------------------------------------------------------------------------
| LIMPAR ESTADO DO COLETOR
|--------------------------------------------------------------------------
|
| Usado quando chegarmos ao final do período pesquisado.
|
*/

async function clearCollectorState() {

    const collection =
        getCollectorStateCollection();

    await collection.deleteOne({

        collectorId:
            COLLECTOR_ID

    });

}


/*
|--------------------------------------------------------------------------
| BUSCAR DETALHES DA NOTÍCIA
|--------------------------------------------------------------------------
|
| Esta função somente é chamada para notícias que
| ainda não existem no MongoDB.
|
*/

async function getArticleDetails(uuid) {

    try {

        const response =
            await axios.get(

                `${API_URL}/details`,

                {

                    headers: {

                        "x-api-key":
                            API_KEY

                    },

                    params: {

                        uuid:
                            uuid

                    }

                }

            );

        return response.data?.data || null;


    } catch (error) {

        console.log("");

        console.log(
            `⚠️ Erro ao buscar detalhes da notícia ${uuid}`
        );


        if (error.response) {

            console.log(
                "Status:",
                error.response.status
            );

            console.log(
                "Resposta:",
                error.response.data
            );

        } else {

            console.log(
                error.message
            );

        }


        return null;

    }

}


/*
|--------------------------------------------------------------------------
| BUSCAR NOTÍCIAS
|--------------------------------------------------------------------------
|
| O sistema utiliza CURSOR.
|
| Quando cursor === null:
|
|   primeira página.
|
| Quando cursor possui valor:
|
|   continua exatamente de onde parou.
|
*/

async function getNewsPage(cursor = null) {

    try {

        const params = {

            language:
                "en",

            topic:
                NEWS_TOPIC,

            order_by:
                "archive",

            page_size:
                PAGE_SIZE,

            published_after:
                PUBLISHED_AFTER,

            published_before:
                PUBLISHED_BEFORE

        };


        /*
        |--------------------------------------------------------------------------
        | CURSOR
        |--------------------------------------------------------------------------
        */

        if (cursor) {

            params.cursor =
                cursor;

        }


        const response =
            await axios.get(

                `${API_URL}/news`,

                {

                    headers: {

                        "x-api-key":
                            API_KEY

                    },

                    params:
                        params

                }

            );


        return response.data;


    } catch (error) {

        console.log("");

        console.log(
            "❌ Erro ao buscar página de notícias."
        );


        if (error.response) {

            console.log(
                "Status:",
                error.response.status
            );

            console.log(
                "Resposta:",
                error.response.data
            );

        } else {

            console.log(
                error.message
            );

        }


        return null;

    }

}


/*
|--------------------------------------------------------------------------
| COLETAR NOTÍCIAS
|--------------------------------------------------------------------------
*/

async function collectNews() {

    try {

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            "📰 CRYPTO NARRATIVE SYSTEM - COLETOR DE NOTÍCIAS"
        );

        console.log(
            "============================================================"
        );


        /*
        |--------------------------------------------------------------------------
        | VALIDAÇÃO DA API KEY
        |--------------------------------------------------------------------------
        */

        if (!API_KEY) {

            console.log("");

            console.log(
                "❌ FREE_NEWS_API_KEY não foi encontrada."
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | VALIDAÇÃO DO MONGODB
        |--------------------------------------------------------------------------
        */

        if (
            !mongoose.connection ||
            mongoose.connection.readyState !== 1
        ) {

            console.log("");

            console.log(
                "❌ MongoDB não está conectado."
            );

            console.log(
                "🛑 Coleta interrompida."
            );

            return;

        }


        /*
        |--------------------------------------------------------------------------
        | INFORMAÇÕES DA COLETA
        |--------------------------------------------------------------------------
        */

        console.log("");

        console.log(
            "📚 MODO: COLETA HISTÓRICA CONTÍNUA"
        );

        console.log(
            `📅 Publicação após: ${PUBLISHED_AFTER}`
        );

        console.log(
            `📅 Publicação antes: ${PUBLISHED_BEFORE}`
        );

        console.log(
            `🎯 Tópico: ${NEWS_TOPIC}`
        );

        console.log(
            `📦 Limite desta execução: ${TOTAL_NEWS}`
        );

        console.log(
            `📄 Notícias por página: ${PAGE_SIZE}`
        );


        /*
        |--------------------------------------------------------------------------
        | RECUPERAR ESTADO ANTERIOR
        |--------------------------------------------------------------------------
        */

        const savedState =
            await getCollectorState();


        /*
        |--------------------------------------------------------------------------
        | CURSOR E PÁGINA INICIAL
        |--------------------------------------------------------------------------
        */

        let cursor =
            savedState?.nextCursor || null;

        let paginaAtual =
            savedState?.nextPage || 1;


        /*
        |--------------------------------------------------------------------------
        | INFORMAR CONTINUAÇÃO
        |--------------------------------------------------------------------------
        */

        if (savedState) {

            console.log("");

            console.log(
                "🔄 CONTINUANDO COLETA ANTERIOR"
            );

            console.log(
                `📍 Próxima página: ${paginaAtual}`
            );

            console.log(
                "💾 Cursor recuperado do MongoDB."
            );

        } else {

            console.log("");

            console.log(
                "🆕 PRIMEIRA EXECUÇÃO DESTA COLETA"
            );

            console.log(
                "📍 Iniciando na página 1."
            );

        }


        /*
        |--------------------------------------------------------------------------
        | CONTADORES
        |--------------------------------------------------------------------------
        */

        let totalRecebidas = 0;

        let novas = 0;

        let existentes = 0;

        let erros = 0;

        let paginas = 0;

        let hasMore =
            savedState?.hasMore !== false;


        /*
        |--------------------------------------------------------------------------
        | CONTROLE DE SEGURANÇA DO CURSOR
        |--------------------------------------------------------------------------
        */

        const cursorsUtilizados =
            new Set();


        /*
        |--------------------------------------------------------------------------
        | PAGINAÇÃO
        |--------------------------------------------------------------------------
        */

        while (

            hasMore &&

            totalRecebidas < TOTAL_NEWS

        ) {


            /*
            |--------------------------------------------------------------------------
            | CONTROLE DA PÁGINA
            |--------------------------------------------------------------------------
            */

            paginas++;


            console.log("");

            console.log(
                "---------------------------------"
            );

            console.log(
                `📄 PÁGINA ${paginaAtual}`
            );


            if (cursor) {

                console.log(
                    "🔁 Navegação: CURSOR SALVO"
                );

            } else {

                console.log(
                    "🔰 Navegação: PRIMEIRA PÁGINA"
                );

            }


            /*
            |--------------------------------------------------------------------------
            | BUSCAR PÁGINA
            |--------------------------------------------------------------------------
            */

            const result =
                await getNewsPage(
                    cursor
                );


            if (!result) {

                console.log("");

                console.log(
                    "❌ Não foi possível obter a página."
                );

                console.log(
                    "💾 Posição NÃO será avançada."
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | DADOS DA API
            |--------------------------------------------------------------------------
            */

            const articles =
                result.data || [];

            const meta =
                result.meta || {};


            console.log(
                `📰 Notícias recebidas: ${articles.length}`
            );


            /*
            |--------------------------------------------------------------------------
            | FIM DOS RESULTADOS
            |--------------------------------------------------------------------------
            */

            if (
                articles.length === 0
            ) {

                console.log("");

                console.log(
                    "⚠️ A API não retornou mais notícias."
                );


                hasMore =
                    false;


                await clearCollectorState();


                break;

            }


            /*
            |--------------------------------------------------------------------------
            | PROCESSAR ARTIGOS
            |--------------------------------------------------------------------------
            */

            for (

                const article of articles

            ) {


                /*
                |--------------------------------------------------------------------------
                | RESPEITAR LIMITE DA EXECUÇÃO
                |--------------------------------------------------------------------------
                */

                if (

                    totalRecebidas >=
                    TOTAL_NEWS

                ) {

                    break;

                }


                totalRecebidas++;


                try {


                    /*
                    |--------------------------------------------------------------------------
                    | UUID
                    |--------------------------------------------------------------------------
                    */

                    const newsId =
                        article.uuid;


                    if (!newsId) {

                        console.log(
                            "⚠️ Notícia sem UUID. Ignorando."
                        );

                        erros++;

                        continue;

                    }


                    /*
                    |--------------------------------------------------------------------------
                    | VERIFICAR DUPLICIDADE
                    |--------------------------------------------------------------------------
                    */

                    const existingPost =
                        await Post.findOne({

                            newsId:
                                newsId

                        })
                        .select("_id")
                        .lean();


                    if (existingPost) {

                        existentes++;

                        console.log(
                            `↩️ Já existe: ${newsId}`
                        );

                        continue;

                    }


                    /*
                    |--------------------------------------------------------------------------
                    | BUSCAR DETALHES
                    |--------------------------------------------------------------------------
                    */

                    const details =
                        await getArticleDetails(
                            newsId
                        );


                    /*
                    |--------------------------------------------------------------------------
                    | PAUSA APÓS REQUEST
                    |--------------------------------------------------------------------------
                    */

                    await sleep(
                        REQUEST_DELAY
                    );


                    /*
                    |--------------------------------------------------------------------------
                    | DADOS DA NOTÍCIA
                    |--------------------------------------------------------------------------
                    */

                    const title =
                        details?.title ||
                        article.title ||
                        "";


                    const content =
                        details?.body ||
                        article.description ||
                        article.subtitle ||
                        "";


                    const source =
                        details?.publisher ||
                        article.publisher ||
                        "FreeNewsAPI";


                    const url =
                        details?.original_url ||
                        article.url ||
                        "";


                    /*
                    |--------------------------------------------------------------------------
                    | DATA ORIGINAL DA PUBLICAÇÃO
                    |--------------------------------------------------------------------------
                    |
                    | publishedAt representa a data em que a notícia
                    | foi originalmente publicada pela fonte.
                    |
                    | NÃO representa a data em que ela entrou no MongoDB.
                    |
                    */

                    const publishedAt =
                        details?.published_at ||
                        article.published_at ||
                        null;


                    /*
                    |--------------------------------------------------------------------------
                    | VALIDAR TÍTULO
                    |--------------------------------------------------------------------------
                    */

                    if (

                        !title ||

                        !title.trim()

                    ) {

                        console.log(
                            "⚠️ Notícia sem título. Ignorando."
                        );

                        erros++;

                        continue;

                    }


                    /*
                    |--------------------------------------------------------------------------
                    | TEXTO PARA ANÁLISE
                    |--------------------------------------------------------------------------
                    */

                    const fullText =
                        `${title} ${content}`;


                    /*
                    |--------------------------------------------------------------------------
                    | DETECTAR CRIPTOMOEDA
                    |--------------------------------------------------------------------------
                    */

                    const coin =
                        detectCoin(
                            fullText
                        );


                    /*
                    |--------------------------------------------------------------------------
                    | ANÁLISE DE SENTIMENTO
                    |--------------------------------------------------------------------------
                    */

                    const sentimentResult =
                        analyzeSentiment(
                            fullText
                        );


                    /*
                    |--------------------------------------------------------------------------
                    | CLASSIFICAÇÃO ORIGINAL DE NARRATIVA
                    |--------------------------------------------------------------------------
                    |
                    | Esta é a classificação baseada nas regras.
                    |
                    | Ela é armazenada em "narrative".
                    |
                    | O modelo de Machine Learning utiliza outro campo:
                    |
                    | "narrativeML"
                    |
                    | Portanto, o coletor NÃO deve sobrescrever
                    | narrativeML.
                    |
                    */

                    const narrative =
                        detectNarrative(
                            fullText
                        );


                    /*
                    |--------------------------------------------------------------------------
                    | SALVAR NO MONGODB
                    |--------------------------------------------------------------------------
                    |
                    | Somente $setOnInsert é utilizado.
                    |
                    | Isso significa que, se a notícia já existir,
                    | seus dados históricos não serão sobrescritos.
                    |
                    | O Mongoose cria automaticamente:
                    |
                    | createdAt
                    | updatedAt
                    |
                    | createdAt representa o momento em que
                    | a notícia entrou no banco.
                    |
                    */

                    const savedPost =
                        await Post.findOneAndUpdate(

                            {

                                newsId:
                                    newsId

                            },

                            {

                                $setOnInsert: {

                                    newsId:
                                        newsId,

                                    title:
                                        title,

                                    content:
                                        content,

                                    source:
                                        source,

                                    coin:
                                        coin,

                                    sentiment:
                                        sentimentResult.sentiment,

                                    sentimentScore:
                                        sentimentResult.score,

                                    /*
                                    |--------------------------------------------------------------------------
                                    | NARRATIVA ORIGINAL
                                    |--------------------------------------------------------------------------
                                    */

                                    narrative:
                                        narrative,

                                    /*
                                    |--------------------------------------------------------------------------
                                    | CAMPOS DO MODELO ML
                                    |--------------------------------------------------------------------------
                                    |
                                    | Não definimos narrativeML nem
                                    | narrativeMLConfidence aqui.
                                    |
                                    | Esses campos são preenchidos
                                    | posteriormente pelo modelo ML.
                                    |
                                    */

                                    url:
                                        url,

                                    /*
                                    |--------------------------------------------------------------------------
                                    | DATA DE PUBLICAÇÃO
                                    |--------------------------------------------------------------------------
                                    */

                                    publishedAt:
                                        publishedAt

                                }

                            },

                            {

                                upsert:
                                    true,

                                new:
                                    true,

                                setDefaultsOnInsert:
                                    true

                            }

                        );


                    /*
                    |--------------------------------------------------------------------------
                    | NOVA NOTÍCIA
                    |--------------------------------------------------------------------------
                    */

                    novas++;


                    /*
                    |--------------------------------------------------------------------------
                    | LOG
                    |--------------------------------------------------------------------------
                    */

                    console.log("");

                    console.log(
                        "🆕 NOTÍCIA SALVA"
                    );

                    console.log(
                        `📰 ${savedPost.title}`
                    );

                    console.log(
                        `🪙 Moeda: ${savedPost.coin}`
                    );

                    console.log(
                        `💭 Sentimento: ${savedPost.sentiment}`
                    );

                    console.log(
                        `📊 Score: ${savedPost.sentimentScore}`
                    );

                    console.log(
                        `🧠 Narrativa original: ${savedPost.narrative}`
                    );

                    console.log(
                        `🤖 Narrativa ML: ${
                            savedPost.narrativeML ||
                            "aguardando classificação ML"
                        }`
                    );

                    console.log(
                        `🎯 Confiança ML: ${
                            savedPost.narrativeMLConfidence !== null &&
                            savedPost.narrativeMLConfidence !== undefined
                                ? (
                                    savedPost.narrativeMLConfidence * 100
                                ).toFixed(2) + "%"
                                : "aguardando classificação ML"
                        }`
                    );

                    console.log(
                        `🆔 ID: ${savedPost.newsId}`
                    );

                    console.log(
                        `📅 Publicada: ${savedPost.publishedAt}`
                    );

                    console.log(
                        `📥 Coletada em: ${savedPost.createdAt}`
                    );

                    console.log(
                        `📈 Progresso: ${totalRecebidas}/${TOTAL_NEWS}`
                    );


                } catch (error) {


                    /*
                    |--------------------------------------------------------------------------
                    | DUPLICIDADE MONGODB
                    |--------------------------------------------------------------------------
                    */

                    if (
                        error.code === 11000
                    ) {

                        existentes++;

                        console.log(
                            `↩️ Notícia já estava no banco: ${article.uuid}`
                        );

                        continue;

                    }


                    erros++;


                    console.log(
                        "⚠️ Erro ao processar notícia:"
                    );

                    console.log(
                        error.message
                    );

                }

            }


            /*
            |--------------------------------------------------------------------------
            | PAGINAÇÃO POR CURSOR
            |--------------------------------------------------------------------------
            */

            const nextCursor =
                meta.next_cursor || null;


            const apiHasMore =
                meta.has_more === true;


            /*
            |--------------------------------------------------------------------------
            | PROTEÇÃO CONTRA CURSOR REPETIDO
            |--------------------------------------------------------------------------
            */

            if (

                nextCursor &&

                cursorsUtilizados.has(
                    nextCursor
                )

            ) {

                console.log("");

                console.log(
                    "⚠️ A API retornou um cursor já utilizado."
                );

                console.log(
                    "🛑 Coleta interrompida por segurança."
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | ADICIONAR CURSOR AO CONTROLE
            |--------------------------------------------------------------------------
            */

            if (nextCursor) {

                cursorsUtilizados.add(
                    nextCursor
                );

            }


            /*
            |--------------------------------------------------------------------------
            | VERIFICAR CURSOR
            |--------------------------------------------------------------------------
            */

            if (

                apiHasMore &&

                !nextCursor

            ) {

                console.log("");

                console.log(
                    "⚠️ A API informou que existem mais notícias,"
                );

                console.log(
                    "mas não forneceu next_cursor."
                );

                console.log(
                    "🛑 Coleta interrompida."
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | DEFINIR PRÓXIMA POSIÇÃO
            |--------------------------------------------------------------------------
            */

            const proximaPagina =
                paginaAtual + 1;


            /*
            |--------------------------------------------------------------------------
            | SALVAR ESTADO
            |--------------------------------------------------------------------------
            |
            | MUITO IMPORTANTE:
            |
            | O estado é salvo somente depois que a página
            | atual foi processada.
            |
            */

            if (

                apiHasMore &&

                nextCursor

            ) {

                await saveCollectorState({

                    nextCursor:
                        nextCursor,

                    nextPage:
                        proximaPagina,

                    hasMore:
                        true

                });


                console.log("");

                console.log(
                    "💾 POSIÇÃO DA COLETA SALVA"
                );

                console.log(
                    `📍 Página processada: ${paginaAtual}`
                );

                console.log(
                    `➡️ Próxima página: ${proximaPagina}`
                );

                console.log(
                    "🔐 Cursor da próxima página armazenado no MongoDB."
                );

            } else {

                /*
                |--------------------------------------------------------------------------
                | HISTÓRICO TERMINOU
                |--------------------------------------------------------------------------
                */

                await clearCollectorState();


                console.log("");

                console.log(
                    "🏁 FIM DO HISTÓRICO DISPONÍVEL."
                );

                console.log(
                    "💾 Estado da coleta histórica removido."
                );

            }


            /*
            |--------------------------------------------------------------------------
            | ATUALIZAR CONTROLE
            |--------------------------------------------------------------------------
            */

            hasMore =
                apiHasMore;


            cursor =
                nextCursor;


            paginaAtual =
                proximaPagina;


            /*
            |--------------------------------------------------------------------------
            | RESUMO DA PÁGINA
            |--------------------------------------------------------------------------
            */

            console.log("");

            console.log(
                "---------------------------------"
            );

            console.log(
                `📄 Página ${paginaAtual - 1} finalizada`
            );

            console.log(
                `📰 Recebidas nesta execução: ${totalRecebidas}`
            );

            console.log(
                `🆕 Novas: ${novas}`
            );

            console.log(
                `↩️ Existentes: ${existentes}`
            );

            console.log(
                `❌ Erros: ${erros}`
            );

            console.log(
                `➡️ Mais páginas: ${
                    hasMore
                        ? "SIM"
                        : "NÃO"
                }`
            );


            /*
            |--------------------------------------------------------------------------
            | LIMITE ATINGIDO
            |--------------------------------------------------------------------------
            */

            if (

                totalRecebidas >=
                TOTAL_NEWS

            ) {

                console.log("");

                console.log(
                    "⏹️ LIMITE DESTA EXECUÇÃO ATINGIDO."
                );

                console.log(
                    `💾 Próxima execução continuará na página ${paginaAtual}.`
                );

                break;

            }


            /*
            |--------------------------------------------------------------------------
            | PAUSA ENTRE PÁGINAS
            |--------------------------------------------------------------------------
            */

            await sleep(
                REQUEST_DELAY
            );

        }


        /*
        |--------------------------------------------------------------------------
        | RESUMO FINAL
        |--------------------------------------------------------------------------
        */

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            "📊 RESUMO DA COLETA"
        );

        console.log(
            "============================================================"
        );

        console.log(
            `📅 Período: ${PUBLISHED_AFTER} → ${PUBLISHED_BEFORE}`
        );

        console.log(
            `🎯 Tópico: ${NEWS_TOPIC}`
        );

        console.log(
            `📄 Páginas processadas nesta execução: ${paginas}`
        );

        console.log(
            `📰 Total recebidas da API: ${totalRecebidas}`
        );

        console.log(
            `🆕 Novas notícias salvas: ${novas}`
        );

        console.log(
            `↩️ Notícias já existentes: ${existentes}`
        );

        console.log(
            `❌ Erros: ${erros}`
        );

        console.log(
            `📚 Mais resultados disponíveis: ${
                hasMore
                    ? "SIM"
                    : "NÃO"
            }`
        );


        if (hasMore) {

            console.log(
                `➡️ Próxima execução: página ${paginaAtual}`
            );

        } else {

            console.log(
                "🏁 Histórico completamente percorrido."
            );

        }


        console.log(
            "============================================================"
        );

        console.log(
            "✅ COLETA FINALIZADA"
        );

        console.log(
            "============================================================"
        );

        console.log("");


    } catch (error) {


        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            "❌ ERRO NEWS COLLECTOR"
        );

        console.log(
            "============================================================"
        );


        if (error.response) {

            console.log(
                "Status:",
                error.response.status
            );

            console.log(
                "Resposta:",
                error.response.data
            );

        } else {

            console.log(
                error.message
            );

        }


        console.log(
            "============================================================"
        );

    }

}


/*
|--------------------------------------------------------------------------
| DETECTAR NARRATIVA
|--------------------------------------------------------------------------
|
| Esta classificação é a classificação ORIGINAL baseada
| em regras.
|
| Ela é armazenada no campo:
|
| narrative
|
| O modelo de Machine Learning utiliza:
|
| narrativeML
| narrativeMLConfidence
|
*/

function detectNarrative(text) {

    if (!text) {

        return "general";

    }


    const content =
        text.toLowerCase();


    /*
    |--------------------------------------------------------------------------
    | REGULAÇÃO
    |--------------------------------------------------------------------------
    */

    if (

        /\b(regulation|regulatory|sec|law|laws|government|ban|legal)\b/

            .test(content)

    ) {

        return "regulation";

    }


    /*
    |--------------------------------------------------------------------------
    | ETF / INVESTIMENTO INSTITUCIONAL
    |--------------------------------------------------------------------------
    */

    if (

        /\b(etf|institutional|institution|fund|investment|investor)\b/

            .test(content)

    ) {

        return "institutional_investment";

    }


    /*
    |--------------------------------------------------------------------------
    | ADOÇÃO
    |--------------------------------------------------------------------------
    */

    if (

        /\b(adoption|adopt|adopting|payment|payments|merchant)\b/

            .test(content)

    ) {

        return "adoption";

    }


    /*
    |--------------------------------------------------------------------------
    | TECNOLOGIA
    |--------------------------------------------------------------------------
    */

    if (

        /\b(blockchain|technology|protocol|upgrade|network|smart contract|defi)\b/

            .test(content)

    ) {

        return "technology";

    }


    /*
    |--------------------------------------------------------------------------
    | MERCADO / PREÇO
    |--------------------------------------------------------------------------
    */

    if (

        /\b(price|market|rally|crash|surge|bull|bear|trading|volume)\b/

            .test(content)

    ) {

        return "market";

    }


    /*
    |--------------------------------------------------------------------------
    | SEGURANÇA
    |--------------------------------------------------------------------------
    */

    if (

        /\b(hack|hacked|security|scam|fraud|attack|exploit)\b/

            .test(content)

    ) {

        return "security";

    }


    /*
    |--------------------------------------------------------------------------
    | MINERAÇÃO
    |--------------------------------------------------------------------------
    */

    if (

        /\b(mining|miner|mining rig|hashrate)\b/

            .test(content)

    ) {

        return "mining";

    }


    /*
    |--------------------------------------------------------------------------
    | GENERAL
    |--------------------------------------------------------------------------
    */

    return "general";

}


/*
|--------------------------------------------------------------------------
| DETECTAR CRIPTOMOEDA
|--------------------------------------------------------------------------
*/

function detectCoin(text) {

    if (!text) {

        return "GENERAL";

    }


    /*
    |--------------------------------------------------------------------------
    | NORMALIZAÇÃO
    |--------------------------------------------------------------------------
    */

    const content =
        text
            .toLowerCase()
            .replace(
                /[.,!?;:()[\]{}"']/g,
                " "
            );


    /*
    |--------------------------------------------------------------------------
    | MAPA DE MOEDAS
    |--------------------------------------------------------------------------
    */

    const coinMap = {

        BTC: [

            /\bbitcoin\b/g,

            /\bbtc\b/g

        ],


        ETH: [

            /\bethereum\b/g,

            /\bether\b/g,

            /\beth\b/g

        ],


        USDT: [

            /\btether\b/g,

            /\busdt\b/g

        ],


        BNB: [

            /\bbnb\b/g,

            /\bbinance coin\b/g

        ],


        XRP: [

            /\bxrp\b/g,

            /\bripple\b/g

        ],


        USDC: [

            /\busd coin\b/g,

            /\busdc\b/g

        ],


        SOL: [

            /\bsolana\b/g,

            /\bsol\b/g

        ],


        TRX: [

            /\btron\b/g,

            /\btrx\b/g

        ],


        DOGE: [

            /\bdogecoin\b/g,

            /\bdoge\b/g

        ],


        FIGR_HELOC: [

            /\bfigure heloc\b/g,

            /\bfigure\b/g,

            /\bheloc\b/g,

            /\bfigr\b/g

        ],


        HYPE: [

            /\bhyperliquid\b/g,

            /\bhype\b/g

        ]

    };


    /*
    |--------------------------------------------------------------------------
    | CONTADORES
    |--------------------------------------------------------------------------
    */

    const scores = {};


    for (

        const coin in coinMap

    ) {

        scores[coin] = 0;


        for (

            const pattern of coinMap[coin]

        ) {

            const matches =
                content.match(
                    pattern
                );


            if (matches) {

                scores[coin] +=
                    matches.length;

            }

        }

    }


    /*
    |--------------------------------------------------------------------------
    | MOEDA MAIS MENCIONADA
    |--------------------------------------------------------------------------
    */

    let detectedCoin =
        "GENERAL";


    let highestScore =
        0;


    for (

        const coin in scores

    ) {

        if (

            scores[coin] >
            highestScore

        ) {

            highestScore =
                scores[coin];

            detectedCoin =
                coin;

        }

    }


    return detectedCoin;

}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports =
    collectNews;