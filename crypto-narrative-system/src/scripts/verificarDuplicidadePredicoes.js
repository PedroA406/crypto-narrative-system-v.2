const fs = require("fs");
const path = require("path");


/*
|--------------------------------------------------------------------------
| ARQUIVO DE PREVISÕES
|--------------------------------------------------------------------------
*/

const ARQUIVO_PREDICOES = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/predicoes_narrativas.json"
);


/*
|--------------------------------------------------------------------------
| EXECUÇÃO
|--------------------------------------------------------------------------
*/

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" VERIFICAÇÃO DE DUPLICIDADE DAS PREVISÕES");
    console.log("============================================================");
    console.log("");


    /*
    |--------------------------------------------------------------------------
    | CARREGAR ARQUIVO
    |--------------------------------------------------------------------------
    */

    if (!fs.existsSync(ARQUIVO_PREDICOES)) {

        throw new Error(
            `Arquivo não encontrado:\n${ARQUIVO_PREDICOES}`
        );
    }


    const predicoes =
        JSON.parse(
            fs.readFileSync(
                ARQUIVO_PREDICOES,
                "utf8"
            )
        );


    console.log(
        `Total de registros no arquivo: ${predicoes.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | MAPA DE NEWSIDS
    |--------------------------------------------------------------------------
    */

    const mapa =
        new Map();


    for (const previsao of predicoes) {

        const newsId =
            previsao.newsId;


        if (!newsId) {
            continue;
        }


        if (!mapa.has(newsId)) {

            mapa.set(
                newsId,
                []
            );
        }


        mapa.get(newsId).push(
            previsao
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CONTADORES
    |--------------------------------------------------------------------------
    */

    let idsUnicos = 0;
    let idsDuplicados = 0;
    let registrosDuplicados = 0;


    const duplicados = [];


    for (
        const [newsId, registros]
        of mapa.entries()
    ) {

        if (registros.length === 1) {

            idsUnicos++;

            continue;
        }


        idsDuplicados++;


        registrosDuplicados +=
            registros.length - 1;


        duplicados.push({

            newsId,

            quantidade:
                registros.length,

            previsoes:
                registros.map(
                    registro => ({

                        narrativeML:
                            registro.narrativeML,

                        confidence:
                            registro.narrativeMLConfidence

                    })
                )

        });
    }


    /*
    |--------------------------------------------------------------------------
    | RESULTADO
    |--------------------------------------------------------------------------
    */

    console.log("");
    console.log("============================================================");
    console.log(" RESULTADO");
    console.log("============================================================");
    console.log("");


    console.log(
        `NewsIds únicos: ${mapa.size}`
    );


    console.log(
        `NewsIds sem duplicidade: ${idsUnicos}`
    );


    console.log(
        `NewsIds duplicados: ${idsDuplicados}`
    );


    console.log(
        `Registros excedentes por duplicidade: ${registrosDuplicados}`
    );


    console.log("");


    /*
    |--------------------------------------------------------------------------
    | MOSTRAR DUPLICADOS
    |--------------------------------------------------------------------------
    */

    if (duplicados.length > 0) {

        console.log(
            `Primeiros ${Math.min(20, duplicados.length)} duplicados:`
        );

        console.log("");


        for (
            const duplicado
            of duplicados.slice(0, 20)
        ) {

            console.log(
                `newsId: ${duplicado.newsId}`
            );

            console.log(
                `Quantidade: ${duplicado.quantidade}`
            );


            for (
                const previsao
                of duplicado.previsoes
            ) {

                console.log(
                    `  ${previsao.narrativeML} ` +
                    `| confiança: ${previsao.confidence}`
                );
            }


            console.log("");
        }
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFICAR SE DUPLICADOS POSSUEM PREVISÕES DIFERENTES
    |--------------------------------------------------------------------------
    */

    let duplicadosIguais = 0;
    let duplicadosDiferentes = 0;


    for (
        const duplicado
        of duplicados
    ) {

        const primeira =
            duplicado.previsoes[0];


        let todasIguais = true;


        for (
            let i = 1;
            i < duplicado.previsoes.length;
            i++
        ) {

            const atual =
                duplicado.previsoes[i];


            if (
                atual.narrativeML !==
                primeira.narrativeML ||

                Math.abs(
                    atual.confidence -
                    primeira.confidence
                ) > 0.000001
            ) {

                todasIguais = false;

                break;
            }
        }


        if (todasIguais) {

            duplicadosIguais++;

        } else {

            duplicadosDiferentes++;
        }
    }


    console.log("");
    console.log("============================================================");
    console.log(" ANÁLISE DOS DUPLICADOS");
    console.log("============================================================");
    console.log("");


    console.log(
        `Duplicados com mesma previsão: ${duplicadosIguais}`
    );


    console.log(
        `Duplicados com previsões diferentes: ${duplicadosDiferentes}`
    );


    console.log("");
    console.log("Nenhuma alteração foi feita no MongoDB.");
    console.log("");
}


/*
|--------------------------------------------------------------------------
| INICIAR
|--------------------------------------------------------------------------
*/

try {

    executar();

} catch (error) {

    console.error("");
    console.error("ERRO:");
    console.error(error.message);
    console.error("");
}