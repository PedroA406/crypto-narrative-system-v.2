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
    "relatorio_distincao_termos.json"
);

const QUANTIDADE_TERMOS = 20;


/* ============================================================
   CARREGAR MODELO
   ============================================================ */

function carregarModelo() {

    if (!fs.existsSync(CAMINHO_MODELO)) {

        throw new Error(
            "Modelo não encontrado em: " +
            CAMINHO_MODELO
        );
    }

    return JSON.parse(
        fs.readFileSync(
            CAMINHO_MODELO,
            "utf8"
        )
    );
}


/* ============================================================
   CRIAR MAPA DO VOCABULÁRIO
   ============================================================ */

function criarMapaTermos(modelo) {

    const mapa = new Array(
        modelo.vocabulario.length
    );

    for (const item of modelo.vocabulario) {

        mapa[item.indice] =
            item.palavra;
    }

    return mapa;
}


/* ============================================================
   CALCULAR MÉDIA DOS PESOS
   ============================================================ */

function calcularMediaPesos(
    pesos,
    indiceTermo,
    indiceClasse
) {

    let soma = 0;

    let quantidade = 0;

    for (
        let classe = 0;
        classe < pesos.length;
        classe++
    ) {

        if (classe === indiceClasse) {
            continue;
        }

        soma +=
            pesos[classe][indiceTermo];

        quantidade++;
    }

    return soma / quantidade;
}


/* ============================================================
   ANALISAR DIFERENCIAÇÃO
   ============================================================ */

function analisarNarrativa(
    modelo,
    termos,
    indiceClasse
) {

    const pesos =
        modelo.pesos[indiceClasse];

    const lista = [];


    for (
        let indiceTermo = 0;
        indiceTermo < pesos.length;
        indiceTermo++
    ) {

        const termo =
            termos[indiceTermo];

        if (!termo) {
            continue;
        }


        const pesoClasse =
            pesos[indiceTermo];


        const mediaOutrasClasses =
            calcularMediaPesos(
                modelo.pesos,
                indiceTermo,
                indiceClasse
            );


        /*
         * Quanto maior essa diferença,
         * mais o termo favorece esta narrativa
         * em relação às demais.
         */

        const poderDiscriminativo =
            pesoClasse -
            mediaOutrasClasses;


        lista.push({

            termo,

            peso:
                pesoClasse,

            mediaOutrasClasses,

            poderDiscriminativo

        });
    }


    return lista
        .filter(
            item =>
                item.poderDiscriminativo > 0
        )
        .sort(
            (a, b) =>
                b.poderDiscriminativo -
                a.poderDiscriminativo
        )
        .slice(
            0,
            QUANTIDADE_TERMOS
        );
}


/* ============================================================
   IDENTIFICAR TERMOS COMPARTILHADOS
   ============================================================ */

function analisarTermosCompartilhados(
    modelo,
    termos
) {

    const resultado = [];


    for (
        let indiceTermo = 0;
        indiceTermo < termos.length;
        indiceTermo++
    ) {

        const termo =
            termos[indiceTermo];

        if (!termo) {
            continue;
        }


        const pesos = [];


        for (
            let classe = 0;
            classe < modelo.classes.length;
            classe++
        ) {

            pesos.push({

                narrativa:
                    modelo.classes[classe],

                peso:
                    modelo.pesos[classe][indiceTermo]

            });
        }


        /*
         * Ordena pelo peso absoluto.
         */

        const ordenados =
            [...pesos].sort(
                (a, b) =>
                    Math.abs(b.peso) -
                    Math.abs(a.peso)
            );


        /*
         * Verifica se o termo possui
         * peso positivo relevante em
         * pelo menos duas narrativas.
         */

        const positivos =
            pesos.filter(
                item =>
                    item.peso > 1
            );


        if (positivos.length >= 2) {

            resultado.push({

                termo,

                quantidadeNarrativas:
                    positivos.length,

                narrativas:
                    positivos
                        .sort(
                            (a, b) =>
                                b.peso -
                                a.peso
                        ),

                maiorPeso:
                    ordenados[0]

            });
        }
    }


    /*
     * Primeiro aparecem os termos
     * presentes em mais narrativas.
     */

    return resultado
        .sort(
            (a, b) => {

                if (
                    b.quantidadeNarrativas !==
                    a.quantidadeNarrativas
                ) {

                    return (
                        b.quantidadeNarrativas -
                        a.quantidadeNarrativas
                    );
                }

                return (
                    Math.abs(
                        b.maiorPeso.peso
                    ) -
                    Math.abs(
                        a.maiorPeso.peso
                    )
                );
            }
        )
        .slice(
            0,
            50
        );
}


