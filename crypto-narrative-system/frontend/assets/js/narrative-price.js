/*
============================================================
CRYPTO NARRATIVE SYSTEM
ANÁLISE NARRATIVA × PREÇO
============================================================
*/


/*
============================================================
CONFIGURAÇÕES
============================================================
*/

const API_URL =
    "/market/narratives/analysis";


let analysisData =
    null;


let charts = {};


/*
============================================================
ELEMENTOS DA INTERFACE
============================================================
*/

const coinSelector =
    document.getElementById("coinSelector");

const periodSelector =
    document.getElementById("periodSelector");

const refreshButton =
    document.getElementById("refreshAnalysis");

const executeAnalysisButton =
    document.getElementById("analyzeSelection");


const statusDot =
    document.getElementById("statusDot");

const statusTitle =
    document.getElementById("statusTitle");

const statusMessage =
    document.getElementById("statusMessage");

const analysisUpdate =
    document.getElementById("analysisUpdate");


/*
============================================================
INICIALIZAÇÃO
============================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    iniciarPagina
);


async function iniciarPagina() {

    console.log(
        "📊 Inicializando Narrative × Price..."
    );

    configurarEventos();

    await carregarAnalise();

}


/*
============================================================
EVENTOS
============================================================
*/

function configurarEventos() {

    /*
    --------------------------------------------------------
    BOTÃO ATUALIZAR
    --------------------------------------------------------
    */

    if (refreshButton) {

        refreshButton.addEventListener(
            "click",
            async function () {

                await carregarAnalise();

            }
        );

    }


    /*
    --------------------------------------------------------
    BOTÃO ANALISAR SELEÇÃO
    --------------------------------------------------------
    */

    if (executeAnalysisButton) {

        executeAnalysisButton.addEventListener(
            "click",
            async function () {

                await carregarAnalise();

            }
        );

    }


    /*
    --------------------------------------------------------
    ALTERAÇÃO DA MOEDA
    --------------------------------------------------------
    */

    if (coinSelector) {

        coinSelector.addEventListener(
            "change",
            function () {

                atualizarInterface();

            }
        );

    }


    /*
    --------------------------------------------------------
    ALTERAÇÃO DO PERÍODO
    --------------------------------------------------------
    */

    if (periodSelector) {

        periodSelector.addEventListener(
            "change",
            function () {

                carregarAnalise();

            }
        );

    }

}


/*
============================================================
CARREGAR ANÁLISE
============================================================
*/

async function carregarAnalise() {

    atualizarStatus(
        "loading",
        "Atualizando análise",
        "Buscando dados de narrativa e preço..."
    );


    try {

        const periodo =
            periodSelector
                ? periodSelector.value
                : "30d";


        /*
        ----------------------------------------------------
        NORMALIZAÇÃO DO PERÍODO
        ----------------------------------------------------
        */

        const periodoNormalizado =
            normalizarPeriodo(periodo);


        const url =
            `${API_URL}?periodo=${encodeURIComponent(
                periodoNormalizado
            )}`;


        console.log(
            "📡 Buscando análise:",
            url
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }


        const resultado =
            await response.json();


        console.log(
            "📦 Resposta da análise:",
            resultado
        );


        if (
            !resultado ||
            resultado.success === false
        ) {

            throw new Error(
                resultado?.message ||
                "A API não retornou uma análise válida."
            );

        }


        /*
        ----------------------------------------------------
        A API pode retornar:
        {
            success: true,
            data: {...}
        }

        ou diretamente:
        {...}
        ----------------------------------------------------
        */

        analysisData =
            resultado.data ||
            resultado;


        if (!analysisData) {

            throw new Error(
                "Dados da análise não encontrados."
            );

        }


        preencherSelecaoMoedas();


        /*
        ----------------------------------------------------
        SE "TODAS" ESTIVER SELECIONADO,
        ESCOLHE AUTOMATICAMENTE O PRIMEIRO ATIVO
        PARA QUE OS GRÁFICOS POSSAM SER EXIBIDOS.
        ----------------------------------------------------
        */

        if (
            coinSelector &&
            coinSelector.value === "all"
        ) {

            const primeiraMoeda =
                obterListaMoedas()[0];


            if (primeiraMoeda) {

                coinSelector.value =
                    primeiraMoeda.coinId ||
                    primeiraMoeda.id ||
                    primeiraMoeda.symbol ||
                    primeiraMoeda.simbolo ||
                    "all";

            }

        }


        atualizarInterface();


        atualizarStatus(
            "success",
            "Análise atualizada",
            "Os dados de narrativa e preço foram carregados."
        );


    } catch (error) {

        console.error(
            "❌ ERRO AO CARREGAR ANÁLISE:",
            error
        );


        atualizarStatus(
            "error",
            "Erro na análise",
            error.message ||
            "Não foi possível carregar os dados."
        );


        mostrarErroNosGraficos();

    }

}


