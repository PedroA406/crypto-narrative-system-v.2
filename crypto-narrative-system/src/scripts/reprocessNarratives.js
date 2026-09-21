const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

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


/*
|--------------------------------------------------------------------------
| NARRATIVAS
|--------------------------------------------------------------------------
|
| As categorias representam os principais tipos de narrativa
| relacionados ao mercado de criptomoedas.
|
*/

const NARRATIVAS = {

    regulation: [
        "regulation",
        "regulatory",
        "regulator",
        "sec",
        "cftc",
        "government",
        "governmental",
        "legislation",
        "legislative",
        "law",
        "laws",
        "legal",
        "policy",
        "policies",
        "ban",
        "banned",
        "compliance",
        "oversight"
    ],

    institutional_investment: [
        "etf",
        "institutional",
        "institution",
        "institutions",
        "fund",
        "funds",
        "investment",
        "investments",
        "investor",
        "investors",
        "asset manager",
        "asset management",
        "portfolio",
        "blackrock",
        "fidelity",
        "vanguard",
        "grayscale"
    ],

    market: [
        "price",
        "prices",
        "market",
        "markets",
        "rally",
        "rallies",
        "surge",
        "surges",
        "soar",
        "soars",
        "crash",
        "crashes",
        "drop",
        "drops",
        "decline",
        "declines",
        "gain",
        "gains",
        "rise",
        "rises",
        "rising",
        "fall",
        "falls",
        "falling",
        "bull",
        "bullish",
        "bear",
        "bearish",
        "trading",
        "trader",
        "traders",
        "volume",
        "volatility",
        "liquidation",
        "liquidations"
    ],

    technology: [
        "blockchain",
        "technology",
        "protocol",
        "protocols",
        "network",
        "networks",
        "upgrade",
        "upgrades",
        "update",
        "updates",
        "smart contract",
        "smart contracts",
        "defi",
        "decentralized finance",
        "layer 2",
        "layer-2",
        "mainnet",
        "testnet",
        "scaling",
        "scalability",
        "software",
        "developer",
        "developers",
        "development"
    ],

    security: [
        "hack",
        "hacked",
        "hacker",
        "hackers",
        "exploit",
        "exploited",
        "exploit",
        "attack",
        "attacked",
        "attacker",
        "breach",
        "breached",
        "security",
        "vulnerability",
        "vulnerabilities",
        "fraud",
        "scam",
        "scams",
        "stolen",
        "steal",
        "stolen funds",
        "phishing",
        "cyberattack",
        "cyber attack"
    ],

    adoption: [
        "adoption",
        "adopt",
        "adopted",
        "adopting",
        "payment",
        "payments",
        "merchant",
        "merchants",
        "accepted",
        "accepting",
        "integration",
        "integrated",
        "users",
        "user adoption",
        "mass adoption",
        "use case",
        "use cases",
        "remittance",
        "remittances"
    ],

    mining: [
        "mining",
        "miner",
        "miners",
        "mined",
        "hashrate",
        "hash rate",
        "mining rig",
        "mining rigs",
        "mining pool",
        "mining pools",
        "proof of work",
        "proof-of-work"
    ]
};


/*
|--------------------------------------------------------------------------
| PESOS DAS NARRATIVAS
|--------------------------------------------------------------------------
|
| Alguns termos são muito mais específicos que outros.
|
| Exemplo:
|
| "SEC" é um forte indicador de regulamentação.
|
| Já "market" pode aparecer em praticamente qualquer
| notícia financeira.
|
| Por isso damos mais peso para termos específicos.
|
*/

