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

const LIMITE_EXEMPLOS = 15;

const CAMINHO_DATASET =
    path.join(
        process.cwd(),
        "dataset"
    );

const ARQUIVO_RELATORIO =
    path.join(
        CAMINHO_DATASET,
        "relatorio_narrativas_v2_simulacao.json"
    );


/* ============================================================
   GARANTIR PASTA DATASET
   ============================================================ */

if (!fs.existsSync(CAMINHO_DATASET)) {

    fs.mkdirSync(
        CAMINHO_DATASET,
        {
            recursive: true
        }
    );

}


/* ============================================================
   NORMALIZAR TEXTO
   ============================================================ */

function normalizarTexto(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/* ============================================================
   VERIFICAR EXPRESSÃO
   ============================================================ */

function contem(texto, expressao) {

    return texto.includes(
        normalizarTexto(expressao)
    );

}


/* ============================================================
   CONTAR OCORRÊNCIAS
   ============================================================ */

function contarOcorrencias(texto, expressao) {

    const termo =
        normalizarTexto(expressao);

    if (!termo) {
        return 0;
    }

    let contador = 0;
    let posicao = 0;

    while (true) {

        const encontrada =
            texto.indexOf(
                termo,
                posicao
            );

        if (encontrada === -1) {
            break;
        }

        contador++;

        posicao =
            encontrada +
            termo.length;

    }

    return contador;

}


/* ============================================================
   REGRAS DAS NARRATIVAS
   ============================================================ */

/*
    A V2 trabalha com dois tipos de evidência:

    1. TERMOS FORTES
       São expressões muito características da narrativa.

    2. TERMOS MODERADOS
       Ajudam na classificação, mas sozinhos não devem
       determinar a narrativa.

    Isso evita problemas como:

       "investor"
       "bank"
       "technology"
       "security"
       "government"

    sendo suficientes para classificar uma notícia.
*/


const REGRAS = {

    security: {

        forte: [

            "hack",
            "hacked",
            "hacker",
            "hackers",
            "exploit",
            "exploited",
            "exploits",
            "vulnerability",
            "vulnerabilities",
            "security breach",
            "data breach",
            "wallet bug",
            "security flaw",
            "stolen crypto",
            "stolen bitcoin",
            "crypto stolen",
            "funds stolen",
            "funds drained",
            "crypto drained",
            "bitcoin drained",
            "phishing attack",
            "malware",
            "ransomware",
            "private key compromised",
            "private keys compromised",
            "wallet exploit",
            "protocol exploit",
            "smart contract exploit",
            "cyberattack",
            "cyber attack"

        ],

        moderada: [

            "security",
            "attack",
            "attacker",
            "breach",
            "drained",
            "stolen",
            "scam",
            "fraud",
            "theft",
            "compromised"

        ]

    },


    mining: {

        forte: [

            "bitcoin mining",
            "crypto mining",
            "cryptocurrency mining",
            "bitcoin miner",
            "bitcoin miners",
            "crypto miner",
            "crypto miners",
            "mining pool",
            "mining pools",
            "mining difficulty",
            "hashrate",
            "hash rate",
            "block reward",
            "proof of work",
            "proof-of-work",
            "mining ban",
            "mining operation",
            "mining operations",
            "mining facility",
            "mining facilities",
            "mining farm",
            "mining farms"

        ],

        moderada: [

            "mining",
            "miner",
            "miners",
            "hash power",
            "hashrate",
            "mined",
            "mines"

        ]

    },


    regulation: {

        forte: [

            "crypto regulation",
            "cryptocurrency regulation",
            "digital asset regulation",
            "digital assets regulation",
            "crypto bill",
            "crypto legislation",
            "digital asset bill",
            "digital asset legislation",
            "stablecoin bill",
            "stablecoin legislation",
            "regulatory framework",
            "regulatory clarity",
            "crypto law",
            "digital asset law",
            "clarity act",
            "sec",
            "cftc",
            "ofac",
            "sanctions",
            "crypto sanctions",
            "crypto compliance",
            "digital asset compliance",
            "regulatory compliance",
            "anti-money laundering",
            "anti money laundering",
            "aml",
            "know your customer",
            "kyc",
            "securities regulator",
            "financial regulator",
            "regulator",
            "regulators",
            "regulatory"

        ],

        moderada: [

            "government",
            "government policy",
            "policy",
            "legislation",
            "law",
            "court",
            "legal",
            "compliance",
            "congress",
            "senate",
            "parliament",
            "ban",
            "lawsuit"

        ]

    },


    institutional_investment: {

        forte: [

            "spot bitcoin etf",
            "spot ethereum etf",
            "bitcoin etf",
            "ethereum etf",
            "crypto etf",
            "digital asset etf",
            "etf inflows",
            "etf outflows",
            "fund inflows",
            "fund outflows",
            "institutional investor",
            "institutional investors",
            "institutional investment",
            "institutional adoption",
            "institutional custody",
            "institutional demand",
            "asset manager",
            "asset managers",
            "hedge fund",
            "hedge funds",
            "pension fund",
            "pension funds",
            "bitcoin custody",
            "crypto custody",
            "digital asset custody",
            "bitcoin reserve",
            "corporate bitcoin",
            "corporate treasury",
            "treasury bitcoin",
            "blackrock",
            "fidelity",
            "grayscale",
            "vanguard",
            "bitwise",
            "ark invest",
            "microstrategy",
            "strategy bitcoin"

        ],

        moderada: [

            "investor",
            "investors",
            "investment",
            "investments",
            "institutional",
            "fund",
            "funds",
            "bank",
            "banks",
            "capital",
            "portfolio",
            "custody",
            "asset management"

        ]

    },


    adoption: {

        forte: [

            "crypto payments",
            "cryptocurrency payments",
            "bitcoin payments",
            "bitcoin payment",
            "stablecoin payments",
            "stablecoin payment",
            "crypto payment",
            "accept bitcoin",
            "accepts bitcoin",
            "accept crypto",
            "accepts crypto",
            "merchant adoption",
            "mainstream adoption",
            "crypto adoption",
            "cryptocurrency adoption",
            "blockchain adoption",
            "mass adoption",
            "cross-border payments",
            "cross border payments",
            "crypto remittances",
            "stablecoin remittances",
            "payment partnership",
            "payments partnership",
            "crypto payment partnership",
            "blockchain payments",
            "tokenized payments",
            "real world adoption"

        ],

        moderada: [

            "adoption",
            "adopt",
            "adopts",
            "users",
            "customers",
            "payments",
            "payment",
            "remittance",
            "merchant",
            "mainstream"

        ]

    },


    technology: {

        forte: [

            "blockchain upgrade",
            "network upgrade",
            "protocol upgrade",
            "ethereum upgrade",
            "bitcoin upgrade",
            "solana upgrade",
            "mainnet",
            "testnet",
            "smart contract",
            "smart contracts",
            "layer 1",
            "layer 2",
            "layer-1",
            "layer-2",
            "rollup",
            "rollups",
            "zk rollup",
            "zk-rollup",
            "zero knowledge proof",
            "zero-knowledge proof",
            "zkp",
            "developer roadmap",
            "development roadmap",
            "network fork",
            "hard fork",
            "soft fork",
            "fork",
            "bip-",
            "quantum-safe",
            "quantum safe",
            "post-quantum",
            "post quantum",
            "defi protocol",
            "defi protocols",
            "protocol development",
            "blockchain developer",
            "blockchain developers",
            "ethereum roadmap",
            "bitcoin roadmap",
            "solana roadmap"

        ],

        moderada: [

            "blockchain",
            "protocol",
            "developer",
            "developers",
            "development",
            "upgrade",
            "roadmap",
            "network",
            "software",
            "infrastructure"

        ]

    },


    market: {

        forte: [

            "bitcoin price",
            "ethereum price",
            "crypto price",
            "cryptocurrency price",
            "price prediction",
            "price target",
            "technical analysis",
            "market analysis",
            "market cap",
            "market capitalization",
            "trading volume",
            "trading volumes",
            "liquidation",
            "liquidations",
            "liquidated",
            "volatility",
            "price volatility",
            "bullish",
            "bearish",
            "bull run",
            "bear market",
            "breakout",
            "breakdown",
            "resistance level",
            "support level",
            "price surge",
            "price rally",
            "price drop",
            "price decline",
            "price falls",
            "price rises",
            "rally",
            "surge",
            "crash",
            "correction",
            "all-time high",
            "all time high",
            "all-time low",
            "all time low",
            "trading",
            "traders",
            "crypto market",
            "cryptocurrency market",
            "bitcoin market",
            "ethereum market"

        ],

        moderada: [

            "price",
            "prices",
            "market",
            "markets",
            "trading",
            "trader",
            "gain",
            "gains",
            "loss",
            "losses",
            "rise",
            "rises",
            "rising",
            "fall",
            "falls",
            "falling",
            "drop",
            "drops",
            "decline",
            "forecast",
            "prediction",
            "volume",
            "volumes",
            "momentum",
            "resistance",
            "support"

        ]

    }

};


/* ============================================================
   CONTEXTO CRIPTO
   ============================================================ */

const TERMOS_CRIPTO = [

    "bitcoin",
    "btc",
    "ethereum",
    "eth",
    "solana",
    "sol",
    "xrp",
    "ripple",
    "bnb",
    "dogecoin",
    "doge",
    "tether",
    "usdt",
    "usdc",
    "hyperliquid",
    "hype",
    "tron",
    "trx",
    "crypto",
    "cryptocurrency",
    "cryptocurrencies",
    "blockchain",
    "digital asset",
    "digital assets",
    "stablecoin",
    "stablecoins",
    "defi",
    "web3",
    "token",
    "tokens",
    "altcoin",
    "altcoins"

];


/* ============================================================
   VERIFICAR CONTEXTO CRIPTO
   ============================================================ */

function possuiContextoCripto(texto, coin) {

    if (coin && coin !== "GENERAL") {

        return true;

    }

    for (const termo of TERMOS_CRIPTO) {

        if (contem(texto, termo)) {

            return true;

        }

    }

    return false;

}


/* ============================================================
   CALCULAR PONTUAÇÃO
   ============================================================ */

function calcularPontuacao(
    texto,
    regra
) {

    let pontosFortes = 0;
    let pontosModerados = 0;

    const evidenciasFortes = [];
    const evidenciasModeradas = [];

    for (const termo of regra.forte) {

        const quantidade =
            contarOcorrencias(
                texto,
                termo
            );

        if (quantidade > 0) {

            /*
                Limita a influência de uma palavra
                repetida muitas vezes.
            */

            const pontos =
                Math.min(
                    quantidade,
                    3
                ) * 5;

            pontosFortes += pontos;

            evidenciasFortes.push({

                termo,
                ocorrencias: quantidade,
                pontos

            });

        }

    }


    for (const termo of regra.moderada) {

        const quantidade =
            contarOcorrencias(
                texto,
                termo
            );

        if (quantidade > 0) {

            const pontos =
                Math.min(
                    quantidade,
                    3
                ) * 1;

            pontosModerados += pontos;

            evidenciasModeradas.push({

                termo,
                ocorrencias: quantidade,
                pontos

            });

        }

    }


    return {

        pontosFortes,
        pontosModerados,

        pontuacao:
            pontosFortes +
            pontosModerados,

        evidenciasFortes,
        evidenciasModeradas

    };

}


/* ============================================================
   CLASSIFICAR UMA NOTÍCIA
   ============================================================ */

function classificarNarrativa(
    noticia
) {

    const titulo =
        noticia.title || "";

    const conteudo =
        noticia.content || "";

    const textoOriginal =
        `${titulo} ${conteudo}`;

    const texto =
        normalizarTexto(
            textoOriginal
        );

    const coin =
        noticia.coin || "GENERAL";


    if (!texto) {

        return {

            narrativa: "general",

            confianca: 0,

            scores: {},

            evidencias: []

        };

    }


    const temCripto =
        possuiContextoCripto(
            texto,
            coin
        );


    const resultados = {};


    for (const narrativa of Object.keys(REGRAS)) {

        resultados[narrativa] =
            calcularPontuacao(
                texto,
                REGRAS[narrativa]
            );

    }


    /*
        Notícias sem contexto relacionado a cripto
        não devem ser classificadas como market apenas
        porque possuem palavras financeiras genéricas.
    */

    if (!temCripto) {

        resultados.market.pontuacao = 0;

        resultados.market.pontosFortes = 0;

        resultados.market.pontosModerados = 0;

    }


    /*
        Segurança possui prioridade quando existem
        evidências realmente fortes.

        Exemplo:

        "Hackers drain $100M in Bitcoin"

        Mesmo que tenha "Bitcoin", "price", "market"
        etc., o assunto principal é segurança.
    */

    if (
        resultados.security.pontosFortes >= 10
    ) {

        return {

            narrativa: "security",

            confianca:
                calcularConfianca(
                    resultados.security,
                    resultados
                ),

            scores:
                extrairScores(
                    resultados
                ),

            evidencias:
                reunirEvidencias(
                    resultados.security
                )

        };

    }


    /*
        Mineração também possui prioridade quando
        existem termos específicos.
    */

    if (
        resultados.mining.pontosFortes >= 10
    ) {

        return {

            narrativa: "mining",

            confianca:
                calcularConfianca(
                    resultados.mining,
                    resultados
                ),

            scores:
                extrairScores(
                    resultados
                ),

            evidencias:
                reunirEvidencias(
                    resultados.mining
                )

        };

    }


    /*
        Ordenar narrativas por pontuação.
    */

    const ranking =
        Object.entries(
            resultados
        )
        .sort(
            (a, b) =>
                b[1].pontuacao -
                a[1].pontuacao
        );


    const primeira =
        ranking[0];

    const segunda =
        ranking[1];


    if (!primeira) {

        return {

            narrativa: "general",

            confianca: 0,

            scores: {},

            evidencias: []

        };

    }


    const nomePrimeira =
        primeira[0];

    const resultadoPrimeira =
        primeira[1];


    const pontuacaoPrimeira =
        resultadoPrimeira.pontuacao;


    const pontuacaoSegunda =
        segunda
            ? segunda[1].pontuacao
            : 0;


    /*
        Regras de segurança.

        Uma narrativa não pode ser escolhida apenas
        porque possui uma palavra moderada.
    */

    if (
        pontuacaoPrimeira < 5
    ) {

        return {

            narrativa: "general",

            confianca: 0.20,

            scores:
                extrairScores(
                    resultados
                ),

            evidencias: []

        };

    }


    /*
        Se só existem evidências moderadas,
        exigimos pelo menos duas evidências.
    */

    const quantidadeFortes =
        resultadoPrimeira
            .evidenciasFortes
            .length;

    const quantidadeModeradas =
        resultadoPrimeira
            .evidenciasModeradas
            .length;


    if (
        quantidadeFortes === 0 &&
        quantidadeModeradas < 2
    ) {

        return {

            narrativa: "general",

            confianca: 0.25,

            scores:
                extrairScores(
                    resultados
                ),

            evidencias: []

        };

    }


    /*
        Se as duas primeiras narrativas estiverem
        muito próximas, preferimos GENERAL.

        Isso evita classificações artificiais em
        notícias que realmente possuem vários temas.
    */

    if (
        pontuacaoSegunda > 0 &&
        pontuacaoPrimeira -
        pontuacaoSegunda < 3
    ) {

        /*
            Exceção para evidência forte muito clara.
        */

        if (
            quantidadeFortes === 0
        ) {

            return {

                narrativa: "general",

                confianca: 0.35,

                scores:
                    extrairScores(
                        resultados
                    ),

                evidencias: []

            };

        }

    }


    /*
        Resultado final.
    */

    return {

        narrativa: nomePrimeira,

        confianca:
            calcularConfianca(
                resultadoPrimeira,
                resultados
            ),

        scores:
            extrairScores(
                resultados
            ),

        evidencias:
            reunirEvidencias(
                resultadoPrimeira
            )

    };

}


/* ============================================================
   EXTRAIR SCORES
   ============================================================ */

function extrairScores(
    resultados
) {

    const scores = {};

    for (
        const [narrativa, resultado]
        of Object.entries(resultados)
    ) {

        scores[narrativa] =
            resultado.pontuacao;

    }

    return scores;

}


/* ============================================================
   REUNIR EVIDÊNCIAS
   ============================================================ */

function reunirEvidencias(
    resultado
) {

    return [

        ...resultado.evidenciasFortes
            .map(
                item =>
                    `FORTE: ${item.termo}`
            ),

        ...resultado.evidenciasModeradas
            .map(
                item =>
                    `MODERADA: ${item.termo}`
            )

    ].slice(
        0,
        10
    );

}


/* ============================================================
   CALCULAR CONFIANÇA
   ============================================================ */

function calcularConfianca(
    resultado,
    todosResultados
) {

    const maior =
        resultado.pontuacao;


    const outras =
        Object.values(
            todosResultados
        )
        .map(
            item =>
                item.pontuacao
        )
        .sort(
            (a, b) =>
                b - a
        );


    const segunda =
        outras.length > 1
            ? outras[1]
            : 0;


    if (maior <= 0) {

        return 0;

    }


    let confianca =
        0.50;


    /*
        Evidência forte aumenta confiança.
    */

    if (
        resultado.pontosFortes >= 10
    ) {

        confianca += 0.25;

    } else if (
        resultado.pontosFortes >= 5
    ) {

        confianca += 0.15;

    }


    /*
        Diferença entre primeira e segunda
        narrativa aumenta confiança.
    */

    if (
        maior - segunda >= 10
    ) {

        confianca += 0.15;

    } else if (
        maior - segunda >= 5
    ) {

        confianca += 0.08;

    }


    return Math.min(
        Number(
            confianca.toFixed(2)
        ),
        0.99
    );

}


/* ============================================================
   INCREMENTAR CONTAGEM
   ============================================================ */

function incrementar(
    objeto,
    chave
) {

    if (!objeto[chave]) {

        objeto[chave] = 0;

    }

    objeto[chave]++;

}


/* ============================================================
   INICIAR
   ============================================================ */

async function executar() {

    console.log("");
    console.log(
        "============================================================"
    );
    console.log(
        "      CLASSIFICADOR DE NARRATIVAS V2 - SIMULAÇÃO"
    );
    console.log(
        "============================================================"
    );
    console.log("");

    console.log(
        "ATENÇÃO: o MongoDB NÃO será alterado."
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

    console.log("");


    const noticias =
        await Post.find({})
            .select(
                "_id newsId title content source coin sentiment narrative publishedAt"
            )
            .lean();


    console.log(
        `Total de notícias analisadas: ${noticias.length}`
    );

    console.log("");


    const contagemAntiga = {};
    const contagemNova = {};

    const alteracoes = [];

    const exemplosPorNarrativa = {};

    const confiancas = [];

    const conflitos = [];


    for (
        const noticia
        of noticias
    ) {

        const narrativaAntiga =
            noticia.narrative ||
            "general";


        const resultado =
            classificarNarrativa(
                noticia
            );


        const narrativaNova =
            resultado.narrativa;


        incrementar(
            contagemAntiga,
            narrativaAntiga
        );


        incrementar(
            contagemNova,
            narrativaNova
        );


        confiancas.push(
            resultado.confianca
        );


        /*
            Detectar situações em que duas narrativas
            possuem pontuações próximas.
        */

        const scores =
            resultado.scores || {};


        const ranking =
            Object.entries(
                scores
            )
            .sort(
                (a, b) =>
                    b[1] - a[1]
            );


        if (
            ranking.length >= 2 &&
            ranking[0][1] > 0 &&
            ranking[1][1] > 0 &&
            ranking[0][1] -
            ranking[1][1] < 5
        ) {

            conflitos.push({

                newsId:
                    noticia.newsId,

                title:
                    noticia.title,

                coin:
                    noticia.coin,

                narrativaAntiga,

                narrativaNova,

                principaisNarrativas:
                    ranking.slice(
                        0,
                        3
                    )

            });

        }


        /*
            Guardar apenas alterações.
        */

        if (
            narrativaAntiga !==
            narrativaNova
        ) {

            const alteracao = {

                newsId:
                    noticia.newsId,

                title:
                    noticia.title,

                coin:
                    noticia.coin,

                sentiment:
                    noticia.sentiment,

                narrativaAntiga,

                narrativaNova,

                confianca:
                    resultado.confianca,

                scores:
                    resultado.scores,

                evidencias:
                    resultado.evidencias

            };


            alteracoes.push(
                alteracao
            );


            if (
                !exemplosPorNarrativa[
                    narrativaNova
                ]
            ) {

                exemplosPorNarrativa[
                    narrativaNova
                ] = [];

            }


            if (
                exemplosPorNarrativa[
                    narrativaNova
                ].length <
                LIMITE_EXEMPLOS
            ) {

                exemplosPorNarrativa[
                    narrativaNova
                ].push(
                    alteracao
                );

            }

        }

    }


    /*
        Estatísticas de confiança.
    */

    const mediaConfianca =
        confiancas.length > 0

            ? confiancas.reduce(
                (total, valor) =>
                    total + valor,
                0
            ) / confiancas.length

            : 0;


    /*
        Percentual de alterações.
    */

    const percentualAlteracao =
        noticias.length > 0

            ? (
                alteracoes.length /
                noticias.length
            ) * 100

            : 0;


    /*
        Relatório final.
    */

    const relatorio = {

        dataExecucao:
            new Date().toISOString(),

        modo:
            "SIMULACAO",

        mongoAlterado:
            false,

        totalNoticias:
            noticias.length,

        totalAlteracoes:
            alteracoes.length,

        percentualAlteracoes:
            Number(
                percentualAlteracao.toFixed(2)
            ),

        confiancaMedia:
            Number(
                mediaConfianca.toFixed(3)
            ),

        contagemAntes:
            contagemAntiga,

        contagemV2:
            contagemNova,

        conflitos:

            conflitos.slice(
                0,
                200
            ),

        exemplosAlteracoes:
            exemplosPorNarrativa,

        todasAlteracoes:
            alteracoes

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


    /* ========================================================
       MOSTRAR RESULTADO NO TERMINAL
       ======================================================== */

    console.log(
        "------------------------------------------------------------"
    );

    console.log(
        "DISTRIBUIÇÃO ANTES"
    );

    console.log(
        "------------------------------------------------------------"
    );


    Object.entries(
        contagemAntiga
    )
    .sort(
        (a, b) =>
            b[1] - a[1]
    )
    .forEach(
        ([narrativa, quantidade]) => {

            const percentual =
                (
                    quantidade /
                    noticias.length
                ) * 100;

            console.log(

                `${narrativa.padEnd(30)} ` +
                `${String(quantidade).padStart(6)} ` +
                `(${percentual.toFixed(2)}%)`

            );

        }
    );


    console.log("");

    console.log(
        "------------------------------------------------------------"
    );

    console.log(
        "DISTRIBUIÇÃO V2"
    );

    console.log(
        "------------------------------------------------------------"
    );


    Object.entries(
        contagemNova
    )
    .sort(
        (a, b) =>
            b[1] - a[1]
    )
    .forEach(
        ([narrativa, quantidade]) => {

            const percentual =
                (
                    quantidade /
                    noticias.length
                ) * 100;

            console.log(

                `${narrativa.padEnd(30)} ` +
                `${String(quantidade).padStart(6)} ` +
                `(${percentual.toFixed(2)}%)`

            );

        }
    );


    console.log("");

    console.log(
        "------------------------------------------------------------"
    );

    console.log(
        "ALTERAÇÕES"
    );

    console.log(
        "------------------------------------------------------------"
    );

    console.log(
        `Notícias alteradas: ${alteracoes.length}`
    );

    console.log(
        `Percentual alterado: ${percentualAlteracao.toFixed(2)}%`
    );

    console.log(
        `Confiança média: ${mediaConfianca.toFixed(3)}`
    );

    console.log(
        `Conflitos identificados: ${conflitos.length}`
    );


    console.log("");

    console.log(
        "Relatório salvo em:"
    );

    console.log(
        ARQUIVO_RELATORIO
    );


    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        "SIMULAÇÃO CONCLUÍDA"
    );

    console.log(
        "Nenhum documento do MongoDB foi alterado."
    );

    console.log(
        "============================================================"
    );

    console.log("");


    await mongoose.disconnect();

}


executar()

    .catch(
        async (erro) => {

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