/*
============================================================
NORMALIZAR PERÍODO
============================================================
*/

function normalizarPeriodo(periodo) {

    /*
    O backend trabalha atualmente com:
    7d
    30d
    60d
    */

    const mapa = {

        "week": "7d",

        "month": "30d",

        "day": "7d",

        "year": "60d",

        "7d": "7d",

        "30d": "30d",

        "60d": "60d"

    };


    return mapa[periodo] ||
        "30d";

}


/*
============================================================
OBTER LISTA DE MOEDAS
============================================================
*/

function obterListaMoedas() {

    if (!analysisData) {

        return [];

    }


    const lista =
        analysisData.analisePorMoeda;


    if (Array.isArray(lista)) {

        return lista;

    }


    if (
        lista &&
        typeof lista === "object"
    ) {

        return Object.values(lista);

    }


    return [];

}


/*
============================================================
PREENCHER SELECT DE MOEDAS
============================================================
*/

function preencherSelecaoMoedas() {

    if (!coinSelector) {

        return;

    }


    const moedas =
        obterListaMoedas();


    if (!moedas.length) {

        return;

    }


    const valorAtual =
        coinSelector.value;


    /*
    --------------------------------------------------------
    MANTÉM A OPÇÃO TODAS
    --------------------------------------------------------
    */

    coinSelector.innerHTML = "";


    const opcaoTodas =
        document.createElement("option");


    opcaoTodas.value =
        "all";


    opcaoTodas.textContent =
        "Todas as moedas";


    coinSelector.appendChild(
        opcaoTodas
    );


    /*
    --------------------------------------------------------
    ADICIONA MOEDAS
    --------------------------------------------------------
    */

    moedas.forEach(
        function (moeda) {

            const coinId =
                moeda.coinId ||
                moeda.id ||
                moeda.symbol ||
                moeda.simbolo;


            if (!coinId) {

                return;

            }


            const option =
                document.createElement("option");


            option.value =
                coinId;


            option.textContent =
                moeda.nome ||
                moeda.name ||
                moeda.symbol ||
                moeda.simbolo ||
                coinId;


            coinSelector.appendChild(
                option
            );

        }
    );


    /*
    --------------------------------------------------------
    RESTAURA SELEÇÃO
    --------------------------------------------------------
    */

    const existe =
        Array.from(
            coinSelector.options
        ).some(
            option =>
                option.value === valorAtual
        );


    if (existe) {

        coinSelector.value =
            valorAtual;

    }

}


/*
============================================================
OBTER MOEDA SELECIONADA
============================================================
*/

function obterAnaliseSelecionada() {

    if (!analysisData) {

        return null;

    }


    const moedas =
        obterListaMoedas();


    if (!moedas.length) {

        return null;

    }


    const valorSelecionado =
        coinSelector
            ? coinSelector.value
            : null;


    /*
    --------------------------------------------------------
    SE FOR TODAS
    --------------------------------------------------------
    */

    if (
        !valorSelecionado ||
        valorSelecionado === "all"
    ) {

        return moedas[0];

    }


    /*
    --------------------------------------------------------
    LOCALIZA A MOEDA
    --------------------------------------------------------
    */

    return moedas.find(
        function (moeda) {

            const id =
                moeda.coinId ||
                moeda.id ||
                moeda.symbol ||
                moeda.simbolo;


            return id ===
                valorSelecionado;

        }
    ) || moedas[0];

}


/*
============================================================
ATUALIZAR TODA A INTERFACE
============================================================
*/

function atualizarInterface() {

    const moeda =
        obterAnaliseSelecionada();


    if (!moeda) {

        console.warn(
            "⚠️ Nenhuma moeda disponível para análise."
        );


        mostrarErroNosGraficos();

        return;

    }


    console.log(
        "📈 Atualizando interface para:",
        moeda
    );


    atualizarHero(moeda);

    atualizarKPIs(moeda);

    atualizarInterpretacao(moeda);

    atualizarResumoSentimento(moeda);

    atualizarTabelaNarrativas(moeda);

    atualizarAnaliseDefasagem(moeda);

    destruirGraficos();

    criarGraficoPrecoSentimento(moeda);

    criarGraficoDistribuicaoSentimento(moeda);

    criarGraficoNarrativaPreco(moeda);

    criarGraficoNoticiasRetorno(moeda);

    criarGraficoNarrativaVolatilidade(moeda);

    criarGraficoDefasagem(moeda);

}


/*
============================================================
HERO
============================================================
*/