const PESOS_ESPECIAIS = {

    regulation: {
        "sec": 5,
        "cftc": 5,
        "legislation": 4,
        "legislative": 4,
        "regulation": 4,
        "regulatory": 4,
        "government": 3,
        "ban": 4,
        "compliance": 3
    },

    institutional_investment: {
        "etf": 5,
        "blackrock": 5,
        "fidelity": 5,
        "grayscale": 5,
        "institutional": 4,
        "asset manager": 4,
        "fund": 3,
        "investment": 2
    },

    security: {
        "hack": 5,
        "hacked": 5,
        "exploit": 5,
        "exploited": 5,
        "breach": 5,
        "fraud": 5,
        "scam": 5,
        "stolen funds": 5,
        "phishing": 5
    },

    mining: {
        "hashrate": 5,
        "hash rate": 5,
        "mining rig": 5,
        "mining pool": 5,
        "proof of work": 4,
        "mining": 3
    },

    adoption: {
        "mass adoption": 5,
        "adoption": 4,
        "payment": 3,
        "payments": 3,
        "merchant": 3,
        "remittance": 4
    },

    technology: {
        "smart contract": 4,
        "smart contracts": 4,
        "mainnet": 5,
        "testnet": 5,
        "layer 2": 5,
        "layer-2": 5,
        "protocol": 3,
        "blockchain": 2
    },

    market: {
        "crash": 4,
        "rally": 4,
        "surge": 4,
        "bullish": 3,
        "bearish": 3,
        "liquidation": 4,
        "volatility": 3,
        "price": 1,
        "market": 1,
        "trading": 2
    }
};


/*
|--------------------------------------------------------------------------
| VALIDAR CONFIGURAÇÃO
|--------------------------------------------------------------------------
*/

if (!MONGODB_URI) {

    console.error(
        "\nERRO: MONGODB_URI ou MONGO_URI não encontrado no .env."
    );

    process.exit(1);
}


/*
|--------------------------------------------------------------------------
| NORMALIZAR TEXTO
|--------------------------------------------------------------------------
*/

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/<[^>]*>/g, " ")
        .replace(/[\r\n\t]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/*
|--------------------------------------------------------------------------
| ESCAPAR EXPRESSÃO REGULAR
|--------------------------------------------------------------------------
*/

function escaparRegex(texto) {

    return texto.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
    );
}


/*
|--------------------------------------------------------------------------
| VERIFICAR OCORRÊNCIA DE TERMO
|--------------------------------------------------------------------------
|
| Evitamos encontrar palavras dentro de outras palavras.
|
| Exemplo:
|
| "fund" não deve contar dentro de uma palavra completamente
| diferente.
|
*/

function contarOcorrencias(texto, termo) {

    const termoNormalizado =
        normalizarTexto(termo);

    if (!termoNormalizado) {
        return 0;
    }


    const regex =
        new RegExp(
            `\\b${escaparRegex(termoNormalizado).replace(/\s+/g, "\\s+")}\\b`,
            "gi"
        );


    const ocorrencias =
        texto.match(regex);


    return ocorrencias
        ? ocorrencias.length
        : 0;
}


/*
|--------------------------------------------------------------------------
| CALCULAR PONTUAÇÃO DAS NARRATIVAS
|--------------------------------------------------------------------------
*/

function calcularNarrativas(texto) {

    const textoNormalizado =
        normalizarTexto(texto);


    const pontuacoes = {

        regulation: 0,

        institutional_investment: 0,

        market: 0,

        technology: 0,

        security: 0,

        adoption: 0,

        mining: 0
    };


    /*
    |--------------------------------------------------------------------------
    | CALCULAR CADA CATEGORIA
    |--------------------------------------------------------------------------
    */

    for (
        const narrativa of Object.keys(NARRATIVAS)
    ) {

        const termos =
            NARRATIVAS[narrativa];


        for (
            const termo of termos
        ) {

            const quantidade =
                contarOcorrencias(
                    textoNormalizado,
                    termo
                );


            if (
                quantidade === 0
            ) {
                continue;
            }


            /*
            |--------------------------------------------------------------------------
            | PESO ESPECIAL
            |--------------------------------------------------------------------------
            */

            const pesoEspecial =
                PESOS_ESPECIAIS[narrativa] &&
                PESOS_ESPECIAIS[narrativa][termo];


            const peso =
                pesoEspecial || 1;


            pontuacoes[narrativa] +=
                quantidade * peso;
        }
    }


    return pontuacoes;
}


/*
|--------------------------------------------------------------------------
| IDENTIFICAR NARRATIVA PRINCIPAL
|--------------------------------------------------------------------------
*/

