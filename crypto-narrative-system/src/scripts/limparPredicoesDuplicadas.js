const fs = require("fs");
const path = require("path");


/*
|--------------------------------------------------------------------------
| ARQUIVOS
|--------------------------------------------------------------------------
*/

const ARQUIVO_ORIGINAL = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/predicoes_narrativas.json"
);

const ARQUIVO_LIMPO = path.join(
    __dirname,
    "../../dataset/predicoes_narrativas/predicoes_narrativas_unicas.json"
);


/*
|--------------------------------------------------------------------------
| NARRATIVAS VÁLIDAS
|--------------------------------------------------------------------------
*/

const NARRATIVAS_VALIDAS = [
    "adoption",
    "general",
    "institutional_investment",
    "market",
    "mining",
    "regulation",
    "security",
    "technology"
];


/*
|--------------------------------------------------------------------------
| EXECUÇÃO
|--------------------------------------------------------------------------
*/

function executar() {

    console.log("");
    console.log("============================================================");
    console.log(" LIMPEZA DAS PREDIÇÕES DUPLICADAS");
    console.log("============================================================");
    console.log("");


    /*
    |--------------------------------------------------------------------------
    | VERIFICAR ARQUIVO
    |--------------------------------------------------------------------------
    */

    if (!fs.existsSync(ARQUIVO_ORIGINAL)) {

        throw new Error(
            `Arquivo não encontrado:\n${ARQUIVO_ORIGINAL}`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | CARREGAR
    |--------------------------------------------------------------------------
    */

    const predicoes =
        JSON.parse(
            fs.readFileSync(
                ARQUIVO_ORIGINAL,
                "utf8"
            )
        );


    console.log(
        `Registros originais: ${predicoes.length}`
    );


    /*
    |--------------------------------------------------------------------------
    | MAPA POR NEWSID
    |--------------------------------------------------------------------------
    |
    | Cada newsId poderá aparecer apenas uma vez.
    |
    */

    const mapa =
        new Map();


    let invalidas = 0;
    let duplicadas = 0;
    let substituidas = 0;


    /*
    |--------------------------------------------------------------------------
    | PROCESSAR
    |--------------------------------------------------------------------------
    */

    for (const previsao of predicoes) {

        /*
        |--------------------------------------------------------------------------
        | VALIDAR
        |--------------------------------------------------------------------------
        */

        if (
            !previsao.newsId ||
            !NARRATIVAS_VALIDAS.includes(
                previsao.narrativeML
            ) ||
            typeof previsao.narrativeMLConfidence !== "number"
        ) {

            invalidas++;

            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | VERIFICAR DUPLICIDADE
        |--------------------------------------------------------------------------
        */

        const existente =
            mapa.get(
                previsao.newsId
            );


        /*
        |--------------------------------------------------------------------------
        | PRIMEIRA OCORRÊNCIA
        |--------------------------------------------------------------------------
        */

        if (!existente) {

            mapa.set(
                previsao.newsId,
                previsao
            );

            continue;
        }


        /*
        |--------------------------------------------------------------------------
        | DUPLICIDADE
        |--------------------------------------------------------------------------
        */

        duplicadas++;


        /*
        |--------------------------------------------------------------------------
        | ESCOLHER MAIOR CONFIANÇA
        |--------------------------------------------------------------------------
        |
        | Quando existem duas previsões diferentes para a mesma
        | notícia, mantemos aquela que possui maior confiança.
        |
        */

        if (
            previsao.narrativeMLConfidence >
            existente.narrativeMLConfidence
        ) {

            mapa.set(
                previsao.newsId,
                previsao
            );

            substituidas++;
        }
    }


    /*
    |--------------------------------------------------------------------------
    | CONVERTER MAPA PARA ARRAY
    |--------------------------------------------------------------------------
    */

    const predicoesUnicas =
        Array.from(
            mapa.values()
        );


    /*
    |--------------------------------------------------------------------------
    | ORDENAR POR DATA
    |--------------------------------------------------------------------------
    |
    | Mantemos uma organização temporal no arquivo.
    |
    */

    predicoesUnicas.sort(
        (a, b) => {

            const dataA =
                new Date(
                    a.publishedAt || 0
                );

            const dataB =
                new Date(
                    b.publishedAt || 0
                );

            return dataA - dataB;
        }
    );


    /*
    |--------------------------------------------------------------------------
    | SALVAR
    |--------------------------------------------------------------------------
    */

    fs.writeFileSync(

        ARQUIVO_LIMPO,

        JSON.stringify(
            predicoesUnicas,
            null,
            2
        ),

        "utf8"
    );


    /*
    |--------------------------------------------------------------------------
    | DISTRIBUIÇÃO
    |--------------------------------------------------------------------------
    */

    const distribuicao = {};


    for (
        const previsao
        of predicoesUnicas
    ) {

        const narrativa =
            previsao.narrativeML;


        if (
            !distribuicao[narrativa]
        ) {

            distribuicao[narrativa] = 0;
        }


        distribuicao[narrativa]++;
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
        `Registros originais: ${predicoes.length}`
    );


    console.log(
        `Registros inválidos: ${invalidas}`
    );


    console.log(
        `Duplicidades encontradas: ${duplicadas}`
    );


    console.log(
        `Previsões substituídas por maior confiança: ${substituidas}`
    );


    console.log(
        `Registros únicos finais: ${predicoesUnicas.length}`
    );


    console.log("");
    console.log("Distribuição das narrativas:");
    console.log("");


    for (
        const narrativa
        of NARRATIVAS_VALIDAS
    ) {

        console.log(
            `${narrativa.padEnd(25)} ` +
            `${distribuicao[narrativa] || 0}`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | VERIFICAÇÃO
    |--------------------------------------------------------------------------
    */

    const ids =
        predicoesUnicas.map(
            previsao => previsao.newsId
        );


    const idsUnicos =
        new Set(ids);


    console.log("");
    console.log("============================================================");
    console.log(" VERIFICAÇÃO FINAL");
    console.log("============================================================");
    console.log("");


    console.log(
        `Total de registros: ${predicoesUnicas.length}`
    );


    console.log(
        `Total de newsIds únicos: ${idsUnicos.size}`
    );


    if (
        predicoesUnicas.length ===
        idsUnicos.size
    ) {

        console.log("");
        console.log(
            "OK: não existem duplicidades no novo arquivo."
        );

    } else {

        console.log("");
        console.log(
            "ATENÇÃO: ainda existem duplicidades."
        );
    }


    console.log("");
    console.log(
        `Arquivo criado: ${ARQUIVO_LIMPO}`
    );


    console.log("");
    console.log(
        "O arquivo original NÃO foi alterado."
    );


    console.log("");
    console.log("============================================================");
    console.log(" LIMPEZA CONCLUÍDA");
    console.log("============================================================");
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