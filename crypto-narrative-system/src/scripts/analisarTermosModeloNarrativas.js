const fs = require("fs");
const path = require("path");

/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

const CAMINHO_MODELO = path.join(
    process.cwd(),
    "dataset",
    "modelo_tfidf_logistic.json"
);

const CAMINHO_SAIDA = path.join(
    process.cwd(),
    "dataset",
    "predicoes_narrativas",
    "relatorio_termos_modelo.json"
);

const QUANTIDADE_TERMOS = 20;


/* ============================================================
   FUNÇÃO PRINCIPAL
   ============================================================ */

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE DOS TERMOS MAIS IMPORTANTES DO MODELO");
    console.log("============================================================");
    console.log("");


    /* --------------------------------------------------------
       VERIFICAR MODELO
       -------------------------------------------------------- */

    if (!fs.existsSync(CAMINHO_MODELO)) {

        console.error(
            "ERRO: modelo não encontrado:"
        );

        console.error(CAMINHO_MODELO);

        process.exit(1);
    }


    /* --------------------------------------------------------
       CARREGAR MODELO
       -------------------------------------------------------- */

    console.log("Carregando modelo...");

    const modelo = JSON.parse(
        fs.readFileSync(
            CAMINHO_MODELO,
            "utf8"
        )
    );

    console.log("Modelo carregado.");
    console.log("");


    /* --------------------------------------------------------
       VALIDAR ESTRUTURA
       -------------------------------------------------------- */

    if (!modelo.classes) {
        console.error(
            "ERRO: o modelo não possui 'classes'."
        );
        process.exit(1);
    }

    if (!modelo.vocabulario) {
        console.error(
            "ERRO: o modelo não possui 'vocabulario'."
        );
        process.exit(1);
    }

    if (!modelo.pesos) {
        console.error(
            "ERRO: o modelo não possui 'pesos'."
        );
        process.exit(1);
    }


    /* --------------------------------------------------------
       INFORMAÇÕES DO MODELO
       -------------------------------------------------------- */

    const classes = modelo.classes;

    const vocabulario = modelo.vocabulario;

    const pesos = modelo.pesos;

    console.log(
        "Classes:",
        classes.length
    );

    console.log(
        "Vocabulário:",
        vocabulario.length
    );

    console.log(
        "Matriz de pesos:",
        pesos.length,
        "x",
        pesos[0].length
    );

    console.log("");


    /* --------------------------------------------------------
       CRIAR MAPA DO VOCABULÁRIO
       --------------------------------------------------------

       O modelo possui:

       vocabulario = [
           {
               palavra: "market",
               indice: 0
           },
           {
               palavra: "bitcoin",
               indice: 1
           }
       ]

       Vamos transformar isso em um vetor simples:

       indice 0 -> market
       indice 1 -> bitcoin
       ...
    */

    const termos = new Array(
        vocabulario.length
    );


    for (const item of vocabulario) {

        termos[item.indice] = item.palavra;
    }


    /* --------------------------------------------------------
       ANALISAR CADA NARRATIVA
       -------------------------------------------------------- */

    const resultado = {};


    for (
        let indiceClasse = 0;
        indiceClasse < classes.length;
        indiceClasse++
    ) {

        const nomeClasse =
            classes[indiceClasse];

        const pesosClasse =
            pesos[indiceClasse];


        /* ----------------------------------------------------
           CRIAR LISTA DOS TERMOS
           ---------------------------------------------------- */

        const listaTermos = [];


        for (
            let indiceTermo = 0;
            indiceTermo < pesosClasse.length;
            indiceTermo++
        ) {

            const peso =
                pesosClasse[indiceTermo];

            const palavra =
                termos[indiceTermo];


            if (!palavra) {
                continue;
            }


            listaTermos.push({

                termo: palavra,

                peso: peso

            });
        }


        /* ----------------------------------------------------
           ORDENAR PELOS MAIORES PESOS POSITIVOS
           ---------------------------------------------------- */

        const termosPositivos =
            [...listaTermos]
                .filter(item => item.peso > 0)
                .sort(
                    (a, b) =>
                        b.peso - a.peso
                )
                .slice(
                    0,
                    QUANTIDADE_TERMOS
                );


        /* ----------------------------------------------------
           ORDENAR PELOS MAIORES PESOS NEGATIVOS
           ---------------------------------------------------- */

        const termosNegativos =
            [...listaTermos]
                .filter(item => item.peso < 0)
                .sort(
                    (a, b) =>
                        a.peso - b.peso
                )
                .slice(
                    0,
                    QUANTIDADE_TERMOS
                );


        /* ----------------------------------------------------
           SALVAR RESULTADO
           ---------------------------------------------------- */

        resultado[nomeClasse] = {

            termosPositivos,

            termosNegativos

        };
    }


    /* ========================================================
       EXIBIR RESULTADOS NO TERMINAL
       ======================================================== */

    console.log(
        "============================================================"
    );

    console.log(
        " TERMOS MAIS IMPORTANTES POR NARRATIVA"
    );

    console.log(
        "============================================================"
    );

    console.log("");


    for (const classe of classes) {

        console.log(
            "------------------------------------------------------------"
        );

        console.log(
            classe.toUpperCase()
        );

        console.log(
            "------------------------------------------------------------"
        );

        console.log("");

        console.log(
            "Termos com maior peso positivo:"
        );

        console.log("");


        const positivos =
            resultado[classe]
                .termosPositivos;


        positivos.forEach(
            (item, indice) => {

                console.log(
                    `${String(indice + 1).padStart(2, "0")}. ` +
                    `${item.termo.padEnd(25)} ` +
                    `peso: ${item.peso.toFixed(6)}`
                );
            }
        );


        console.log("");

        console.log(
            "Termos com maior peso negativo:"
        );

        console.log("");


        const negativos =
            resultado[classe]
                .termosNegativos;


        negativos.forEach(
            (item, indice) => {

                console.log(
                    `${String(indice + 1).padStart(2, "0")}. ` +
                    `${item.termo.padEnd(25)} ` +
                    `peso: ${item.peso.toFixed(6)}`
                );
            }
        );


        console.log("");
    }


    /* ========================================================
       SALVAR RELATÓRIO
       ======================================================== */

    const diretorioSaida =
        path.dirname(CAMINHO_SAIDA);


    if (!fs.existsSync(diretorioSaida)) {

        fs.mkdirSync(
            diretorioSaida,
            {
                recursive: true
            }
        );
    }


    const relatorio = {

        tipo:
            "Análise dos termos mais importantes do modelo TF-IDF + Regressão Logística",

        modelo:
            "TF-IDF + Regressão Logística Multiclasses",

        quantidadeClasses:
            classes.length,

        quantidadeTermos:
            vocabulario.length,

        quantidadeTermosExibidos:
            QUANTIDADE_TERMOS,

        classes,

        resultados:
            resultado,

        observacao:
            "Os pesos positivos representam termos que contribuem para aumentar a pontuação da respectiva classe no modelo. Os pesos negativos representam termos que contribuem para reduzir essa pontuação. Os pesos devem ser interpretados como características aprendidas pelo modelo e não como relações causais."
    };


    fs.writeFileSync(

        CAMINHO_SAIDA,

        JSON.stringify(
            relatorio,
            null,
            2
        ),

        "utf8"
    );


    /* ========================================================
       FINAL
       ======================================================== */

    console.log("");
    console.log(
        "============================================================"
    );

    console.log(
        " ANÁLISE CONCLUÍDA"
    );

    console.log(
        "============================================================"
    );

    console.log("");

    console.log(
        "Relatório salvo em:"
    );

    console.log(
        CAMINHO_SAIDA
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

try {

    executar();

} catch (erro) {

    console.error("");

    console.error(
        "ERRO DURANTE A ANÁLISE:"
    );

    console.error(
        erro.message
    );

    console.error("");

    process.exit(1);
}