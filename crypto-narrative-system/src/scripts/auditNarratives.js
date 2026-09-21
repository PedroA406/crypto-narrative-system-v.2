const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
require("dotenv").config();
const Post = require("../models/Post");


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;

const AMOSTRAS_POR_NARRATIVA = 10;
const TAMANHO_TRECHO = 300;


/* ============================================================
   PALAVRAS-CHAVE DAS NARRATIVAS

   Estas palavras servem APENAS para diagnóstico da auditoria.

   O script NÃO altera a narrativa salva no MongoDB.
   ============================================================ */

const regrasNarrativas = {

    regulation: [
        "regulation",
        "regulatory",
        "regulator",
        "sec",
        "cftc",
        "congress",
        "senate",
        "legislation",
        "law",
        "legal",
        "compliance",
        "policy",
        "policies",
        "government",
        "white house",
        "framework",
        "bill",
        "lawsuit",
        "court",
        "ban",
        "banned",
        "license",
        "licensed"
    ],

    institutional_investment: [
        "institutional",
        "institutional investor",
        "institutional investors",
        "investment fund",
        "investment funds",
        "asset manager",
        "asset managers",
        "hedge fund",
        "hedge funds",
        "etf",
        "etfs",
        "blackrock",
        "fidelity",
        "vanguard",
        "grayscale",
        "microstrategy",
        "strategy",
        "pension fund",
        "bank",
        "banks",
        "wall street",
        "institutional adoption",
        "capital inflow",
        "fund inflow",
        "fund flows"
    ],

    market: [
        "price",
        "prices",
        "market",
        "markets",
        "trading",
        "trader",
        "traders",
        "bullish",
        "bearish",
        "rally",
        "surge",
        "drop",
        "decline",
        "rise",
        "fall",
        "volume",
        "volatility",
        "resistance",
        "support",
        "breakout",
        "correction",
        "forecast",
        "prediction",
        "technical analysis",
        "market cap",
        "liquidation",
        "liquidations"
    ],

    technology: [
        "blockchain",
        "protocol",
        "protocols",
        "network",
        "networks",
        "upgrade",
        "upgrades",
        "mainnet",
        "testnet",
        "smart contract",
        "smart contracts",
        "defi",
        "web3",
        "layer 1",
        "layer 2",
        "scaling",
        "rollup",
        "rollups",
        "ethereum virtual machine",
        "evm",
        "developer",
        "developers",
        "development",
        "software",
        "code",
        "launch",
        "launched",
        "release",
        "released"
    ],

    security: [
        "hack",
        "hacked",
        "hacker",
        "hackers",
        "exploit",
        "exploited",
        "vulnerability",
        "vulnerabilities",
        "attack",
        "attacked",
        "attacker",
        "attackers",
        "breach",
        "breached",
        "stolen",
        "stolen funds",
        "theft",
        "phishing",
        "scam",
        "scams",
        "fraud",
        "fraudulent",
        "malware",
        "security",
        "security flaw",
        "security incident"
    ],

    adoption: [
        "adoption",
        "adopt",
        "adopted",
        "accept",
        "accepted",
        "acceptance",
        "merchant",
        "merchants",
        "payment",
        "payments",
        "pay with bitcoin",
        "crypto payments",
        "mass adoption",
        "users",
        "user growth",
        "customers",
        "retail adoption",
        "institutional adoption",
        "mainstream",
        "mainstream adoption"
    ],

    mining: [
        "mining",
        "miner",
        "miners",
        "hashrate",
        "hash rate",
        "mining pool",
        "mining pools",
        "bitcoin mining",
        "crypto mining",
        "mining company",
        "mining companies",
        "mining facility",
        "mining facilities",
        "mining operation",
        "mining operations",
        "mining revenue",
        "mining difficulty",
        "block reward",
        "block rewards",
        "proof of work",
        "proof-of-work"
    ]
};


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)
        .toLowerCase()
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}


/* ============================================================
   CONSTRUIR TEXTO
   ============================================================ */

