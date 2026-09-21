/*
|--------------------------------------------------------------------------
| SENTIMENT SERVICE
|--------------------------------------------------------------------------
| Analisa notícias de criptomoedas utilizando:
|
| 1. Palavras positivas;
| 2. Palavras negativas;
| 3. Expressões positivas;
| 4. Expressões negativas;
| 5. Negação;
| 6. Intensificadores;
|
| Retorno:
|
| sentiment:
| positive | negative | neutral
|
| score:
| -100 até +100
|--------------------------------------------------------------------------
*/


/*
|--------------------------------------------------------------------------
| PALAVRAS POSITIVAS
|--------------------------------------------------------------------------
*/

const positiveWords = {

    // Muito positivas

    bullish: 3,
    surge: 3,
    rally: 3,
    breakout: 3,
    "all-time-high": 3,
    ath: 3,
    moon: 3,

    // Positivas

    gain: 2,
    gains: 2,

    rise: 2,
    rises: 2,
    rising: 2,

    growth: 2,

    profit: 2,
    profits: 2,

    strong: 2,
    stronger: 2,
    strength: 2,

    recovery: 2,
    recover: 2,
    recoveries: 2,

    adoption: 2,
    demand: 2,

    buy: 2,
    buying: 2,

    investment: 2,
    institutional: 2,

    support: 1,

    positive: 2,

    optimistic: 2,
    optimism: 2,

    successful: 2,
    success: 2,

    improve: 2,
    improvement: 2,

    upgrade: 2,

    approval: 2,
    approved: 2,

    accumulate: 2,
    accumulated: 2,
    accumulation: 2,

    gains: 2,

    outperform: 3,
    outperforming: 3,

    resilience: 2,
    resilient: 2,

    stabilize: 2,
    stabilise: 2,
    stability: 2,

    opportunity: 2,
    opportunities: 2,

    favorable: 2,
    favourable: 2,

    bullishness: 3,

    high: 1,

    bottom: 1

};


/*
|--------------------------------------------------------------------------
| PALAVRAS NEGATIVAS
|--------------------------------------------------------------------------
*/

const negativeWords = {

    // Muito negativas

    crash: 3,

    collapse: 3,

    hack: 3,
    hacked: 3,

    exploit: 3,
    exploited: 3,

    attack: 3,
    attacked: 3,

    scam: 3,

    fraud: 3,

    theft: 3,
    stolen: 3,

    breach: 3,

    outrage: 3,

    // Negativas

    bearish: 2,

    dump: 2,

    fall: 2,
    falls: 2,
    falling: 2,

    drop: 2,
    drops: 2,
    dropping: 2,

    decline: 2,
    declining: 2,

    fear: 2,
    panic: 2,

    sell: 2,
    selling: 2,

    loss: 2,
    losses: 2,

    weak: 2,
    weaker: 2,
    weakness: 2,

    downtrend: 2,

    liquidation: 2,
    liquidations: 2,

    risk: 2,
    risky: 2,

    threat: 2,
    threats: 2,

    warning: 2,

    concern: 2,
    concerns: 2,

    negative: 2,

    uncertainty: 2,
    uncertain: 2,

    lawsuit: 2,
    lawsuits: 2,

    penalty: 2,
    penalties: 2,

    investigation: 2,
    investigations: 2,

    regulation: 1,
    regulatory: 1,

    pressure: 2,

    pressured: 2,

    trouble: 2,

    problematic: 2,

    disappointing: 2,

    disappointment: 2,

    controversy: 2,

    controversial: 2,

    halt: 3,
    halts: 3,

    halted: 3,

    attack: 3,

    breach: 3,

    stolen: 3,

    theft: 3,

    damages: 2,

    damage: 2,

    loss: 2,

    losses: 2,

    uncertainty: 2,

    recession: 3,

    inflation: 1,

    crisis: 3,

    war: 3,

    conflict: 2,

    sanction: 2,
    sanctions: 2

};


