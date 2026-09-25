const narrativeAnalysisService =
    require("../services/narrativeAnalysisService");


/*
|--------------------------------------------------------------------------
| ANÁLISE NARRATIVA × PREÇO
|--------------------------------------------------------------------------
|
| Endpoint:
|
| GET /market/narratives/analysis
|
| Parâmetros:
|
| ?period=7d
| ?period=30d
| ?period=60d
|
| ?asset=all
| ?asset=bitcoin
| ?asset=btc
|
*/


async function getNarrativeAnalysis(req, res) {

    try {

        /*
        |--------------------------------------------------------------------------
        | PERÍODO
        |--------------------------------------------------------------------------
        */

        const period =
            req.query.period ||
            "30d";


        /*
        |--------------------------------------------------------------------------
        | ATIVO
        |--------------------------------------------------------------------------
        */

        const asset =
            req.query.asset ||
            "all";


        console.log(
            "=============================================="
        );


        console.log(
            "REQUISIÇÃO — NARRATIVA × PREÇO"
        );


        console.log(
            `Período: ${period}`
        );


        console.log(
            `Ativo: ${asset}`
        );


        console.log(
            "=============================================="
        );


        /*
        |--------------------------------------------------------------------------
        | EXECUTAR ANÁLISE OTIMIZADA
        |--------------------------------------------------------------------------
        */

        const analysis =
            await narrativeAnalysisService
                .obterAnaliseNarrativaPreco(
                    period,
                    asset
                );


        /*
        |--------------------------------------------------------------------------
        | RESPOSTA
        |--------------------------------------------------------------------------
        */

        res.status(200).json({

            success:
                true,

            data:
                analysis

        });


    } catch (error) {

        console.error(
            "❌ ERRO NA ANÁLISE NARRATIVA × PREÇO:",
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                "Erro ao gerar análise narrativa × preço.",

            error:
                error.message

        });

    }

}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {

    getNarrativeAnalysis

};
