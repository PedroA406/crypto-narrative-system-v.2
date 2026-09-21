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
    "../../dataset/predicoes_narrativas/relatorio_concordancia.json"
);

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
   FUNÇÕES AUXILIARES
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


function ordenarObjeto(objeto) {

    return Object.entries(objeto)
        .sort((a, b) => b[1] - a[1]);
}


/* ============================================================
   EXECUÇÃO
   ============================================================ */

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE DE CONCORDÂNCIA DAS NARRATIVAS");
    console.log("============================================================");
    console.log("");


    /* --------------------------------------------------------
       CARREGAR ARQUIVO
       -------------------------------------------------------- */

    if (!fs.existsSync(ARQUIVO_PREDICOES)) {

        console.error("Arquivo de previsões não encontrado:");
        console.error(ARQUIVO_PREDICOES);

        process.exit(1);
    }


    console.log("Carregando previsões...");

    const dados = JSON.parse(
        fs.readFileSync(ARQUIVO_PREDICOES, "utf8")
    );


    if (!Array.isArray(dados)) {

        console.error(
            "O arquivo de previsões não contém um array válido."
        );

        process.exit(1);
    }


    console.log(
        `Registros encontrados: ${dados.length}`
    );

    console.log("");


    /* --------------------------------------------------------
       ESTRUTURAS DE ANÁLISE
       -------------------------------------------------------- */

    let total = dados.length;

    let validos = 0;

    let semNarrativaOriginal = 0;

    let concordancias = 0;

    let divergencias = 0;

    let confiancaConcordancias = 0;

    let confiancaDivergencias = 0;


    const matriz = {};

    const porNarrativaOriginal = {};

    const porNarrativaML = {};

    const mudancas = {};


    for (const narrativa of NARRATIVAS) {

        matriz[narrativa] = {};

        for (const previsao of NARRATIVAS) {

            matriz[narrativa][previsao] = 0;
        }

        porNarrativaOriginal[narrativa] = {
            total: 0,
            concordancias: 0,
            divergencias: 0,
            percentualConcordancia: 0
        };

        porNarrativaML[narrativa] = 0;
    }


    /* --------------------------------------------------------
       PROCESSAR REGISTROS
       -------------------------------------------------------- */

    for (const registro of dados) {

        const original =
            registro.narrativeOriginal;

        const ml =
            registro.narrativeML;

        const confianca =
            Number(registro.narrativeMLConfidence) || 0;


        /*
         * Caso a narrativa original esteja vazia.
         */

        if (
            !original ||
            typeof original !== "string" ||
            original.trim() === ""
        ) {

            semNarrativaOriginal++;

            continue;
        }


        validos++;


        /*
         * Contabiliza narrativa original.
         */

        if (porNarrativaOriginal[original]) {

            porNarrativaOriginal[original].total++;
        }


        /*
         * Contabiliza previsão ML.
         */

        if (porNarrativaML[ml] !== undefined) {

            porNarrativaML[ml]++;
        }


        /*
         * Matriz de confusão.
         */

        if (
            matriz[original] &&
            matriz[original][ml] !== undefined
        ) {

            matriz[original][ml]++;
        }


        /*
         * Concordância ou divergência.
         */

        if (original === ml) {

            concordancias++;

            confiancaConcordancias += confianca;


            if (porNarrativaOriginal[original]) {

                porNarrativaOriginal[original]
                    .concordancias++;
            }

        } else {

            divergencias++;

            confiancaDivergencias += confianca;


            if (porNarrativaOriginal[original]) {

                porNarrativaOriginal[original]
                    .divergencias++;
            }


            /*
             * Registra mudança:
             *
             * original -> ML
             */

            const chave =
                `${original} -> ${ml}`;

            if (!mudancas[chave]) {

                mudancas[chave] = 0;
            }

            mudancas[chave]++;
        }
    }


    /* --------------------------------------------------------
       CALCULAR PERCENTUAIS POR NARRATIVA
       -------------------------------------------------------- */

    for (const narrativa of NARRATIVAS) {

        const dadosNarrativa =
            porNarrativaOriginal[narrativa];

        dadosNarrativa.percentualConcordancia =
            percentual(
                dadosNarrativa.concordancias,
                dadosNarrativa.total
            );
    }


    /* --------------------------------------------------------
       MÉDIAS DE CONFIANÇA
       -------------------------------------------------------- */

    const mediaConfiancaConcordancias =
        concordancias > 0
            ? confiancaConcordancias / concordancias
            : 0;


    const mediaConfiancaDivergencias =
        divergencias > 0
            ? confiancaDivergencias / divergencias
            : 0;


    /* --------------------------------------------------------
       PERCENTUAIS GERAIS
       -------------------------------------------------------- */

    const percentualConcordancia =
        percentual(
            concordancias,
            validos
        );


    const percentualDivergencia =
        percentual(
            divergencias,
            validos
        );


    /* --------------------------------------------------------
       ORDENAR MUDANÇAS
       -------------------------------------------------------- */

    const mudancasOrdenadas =
        ordenarObjeto(mudancas);


    /* --------------------------------------------------------
       EXIBIR RESULTADOS
       -------------------------------------------------------- */

    console.log("============================================================");
    console.log(" RESULTADO GERAL");
    console.log("============================================================");
    console.log("");

    console.log(
        `Total de registros:          ${total}`
    );

    console.log(
        `Registros analisados:        ${validos}`
    );

    console.log(
        `Sem narrativa original:      ${semNarrativaOriginal}`
    );

    console.log("");

    console.log(
        `Concordâncias:               ${concordancias}`
    );

    console.log(
        `Percentual de concordância:  ${formatarPercentual(percentualConcordancia)}`
    );

    console.log("");

    console.log(
        `Divergências:                ${divergencias}`
    );

    console.log(
        `Percentual de divergência:   ${formatarPercentual(percentualDivergencia)}`
    );

    console.log("");

    console.log(
        `Confiança média - concordâncias: ${formatarPercentual(mediaConfiancaConcordancias)}`
    );

    console.log(
        `Confiança média - divergências:   ${formatarPercentual(mediaConfiancaDivergencias)}`
    );


    /* --------------------------------------------------------
       DISTRIBUIÇÃO ORIGINAL
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" DISTRIBUIÇÃO DAS NARRATIVAS ORIGINAIS");
    console.log("============================================================");
    console.log("");

    for (const narrativa of NARRATIVAS) {

        const dadosNarrativa =
            porNarrativaOriginal[narrativa];

        console.log(
            narrativa.padEnd(27) +
            String(dadosNarrativa.total).padStart(6) +
            " | concordância: " +
            formatarPercentual(
                dadosNarrativa.percentualConcordancia
            )
        );
    }


    /* --------------------------------------------------------
       DISTRIBUIÇÃO ML
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" DISTRIBUIÇÃO DAS PREVISÕES ML");
    console.log("============================================================");
    console.log("");

    const distribuicaoML =
        ordenarObjeto(porNarrativaML);

    for (const [narrativa, quantidade] of distribuicaoML) {

        console.log(
            narrativa.padEnd(27) +
            String(quantidade).padStart(6) +
            " (" +
            formatarPercentual(
                percentual(quantidade, validos)
            ) +
            ")"
        );
    }


    /* --------------------------------------------------------
       PRINCIPAIS MUDANÇAS
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" PRINCIPAIS DIVERGÊNCIAS");
    console.log("============================================================");
    console.log("");

    const limite =
        Math.min(20, mudancasOrdenadas.length);

    for (let i = 0; i < limite; i++) {

        const [mudanca, quantidade] =
            mudancasOrdenadas[i];

        console.log(
            `${String(i + 1).padStart(2)}. ` +
            mudanca.padEnd(45) +
            quantidade
        );
    }


    /* --------------------------------------------------------
       MATRIZ DE CONFUSÃO
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" MATRIZ DE CONFUSÃO");
    console.log("============================================================");
    console.log("");

    console.log(
        "Original \\ ML".padEnd(27) +
        NARRATIVAS
            .map(n => n.substring(0, 8).padStart(10))
            .join("")
    );

    console.log("-".repeat(107));


    for (const original of NARRATIVAS) {

        let linha =
            original.padEnd(27);

        for (const ml of NARRATIVAS) {

            linha +=
                String(
                    matriz[original][ml]
                ).padStart(10);
        }

        console.log(linha);
    }


    /* --------------------------------------------------------
       RELATÓRIO
       -------------------------------------------------------- */

    const relatorio = {

        dataAnalise: new Date().toISOString(),

        arquivoOrigem:
            "predicoes_narrativas.json",

        totalRegistros: total,

        registrosAnalisados: validos,

        semNarrativaOriginal,

        concordancias,

        divergencias,

        percentualConcordancia,

        percentualDivergencia,

        confiancaMediaConcordancias:
            mediaConfiancaConcordancias,

        confiancaMediaDivergencias:
            mediaConfiancaDivergencias,

        distribuicaoOriginal:
            porNarrativaOriginal,

        distribuicaoML:
            porNarrativaML,

        principaisMudancas:
            mudancasOrdenadas,

        matrizConfusao:
            matriz
    };


    /* --------------------------------------------------------
       SALVAR RELATÓRIO
       -------------------------------------------------------- */

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