function construirTexto(post) {

    const titulo = post.title || "";
    const conteudo = post.content || "";

    return normalizarTexto(
        `${titulo} ${conteudo}`
    );
}


/* ============================================================
   CALCULAR EVIDÊNCIAS

   Importante:
   Este cálculo NÃO é o cálculo original usado para gravar
   a narrativa.

   Ele serve somente para verificar se a narrativa atual
   possui evidências suficientes.
   ============================================================ */

function calcularEvidencias(texto) {

    const resultados = {};

    for (const narrativa of Object.keys(regrasNarrativas)) {

        const palavras =
            regrasNarrativas[narrativa];

        const encontrados = [];

        let pontuacao = 0;

        for (const palavra of palavras) {

            const termo = normalizarTexto(palavra);

            if (!termo) {
                continue;
            }

            const ocorrencias =
                contarOcorrencias(texto, termo);

            if (ocorrencias > 0) {

                encontrados.push({
                    termo: palavra,
                    ocorrencias
                });

                pontuacao += ocorrencias;
            }
        }

        resultados[narrativa] = {
            pontuacao,
            encontrados
        };
    }

    return resultados;
}


/* ============================================================
   CONTAR OCORRÊNCIAS
   ============================================================ */

function contarOcorrencias(texto, termo) {

    if (!texto || !termo) {
        return 0;
    }

    let contador = 0;
    let posicao = 0;

    while (true) {

        const indice =
            texto.indexOf(termo, posicao);

        if (indice === -1) {
            break;
        }

        contador++;

        posicao =
            indice + termo.length;
    }

    return contador;
}


/* ============================================================
   OBTER PRINCIPAIS EVIDÊNCIAS
   ============================================================ */

function obterPrincipaisEvidencias(evidencias) {

    return Object.entries(evidencias)
        .map(([narrativa, dados]) => {

            return {
                narrativa,
                pontuacao: dados.pontuacao,
                termos: dados.encontrados
            };

        })
        .sort(
            (a, b) =>
                b.pontuacao - a.pontuacao
        );
}


/* ============================================================
   TRECHO DO CONTEÚDO
   ============================================================ */

function obterTrecho(post) {

    const conteudo =
        normalizarTexto(post.content);

    if (!conteudo) {

        return "Sem conteúdo. Classificação baseada no título.";
    }

    return conteudo.substring(
        0,
        TAMANHO_TRECHO
    ) + (conteudo.length > TAMANHO_TRECHO ? "..." : "");
}


/* ============================================================
   DATA
   ============================================================ */

function formatarData(data) {

    if (!data) {
        return null;
    }

    const dataObj =
        new Date(data);

    if (isNaN(dataObj.getTime())) {
        return null;
    }

    return dataObj
        .toISOString()
        .substring(0, 10);
}


/* ============================================================
   MÊS
   ============================================================ */

function obterMes(data) {

    if (!data) {
        return "data_invalida";
    }

    const dataObj =
        new Date(data);

    if (isNaN(dataObj.getTime())) {
        return "data_invalida";
    }

    return `${dataObj.getUTCFullYear()}-${String(
        dataObj.getUTCMonth() + 1
    ).padStart(2, "0")}`;
}


/* ============================================================
   PERCENTUAL
   ============================================================ */

function percentual(valor, total) {

    if (!total) {
        return 0;
    }

    return Number(
        ((valor / total) * 100).toFixed(2)
    );
}


/* ============================================================
   DISTRIBUIÇÃO DE NARRATIVAS
   ============================================================ */

function gerarDistribuicao(posts) {

    const resultado = {};

    for (const post of posts) {

        const narrativa =
            post.narrative || "vazia";

        if (!resultado[narrativa]) {

            resultado[narrativa] = 0;
        }

        resultado[narrativa]++;
    }

    return Object.entries(resultado)
        .map(([narrativa, quantidade]) => {

            return {
                narrativa,
                quantidade,
                percentual:
                    percentual(
                        quantidade,
                        posts.length
                    )
            };

        })
        .sort(
            (a, b) =>
                b.quantidade - a.quantidade
        );
}