function atualizarHero(moeda) {

    const heroCoin =
        document.getElementById("heroCoin");

    const heroPeriod =
        document.getElementById("heroPeriod");

    const heroNewsCount =
        document.getElementById("heroNewsCount");

    const heroSignal =
        document.getElementById("heroSignal");

    const heroSignalLabel =
        document.getElementById("heroSignalLabel");


    if (heroCoin) {

        heroCoin.textContent =
            moeda.nome ||
            moeda.symbol ||
            moeda.simbolo ||
            moeda.coinId ||
            "--";

    }


    if (heroPeriod) {

        heroPeriod.textContent =
            obterTextoPeriodo();

    }


    if (heroNewsCount) {

        heroNewsCount.textContent =
            formatarNumero(
                moeda.totalNoticias ||
                0
            );

    }


    const sentimento =
        obterSentimentoMedio(moeda);


    if (heroSignal) {

        heroSignal.textContent =
            formatarNumeroDecimal(
                sentimento,
                2
            );

    }


    if (heroSignalLabel) {

        heroSignalLabel.textContent =
            interpretarSentimento(
                sentimento
            );

    }

}


/*
============================================================
TEXTO DO PERÍODO
============================================================
*/

function obterTextoPeriodo() {

    const valor =
        periodSelector
            ? periodSelector.value
            : "30d";


    const textos = {

        "7d": "Últimos 7 dias",

        "30d": "Últimos 30 dias",

        "60d": "Últimos 60 dias",

        "week": "Últimos 7 dias",

        "month": "Últimos 30 dias",

        "day": "Últimos 7 dias",

        "year": "Últimos 60 dias"

    };


    return textos[valor] ||
        "Período analisado";

}


/*
============================================================
KPIs
============================================================
*/

function atualizarKPIs(moeda) {

    const currentPrice =
        document.getElementById("currentPrice");

    const priceVariation =
        document.getElementById("priceVariation");

    const newsCount =
        document.getElementById("newsCount");

    const averageSentiment =
        document.getElementById("averageSentiment");

    const sentimentDescription =
        document.getElementById("sentimentDescription");

    const volatilityValue =
        document.getElementById("volatilityValue");

    const priceDescription =
        document.getElementById("priceDescription");


    const preco =
        moeda.precoAtual ??
        moeda.currentPrice ??
        moeda.price ??
        0;


    const variacao =
        moeda.variacaoPeriodo ??
        moeda.priceVariation ??
        moeda.variation ??
        0;


    const noticias =
        moeda.totalNoticias ??
        moeda.newsCount ??
        0;


    const sentimento =
        obterSentimentoMedio(moeda);


    const volatilidade =
        moeda.volatilidadeMedia ??
        moeda.volatility ??
        0;


    if (currentPrice) {

        currentPrice.textContent =
            formatarPreco(preco);

    }


    if (priceVariation) {

        priceVariation.textContent =
            formatarPercentual(variacao);

    }


    if (newsCount) {

        newsCount.textContent =
            formatarNumero(noticias);

    }


    if (averageSentiment) {

        averageSentiment.textContent =
            formatarNumeroDecimal(
                sentimento,
                2
            );

    }


    if (sentimentDescription) {

        sentimentDescription.textContent =
            interpretarSentimento(
                sentimento
            );

    }


    if (volatilityValue) {

        volatilityValue.textContent =
            formatarPercentual(
                volatilidade
            );

    }


    if (priceDescription) {

        priceDescription.textContent =
            interpretarRetorno(
                variacao
            );

    }

}


/*
============================================================
INTERPRETAÇÃO
============================================================
*/

function atualizarInterpretacao(moeda) {

    const elemento =
        document.getElementById(
            "analysisInterpretation"
        );


    if (!elemento) {

        return;

    }


    const sentimento =
        obterSentimentoMedio(moeda);


    const variacao =
        moeda.variacaoPeriodo ??
        moeda.priceVariation ??
        moeda.variation ??
        0;


    const volatilidade =
        moeda.volatilidadeMedia ??
        moeda.volatility ??
        0;


    let texto =
        "";


    if (sentimento > 0.15) {

        texto +=
            "O período apresenta predominância de sentimento positivo nas notícias. ";

    } else if (sentimento < -0.15) {

        texto +=
            "O período apresenta predominância de sentimento negativo nas notícias. ";

    } else {

        texto +=
            "O sentimento agregado das notícias permanece próximo da neutralidade. ";

    }


    if (variacao > 0) {

        texto +=
            "O preço apresentou variação positiva no período. ";

    } else if (variacao < 0) {

        texto +=
            "O preço apresentou variação negativa no período. ";

    } else {

        texto +=
            "O preço apresentou pouca variação acumulada no período. ";

    }


    if (volatilidade > 5) {

        texto +=
            "A volatilidade calculada indica maior oscilação dos preços.";

    } else {

        texto +=
            "A volatilidade calculada permanece em um nível mais moderado.";

    }


    elemento.textContent =
        texto;

}


/*
============================================================
SENTIMENTO MÉDIO
============================================================
*/

