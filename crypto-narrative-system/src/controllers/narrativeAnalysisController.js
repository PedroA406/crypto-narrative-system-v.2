const narrativeAnalysisService =
    require("../services/narrativeAnalysisService");


/*
|--------------------------------------------------------------------------
| ANÁLISE COMPLETA DE NARRATIVAS
|--------------------------------------------------------------------------
*/

async function getNarrativeAnalysis(req, res) {

    try {

        const analysis =
            await narrativeAnalysisService
                .obterAnaliseCompleta();


        res.status(200).json({

            success: true,

            data:
                analysis

        });


    } catch (error) {

        console.error(
            "❌ Erro na análise de narrativas:",
            error
        );


        res.status(500).json({

            success: false,

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