function detectarNarrativa(texto) {

    const pontuacoes =
        calcularNarrativas(texto);


    let melhorNarrativa =
        "general";

    let maiorPontuacao =
        0;


    /*
    |--------------------------------------------------------------------------
    | ENCONTRAR MAIOR PONTUAÇÃO
    |--------------------------------------------------------------------------
    */

    for (
        const narrativa of Object.keys(pontuacoes)
    ) {

        const pontuacao =
            pontuacoes[narrativa];


        if (
            pontuacao >
            maiorPontuacao
        ) {

            maiorPontuacao =
                pontuacao;

            melhorNarrativa =
                narrativa;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | NENHUMA EVIDÊNCIA
    |--------------------------------------------------------------------------
    */

    if (
        maiorPontuacao === 0
    ) {

        return {

            narrative: "general",

            score: 0,

            scores: pontuacoes
        };
    }


    return {

        narrative: melhorNarrativa,

        score: maiorPontuacao,

        scores: pontuacoes
    };
}


/*
|--------------------------------------------------------------------------
| CRIAR DIRETÓRIO DE RELATÓRIO
|--------------------------------------------------------------------------
*/

function garantirDiretorio() {

    const diretorio =
        path.join(
            process.cwd(),
            "dataset"
        );


    if (
        !fs.existsSync(diretorio)
    ) {

        fs.mkdirSync(
            diretorio,
            {
                recursive: true
            }
        );
    }


    return diretorio;
}


/*
|--------------------------------------------------------------------------
| PROCESSAR NARRATIVAS
|--------------------------------------------------------------------------
*/

async function processarNarrativas() {

    console.log("\n");

    console.log(
        "============================================================"
    );

    console.log(
        " REPROCESSAMENTO DAS NARRATIVAS HISTÓRICAS"
    );

    console.log(
        "============================================================"
    );

    console.log(
        "\nATENÇÃO:"
    );

    console.log(
        "Este processo altera SOMENTE o campo 'narrative'."
    );

    console.log(
        "Nenhuma notícia será coletada."
    );

    console.log(
        "Nenhum outro campo será alterado."
    );


    /*
    |--------------------------------------------------------------------------
    | CONECTAR
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
        "\nBuscando notícias..."
    );


    const noticias =
        await Post.find({})
            .select({
                _id: 1,
                newsId: 1,
                title: 1,
                content: 1,
                narrative: 1
            })
            .lean();


    console.log(
        `Total encontrado: ${noticias.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | CONTADORES
    |--------------------------------------------------------------------------
    */

    const contagemAntes = {};

    const contagemDepois = {};

    const exemplos = {};


    const todasNarrativas = [
        "general",
        "market",
        "regulation",
        "institutional_investment",
        "technology",
        "security",
        "adoption",
        "mining"
    ];


    for (
        const narrativa of todasNarrativas
    ) {

        contagemAntes[narrativa] = 0;

        contagemDepois[narrativa] = 0;

        exemplos[narrativa] = [];
    }


    /*
    |--------------------------------------------------------------------------
    | CONTAR ESTADO ATUAL
    |--------------------------------------------------------------------------
    */

    for (
        const noticia of noticias
    ) {

        const narrativaAtual =
            noticia.narrative
                ? String(noticia.narrative).trim()
                : "general";


        if (
            contagemAntes[narrativaAtual] === undefined
        ) {

            contagemAntes[narrativaAtual] = 0;
        }


        contagemAntes[narrativaAtual]++;
    }


    /*
    |--------------------------------------------------------------------------
    | PROCESSAMENTO
    |--------------------------------------------------------------------------
    */

    let processadas = 0;

    let alteradas = 0;


    for (
        const noticia of noticias
    ) {

        const titulo =
            noticia.title || "";

        const conteudo =
            noticia.content || "";


        const texto =
            `${titulo} ${conteudo}`;


        const resultado =
            detectarNarrativa(texto);


        const narrativaNova =
            resultado.narrative;


        /*
        |--------------------------------------------------------------------------
        | CONTAGEM
        |--------------------------------------------------------------------------
        */

        if (
            contagemDepois[narrativaNova] === undefined
        ) {

            contagemDepois[narrativaNova] = 0;
        }


        contagemDepois[narrativaNova]++;


        /*
        |--------------------------------------------------------------------------
        | EXEMPLOS
        |--------------------------------------------------------------------------
        */

        if (
            exemplos[narrativaNova] &&
            exemplos[narrativaNova].length < 5
        ) {

            exemplos[narrativaNova].push({

                newsId:
                    noticia.newsId || "(vazio)",

                title:
                    titulo,

                score:
                    resultado.score
            });
        }


        /*
        |--------------------------------------------------------------------------
        | ATUALIZAR APENAS SE NECESSÁRIO
        |--------------------------------------------------------------------------
        */

        const narrativaAtual =
            noticia.narrative
                ? String(noticia.narrative).trim()
                : "general";


        if (
            narrativaAtual !==
            narrativaNova
        ) {

            await Post.updateOne(

                {
                    _id: noticia._id
                },

                {
                    $set: {
                        narrative: narrativaNova
                    }
                }
            );


            alteradas++;
        }


        processadas++;


        /*
        |--------------------------------------------------------------------------
        | PROGRESSO
        |--------------------------------------------------------------------------
        */

        if (
            processadas % 500 === 0
        ) {

            console.log(
                `Processadas: ${processadas}/${noticias.length}`
            );
        }
    }


    /*
    |--------------------------------------------------------------------------
    | RELATÓRIO
    |--------------------------------------------------------------------------
    */

    const relatorio = {

        data:
            new Date().toISOString(),

        totalNoticias:
            noticias.length,

        processadas:
            processadas,

        alteradas:
            alteradas,

        mantidas:
            processadas - alteradas,

        contagemAntes:
            contagemAntes,

        contagemDepois:
            contagemDepois,

        exemplos:
            exemplos
    };


    const diretorio =
        garantirDiretorio();


    const arquivo =
        path.join(
            diretorio,
            "relatorio_narrativas.json"
        );


    fs.writeFileSync(

        arquivo,

        JSON.stringify(
            relatorio,
            null,
            2
        ),

        "utf8"
    );


    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    */

    console.log("\n");

    console.log(
        "============================================================"
    );

    console.log(
        " RESULTADO DO REPROCESSAMENTO"
    );

    console.log(
        "============================================================"
    );


    console.log(
        `Total de notícias: ${processadas}`
    );

    console.log(
        `Narrativas alteradas: ${alteradas}`
    );

    console.log(
        `Narrativas mantidas: ${processadas - alteradas}`
    );


    console.log("\n");

    console.log(
        "DISTRIBUIÇÃO ANTES:"
    );


    for (
        const narrativa of Object.keys(contagemAntes)
    ) {

        console.log(
            `${narrativa}: ${contagemAntes[narrativa]}`
        );
    }


    console.log("\n");

    console.log(
        "DISTRIBUIÇÃO DEPOIS:"
    );


    for (
        const narrativa of Object.keys(contagemDepois)
    ) {

        console.log(
            `${narrativa}: ${contagemDepois[narrativa]}`
        );
    }


    console.log("\n");

    console.log(
        "EXEMPLOS:"
    );


    for (
        const narrativa of todasNarrativas
    ) {

        console.log("\n----------------------------------------");

        console.log(
            narrativa
        );


        if (
            !exemplos[narrativa] ||
            exemplos[narrativa].length === 0
        ) {

            console.log(
                "Nenhum exemplo."
            );

            continue;
        }


        for (
            const exemplo of exemplos[narrativa]
        ) {

            console.log(
                `- ${exemplo.title}`
            );

            console.log(
                `  score: ${exemplo.score}`
            );
        }
    }


    console.log("\n");

    console.log(
        "Relatório salvo em:"
    );

    console.log(
        arquivo
    );


    console.log("\n");

    console.log(
        "============================================================"
    );

    console.log(
        " REPROCESSAMENTO CONCLUÍDO"
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

processarNarrativas()

    .then(async () => {

        await mongoose.disconnect();

        console.log(
            "\nMongoDB desconectado."
        );

        process.exit(0);
    })

    .catch(async (error) => {

        console.error(
            "\nERRO DURANTE O REPROCESSAMENTO:"
        );

        console.error(
            error
        );


        try {

            await mongoose.disconnect();

        } catch (erro) {

            console.error(
                "Erro ao desconectar:",
                erro.message
            );
        }


        process.exit(1);
    });