function obterSentimentoMedio(moeda) {

    const valor =
        moeda.sentimentoMedio ??
        moeda.averageSentiment ??
        moeda.sentimentScore;


    if (
        valor !== undefined &&
        valor !== null &&
        !isNaN(Number(valor))
    ) {

        return Number(valor);

    }


    /*
    --------------------------------------------------------
    TENTA CALCULAR PELA SÉRIE TEMPORAL
    --------------------------------------------------------
    */

    const serie =
        obterSerieTemporal(moeda);


    if (!serie.length) {

        return 0;

    }


    const valores =
        serie
            .map(
                item =>
                    Number(
                        item.sentimentScore ??
                        item.sentimentoScore ??
                        0
                    )
            )
            .filter(
                valor =>
                    !isNaN(valor)
            );


    if (!valores.length) {

        return 0;

    }


    return
        valores.reduce(
            (total, valor) =>
                total + valor,
            0
        ) / valores.length;

}


/*
============================================================
SÉRIE TEMPORAL
============================================================
*/

function obterSerieTemporal(moeda) {

    if (
        !moeda ||
        !moeda.serieTemporal
    ) {

        return [];

    }


    if (
        Array.isArray(
            moeda.serieTemporal
        )
    ) {

        return moeda.serieTemporal;

    }


    if (
        typeof moeda.serieTemporal ===
        "object"
    ) {

        return Object.values(
            moeda.serieTemporal
        );

    }


    return [];

}


/*
============================================================
DISTRIBUIÇÃO DE SENTIMENTO
============================================================
*/

function obterDistribuicaoSentimento(moeda) {

    const direta =
        moeda.distribuicaoSentimento ||
        moeda.sentimentDistribution;


    if (
        direta &&
        typeof direta === "object"
    ) {

        return {

            positive:
                Number(
                    direta.positive ??
                    direta.positivo ??
                    0
                ),

            neutral:
                Number(
                    direta.neutral ??
                    direta.neutro ??
                    0
                ),

            negative:
                Number(
                    direta.negative ??
                    direta.negativo ??
                    0
                )

        };

    }


    /*
    --------------------------------------------------------
    AGREGA A SÉRIE TEMPORAL
    --------------------------------------------------------
    */

    const resultado = {

        positive: 0,

        neutral: 0,

        negative: 0

    };


    const serie =
        obterSerieTemporal(moeda);


    serie.forEach(
        function (item) {

            const sentimentos =
                item.sentimentos ||
                item.sentiments;


            if (
                sentimentos &&
                typeof sentimentos ===
                "object"
            ) {

                resultado.positive +=
                    Number(
                        sentimentos.positive ??
                        sentimentos.positivo ??
                        0
                    );


                resultado.neutral +=
                    Number(
                        sentimentos.neutral ??
                        sentimentos.neutro ??
                        0
                    );


                resultado.negative +=
                    Number(
                        sentimentos.negative ??
                        sentimentos.negativo ??
                        0
                    );

            }

        }
    );


    return resultado;

}


/*
============================================================
ATUALIZAR RESUMO DE SENTIMENTO
============================================================
*/

function atualizarResumoSentimento(moeda) {

    const positivo =
        document.getElementById(
            "positiveSentiment"
        );

    const neutro =
        document.getElementById(
            "neutralSentiment"
        );

    const negativo =
        document.getElementById(
            "negativeSentiment"
        );


    const distribuicao =
        obterDistribuicaoSentimento(
            moeda
        );


    const total =
        distribuicao.positive +
        distribuicao.neutral +
        distribuicao.negative;


    if (positivo) {

        positivo.textContent =
            calcularPercentualDistribuicao(
                distribuicao.positive,
                total
            );

    }


    if (neutro) {

        neutro.textContent =
            calcularPercentualDistribuicao(
                distribuicao.neutral,
                total
            );

    }


    if (negativo) {

        negativo.textContent =
            calcularPercentualDistribuicao(
                distribuicao.negative,
                total
            );

    }

}


/*
============================================================
INTENSIDADE NARRATIVA
============================================================
*/

function obterIntensidadeNarrativa(item) {

    if (!item) {

        return 0;

    }


    const camposDiretos = [

        "narrativeIntensity",

        "intensidadeNarrativa",

        "narrativeScore",

        "intensidade",

        "narrativeCount"

    ];


    for (
        const campo of camposDiretos
    ) {

        if (
            item[campo] !== undefined &&
            item[campo] !== null &&
            !isNaN(Number(item[campo]))
        ) {

            return Number(
                item[campo]
            );

        }

    }


    const narrativas =
        item.narrativas ||
        item.narratives;


    if (
        typeof narrativas === "number"
    ) {

        return narrativas;

    }


    if (
        Array.isArray(narrativas)
    ) {

        return narrativas.reduce(
            function (total, narrativa) {

                if (
                    typeof narrativa ===
                    "number"
                ) {

                    return total +
                        narrativa;

                }


                if (
                    typeof narrativa ===
                    "object"
                ) {

                    return total +
                        Number(
                            narrativa.intensity ??
                            narrativa.intensidade ??
                            narrativa.score ??
                            narrativa.valor ??
                            narrativa.quantidade ??
                            0
                        );

                }


                return total;

            },
            0
        );

    }


    if (
        narrativas &&
        typeof narrativas === "object"
    ) {

        return Object.values(
            narrativas
        ).reduce(
            function (total, valor) {

                if (
                    typeof valor ===
                    "number"
                ) {

                    return total +
                        valor;

                }


                if (
                    typeof valor ===
                    "object"
                ) {

                    return total +
                        Number(
                            valor.intensity ??
                            valor.intensidade ??
                            valor.score ??
                            valor.valor ??
                            valor.quantidade ??
                            0
                        );

                }


                return total;

            },
            0
        );

    }


    return 0;

}


