const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
require("dotenv").config();

const Post = require("../models/Post");

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const TOTAL_AMOSTRA = 300;

const NARRATIVAS = [
    "adoption",
    "general",
    "institutional_investment",
    "market",
    "mining",
    "regulation",
    "security",
    "technology"
];


/* ============================================================
   OBTÉM A URI DO MONGODB
   ============================================================ */

function obterMongoURI() {

    /*
     * Tenta encontrar a variável usada pelo projeto.
     *
     * Não alteramos o .env.
     */

    const nomesPossiveis = [
        "MONGODB_URI",
        "MONGO_URI",
        "MONGODB_URL",
        "MONGO_URL",
        "DATABASE_URL",
        "DB_URI",
        "MONGODB_CONNECTION_STRING"
    ];

    for (const nome of nomesPossiveis) {

        if (
            process.env[nome] &&
            process.env[nome].trim() !== ""
        ) {

            console.log(
                `Variável MongoDB encontrada: ${nome}`
            );

            return process.env[nome];
        }
    }

    /*
     * Caso nenhuma variável conhecida seja encontrada,
     * mostra quais variáveis existem no .env sem revelar
     * senhas ou valores.
     */

    const variaveisEncontradas =
        Object.keys(process.env)
            .filter(nome =>
                /mongo|database|db/i.test(nome)
            );

    console.log("");
    console.log(
        "Variáveis relacionadas ao banco encontradas:"
    );

    if (variaveisEncontradas.length === 0) {

        console.log(
            "  Nenhuma variável com nome relacionado ao MongoDB foi encontrada."
        );

    } else {

        for (const nome of variaveisEncontradas) {

            console.log(
                `  ${nome}`
            );
        }
    }

    throw new Error(
        "Não foi encontrada uma variável de conexão com o MongoDB no arquivo .env."
    );
}


/* ============================================================
   EMBARALHAMENTO
   ============================================================ */

function embaralhar(array) {

    const copia = [...array];

    for (
        let i = copia.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
            );

        [
            copia[i],
            copia[j]
        ] = [
            copia[j],
            copia[i]
        ];
    }

    return copia;
}


/* ============================================================
   LIMPA TEXTO
   ============================================================ */

function limparTexto(texto) {

    if (!texto) {
        return "";
    }

    return String(texto)

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
            /&quot;/gi,
            '"'
        )

        .replace(
            /&#39;/gi,
            "'"
        )

        .replace(
            /\s+/g,
            " "
        )

        .trim();
}


/* ============================================================
   DISTRIBUIÇÃO PROPORCIONAL
   ============================================================ */

function calcularQuantidadeProporcional(
    total,
    quantidadePorNarrativa
) {

    const resultado = {};

    const soma =
        Object.values(
            quantidadePorNarrativa
        ).reduce(
            (a, b) => a + b,
            0
        );

    if (soma === 0) {

        throw new Error(
            "Não existem notícias classificadas nas narrativas informadas."
        );
    }

    let distribuidos = 0;

    const restos = [];

    for (
        const narrativa of NARRATIVAS
    ) {

        const quantidade =
            quantidadePorNarrativa[
                narrativa
            ];

        const valorExato =
            (
                quantidade /
                soma
            ) * total;

        const parteInteira =
            Math.floor(
                valorExato
            );

        resultado[narrativa] =
            parteInteira;

        distribuidos +=
            parteInteira;

        restos.push({

            narrativa,

            resto:
                valorExato -
                parteInteira
        });
    }

    /*
     * Distribui os registros restantes
     * pelas maiores partes decimais.
     */

    restos.sort(
        (a, b) =>
            b.resto -
            a.resto
    );

    let restante =
        total -
        distribuidos;

    let indice = 0;

    while (
        restante > 0
    ) {

        resultado[
            restos[indice].narrativa
        ]++;

        restante--;

        indice++;

        if (
            indice >=
            restos.length
        ) {

            indice = 0;
        }
    }

    return resultado;
}


/* ============================================================
   ESCAPA CAMPO DO CSV
   ============================================================ */

function escaparCSV(valor) {

    if (
        valor === null ||
        valor === undefined
    ) {

        return '""';
    }

    const texto =
        String(valor)
            .replace(
                /"/g,
                '""'
            );

    return `"${texto}"`;
}


/* ============================================================
   GERA CSV
   ============================================================ */