/*
|--------------------------------------------------------------------------
| EXPRESSÕES POSITIVAS
|--------------------------------------------------------------------------
|
| Expressões têm prioridade sobre palavras isoladas.
|--------------------------------------------------------------------------
*/

const positiveExpressions = {

    "bull market": 5,

    "bull run": 5,

    "bullish trend": 5,

    "price rally": 4,

    "strong rally": 5,

    "major rally": 5,

    "market recovery": 4,

    "price recovery": 4,

    "strong recovery": 5,

    "record high": 5,

    "new high": 4,

    "all time high": 5,

    "all-time high": 5,

    "breakout above": 4,

    "breaks resistance": 4,

    "break resistance": 4,

    "whales accumulate": 4,

    "whales accumulating": 4,

    "institutional adoption": 4,

    "increased demand": 3,

    "rising demand": 3,

    "strong demand": 4,

    "positive outlook": 4,

    "bullish outlook": 5,

    "market strength": 3,

    "strong support": 3,

    "cycle bottom": 3,

    "bottom is in": 5,

    "bull run is just getting started": 6,

    "strategic reserve": 3,

    "bitcoin reserve": 3,

    "major announcement": 2,

    "successful upgrade": 4,

    "network adoption": 3,

    "price target": 1,

    "target higher": 3

};


/*
|--------------------------------------------------------------------------
| EXPRESSÕES NEGATIVAS
|--------------------------------------------------------------------------
*/

const negativeExpressions = {

    "under pressure": -4,

    "remains under pressure": -5,

    "market downturn": -5,

    "price downturn": -5,

    "sharp decline": -5,

    "sharp drop": -5,

    "major drop": -5,

    "heavy losses": -5,

    "mounting losses": -5,

    "losses mount": -5,

    "rising losses": -4,

    "deep losses": -5,

    "market crash": -7,

    "price crash": -7,

    "flash crash": -7,

    "market collapse": -7,

    "smart contract breach": -7,

    "contract breach": -6,

    "security breach": -6,

    "contract attack": -6,

    "network attack": -6,

    "protocol exploit": -7,

    "contract exploit": -7,

    "targeted by exploit": -6,

    "fraud scheme": -6,

    "fraud case": -5,

    "fraud investigation": -5,

    "legal trouble": -4,

    "regulatory pressure": -3,

    "inflation risk": -4,

    "recession fears": -5,

    "market fears": -4,

    "investor fears": -4,

    "growing concerns": -4,

    "heightened concerns": -4,

    "risk increases": -4,

    "increased risk": -4,

    "risky environment": -4,

    "halted transfers": -6,

    "halts transfers": -6,

    "halts operations": -6,

    "halts cross-chain": -6,

    "cross-chain attack": -7,

    "sparks outrage": -5,

    "sparks controversy": -4,

    "critics cry theft": -5,

    "under investigation": -4,

    "investigation into": -3,

    "rate hike": -1,

    "rate hikes": -1,

    "higher inflation": -3,

    "inflation forecast": -2,

    "geopolitical conflict": -4,

    "us iran conflict": -5

};


/*
|--------------------------------------------------------------------------
| PALAVRAS DE NEGAÇÃO
|--------------------------------------------------------------------------
|
| Exemplo:
|
| "not bearish"
|
| Não devemos contar "bearish" como negativo.
|--------------------------------------------------------------------------
*/

const negations = [

    "not",
    "no",
    "never",
    "without",
    "unlikely",
    "hardly",
    "less"

];


/*
|--------------------------------------------------------------------------
| INTENSIFICADORES
|--------------------------------------------------------------------------
*/

const intensifiers = {

    very: 1.5,

    extremely: 2,

    sharply: 1.5,

    significantly: 1.5,

    heavily: 1.5,

    strongly: 1.5,

    major: 1.3,

    massive: 1.7,

    huge: 1.5,

    severe: 1.7,

    sharply: 1.5

};


/*
|--------------------------------------------------------------------------
| NORMALIZAR TEXTO
|--------------------------------------------------------------------------
*/