/*
============================================================
GRÁFICO 1
PREÇO × SENTIMENTO
============================================================
*/

function criarGraficoPrecoSentimento(moeda) {

    const canvas =
        document.getElementById(
            "priceSentimentChart"
        );


    if (!canvas) {

        return;

    }


    const serie =
        obterSerieTemporal(moeda);


    if (!serie.length) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados de preço e sentimento."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.data
                )
        );


    const precos =
        serie.map(
            item =>
                Number(
                    item.price ??
                    item.preco ??
                    0
                )
        );


    const sentimentos =
        serie.map(
            item =>
                Number(
                    item.sentimentScore ??
                    item.sentimentoScore ??
                    0
                )
        );


    charts.priceSentiment =
        criarChart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Preço",

                            data:
                                precos,

                            yAxisID:
                                "price"

                        },

                        {

                            label:
                                "Sentimento",

                            data:
                                sentimentos,

                            yAxisID:
                                "sentiment",

                            borderDash:
                                [5, 5]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    scales: {

                        price: {

                            type:
                                "linear",

                            position:
                                "left"

                        },

                        sentiment: {

                            type:
                                "linear",

                            position:
                                "right",

                            suggestedMin:
                                -1,

                            suggestedMax:
                                1

                        }

                    }

                }

            }
        );

}


/*
============================================================
GRÁFICO 2
DISTRIBUIÇÃO DE SENTIMENTO
============================================================
*/

function criarGraficoDistribuicaoSentimento(
    moeda
) {

    const canvas =
        document.getElementById(
            "sentimentDistributionChart"
        );


    if (!canvas) {

        return;

    }


    const dados =
        obterDistribuicaoSentimento(
            moeda
        );


    const total =
        dados.positive +
        dados.neutral +
        dados.negative;


    if (!total) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados de sentimento."
        );

        return;

    }


    charts.sentimentDistribution =
        criarChart(
            canvas,
            {

                type: "doughnut",

                data: {

                    labels: [

                        "Positivo",

                        "Neutro",

                        "Negativo"

                    ],

                    datasets: [

                        {

                            data: [

                                dados.positive,

                                dados.neutral,

                                dados.negative

                            ]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {

                            position:
                                "bottom"

                        }

                    }

                }

            }
        );

}


/*
============================================================
GRÁFICO 3
NARRATIVA × PREÇO
============================================================
*/

function criarGraficoNarrativaPreco(
    moeda
) {

    const canvas =
        document.getElementById(
            "narrativePriceChart"
        );


    if (!canvas) {

        return;

    }


    const serie =
        obterSerieTemporal(moeda);


    if (!serie.length) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados narrativos."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.data
                )
        );


    const intensidade =
        serie.map(
            item =>
                obterIntensidadeNarrativa(
                    item
                )
        );


    const precos =
        serie.map(
            item =>
                Number(
                    item.price ??
                    item.preco ??
                    0
                )
        );


    charts.narrativePrice =
        criarChart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Preço",

                            data:
                                precos,

                            yAxisID:
                                "price"

                        },

                        {

                            label:
                                "Intensidade narrativa",

                            data:
                                intensidade,

                            yAxisID:
                                "narrative",

                            borderDash:
                                [6, 4]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    scales: {

                        price: {

                            type:
                                "linear",

                            position:
                                "left"

                        },

                        narrative: {

                            type:
                                "linear",

                            position:
                                "right",

                            beginAtZero:
                                true

                        }

                    }

                }

            }
        );

}


/*
============================================================
GRÁFICO 4
NOTÍCIAS × RETORNO
============================================================
*/

