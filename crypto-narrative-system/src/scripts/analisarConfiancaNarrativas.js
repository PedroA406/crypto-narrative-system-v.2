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
    "../../dataset/predicoes_narrativas/relatorio_confianca.json"
);


/* ============================================================
   FAIXAS DE CONFIANÇA
   ============================================================ */

const FAIXAS = [
    {
        nome: "0-20%",
        minimo: 0,
        maximo: 0.20
    },
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


function criarEstruturaFaixa() {

    return {

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


/* ============================================================
   EXECUÇÃO
   ============================================================ */

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE DE CONFIANÇA DO MODELO DE NARRATIVAS");
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
            "O arquivo não possui uma estrutura válida."
        );

        process.exit(1);
    }


    console.log(
        `Registros encontrados: ${dados.length}`
    );

    console.log("");


    /* --------------------------------------------------------
       ESTRUTURAS
       -------------------------------------------------------- */

    const analiseFaixas = {};

    for (const faixa of FAIXAS) {

        analiseFaixas[faixa.nome] =
            criarEstruturaFaixa();
    }


    let totalValido = 0;

    let somaConfianca = 0;

    let maiorConfianca = 0;

    let menorConfianca = 1;

    let confiancaMaior90 = 0;

    let confiancaMenor60 = 0;


    let concordancias = 0;

    let divergencias = 0;


    /* --------------------------------------------------------
       PROCESSAR
       -------------------------------------------------------- */

    for (const registro of dados) {

        const original =
            registro.narrativeOriginal;

        const previsao =
            registro.narrativeML;

        let confianca =
            Number(
                registro.narrativeMLConfidence
            );


        /*
         * Ignorar registros sem narrativa original.
         */

        if (
            !original ||
            typeof original !== "string" ||
            original.trim() === ""
        ) {

            continue;
        }


        /*
         * Verificar confiança.
         */

        if (!Number.isFinite(confianca)) {

            continue;
        }


        /*
         * Garantir intervalo válido.
         */

        if (confianca < 0) {
            confianca = 0;
        }

        if (confianca > 1) {
            confianca = 1;
        }


        totalValido++;

        somaConfianca += confianca;


        if (confianca > maiorConfianca) {

            maiorConfianca = confianca;
        }


        if (confianca < menorConfianca) {

            menorConfianca = confianca;
        }


        /*
         * Concordância.
         */

        const concordou =
            original === previsao;


        if (concordou) {

            concordancias++;

        } else {

            divergencias++;
        }


        /*
         * Faixas.
         */

        for (const faixa of FAIXAS) {

            if (
                confianca >= faixa.minimo &&
                confianca < faixa.maximo
            ) {

                const dadosFaixa =
                    analiseFaixas[faixa.nome];


                dadosFaixa.total++;

                dadosFaixa.confiancaTotal +=
                    confianca;


                if (concordou) {

                    dadosFaixa.concordancias++;

                } else {

                    dadosFaixa.divergencias++;
                }


                break;
            }
        }


        /*
         * Contadores especiais.
         */

        if (confianca >= 0.90) {

            confiancaMaior90++;
        }


        if (confianca < 0.60) {

            confiancaMenor60++;
        }
    }


    /* --------------------------------------------------------
       CALCULAR MÉDIAS E PERCENTUAIS
       -------------------------------------------------------- */

    const confiancaMedia =
        totalValido > 0
            ? somaConfianca / totalValido
            : 0;


    for (const faixa of FAIXAS) {

        const dadosFaixa =
            analiseFaixas[faixa.nome];


        if (dadosFaixa.total > 0) {

            dadosFaixa.confiancaMedia =
                dadosFaixa.confiancaTotal /
                dadosFaixa.total;


            dadosFaixa.percentualDoTotal =
                percentual(
                    dadosFaixa.total,
                    totalValido
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
       RESULTADO GERAL
       -------------------------------------------------------- */

    console.log("============================================================");
    console.log(" RESULTADO GERAL");
    console.log("============================================================");
    console.log("");

    console.log(
        `Registros analisados:       ${totalValido}`
    );

    console.log(
        `Confiança média:            ${formatarPercentual(confiancaMedia)}`
    );

    console.log(
        `Menor confiança:            ${formatarPercentual(menorConfianca)}`
    );

    console.log(
        `Maior confiança:            ${formatarPercentual(maiorConfianca)}`
    );

    console.log("");

    console.log(
        `Concordâncias:              ${concordancias}`
    );

    console.log(
        `Divergências:               ${divergencias}`
    );

    console.log("");

    console.log(
        `Confiança >= 90%:           ${confiancaMaior90} ` +
        `(${formatarPercentual(
            percentual(
                confiancaMaior90,
                totalValido
            )
        )})`
    );

    console.log(
        `Confiança < 60%:            ${confiancaMenor60} ` +
        `(${formatarPercentual(
            percentual(
                confiancaMenor60,
                totalValido
            )
        )})`
    );


    /* --------------------------------------------------------
       ANÁLISE POR FAIXA
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE POR FAIXA DE CONFIANÇA");
    console.log("============================================================");
    console.log("");

    console.log(
        "Faixa".padEnd(12) +
        "Total".padStart(8) +
        "Total %".padStart(10) +
        "Concord.".padStart(12) +
        "Diverg.".padStart(10) +
        "Acordo %".padStart(12) +
        "Conf. média".padStart(14)
    );

    console.log(
        "-".repeat(78)
    );


    for (const faixa of FAIXAS) {

        const dadosFaixa =
            analiseFaixas[faixa.nome];


        console.log(
            faixa.nome.padEnd(12) +

            String(
                dadosFaixa.total
            ).padStart(8) +

            formatarPercentual(
                dadosFaixa.percentualDoTotal
            ).padStart(10) +

            String(
                dadosFaixa.concordancias
            ).padStart(12) +

            String(
                dadosFaixa.divergencias
            ).padStart(10) +

            formatarPercentual(
                dadosFaixa.percentualConcordancia
            ).padStart(12) +

            formatarPercentual(
                dadosFaixa.confiancaMedia
            ).padStart(14)
        );
    }


    /* --------------------------------------------------------
       INTERPRETAÇÃO DAS FAIXAS
       -------------------------------------------------------- */

    console.log("");
    console.log("============================================================");
    console.log(" LEITURA DA CONFIANÇA");
    console.log("============================================================");
    console.log("");


    if (confiancaMedia >= 0.80) {

        console.log(
            "A confiança média geral está acima de 80%."
        );

    } else if (confiancaMedia >= 0.60) {

        console.log(
            "A confiança média geral está entre 60% e 80%."
        );

    } else {

        console.log(
            "A confiança média geral está abaixo de 60%."
        );
    }


    console.log("");


    if (confiancaMaior90 > 0) {

        console.log(
            "Existem previsões com confiança igual ou superior a 90%."
        );
    }


    if (confiancaMenor60 > 0) {

        console.log(
            "Existem previsões com confiança inferior a 60%."
        );
    }


    console.log("");


    /*
     * Comparar confiança das faixas.
     */

    const faixaAlta =
        analiseFaixas["90-100%"];

    const faixaBaixa =
        analiseFaixas["0-20%"];


    if (
        faixaAlta &&
        faixaAlta.total > 0
    ) {

        console.log(
            "Na faixa de 90-100%, a concordância foi de " +
            formatarPercentual(
                faixaAlta.percentualConcordancia
            ) +
            "."
        );
    }


    if (
        faixaBaixa &&
        faixaBaixa.total > 0
    ) {

        console.log(
            "Na faixa de 0-20%, a concordância foi de " +
            formatarPercentual(
                faixaBaixa.percentualConcordancia
            ) +
            "."
        );
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

        registrosAnalisados:
            totalValido,

        confiancaMedia,

        menorConfianca,

        maiorConfianca,

        confiancaMaior90,

        percentualConfiancaMaior90:
            percentual(
                confiancaMaior90,
                totalValido
            ),

        confiancaMenor60,

        percentualConfiancaMenor60:
            percentual(
                confiancaMenor60,
                totalValido
            ),

        concordancias,

        divergencias,

        percentualConcordancia:
            percentual(
                concordancias,
                totalValido
            ),

        percentualDivergencia:
            percentual(
                divergencias,
                totalValido
            ),

        faixas:
            analiseFaixas
    };


    /* --------------------------------------------------------
       SALVAR
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