function normalizeText(text) {

    return text
        .toLowerCase()
        .replace(/[.,!?;:()[\]{}"'’‘“”]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/*
|--------------------------------------------------------------------------
| VERIFICA SE EXPRESSÃO EXISTE
|--------------------------------------------------------------------------
*/

function containsExpression(text, expression) {

    return text.includes(
        expression.toLowerCase()
    );

}


/*
|--------------------------------------------------------------------------
| ANALISAR EXPRESSÕES
|--------------------------------------------------------------------------
*/

function analyzeExpressions(text) {

    let score = 0;

    const usedExpressions = [];


    /*
     * Expressões positivas
     */

    for (
        const expression in positiveExpressions
    ) {

        if (
            containsExpression(
                text,
                expression
            )
        ) {

            const value =
                positiveExpressions[
                    expression
                ];

            score += value;

            usedExpressions.push(
                `+${expression}`
            );

        }

    }


    /*
     * Expressões negativas
     */

    for (
        const expression in negativeExpressions
    ) {

        if (
            containsExpression(
                text,
                expression
            )
        ) {

            const value =
                negativeExpressions[
                    expression
                ];

            score += value;

            usedExpressions.push(
                `${value}${expression}`
            );

        }

    }


    return {

        score,

        usedExpressions

    };

}


/*
|--------------------------------------------------------------------------
| ANALISAR PALAVRAS
|--------------------------------------------------------------------------
*/

function analyzeWords(text) {

    const words =
        text.split(/\s+/);


    let score = 0;


    for (
        let i = 0;
        i < words.length;
        i++
    ) {

        const word =
            words[i];


        let wordScore = 0;


        /*
         * Palavra positiva
         */

        if (
            positiveWords[word]
        ) {

            wordScore =
                positiveWords[word];

        }


        /*
         * Palavra negativa
         */

        if (
            negativeWords[word]
        ) {

            wordScore =
                -negativeWords[word];

        }


        /*
         * Se não é palavra de sentimento,
         * passa para a próxima.
         */

        if (
            wordScore === 0
        ) {

            continue;

        }


        /*
         * Verifica palavras anteriores
         * para identificar negação.
         */

        const previousWords =
            words.slice(
                Math.max(0, i - 3),
                i
            );


        const hasNegation =
            previousWords.some(
                previous =>
                    negations.includes(
                        previous
                    )
            );


        if (
            hasNegation
        ) {

            wordScore =
                -wordScore;

        }


        /*
         * Verifica intensificador.
         */

        const previousWord =
            words[i - 1];


        if (
            intensifiers[
                previousWord
            ]
        ) {

            wordScore *=
                intensifiers[
                    previousWord
                ];

        }


        score +=
            wordScore;

    }


    return score;

}


/*
|--------------------------------------------------------------------------
| ANALISAR SENTIMENTO
|--------------------------------------------------------------------------
*/

function analyzeSentiment(text) {

    if (!text) {

        return {

            sentiment: "neutral",

            score: 0

        };

    }


    const content =
        normalizeText(text);


    /*
     * Analisa expressões primeiro.
     */

    const expressionResult =
        analyzeExpressions(
            content
        );


    /*
     * Analisa palavras.
     */

    const wordScore =
        analyzeWords(
            content
        );


    /*
     * Score final.
     */

    let score =
        expressionResult.score +
        wordScore;


    /*
     * Limita entre -100 e +100.
     */

    score =
        Math.max(
            -100,
            Math.min(
                100,
                Math.round(score)
            )
        );


    /*
     * Classificação.
     *
     * Pequenos scores são considerados
     * neutros para evitar exageros.
     */

    let sentiment =
        "neutral";


    if (
        score >= 2
    ) {

        sentiment =
            "positive";

    }


    if (
        score <= -2
    ) {

        sentiment =
            "negative";

    }


    return {

        sentiment,

        score

    };

}


/*
|--------------------------------------------------------------------------
| EXPORT
|--------------------------------------------------------------------------
*/

module.exports = {

    analyzeSentiment

};