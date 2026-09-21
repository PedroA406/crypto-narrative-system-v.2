const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
    {
        /*
        |--------------------------------------------------------------------------
        | IDENTIFICAÇÃO DA NOTÍCIA
        |--------------------------------------------------------------------------
        |
        | O newsId vem da FreeNews API.
        |
        | Ele é único para que a mesma notícia não seja
        | armazenada várias vezes no banco.
        |
        */

        newsId: {
            type: String,
            required: true,
            unique: true,
            index: true,
            trim: true
        },

        /*
        |--------------------------------------------------------------------------
        | TÍTULO
        |--------------------------------------------------------------------------
        */

        title: {
            type: String,
            required: true,
            trim: true
        },

        /*
        |--------------------------------------------------------------------------
        | CONTEÚDO
        |--------------------------------------------------------------------------
        */

        content: {
            type: String,
            default: ""
        },

        /*
        |--------------------------------------------------------------------------
        | FONTE
        |--------------------------------------------------------------------------
        */

        source: {
            type: String,
            required: true,
            trim: true
        },

        /*
        |--------------------------------------------------------------------------
        | CRIPTOMOEDA RELACIONADA
        |--------------------------------------------------------------------------
        |
        | Exemplos:
        |
        | BTC
        | ETH
        | SOL
        | XRP
        | GENERAL
        |
        */

        coin: {
            type: String,
            required: true,
            trim: true,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | SENTIMENTO
        |--------------------------------------------------------------------------
        */

        sentiment: {
            type: String,
            enum: [
                "positive",
                "negative",
                "neutral"
            ],
            default: "neutral",
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | SCORE DE SENTIMENTO
        |--------------------------------------------------------------------------
        */

        sentimentScore: {
            type: Number,
            default: 0
        },

        /*
        |--------------------------------------------------------------------------
        | NARRATIVA ORIGINAL
        |--------------------------------------------------------------------------
        |
        | Classificação produzida pelo método baseado em regras/palavras-chave.
        |
        | IMPORTANTE:
        | Este campo será preservado.
        |
        | Ele permite posteriormente comparar:
        |
        | narrative
        |       x
        | narrativeML
        |
        */

        narrative: {
            type: String,
            default: "general",
            trim: true,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | NARRATIVA CLASSIFICADA POR MACHINE LEARNING
        |--------------------------------------------------------------------------
        |
        | Resultado produzido pelo modelo TF-IDF + Regressão Logística.
        |
        | Exemplos:
        |
        | market
        | regulation
        | institutional_investment
        | adoption
        | technology
        | security
        | mining
        | general
        |
        | Este campo será preenchido posteriormente pelo processo
        | de aplicação do modelo sobre as notícias históricas.
        |
        */

        narrativeML: {
            type: String,
            default: "",
            trim: true,
            index: true
        },

        /*
        |--------------------------------------------------------------------------
        | CONFIANÇA DA CLASSIFICAÇÃO DO MACHINE LEARNING
        |--------------------------------------------------------------------------
        |
        | Valor entre 0 e 1.
        |
        | Exemplos:
        |
        | 0.95 = 95%
        | 0.80 = 80%
        | 0.52 = 52%
        |
        | Representa a confiança calculada pelo modelo para
        | a narrativa prevista.
        |
        */

        narrativeMLConfidence: {
            type: Number,
            default: null,
            min: 0,
            max: 1
        },

        /*
        |--------------------------------------------------------------------------
        | URL ORIGINAL
        |--------------------------------------------------------------------------
        */

        url: {
            type: String,
            default: "",
            trim: true
        },

        /*
        |--------------------------------------------------------------------------
        | DATA DE PUBLICAÇÃO
        |--------------------------------------------------------------------------
        */

        publishedAt: {
            type: Date,
            default: Date.now,
            index: true
        }
    },

    /*
    |--------------------------------------------------------------------------
    | TIMESTAMPS
    |--------------------------------------------------------------------------
    |
    | createdAt = momento em que entrou no nosso banco.
    |
    | updatedAt = última alteração do documento.
    |
    */

    {
        timestamps: true
    }
);


/*
|--------------------------------------------------------------------------
| ÍNDICES PARA ANÁLISES FUTURAS
|--------------------------------------------------------------------------
|
| Esses índices serão úteis quando começarmos a fazer:
|
| - análise temporal;
| - sentimento por moeda;
| - narrativas por período;
| - sentimento por narrativa;
| - classificação ML;
| - comparação entre classificação original e ML.
|
*/


/*
|--------------------------------------------------------------------------
| ÍNDICE: MOEDA + DATA
|--------------------------------------------------------------------------
*/

postSchema.index({
    coin: 1,
    publishedAt: -1
});


/*
|--------------------------------------------------------------------------
| ÍNDICE: SENTIMENTO + DATA
|--------------------------------------------------------------------------
*/

postSchema.index({
    sentiment: 1,
    publishedAt: -1
});


/*
|--------------------------------------------------------------------------
| ÍNDICE: NARRATIVA ORIGINAL + DATA
|--------------------------------------------------------------------------
*/

postSchema.index({
    narrative: 1,
    publishedAt: -1
});


/*
|--------------------------------------------------------------------------
| ÍNDICE: NARRATIVA ML + DATA
|--------------------------------------------------------------------------
|
| Será utilizado principalmente pela nova interface.
|
| Exemplos de consultas:
|
| - quantas notícias foram classificadas como "market";
| - evolução de "regulation" ao longo do tempo;
| - narrativas predominantes em determinado período.
|
*/

postSchema.index({
    narrativeML: 1,
    publishedAt: -1
});


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = mongoose.model("Post", postSchema);