/* ============================================================
   NARRATIVA × MOEDA
   ============================================================ */

function gerarNarrativaPorCoin(posts) {

    const resultado = {};

    for (const post of posts) {

        const narrativa =
            post.narrative || "vazia";

        const coin =
            post.coin || "GENERAL";

        if (!resultado[narrativa]) {

            resultado[narrativa] = {};
        }

        if (!resultado[narrativa][coin]) {

            resultado[narrativa][coin] = 0;
        }

        resultado[narrativa][coin]++;
    }

    return resultado;
}


/* ============================================================
   NARRATIVA × SENTIMENTO
   ============================================================ */

function gerarNarrativaPorSentimento(posts) {

    const resultado = {};

    for (const post of posts) {

        const narrativa =
            post.narrative || "vazia";

        const sentimento =
            post.sentiment || "neutral";

        if (!resultado[narrativa]) {

            resultado[narrativa] = {};
        }

        if (!resultado[narrativa][sentimento]) {

            resultado[narrativa][sentimento] = 0;
        }

        resultado[narrativa][sentimento]++;
    }

    return resultado;
}


/* ============================================================
   NARRATIVA × PERÍODO
   ============================================================ */

function gerarNarrativaPorMes(posts) {

    const resultado = {};

    for (const post of posts) {

        const narrativa =
            post.narrative || "vazia";

        const mes =
            obterMes(post.publishedAt);

        if (!resultado[mes]) {

            resultado[mes] = {};
        }

        if (!resultado[mes][narrativa]) {

            resultado[mes][narrativa] = 0;
        }

        resultado[mes][narrativa]++;
    }

    return resultado;
}


/* ============================================================
   SELECIONAR AMOSTRAS

   Faz uma seleção aleatória para evitar que apenas os
   primeiros registros sejam analisados.
   ============================================================ */

function selecionarAmostras(posts) {

    const grupos = {};

    for (const post of posts) {

        const narrativa =
            post.narrative || "vazia";

        if (!grupos[narrativa]) {

            grupos[narrativa] = [];
        }

        grupos[narrativa].push(post);
    }

    const resultado = {};

    for (const narrativa of Object.keys(grupos)) {

        const grupo =
            [...grupos[narrativa]];

        // Embaralhamento simples
        grupo.sort(
            () => Math.random() - 0.5
        );

        resultado[narrativa] =
            grupo.slice(
                0,
                AMOSTRAS_POR_NARRATIVA
            );
    }

    return resultado;
}


/* ============================================================
   ANALISAR AMOSTRAS
   ============================================================ */

function analisarAmostras(amostras) {

    const resultado = {};

    for (const narrativa of Object.keys(amostras)) {

        resultado[narrativa] =
            amostras[narrativa].map(post => {

                const texto =
                    construirTexto(post);

                const evidencias =
                    calcularEvidencias(texto);

                const ranking =
                    obterPrincipaisEvidencias(
                        evidencias
                    );

                const evidenciaAtual =
                    evidencias[narrativa] || {
                        pontuacao: 0,
                        encontrados: []
                    };

                return {

                    _id: String(post._id),

                    newsId:
                        post.newsId || null,

                    narrativaAtual:
                        narrativa,

                    titulo:
                        post.title || "",

                    coin:
                        post.coin || "GENERAL",

                    sentimento:
                        post.sentiment || "neutral",

                    sentimentScore:
                        post.sentimentScore ?? 0,

                    fonte:
                        post.source || "",

                    data:
                        formatarData(
                            post.publishedAt
                        ),

                    trecho:
                        obterTrecho(post),

                    evidenciaDaNarrativaAtual: {

                        pontuacao:
                            evidenciaAtual.pontuacao,

                        termos:
                            evidenciaAtual.encontrados
                    },

                    principaisNarrativasPorEvidencia:
                        ranking.slice(0, 4)
                };
            });
    }

    return resultado;
}


/* ============================================================
   IDENTIFICAR POSSÍVEIS CASOS FRACOS
   ============================================================ */