function criarGraficoNoticiasRetorno(
    moeda
) {

    const canvas =
        document.getElementById(
            "newsReturnChart"
        );


    if (!canvas) {

        return;

    }


    const serie =
        obterSerieTemporal(moeda);


    if (!serie.length) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados de notícias e retorno."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.data
                )
        );


    const noticias =
        serie.map(
            item =>
                Number(
                    item.noticias ??
                    item.newsCount ??
                    item.quantidadeNoticias ??
                    0
                )
        );


    const retornos =
        serie.map(
            item =>
                Number(
                    item.retornoPercentual ??
                    item.returnPercentual ??
                    item.retorno ??
                    item.return ??
                    0
                )
        );


    charts.newsReturn =
        criarChart(
            canvas,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Notícias",

                            data:
                                noticias,

                            yAxisID:
                                "news"

                        },

                        {

                            type:
                                "line",

                            label:
                                "Retorno (%)",

                            data:
                                retornos,

                            yAxisID:
                                "return"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    scales: {

                        news: {

                            type:
                                "linear",

                            position:
                                "left",

                            beginAtZero:
                                true

                        },

                        return: {

                            type:
                                "linear",

                            position:
                                "right"

                        }

                    }

                }

            }
        );

}


/*
============================================================
GRÁFICO 5
NARRATIVA × VOLATILIDADE
============================================================
*/

function criarGraficoNarrativaVolatilidade(
    moeda
) {

    const canvas =
        document.getElementById(
            "narrativeVolatilityChart"
        );


    if (!canvas) {

        return;

    }


    const serie =
        obterSerieTemporal(moeda);


    if (!serie.length) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados de volatilidade."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.data
                )
        );


    const narrativa =
        serie.map(
            item =>
                obterIntensidadeNarrativa(
                    item
                )
        );


    const volatilidade =
        serie.map(
            item =>
                Number(
                    item.volatilidade ??
                    item.volatility ??
                    0
                )
        );


    charts.narrativeVolatility =
        criarChart(
            canvas,
            {

                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Intensidade narrativa",

                            data:
                                narrativa,

                            yAxisID:
                                "narrative"

                        },

                        {

                            label:
                                "Volatilidade",

                            data:
                                volatilidade,

                            yAxisID:
                                "volatility",

                            borderDash:
                                [5, 5]

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },

                    scales: {

                        narrative: {

                            type:
                                "linear",

                            position:
                                "left",

                            beginAtZero:
                                true

                        },

                        volatility: {

                            type:
                                "linear",

                            position:
                                "right",

                            beginAtZero:
                                true

                        }

                    }

                }

            }
        );

}


/*
============================================================
GRÁFICO 6
DEFASAGEM
============================================================
*/

function criarGraficoDefasagem(
    moeda
) {

    const canvas =
        document.getElementById(
            "lagChart"
        );


    if (!canvas) {

        return;

    }


    const defasagens =
        moeda.defasagens ||
        moeda.defasagemNarrativa ||
        [];


    if (
        !defasagens ||
        !Object.keys(
            defasagens
        ).length
    ) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados de defasagem."
        );

        return;

    }


    let dados = [];


    if (
        Array.isArray(
            defasagens
        )
    ) {

        dados =
            defasagens;

    } else {

        dados =
            Object.entries(
                defasagens
            ).map(
                ([chave, valor]) => ({

                    chave,

                    valor

                })
            );

    }


    const labels =
        dados.map(
            item =>
                item.chave ??
                item.lag ??
                item.defasagem ??
                item.dias ??
                "--"
        );


    const valores =
        dados.map(
            item =>
                Number(
                    item.valor ??
                    item.relation ??
                    item.relacao ??
                    item.correlation ??
                    item.correlacao ??
                    0
                )
        );


    charts.lag =
        criarChart(
            canvas,
            {

                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Relação narrativa × preço",

                            data:
                                valores

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    scales: {

                        y: {

                            beginAtZero:
                                false

                        }

                    }

                }

            }
        );

}


/*
============================================================
CRIAR CHART
============================================================
*/

function criarChart(
    canvas,
    config
) {

    try {

        return new Chart(
            canvas.getContext("2d"),
            config
        );

    } catch (error) {

        console.error(
            "❌ Erro ao criar gráfico:",
            error
        );


        mostrarGraficoVazio(
            canvas,
            "Não foi possível renderizar este gráfico."
        );


        return null;

    }

}


/*
============================================================
DESTRUIR GRÁFICOS
============================================================
*/

function destruirGraficos() {

    Object.keys(
        charts
    ).forEach(
        function (nome) {

            const chart =
                charts[nome];


            if (
                chart &&
                typeof chart.destroy ===
                "function"
            ) {

                chart.destroy();

            }

        }
    );


    charts = {};


    /*
    --------------------------------------------------------
    GARANTE QUE GRÁFICOS CRIADOS ANTERIORMENTE
    TAMBÉM SEJAM REMOVIDOS
    --------------------------------------------------------
    */

    const ids = [

        "priceSentimentChart",

        "sentimentDistributionChart",

        "narrativePriceChart",

        "newsReturnChart",

        "narrativeVolatilityChart",

        "lagChart"

    ];


    ids.forEach(
        function (id) {

            const canvas =
                document.getElementById(id);


            if (!canvas) {

                return;

            }


            const chart =
                Chart.getChart(canvas);


            if (chart) {

                chart.destroy();

            }

        }
    );

}


/*
============================================================
GRÁFICO VAZIO
============================================================
*/

