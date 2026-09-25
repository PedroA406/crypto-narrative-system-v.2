const narrativeAnalysisService =
    require("../services/narrativeAnalysisService");


/*
|--------------------------------------------------------------------------
| ANÁLISE COMPLETA DE NARRATIVAS
|--------------------------------------------------------------------------
*/

async function getNarrativeAnalysis(req, res) {

    try {

        /*
        |--------------------------------------------------------------------------
        | FILTROS RECEBIDOS DA PÁGINA
        |--------------------------------------------------------------------------
        */

        const period =
            req.query.period ||
            "30d";


        const asset =
            req.query.asset ||
            "all";


        console.log(
            "================================="
        );


        console.log(
            "ANÁLISE NARRATIVA × PREÇO"
        );


        console.log(
            "Período:",
            period
        );


        console.log(
            "Ativo:",
            asset
        );


        console.log(
            "================================="
        );


        /*
        |--------------------------------------------------------------------------
        | GERA A ANÁLISE
        |--------------------------------------------------------------------------
        */

        const analysis =
            await narrativeAnalysisService
                .obterAnaliseCompleta(
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
            "❌ Erro na análise de narrativas:",
            error
        );


        res.status(500).json({

            success:
                false,

            message:
                "Erro ao gerar análise de narrativas.",

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