function identificarCasosFracos(amostrasAnalisadas) {

    const casos = [];

    for (
        const narrativa of
        Object.keys(amostrasAnalisadas)
    ) {

        const lista =
            amostrasAnalisadas[narrativa];

        for (const item of lista) {

            const evidencia =
                item.evidenciaDaNarrativaAtual;

            const ranking =
                item.principaisNarrativasPorEvidencia;

            const primeira =
                ranking.length > 0
                    ? ranking[0]
                    : null;

            /*
             * Caso 1:
             * a narrativa atual não possui nenhuma evidência.
             */

            if (
                evidencia.pontuacao === 0
            ) {

                casos.push({

                    tipo:
                        "SEM_EVIDENCIA",

                    narrativaAtual:
                        narrativa,

                    titulo:
                        item.titulo,

                    coin:
                        item.coin,

                    data:
                        item.data,

                    explicacao:
                        "A narrativa atual não encontrou nenhuma palavra-chave no texto."
                });

                continue;
            }


            /*
             * Caso 2:
             * outra narrativa possui pontuação maior.
             */

            if (
                primeira &&
                primeira.narrativa !== narrativa &&
                primeira.pontuacao >
                    evidencia.pontuacao
            ) {

                casos.push({

                    tipo:
                        "OUTRA_NARRATIVA_MAIS_FORTE",

                    narrativaAtual:
                        narrativa,

                    titulo:
                        item.titulo,

                    coin:
                        item.coin,

                    data:
                        item.data,

                    narrativaMaisForte:
                        primeira.narrativa,

                    pontuacaoAtual:
                        evidencia.pontuacao,

                    pontuacaoOutra:
                        primeira.pontuacao,

                    explicacao:
                        "Outra narrativa apresentou maior evidência pelas regras de diagnóstico."
                });
            }
        }
    }

    return casos;
}


/* ============================================================
   EXECUÇÃO PRINCIPAL
   ============================================================ */