function mostrarGraficoVazio(
    canvas,
    mensagem
) {

    if (!canvas) {

        return;

    }


    const contexto =
        canvas.getContext("2d");


    contexto.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    contexto.save();


    contexto.textAlign =
        "center";


    contexto.textBaseline =
        "middle";


    contexto.font =
        "14px Arial";


    contexto.fillText(
        mensagem,
        canvas.width / 2,
        canvas.height / 2
    );


    contexto.restore();

}


/*
============================================================
ERRO NOS GRÁFICOS
============================================================
*/

function mostrarErroNosGraficos() {

    const ids = [

        "priceSentimentChart",

        "sentimentDistributionChart",

        "narrativePriceChart",

        "newsReturnChart",

        "narrativeVolatilityChart",

        "lagChart"

    ];


    ids.forEach(
        function (id) {

            const canvas =
                document.getElementById(id);


            if (canvas) {

                mostrarGraficoVazio(
                    canvas,
                    "Não foi possível carregar os dados."
                );

            }

        }
    );

}


/*
============================================================
TABELA DE NARRATIVAS
============================================================
*/

function atualizarTabelaNarrativas(
    moeda
) {

    const tbody =
        document.getElementById(
            "narrativeTableBody"
        );


    if (!tbody) {

        return;

    }


    tbody.innerHTML = "";


    const narrativas =
        moeda.narrativasPreco ||
        moeda.relacaoNarrativaPreco ||
        moeda.narrativas ||
        [];


    let lista = [];


    if (
        Array.isArray(narrativas)
    ) {

        lista =
            narrativas;

    } else if (
        narrativas &&
        typeof narrativas ===
        "object"
    ) {

        lista =
            Object.entries(
                narrativas
            ).map(
                ([nome, dados]) => {

                    if (
                        typeof dados ===
                        "object"
                    ) {

                        return {

                            narrativa:
                                nome,

                            ...dados

                        };

                    }


                    return {

                        narrativa:
                            nome,

                        valor:
                            dados

                    };

                }
            );

    }


    if (!lista.length) {

        const tr =
            document.createElement(
                "tr"
            );


        tr.innerHTML = `
            <td colspan="6">
                Nenhuma narrativa disponível para o período.
            </td>
        `;


        tbody.appendChild(
            tr
        );


        return;

    }


    lista.forEach(
        function (item) {

            const tr =
                document.createElement(
                    "tr"
                );


            const narrativa =
                item.narrativa ||
                item.nome ||
                item.name ||
                item.narrative ||
                item.label ||
                "--";


            const noticias =
                item.totalNoticias ??
                item.newsCount ??
                item.noticias ??
                item.quantidadeNoticias ??
                0;


            const intensidade =
                item.intensidade ??
                item.intensidadeNarrativa ??
                item.narrativeIntensity ??
                item.score ??
                item.valor ??
                0;


            const sentimento =
                item.sentimento ??
                item.sentiment ??
                item.sentimentScore ??
                0;


            const retorno =
                item.retorno ??
                item.return ??
                item.retornoPercentual ??
                item.returnPercentual ??
                0;


            const relacao =
                item.relacao ??
                item.relation ??
                item.correlacao ??
                item.correlation ??
                0;


            tr.innerHTML = `

                <td>
                    ${escaparHTML(
                        narrativa
                    )}
                </td>

                <td>
                    ${formatarNumero(
                        noticias
                    )}
                </td>

                <td>
                    ${formatarNumeroDecimal(
                        intensidade,
                        2
                    )}
                </td>

                <td>
                    ${formatarNumeroDecimal(
                        sentimento,
                        2
                    )}
                </td>

                <td>
                    ${formatarPercentual(
                        retorno
                    )}
                </td>

                <td>
                    ${formatarNumeroDecimal(
                        relacao,
                        2
                    )}
                </td>

            `;


            tbody.appendChild(
                tr
            );

        }
    );

}


/*
============================================================
ANÁLISE DE DEFASAGEM
============================================================
*/

function atualizarAnaliseDefasagem(
    moeda
) {

    const container =
        document.getElementById(
            "lagAnalysisContainer"
        );


    if (!container) {

        return;

    }


    const defasagens =
        moeda.defasagens ||
        moeda.defasagemNarrativa;


    if (
        !defasagens
    ) {

        container.innerHTML =
            "<p>Não há dados de defasagem disponíveis.</p>";

        return;

    }


    if (
        Array.isArray(
            defasagens
        )
    ) {

        container.innerHTML =
            defasagens
                .map(
                    item => `

                        <div class="lag-item">

                            <strong>
                                ${escaparHTML(
                                    String(
                                        item.lag ??
                                        item.defasagem ??
                                        item.dias ??
                                        "--"
                                    )
                                )}
                            </strong>

                            <span>
                                ${formatarNumeroDecimal(
                                    item.valor ??
                                    item.relacao ??
                                    item.relation ??
                                    0,
                                    2
                                )}
                            </span>

                        </div>

                    `
                )
                .join("");

        return;

    }


    if (
        typeof defasagens ===
        "object"
    ) {

        container.innerHTML =
            Object.entries(
                defasagens
            )
            .map(
                ([chave, valor]) => `

                    <div class="lag-item">

                        <strong>
                            ${escaparHTML(
                                chave
                            )}
                        </strong>

                        <span>
                            ${formatarNumeroDecimal(
                                typeof valor === "object"
                                    ? (
                                        valor.valor ??
                                        valor.relacao ??
                                        valor.relation ??
                                        0
                                    )
                                    : valor,
                                2
                            )}
                        </span>

                    </div>

                `
            )
            .join("");

        return;

    }


    container.innerHTML =
        "<p>Não há dados de defasagem disponíveis.</p>";

}


