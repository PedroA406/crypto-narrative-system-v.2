const fs = require("fs");
const path = require("path");


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const ARQUIVO_PREDICOES = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/predicoes_narrativas.json"
);

const ARQUIVO_RELATORIO = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/relatorio_confianca_por_narrativa.json"
);


/* ============================================================
   NARRATIVAS
   ============================================================ */

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
   FAIXAS
   ============================================================ */

const FAIXAS = [
    {
        nome: "20-40%",
        minimo: 0.20,
        maximo: 0.40
    },
    {
        nome: "40-60%",
        minimo: 0.40,
        maximo: 0.60
    },
    {
        nome: "60-70%",
        minimo: 0.60,
        maximo: 0.70
    },
    {
        nome: "70-80%",
        minimo: 0.70,
        maximo: 0.80
    },
    {
        nome: "80-90%",
        minimo: 0.80,
        maximo: 0.90
    },
    {
        nome: "90-100%",
        minimo: 0.90,
        maximo: 1.01
    }
];


/* ============================================================
   FUNÇÕES
   ============================================================ */

function percentual(valor, total) {

    if (total === 0) {
        return 0;
    }

    return (valor / total) * 100;
}


function formatarPercentual(valor) {

    return valor.toFixed(2) + "%";
}


function criarEstruturaNarrativa() {

    const faixas = {};

    for (const faixa of FAIXAS) {

        faixas[faixa.nome] = {

            total: 0,

            concordancias: 0,

            divergencias: 0,

            confiancaTotal: 0,

            confiancaMedia: 0,

            percentualDoTotal: 0,

            percentualConcordancia: 0,

            percentualDivergencia: 0
        };
    }


    return {

        total: 0,

        concordancias: 0,

        divergencias: 0,

        confiancaTotal: 0,

        confiancaMedia: 0,

        percentualConcordancia: 0,

        percentualDivergencia: 0,

        altaConfianca: 0,

        baixaConfianca: 0,

        faixas
    };
}