function gerarCSV(registros) {

    const cabecalho = [

        "ordem",

        "newsId",

        "titulo",

        "texto",

        "narrativa_atual",

        "narrativa_humana"
    ];

    const linhas = [];

    linhas.push(
        cabecalho
            .map(escaparCSV)
            .join(",")
    );

    registros.forEach(
        (registro, indice) => {

            linhas.push(

                [

                    indice + 1,

                    registro.newsId,

                    registro.titulo,

                    registro.texto,

                    registro.narrativaAtual,

                    ""

                ]

                    .map(escaparCSV)

                    .join(",")
            );
        }
    );

    return linhas.join("\n");
}


/* ============================================================
   FUNÇÃO PRINCIPAL
   ============================================================ */

async function gerarGoldStandard() {

    let conectado = false;

    try {

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " GERAÇÃO DO GOLD STANDARD"
        );

        console.log(
            "============================================================"
        );

        console.log("");


        /* ====================================================
           CONEXÃO COM MONGODB
           ==================================================== */

        const mongoURI =
            obterMongoURI();

        console.log("");

        console.log(
            "Conectando ao MongoDB..."
        );

        await mongoose.connect(
            mongoURI
        );

        conectado = true;

        console.log(
            "MongoDB conectado com sucesso."
        );


        /* ====================================================
           BUSCA AS NOTÍCIAS
           ==================================================== */

        console.log("");

        console.log(
            "Buscando notícias históricas..."
        );

        const noticias =
            await Post.find({

                narrative: {
                    $in: NARRATIVAS
                }

            })

                .select(
                    "newsId title content narrative coin publishedAt source"
                )

                .lean();


        console.log("");

        console.log(
            `Notícias encontradas: ${noticias.length}`
        );


        if (
            noticias.length === 0
        ) {

            throw new Error(
                "Nenhuma notícia encontrada no MongoDB."
            );
        }


        /* ====================================================
           CONTAGEM POR NARRATIVA
           ==================================================== */

        const quantidadePorNarrativa = {};

        for (
            const narrativa of NARRATIVAS
        ) {

            quantidadePorNarrativa[
                narrativa
            ] =
                noticias.filter(
                    noticia =>
                        noticia.narrative ===
                        narrativa
                ).length;
        }


        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " DISTRIBUIÇÃO ATUAL DAS NARRATIVAS"
        );

        console.log(
            "============================================================"
        );

        for (
            const narrativa of NARRATIVAS
        ) {

            console.log(

                `${narrativa.padEnd(28)} ` +
                `${quantidadePorNarrativa[narrativa]}`
            );
        }


        /* ====================================================
           CALCULA AMOSTRA
           ==================================================== */

        const quantidadeAmostra =
            calcularQuantidadeProporcional(

                TOTAL_AMOSTRA,

                quantidadePorNarrativa
            );


        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            ` AMOSTRA PROPORCIONAL - ${TOTAL_AMOSTRA} NOTÍCIAS`
        );

        console.log(
            "============================================================"
        );

        for (
            const narrativa of NARRATIVAS
        ) {

            console.log(

                `${narrativa.padEnd(28)} ` +
                `${quantidadeAmostra[narrativa]}`
            );
        }


        /* ====================================================
           SELECIONA AS NOTÍCIAS
           ==================================================== */

        const selecionadas = [];

        for (
            const narrativa of NARRATIVAS
        ) {

            const registros =
                noticias.filter(
                    noticia =>
                        noticia.narrative ===
                        narrativa
                );


            /*
             * Embaralha somente os registros
             * daquela narrativa.
             */

            const embaralhadas =
                embaralhar(
                    registros
                );


            const quantidade =
                quantidadeAmostra[
                    narrativa
                ];


            const escolhidas =
                embaralhadas.slice(
                    0,
                    quantidade
                );


            for (
                const noticia of escolhidas
            ) {

                const titulo =
                    limparTexto(
                        noticia.title
                    );


                const conteudo =
                    limparTexto(
                        noticia.content
                    );


                let texto =
                    titulo;


                if (
                    conteudo
                ) {

                    texto +=
                        " " +
                        conteudo;
                }


                selecionadas.push({

                    newsId:
                        noticia.newsId,

                    titulo,

                    texto,

                    narrativaAtual:
                        noticia.narrative,

                    coin:
                        noticia.coin,

                    publishedAt:
                        noticia.publishedAt,

                    source:
                        noticia.source
                });
            }
        }


        /* ====================================================
           EMBARALHA TODA A AMOSTRA
           ==================================================== */

        const amostraFinal =
            embaralhar(
                selecionadas
            );


        /*
         * Verificação de segurança.
         */

        if (
            amostraFinal.length !==
            TOTAL_AMOSTRA
        ) {

            throw new Error(

                `A amostra deveria possuir ` +
                `${TOTAL_AMOSTRA} registros, ` +
                `mas possui ` +
                `${amostraFinal.length}.`
            );
        }


        /* ====================================================
           PASTA DE SAÍDA
           ==================================================== */

        const pastaSaida =
            path.join(

                process.cwd(),

                "dataset",

                "gold_standard"
            );


        fs.mkdirSync(

            pastaSaida,

            {
                recursive: true
            }
        );


        /* ====================================================
           PREPARA JSON
           ==================================================== */

        const jsonFinal =
            amostraFinal.map(

                (registro, indice) => ({

                    ordem:
                        indice + 1,

                    newsId:
                        registro.newsId,

                    titulo:
                        registro.titulo,

                    texto:
                        registro.texto,

                    narrativaAtual:
                        registro.narrativaAtual,

                    narrativaHumana:
                        "",

                    coin:
                        registro.coin,

                    publishedAt:
                        registro.publishedAt,

                    source:
                        registro.source
                })
            );


        /* ====================================================
           SALVA JSON
           ==================================================== */

        const caminhoJSON =
            path.join(

                pastaSaida,

                "gold_standard_300.json"
            );


        fs.writeFileSync(

            caminhoJSON,

            JSON.stringify(

                jsonFinal,

                null,

                2
            ),

            "utf8"
        );


        /* ====================================================
           SALVA CSV
           ==================================================== */

        const caminhoCSV =
            path.join(

                pastaSaida,

                "gold_standard_300.csv"
            );


        const csv =
            gerarCSV(
                jsonFinal
            );


        /*
         * BOM UTF-8 para o Excel reconhecer
         * corretamente acentos.
         */

        fs.writeFileSync(

            caminhoCSV,

            "\uFEFF" + csv,

            "utf8"
        );


        /* ====================================================
           RELATÓRIO
           ==================================================== */

        const distribuicaoFinal = {};


        for (
            const narrativa of NARRATIVAS
        ) {

            distribuicaoFinal[
                narrativa
            ] =
                jsonFinal.filter(

                    registro =>
                        registro.narrativaAtual ===
                        narrativa

                ).length;
        }


        const relatorio = {

            dataGeracao:
                new Date()
                    .toISOString(),

            totalNoticiasMongo:
                noticias.length,

            tamanhoAmostra:
                jsonFinal.length,

            metodo:
                "Amostragem aleatória estratificada proporcional",

            narrativas:
                NARRATIVAS,

            distribuicaoAmostra:
                distribuicaoFinal,

            arquivos: {

                json:
                    "dataset/gold_standard/gold_standard_300.json",

                csv:
                    "dataset/gold_standard/gold_standard_300.csv"
            },

            observacao:
                "A narrativa atual é utilizada somente para estratificação da amostra. A coluna narrativa_humana deve ser preenchida manualmente e será utilizada posteriormente para validação do modelo."
        };


        const caminhoRelatorio =
            path.join(

                pastaSaida,

                "relatorio_gold_standard.json"
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


        /* ====================================================
           RESULTADO FINAL
           ==================================================== */

        console.log("");

        console.log(
            "============================================================"
        );

        console.log(
            " GOLD STANDARD GERADO COM SUCESSO"
        );

        console.log(
            "============================================================"
        );

        console.log("");

        console.log(
            `Total selecionado: ${jsonFinal.length}`
        );

        console.log("");

        console.log(
            "Distribuição final:"
        );

        console.log("");


        for (
            const narrativa of NARRATIVAS
        ) {

            console.log(

                `${narrativa.padEnd(28)} ` +
                `${distribuicaoFinal[narrativa]}`
            );
        }


        console.log("");

        console.log(
            "Arquivos criados:"
        );

        console.log("");

        console.log(
            "  dataset/gold_standard/gold_standard_300.json"
        );

        console.log(
            "  dataset/gold_standard/gold_standard_300.csv"
        );

        console.log(
            "  dataset/gold_standard/relatorio_gold_standard.json"
        );

        console.log("");

        console.log(
            "IMPORTANTE:"
        );

        console.log(
            "Preencha somente a coluna narrativa_humana."
        );

        console.log(
            "Não altere a narrativa_atual."
        );

        console.log("");

    } catch (error) {

        console.error("");

        console.error(
            "============================================================"
        );

        console.error(
            " ERRO AO GERAR GOLD STANDARD"
        );

        console.error(
            "============================================================"
        );

        console.error("");

        console.error(
            error.message
        );

        console.error("");

    } finally {

        if (conectado) {

            await mongoose.disconnect();

            console.log(
                "MongoDB desconectado."
            );
        }
    }
}


/* ============================================================
   EXECUÇÃO
   ============================================================ */

gerarGoldStandard();