/*
============================================================
STATUS
============================================================
*/

function atualizarStatus(
    tipo,
    titulo,
    mensagem
) {

    if (statusTitle) {

        statusTitle.textContent =
            titulo;

    }


    if (statusMessage) {

        statusMessage.textContent =
            mensagem;

    }


    if (analysisUpdate) {

        analysisUpdate.textContent =
            new Date().toLocaleTimeString(
                "pt-BR"
            );

    }


    if (statusDot) {

        statusDot.classList.remove(
            "loading",
            "success",
            "error"
        );


        statusDot.classList.add(
            tipo
        );

    }

}


/*
============================================================
INTERPRETAÇÃO DO SENTIMENTO
============================================================
*/

function interpretarSentimento(
    valor
) {

    const numero =
        Number(valor);


    if (numero > 0.15) {

        return "Predominantemente positivo";

    }


    if (numero < -0.15) {

        return "Predominantemente negativo";

    }


    return "Predominantemente neutro";

}


/*
============================================================
INTERPRETAÇÃO DO RETORNO
============================================================
*/

function interpretarRetorno(
    valor
) {

    const numero =
        Number(valor);


    if (numero > 0) {

        return "Valorização no período";

    }


    if (numero < 0) {

        return "Queda no período";

    }


    return "Pouca alteração no período";

}


/*
============================================================
FORMATAÇÃO DE PREÇO
============================================================
*/

function formatarPreco(
    valor
) {

    const numero =
        Number(valor);


    if (
        isNaN(numero)
    ) {

        return "--";

    }


    return numero.toLocaleString(
        "en-US",
        {

            style:
                "currency",

            currency:
                "USD",

            minimumFractionDigits:
                numero < 1
                    ? 4
                    : 2,

            maximumFractionDigits:
                numero < 1
                    ? 8
                    : 2

        }
    );

}


/*
============================================================
FORMATAÇÃO DE PERCENTUAL
============================================================
*/

function formatarPercentual(
    valor
) {

    const numero =
        Number(valor);


    if (
        isNaN(numero)
    ) {

        return "--";

    }


    return `${numero.toFixed(2)}%`;

}


/*
============================================================
FORMATAÇÃO NUMÉRICA
============================================================
*/

function formatarNumero(
    valor
) {

    const numero =
        Number(valor);


    if (
        isNaN(numero)
    ) {

        return "0";

    }


    return numero.toLocaleString(
        "pt-BR"
    );

}


/*
============================================================
FORMATAÇÃO DECIMAL
============================================================
*/

function formatarNumeroDecimal(
    valor,
    casas = 2
) {

    const numero =
        Number(valor);


    if (
        isNaN(numero)
    ) {

        return "0";

    }


    return numero.toLocaleString(
        "pt-BR",
        {

            minimumFractionDigits:
                casas,

            maximumFractionDigits:
                casas

        }
    );

}


/*
============================================================
FORMATAÇÃO DE DATA
============================================================
*/

function formatarData(
    data
) {

    if (!data) {

        return "--";

    }


    const dataObjeto =
        new Date(data);


    if (
        isNaN(
            dataObjeto.getTime()
        )
    ) {

        return String(data);

    }


    return dataObjeto.toLocaleDateString(
        "pt-BR",
        {

            day:
                "2-digit",

            month:
                "2-digit"

        }
    );

}


/*
============================================================
PERCENTUAL DA DISTRIBUIÇÃO
============================================================
*/

function calcularPercentualDistribuicao(
    valor,
    total
) {

    if (
        !total ||
        total <= 0
    ) {

        return "0%";

    }


    return (
        (
            Number(valor) /
            Number(total)
        ) *
        100
    ).toFixed(1) + "%";

}


/*
============================================================
ESCAPAR HTML
============================================================
*/

function escaparHTML(
    valor
) {

    return String(valor)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/*
============================================================
EXPORTAÇÃO GLOBAL
============================================================
*/

window.carregarNarrativePrice =
    carregarAnalise;


console.log(
    "✅ narrative-price.js carregado."
);