/* ============================================================
   EXECUÇÃO
   ============================================================ */

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" CONFIANÇA POR NARRATIVA");
    console.log("============================================================");
    console.log("");


    /* --------------------------------------------------------
       VERIFICAR ARQUIVO
       -------------------------------------------------------- */

    if (!fs.existsSync(ARQUIVO_PREDICOES)) {

        console.error(
            "Arquivo de previsões não encontrado:"
        );

        console.error(
            ARQUIVO_PREDICOES
        );

        process.exit(1);
    }


    /* --------------------------------------------------------
       CARREGAR DADOS
       -------------------------------------------------------- */

    console.log(
        "Carregando previsões..."
    );

    const dados = JSON.parse(
        fs.readFileSync(
            ARQUIVO_PREDICOES,
            "utf8"
        )
    );


    if (!Array.isArray(dados)) {

        console.error(
            "O arquivo de previsões não possui um array válido."
        );

        process.exit(1);
    }


    console.log(
        `Registros encontrados: ${dados.length}`
    );

    console.log("");


    /* --------------------------------------------------------
       CRIAR ESTRUTURAS
       -------------------------------------------------------- */

    const analise = {};

    for (const narrativa of NARRATIVAS) {

        analise[narrativa] =
            criarEstruturaNarrativa();
    }


    let registrosAnalisados = 0;


    /* --------------------------------------------------------
       PROCESSAR
       -------------------------------------------------------- */

    for (const registro of dados) {

        const narrativa =
            registro.narrativeOriginal;

        const previsao =
            registro.narrativeML;

        let confianca =
            Number(
                registro.narrativeMLConfidence
            );


        /*
         * Ignorar narrativa original vazia.
         */

        if (
            !narrativa ||
            !analise[narrativa]
        ) {

            continue;
        }


        /*
         * Ignorar confiança inválida.
         */

        if (!Number.isFinite(confianca)) {

            continue;
        }


        if (confianca < 0) {
            confianca = 0;
        }

        if (confianca > 1) {
            confianca = 1;
        }


        registrosAnalisados++;


        const dadosNarrativa =
            analise[narrativa];


        dadosNarrativa.total++;

        dadosNarrativa.confiancaTotal +=
            confianca;


        /*
         * Concordância.
         */

        if (narrativa === previsao) {

            dadosNarrativa.concordancias++;

        } else {

            dadosNarrativa.divergencias++;
        }


        /*
         * Alta confiança.
         */

        if (confianca >= 0.90) {

            dadosNarrativa.altaConfianca++;
        }


        /*
         * Baixa confiança.
         */

        if (confianca < 0.60) {

            dadosNarrativa.baixaConfianca++;
        }


        /*
         * Identificar faixa.
         */

        for (const faixa of FAIXAS) {

            if (
                confianca >= faixa.minimo &&
                confianca < faixa.maximo
            ) {

                const dadosFaixa =
                    dadosNarrativa.faixas[faixa.nome];


                dadosFaixa.total++;

                dadosFaixa.confiancaTotal +=
                    confianca;


                if (narrativa === previsao) {

                    dadosFaixa.concordancias++;

                } else {

                    dadosFaixa.divergencias++;
                }


                break;
            }
        }
    }


    /* --------------------------------------------------------
       CALCULAR RESULTADOS
       -------------------------------------------------------- */

    for (const narrativa of NARRATIVAS) {

        const dadosNarrativa =
            analise[narrativa];


        dadosNarrativa.confiancaMedia =
            dadosNarrativa.total > 0
                ? dadosNarrativa.confiancaTotal /
                  dadosNarrativa.total
                : 0;


        dadosNarrativa.percentualConcordancia =
            percentual(
                dadosNarrativa.concordancias,
                dadosNarrativa.total
            );


        dadosNarrativa.percentualDivergencia =
            percentual(
                dadosNarrativa.divergencias,
                dadosNarrativa.total
            );


        for (const faixa of FAIXAS) {

            const dadosFaixa =
                dadosNarrativa.faixas[faixa.nome];


            dadosFaixa.confiancaMedia =
                dadosFaixa.total > 0
                    ? dadosFaixa.confiancaTotal /
                      dadosFaixa.total
                    : 0;


            dadosFaixa.percentualDoTotal =
                percentual(
                    dadosFaixa.total,
                    dadosNarrativa.total
                );


            dadosFaixa.percentualConcordancia =
                percentual(
                    dadosFaixa.concordancias,
                    dadosFaixa.total
                );


            dadosFaixa.percentualDivergencia =
                percentual(
                    dadosFaixa.divergencias,
                    dadosFaixa.total
                );
        }
    }


    /* --------------------------------------------------------
       RESUMO GERAL POR NARRATIVA
       -------------------------------------------------------- */

    console.log("============================================================");
    console.log(" RESUMO POR NARRATIVA");
    console.log("============================================================");
    console.log("");

    console.log(
        "Narrativa".padEnd(27) +
        "Total".padStart(8) +
        "Concord.".padStart(12) +
        "Acordo %".padStart(12) +
        "Confiança".padStart(14) +
        ">=90%".padStart(10) +
        "<60%".padStart(10)
    );

    console.log(
        "-".repeat(93)
    );


    for (const narrativa of NARRATIVAS) {

        const dadosNarrativa =
            analise[narrativa];


        console.log(

            narrativa.padEnd(27) +

            String(
                dadosNarrativa.total
            ).padStart(8) +

            String(
                dadosNarrativa.concordancias
            ).padStart(12) +

            formatarPercentual(
                dadosNarrativa.percentualConcordancia
            ).padStart(12) +

            formatarPercentual(
                dadosNarrativa.confiancaMedia
            ).padStart(14) +

            String(
                dadosNarrativa.altaConfianca
            ).padStart(10) +

            String(
                dadosNarrativa.baixaConfianca
            ).padStart(10)
        );
    }


    /* --------------------------------------------------------
       DETALHAMENTO POR NARRATIVA
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" DISTRIBUIÇÃO DA CONFIANÇA POR NARRATIVA");
    console.log("============================================================");
    console.log("");


    for (const narrativa of NARRATIVAS) {

        const dadosNarrativa =
            analise[narrativa];


        console.log("");
        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            narrativa.toUpperCase()
        );

        console.log(
            "------------------------------------------------------------"
        );


        console.log(
            "Total: " +
            dadosNarrativa.total
        );

        console.log(
            "Concordância: " +
            formatarPercentual(
                dadosNarrativa.percentualConcordancia
            )
        );

        console.log(
            "Confiança média: " +
            formatarPercentual(
                dadosNarrativa.confiancaMedia
            )
        );

        console.log(
            "Alta confiança (>=90%): " +
            dadosNarrativa.altaConfianca
        );

        console.log(
            "Baixa confiança (<60%): " +
            dadosNarrativa.baixaConfianca
        );

        console.log("");


        console.log(
            "Faixa".padEnd(12) +
            "Total".padStart(8) +
            "Total %".padStart(12) +
            "Concord.".padStart(12) +
            "Acordo %".padStart(12)
        );

        console.log(
            "-".repeat(56)
        );


        for (const faixa of FAIXAS) {

            const dadosFaixa =
                dadosNarrativa.faixas[faixa.nome];


            console.log(

                faixa.nome.padEnd(12) +

                String(
                    dadosFaixa.total
                ).padStart(8) +

                formatarPercentual(
                    dadosFaixa.percentualDoTotal
                ).padStart(12) +

                String(
                    dadosFaixa.concordancias
                ).padStart(12) +

                formatarPercentual(
                    dadosFaixa.percentualConcordancia
                ).padStart(12)
            );
        }
    }


    /* --------------------------------------------------------
       RELATÓRIO
       -------------------------------------------------------- */

    const relatorio = {

        dataAnalise:
            new Date().toISOString(),

        arquivoOrigem:
            "predicoes_narrativas.json",

        totalRegistros:
            dados.length,

        registrosAnalisados,

        narrativas:
            analise
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


    /* --------------------------------------------------------
       FINAL
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE CONCLUÍDA");
    console.log("============================================================");
    console.log("");

    console.log(
        "Relatório salvo em:"
    );

    console.log(
        ARQUIVO_RELATORIO
    );

    console.log("");

    console.log(
        "MongoDB NÃO foi alterado."
    );

    console.log("");
}


/* ============================================================
   EXECUTAR
   ============================================================ */

executar();