async function executar() {

    try {

        console.log("");
        console.log(
            "============================================================"
        );

        console.log(
            " AUDITORIA DAS NARRATIVAS"
        );

        console.log(
            "============================================================"
        );

        console.log("");


        /* ----------------------------------------------------
           CONEXÃO
           ---------------------------------------------------- */

        if (!MONGODB_URI) {

            throw new Error(
                "MONGODB_URI ou MONGO_URI não foi encontrado nas variáveis de ambiente."
            );
        }

        await mongoose.connect(
            MONGODB_URI
        );

        console.log(
            "MongoDB conectado."
        );

        console.log("");


        /* ----------------------------------------------------
           BUSCAR DADOS
           ---------------------------------------------------- */

        const posts =
            await Post.find({})
                .select(
                    "_id newsId title content source coin sentiment sentimentScore narrative publishedAt"
                )
                .lean();

        console.log(
            `Total de notícias analisadas: ${posts.length}`
        );

        console.log("");


        /* ----------------------------------------------------
           DISTRIBUIÇÃO
           ---------------------------------------------------- */

        const distribuicao =
            gerarDistribuicao(posts);

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            "DISTRIBUIÇÃO DAS NARRATIVAS"
        );

        console.log(
            "------------------------------------------------------------"
        );

        for (const item of distribuicao) {

            console.log(
                `${item.narrativa.padEnd(28)} ${String(item.quantidade).padStart(6)} (${item.percentual}%)`
            );
        }

        console.log("");


        /* ----------------------------------------------------
           NARRATIVA × COIN
           ---------------------------------------------------- */

        const porCoin =
            gerarNarrativaPorCoin(posts);

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            "NARRATIVA × MOEDA"
        );

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            JSON.stringify(
                porCoin,
                null,
                2
            )
        );

        console.log("");


        /* ----------------------------------------------------
           NARRATIVA × SENTIMENTO
           ---------------------------------------------------- */

        const porSentimento =
            gerarNarrativaPorSentimento(
                posts
            );

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            "NARRATIVA × SENTIMENTO"
        );

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            JSON.stringify(
                porSentimento,
                null,
                2
            )
        );

        console.log("");


        /* ----------------------------------------------------
           NARRATIVA × MÊS
           ---------------------------------------------------- */

        const porMes =
            gerarNarrativaPorMes(posts);

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            "NARRATIVA × MÊS"
        );

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            JSON.stringify(
                porMes,
                null,
                2
            )
        );

        console.log("");


        /* ----------------------------------------------------
           AMOSTRAS
           ---------------------------------------------------- */

        const amostras =
            selecionarAmostras(posts);

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            "AMOSTRAS PARA AUDITORIA"
        );

        console.log(
            "------------------------------------------------------------"
        );

        for (const narrativa of Object.keys(amostras)) {

            console.log("");

            console.log(
                `### ${narrativa.toUpperCase()}`
            );

            console.log("");

            for (
                const post of
                amostras[narrativa]
            ) {

                console.log(
                    `[${formatarData(post.publishedAt) || "sem data"}] ${post.title}`
                );

                console.log(
                    `Coin: ${post.coin || "GENERAL"}`
                );

                console.log(
                    `Sentimento: ${post.sentiment || "neutral"}`
                );

                console.log(
                    `Fonte: ${post.source || "sem fonte"}`
                );

                console.log(
                    `Trecho: ${obterTrecho(post)}`
                );

                console.log(
                    "------------------------------------------------------------"
                );
            }
        }


        /* ----------------------------------------------------
           ANÁLISE DAS EVIDÊNCIAS
           ---------------------------------------------------- */

        const amostrasAnalisadas =
            analisarAmostras(
                amostras
            );

        const casosFracos =
            identificarCasosFracos(
                amostrasAnalisadas
            );


        /* ----------------------------------------------------
           RELATÓRIO FINAL
           ---------------------------------------------------- */

        const relatorio = {

            geradoEm:
                new Date().toISOString(),

            observacao:
                "Auditoria somente para diagnóstico. Este script não altera registros no MongoDB.",

            totalNoticias:
                posts.length,

            amostrasPorNarrativa:
                AMOSTRAS_POR_NARRATIVA,

            distribuicaoNarrativas:
                distribuicao,

            narrativaPorCoin:
                porCoin,

            narrativaPorSentimento:
                porSentimento,

            narrativaPorMes:
                porMes,

            amostrasAnalisadas,

            casosPotencialmenteFracos:
                casosFracos
        };


        /* ----------------------------------------------------
           SALVAR RELATÓRIO
           ---------------------------------------------------- */

        const pastaDataset =
            path.join(
                process.cwd(),
                "dataset"
            );

        if (
            !fs.existsSync(
                pastaDataset
            )
        ) {

            fs.mkdirSync(
                pastaDataset,
                {
                    recursive: true
                }
            );
        }


        const caminhoRelatorio =
            path.join(
                pastaDataset,
                "relatorio_auditoria_narrativas.json"
            );


        fs.writeFileSync(

            caminhoRelatorio,

            JSON.stringify(
                relatorio,
                null,
                2
            ),

            "utf8"
        );


        /* ----------------------------------------------------
           RESUMO FINAL
           ---------------------------------------------------- */

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " AUDITORIA CONCLUÍDA"
        );

        console.log(
            "============================================================"
        );

        console.log("");

        console.log(
            `Notícias analisadas: ${posts.length}`
        );

        console.log(
            `Narrativas encontradas: ${distribuicao.length}`
        );

        console.log(
            `Casos potencialmente fracos nas amostras: ${casosFracos.length}`
        );

        console.log("");

        console.log(
            `Relatório salvo em:`
        );

        console.log(
            caminhoRelatorio
        );

        console.log("");

        console.log(
            "IMPORTANTE: nenhum registro foi alterado no MongoDB."
        );

        console.log("");

    } catch (error) {

        console.error("");

        console.error(
            "ERRO DURANTE A AUDITORIA:"
        );

        console.error(
            error.message
        );

        console.error("");

    } finally {

        await mongoose.disconnect();

        console.log(
            "MongoDB desconectado."
        );
    }
}


/* ============================================================
   INICIAR
   ============================================================ */

executar();