/* ============================================================
   ANALISAR TERMOS QUE MAIS DIFERENCIAM
   ============================================================ */

function gerarAnalise(modelo) {

    const termos =
        criarMapaTermos(modelo);


    const resultados = {};


    for (
        let classe = 0;
        classe < modelo.classes.length;
        classe++
    ) {

        const nomeClasse =
            modelo.classes[classe];


        resultados[nomeClasse] =
            analisarNarrativa(
                modelo,
                termos,
                classe
            );
    }


    const compartilhados =
        analisarTermosCompartilhados(
            modelo,
            termos
        );


    return {

        porNarrativa:
            resultados,

        termosCompartilhados:
            compartilhados
    };
}


/* ============================================================
   EXIBIR TERMOS POR NARRATIVA
   ============================================================ */

function exibirNarrativas(
    modelo,
    resultados
) {

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " TERMOS MAIS DISCRIMINATIVOS POR NARRATIVA"
    );

    console.log(
        "============================================================"
    );


    for (const classe of modelo.classes) {

        console.log("");

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

        resultados[classe]
            .forEach(
                (item, indice) => {

                    console.log(

                        `${String(indice + 1).padStart(2, "0")}. ` +

                        `${item.termo.padEnd(25)} ` +

                        `peso: ${item.peso.toFixed(4)} ` +

                        `| média demais: ` +

                        `${item.mediaOutrasClasses.toFixed(4)} ` +

                        `| diferença: ` +

                        `${item.poderDiscriminativo.toFixed(4)}`
                    );
                }
            );
    }
}


/* ============================================================
   EXIBIR TERMOS COMPARTILHADOS
   ============================================================ */

function exibirCompartilhados(
    termosCompartilhados
) {

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " TERMOS COMPARTILHADOS ENTRE NARRATIVAS"
    );

    console.log(
        "============================================================"
    );

    console.log("");

    termosCompartilhados
        .slice(
            0,
            30
        )
        .forEach(
            (item, indice) => {

                console.log(
                    `${String(indice + 1).padStart(2, "0")}. ` +
                    `${item.termo}`
                );


                item.narrativas
                    .forEach(
                        narrativa => {

                            console.log(
                                `    ${narrativa.narrativa}: ` +
                                `${narrativa.peso.toFixed(4)}`
                            );
                        }
                    );

                console.log("");
            }
        );
}


/* ============================================================
   FUNÇÃO PRINCIPAL
   ============================================================ */

function executar() {

    console.log("");

    console.log(
        "============================================================"
    );

    console.log(
        " ANÁLISE DE DISTINÇÃO ENTRE NARRATIVAS"
    );

    console.log(
        "============================================================"
    );

    console.log("");


    console.log(
        "Carregando modelo..."
    );

    const modelo =
        carregarModelo();

    console.log(
        "Modelo carregado."
    );

    console.log("");

    console.log(
        "Classes:",
        modelo.classes.length
    );

    console.log(
        "Vocabulário:",
        modelo.vocabulario.length
    );


    console.log("");

    console.log(
        "Calculando poder discriminativo dos termos..."
    );


    const analise =
        gerarAnalise(
            modelo
        );


    exibirNarrativas(
        modelo,
        analise.porNarrativa
    );


    exibirCompartilhados(
        analise.termosCompartilhados
    );


    /* ========================================================
       SALVAR RELATÓRIO
       ======================================================== */

    const diretorio =
        path.dirname(
            CAMINHO_SAIDA
        );


    if (!fs.existsSync(diretorio)) {

        fs.mkdirSync(
            diretorio,
            {
                recursive: true
            }
        );
    }


    const relatorio = {

        tipo:
            "Análise de distinção dos termos entre narrativas",

        modelo:
            "TF-IDF + Regressão Logística Multiclasses",

        classes:
            modelo.classes,

        vocabulario:
            modelo.vocabulario.length,

        quantidadeTermosPorNarrativa:
            QUANTIDADE_TERMOS,

        explicacao:
            "O poder discriminativo representa a diferença entre o peso de um termo para uma narrativa e a média do peso desse termo nas demais narrativas. Valores maiores indicam maior capacidade de diferenciar a narrativa das outras classes.",

        porNarrativa:
            analise.porNarrativa,

        termosCompartilhados:
            analise.termosCompartilhados,

        observacao:
            "Os resultados representam características aprendidas pelo modelo estatístico e não relações causais entre termos e narrativas."
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
   EXECUÇÃO
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