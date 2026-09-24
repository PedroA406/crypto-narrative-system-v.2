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
ELEMENTOS
============================================================
*/

const coinSelector =
    document.getElementById("coinSelector");

const periodSelector =
    document.getElementById("periodSelector");

const refreshButton =
    document.getElementById("refreshAnalysis");

const analysisStatus =
    document.getElementById("analysisStatus");


/*
============================================================
FORMATAÇÃO
============================================================
*/

function formatNumber(
    value,
    decimals = 2
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "—";

    }


    return Number(value).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }
    );

}


function formatPrice(value) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "—";

    }


    const number =
        Number(value);


    if (number >= 1000) {

        return number.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    }


    if (number >= 1) {

        return number.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
            }
        );

    }


    return number.toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 4,
            maximumFractionDigits: 8
        }
    );

}


function formatPercent(
    value
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "—";

    }


    const number =
        Number(value);


    const prefix =
        number > 0
            ? "+"
            : "";


    return (
        prefix +
        number.toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ) +
        "%"
    );

}


function formatCorrelation(
    value
) {

    if (
        value === null ||
        value === undefined ||
        Number.isNaN(Number(value))
    ) {

        return "—";

    }


    return Number(value).toLocaleString(
        "pt-BR",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


/*
============================================================
CORES
============================================================
*/

const COLORS = {

    green:
        "#35d39a",

    red:
        "#ff7272",

    blue:
        "#4ea8ff",

    yellow:
        "#e8c96d",

    neutral:
        "#7f9690",

    purple:
        "#9b7cff",

    cyan:
        "#5ed7d1"

};


/*
============================================================
CONFIGURAÇÃO GLOBAL DO CHART.JS
============================================================
*/

Chart.defaults.color =
    "#809590";

Chart.defaults.borderColor =
    "rgba(255,255,255,0.06)";

Chart.defaults.font.family =
    "Inter, Arial, Helvetica, sans-serif";


/*
============================================================
STATUS
============================================================
*/

function setStatus(
    message,
    error = false
) {

    if (!analysisStatus) {

        return;

    }


    analysisStatus.textContent =
        message;


    analysisStatus.style.color =
        error
            ? COLORS.red
            : "#718984";

}


/*
============================================================
CARREGAR DADOS
============================================================
*/

async function carregarAnalise() {

    try {

        setStatus(
            "Carregando análise de mercado..."
        );


        if (refreshButton) {

            refreshButton.disabled =
                true;

        }


        const response =
            await fetch(
                API_URL,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `Erro HTTP ${response.status}`
            );

        }


        const result =
            await response.json();


        if (
            !result.success
        ) {

            throw new Error(
                result.message ||
                "A API não retornou uma análise válida."
            );

        }


        analysisData =
            result.data;


        preencherMoedas();


        atualizarInterface();


        setStatus(
            "Análise atualizada com sucesso."
        );


    } catch (error) {

        console.error(
            "Erro ao carregar análise:",
            error
        );


        setStatus(
            "Não foi possível carregar os dados da análise.",
            true
        );


        mostrarErroGraficos(
            error.message
        );


    } finally {

        if (refreshButton) {

            refreshButton.disabled =
                false;

        }

    }

}


/*
============================================================
PREENCHER MOEDAS
============================================================
*/

function preencherMoedas() {

    if (!analysisData || !coinSelector) {

        return;

    }


    const lista =
        analysisData.analisePorMoeda ||
        [];


    const valorAtual =
        coinSelector.value;


    coinSelector.innerHTML = "";


    const optionTodos =
        document.createElement("option");


    optionTodos.value =
        "all";


    optionTodos.textContent =
        "Visão geral do mercado";


    coinSelector.appendChild(
        optionTodos
    );


    lista.forEach(
        item => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                item.coinId ||
                item.symbol ||
                "";


            option.textContent =
                item.name ||
                item.symbol ||
                item.coinId;


            coinSelector.appendChild(
                option
            );

        }
    );


    const existe =
        Array.from(
            coinSelector.options
        ).some(
            option =>
                option.value ===
                valorAtual
        );


    if (existe) {

        coinSelector.value =
            valorAtual;

    }

}


/*
============================================================
OBTER ANÁLISE DA MOEDA SELECIONADA
============================================================
*/

function obterAnaliseSelecionada() {

    if (!analysisData || !coinSelector) {

        return null;

    }


    const selecionada =
        coinSelector.value;


    const lista =
        analysisData.analisePorMoeda ||
        [];


    if (
        selecionada === "all"
    ) {

        return null;

    }


    return (
        lista.find(
            item =>
                item.coinId === selecionada ||
                item.symbol === selecionada
        ) ||
        null
    );

}


/*
============================================================
ATUALIZAR INTERFACE
============================================================
*/

function atualizarInterface() {

    const moeda =
        obterAnaliseSelecionada();


    if (moeda) {

        atualizarMoeda(
            moeda
        );

    } else {

        atualizarVisaoGeral();

    }


    destruirGraficos();


    criarGraficoPrecoSentimento(
        moeda
    );


    criarGraficoDistribuicao(
        moeda
    );


    criarGraficoNarrativaPreco(
        moeda
    );


    criarGraficoNoticiasRetorno(
        moeda
    );


    criarGraficoNarrativaVolatilidade(
        moeda
    );


    criarGraficoDefasagem(
        moeda
    );


    preencherTabelaNarrativas(
        moeda
    );


    preencherDefasagens(
        moeda
    );


    preencherInterpretacao(
        moeda
    );

}


/*
============================================================
ATUALIZAR KPIs DA MOEDA
============================================================
*/

function atualizarMoeda(
    moeda
) {

    const resumo =
        moeda.resumo ||
        moeda.resumoPreco ||
        {};


    const currentPrice =
        resumo.currentPrice ??
        moeda.currentPrice ??
        moeda.price;


    const periodReturn =
        resumo.periodReturn ??
        moeda.periodReturn;


    const newsCount =
        moeda.newsCount ??
        resumo.newsCount ??
        0;


    const averageSentiment =
        moeda.averageSentiment ??
        resumo.averageSentiment ??
        0;


    const volatility =
        moeda.volatility ??
        resumo.volatility ??
        0;


    document.getElementById(
        "currentPrice"
    ).textContent =
        "$ " +
        formatPrice(
            currentPrice
        );


    document.getElementById(
        "priceVariation"
    ).textContent =
        formatPercent(
            periodReturn
        );


    document.getElementById(
        "newsCount"
    ).textContent =
        formatNumber(
            newsCount,
            0
        );


    document.getElementById(
        "averageSentiment"
    ).textContent =
        formatNumber(
            averageSentiment
        );


    document.getElementById(
        "sentimentDescription"
    ).textContent =
        obterDescricaoSentimento(
            averageSentiment
        );


    document.getElementById(
        "volatilityValue"
    ).textContent =
        formatPercent(
            volatility
        );

}


/*
============================================================
VISÃO GERAL
============================================================
*/

function atualizarVisaoGeral() {

    const resumo =
        analysisData.resumoPreco ||
        {};


    const averageSentiment =
        analysisData.sentimentoMedio ??
        resumo.averageSentiment ??
        0;


    document.getElementById(
        "currentPrice"
    ).textContent =
        "Mercado";


    document.getElementById(
        "priceVariation"
    ).textContent =
        "Selecione uma moeda";


    document.getElementById(
        "newsCount"
    ).textContent =
        formatNumber(
            analysisData.totalNoticias ??
            analysisData.totalPosts ??
            0,
            0
        );


    document.getElementById(
        "averageSentiment"
    ).textContent =
        formatNumber(
            averageSentiment
        );


    document.getElementById(
        "sentimentDescription"
    ).textContent =
        obterDescricaoSentimento(
            averageSentiment
        );


    document.getElementById(
        "volatilityValue"
    ).textContent =
        "—";

}


/*
============================================================
DESCRIÇÃO DO SENTIMENTO
============================================================
*/

function obterDescricaoSentimento(
    value
) {

    const numero =
        Number(value);


    if (numero > 20) {

        return "Predominantemente positivo";

    }


    if (numero < -20) {

        return "Predominantemente negativo";

    }


    return "Comportamento próximo do neutro";

}


/*
============================================================
OBTER SÉRIE DA MOEDA
============================================================
*/

function obterSerie(
    moeda
) {

    if (!moeda) {

        return null;

    }


    return (
        moeda.serie ||
        moeda.series ||
        moeda.serieTemporal ||
        null
    );

}


/*
============================================================
GRÁFICO PREÇO × SENTIMENTO
============================================================
*/

function criarGraficoPrecoSentimento(
    moeda
) {

    const canvas =
        document.getElementById(
            "priceSentimentChart"
        );


    if (!canvas) {

        return;

    }


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma criptomoeda para visualizar a relação."
        );

        return;

    }


    const serie =
        obterSerie(
            moeda
        );


    if (
        !serie ||
        !serie.length
    ) {

        mostrarGraficoVazio(
            canvas,
            "Não existem dados temporais suficientes."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.date ||
                    item.data
                )
        );


    const prices =
        serie.map(
            item =>
                Number(
                    item.price ??
                    item.preco ??
                    0
                )
        );


    const sentiment =
        serie.map(
            item =>
                Number(
                    item.sentiment ??
                    item.sentimentScore ??
                    0
                )
        );


    charts.priceSentiment =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {
                            label: "Preço",

                            data: prices,

                            borderColor:
                                COLORS.green,

                            backgroundColor:
                                "rgba(53,211,154,0.08)",

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "price"

                        },

                        {
                            label: "Sentimento",

                            data: sentiment,

                            borderColor:
                                COLORS.blue,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "sentiment"

                        }

                    ]

                },

                options:
                    criarOpcoesGraficoDualAxis()

            }
        );

}


/*
============================================================
GRÁFICO DE DISTRIBUIÇÃO
============================================================
*/

function criarGraficoDistribuicao(
    moeda
) {

    const canvas =
        document.getElementById(
            "sentimentDistributionChart"
        );


    if (!canvas) {

        return;

    }


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma moeda."
        );

        return;

    }


    const distribuicao =
        moeda.distribuicaoSentimento ||
        moeda.sentimentDistribution ||
        {};


    const positivo =
        Number(
            distribuicao.positive ??
            distribuicao.positivo ??
            0
        );


    const neutro =
        Number(
            distribuicao.neutral ??
            distribuicao.neutro ??
            0
        );


    const negativo =
        Number(
            distribuicao.negative ??
            distribuicao.negativo ??
            0
        );


    charts.distribution =
        new Chart(
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
                                positivo,
                                neutro,
                                negativo
                            ],

                            backgroundColor: [
                                COLORS.green,
                                COLORS.neutral,
                                COLORS.red
                            ],

                            borderWidth: 0

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "68%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                padding: 18,

                                usePointStyle: true,

                                boxWidth: 8

                            }

                        }

                    }

                }

            }
        );

}


/*
============================================================
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


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma criptomoeda."
        );

        return;

    }


    const serie =
        obterSerie(
            moeda
        );


    if (
        !serie ||
        !serie.length
    ) {

        mostrarGraficoVazio(
            canvas,
            "Dados narrativos insuficientes."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.date ||
                    item.data
                )
        );


    const prices =
        serie.map(
            item =>
                Number(
                    item.price ??
                    item.preco ??
                    0
                )
        );


    const narrative =
        serie.map(
            item =>
                Number(
                    item.narrativeIntensity ??
                    item.intensidadeNarrativa ??
                    0
                )
        );


    charts.narrativePrice =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label: "Preço",

                            data: prices,

                            borderColor:
                                COLORS.green,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "price"

                        },

                        {

                            label:
                                "Intensidade narrativa",

                            data:
                                narrative,

                            borderColor:
                                COLORS.purple,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "narrative"

                        }

                    ]

                },

                options:
                    criarOpcoesGraficoDualAxis()

            }
        );

}


/*
============================================================
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


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma criptomoeda."
        );

        return;

    }


    const serie =
        obterSerie(
            moeda
        );


    if (
        !serie ||
        !serie.length
    ) {

        mostrarGraficoVazio(
            canvas,
            "Dados insuficientes."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.date ||
                    item.data
                )
        );


    const news =
        serie.map(
            item =>
                Number(
                    item.newsCount ??
                    item.newsVolume ??
                    0
                )
        );


    const returns =
        serie.map(
            item =>
                Number(
                    item.return ??
                    item.retorno ??
                    0
                )
        );


    charts.newsReturn =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            type: "bar",

                            label:
                                "Volume de notícias",

                            data:
                                news,

                            backgroundColor:
                                "rgba(78,168,255,0.45)",

                            borderWidth: 0,

                            yAxisID:
                                "news"

                        },

                        {

                            type: "line",

                            label:
                                "Retorno (%)",

                            data:
                                returns,

                            borderColor:
                                COLORS.yellow,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.2,

                            yAxisID:
                                "return"

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {

                        mode: "index",

                        intersect: false

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            }

                        },

                        news: {

                            position: "left",

                            beginAtZero: true

                        },

                        return: {

                            position: "right",

                            grid: {
                                drawOnChartArea: false
                            }

                        }

                    }

                }

            }
        );

}


/*
============================================================
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


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma criptomoeda."
        );

        return;

    }


    const serie =
        obterSerie(
            moeda
        );


    if (
        !serie ||
        !serie.length
    ) {

        mostrarGraficoVazio(
            canvas,
            "Dados insuficientes."
        );

        return;

    }


    const labels =
        serie.map(
            item =>
                formatarData(
                    item.date ||
                    item.data
                )
        );


    const narrative =
        serie.map(
            item =>
                Number(
                    item.narrativeIntensity ??
                    item.intensidadeNarrativa ??
                    0
                )
        );


    const volatility =
        serie.map(
            item =>
                Number(
                    item.volatility ??
                    item.volatilidade ??
                    Math.abs(
                        Number(
                            item.return ??
                            item.retorno ??
                            0
                        )
                    )
                )
        );


    charts.narrativeVolatility =
        new Chart(
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
                                narrative,

                            borderColor:
                                COLORS.purple,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "narrative"

                        },

                        {

                            label:
                                "Volatilidade",

                            data:
                                volatility,

                            borderColor:
                                COLORS.red,

                            borderWidth: 2,

                            pointRadius: 0,

                            tension: 0.25,

                            yAxisID:
                                "volatility"

                        }

                    ]

                },

                options:
                    criarOpcoesGraficoDualAxis()

            }
        );

}


/*
============================================================
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


    if (!moeda) {

        mostrarGraficoVazio(
            canvas,
            "Selecione uma criptomoeda."
        );

        return;

    }


    const dados =
        moeda.defasagens ||
        moeda.defasagemNarrativa ||
        analysisData.defasagemNarrativa ||
        [];


    if (!Array.isArray(dados)) {

        mostrarGraficoVazio(
            canvas,
            "Dados de defasagem indisponíveis."
        );

        return;

    }


    const labels =
        dados.map(
            item =>
                item.lag ||
                item.defasagem ||
                `${item.days || 0}d`
        );


    const values =
        dados.map(
            item =>
                Number(
                    item.correlation ??
                    item.correlacao ??
                    0
                )
        );


    charts.lag =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Correlação",

                            data:
                                values,

                            backgroundColor:
                                values.map(
                                    value =>
                                        value >= 0
                                            ? "rgba(53,211,154,0.65)"
                                            : "rgba(255,114,114,0.65)"
                                ),

                            borderWidth: 0,

                            borderRadius: 5

                        }

                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    scales: {

                        y: {

                            min: -1,

                            max: 1

                        }

                    },

                    plugins: {

                        legend: {
                            display: false
                        }

                    }

                }

            }
        );

}


/*
============================================================
TABELA DE NARRATIVAS
============================================================
*/

function preencherTabelaNarrativas(
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


    if (!moeda) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    Selecione uma criptomoeda para visualizar
                    as relações entre narrativas e retorno.
                </td>
            </tr>
        `;

        return;

    }


    const dados =
        moeda.relacaoNarrativaPreco ||
        moeda.narrativas ||
        [];


    if (!Array.isArray(dados) || !dados.length) {

        tbody.innerHTML = `
            <tr>
                <td colspan="6">
                    Não existem dados suficientes para esta análise.
                </td>
            </tr>
        `;

        return;

    }


    dados.forEach(
        item => {

            const correlation =
                Number(
                    item.correlation ??
                    item.correlacao ??
                    0
                );


            const tr =
                document.createElement(
                    "tr"
                );


            let classe =
                "correlation-neutral";


            if (correlation > 0.1) {

                classe =
                    "correlation-positive";

            }


            if (correlation < -0.1) {

                classe =
                    "correlation-negative";

            }


            tr.innerHTML = `

                <td>
                    ${item.narrative ||
                    item.nome ||
                    "—"}
                </td>

                <td>
                    ${formatNumber(
                        item.newsCount ??
                        item.quantidade ??
                        0,
                        0
                    )}
                </td>

                <td>
                    ${formatNumber(
                        item.intensity ??
                        item.intensidade ??
                        0
                    )}
                </td>

                <td class="${classe}">
                    ${formatCorrelation(
                        correlation
                    )}
                </td>

                <td class="${classe}">
                    ${obterDirecao(
                        correlation
                    )}
                </td>

                <td>
                    ${item.interpretation ||
                    item.interpretacao ||
                    obterInterpretacaoCorrelacao(
                        correlation
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
DEFASAGENS — TEXTO
============================================================
*/

function preencherDefasagens(
    moeda
) {

    const container =
        document.getElementById(
            "lagAnalysisContainer"
        );


    if (!container) {

        return;

    }


    if (!moeda) {

        container.innerHTML = `
            <div class="empty-analysis">
                Selecione uma criptomoeda para visualizar
                a análise de defasagem.
            </div>
        `;

        return;

    }


    const dados =
        moeda.defasagens ||
        moeda.defasagemNarrativa ||
        [];


    if (
        !Array.isArray(dados) ||
        !dados.length
    ) {

        container.innerHTML = `
            <div class="empty-analysis">
                Não existem dados suficientes de defasagem.
            </div>
        `;

        return;

    }


    container.innerHTML = "";


    dados.forEach(
        item => {

            const correlation =
                Number(
                    item.correlation ??
                    item.correlacao ??
                    0
                );


            const lag =
                item.lag ||
                item.defasagem ||
                `${item.days || 0} dias`;


            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "lag-item";


            element.innerHTML = `

                <div class="lag-title">
                    ${lag}
                </div>

                <div class="lag-value">
                    ${formatCorrelation(
                        correlation
                    )}
                </div>

                <div class="lag-description">
                    ${obterInterpretacaoCorrelacao(
                        correlation
                    )}
                </div>

            `;


            container.appendChild(
                element
            );

        }
    );

}


/*
============================================================
INTERPRETAÇÃO AUTOMÁTICA
============================================================
*/

function preencherInterpretacao(
    moeda
) {

    const elemento =
        document.getElementById(
            "analysisInterpretation"
        );


    if (!elemento) {

        return;

    }


    if (!moeda) {

        elemento.innerHTML = `

            Selecione uma criptomoeda para realizar
            uma análise individual do comportamento do
            preço em relação às narrativas e ao sentimento
            das notícias.

        `;

        return;

    }


    const resumo =
        moeda.resumoPreco ||
        moeda.resumo ||
        {};


    const correlation =
        Number(
            resumo.correlation ??
            resumo.correlacao ??
            moeda.correlation ??
            0
        );


    const sentiment =
        Number(
            moeda.averageSentiment ??
            resumo.averageSentiment ??
            0
        );


    const news =
        Number(
            moeda.newsCount ??
            resumo.newsCount ??
            0
        );


    let texto =
        "";


    if (correlation > 0.3) {

        texto +=
            "Foi observada uma associação positiva entre a intensidade das informações analisadas e o comportamento do preço no período. ";

    } else if (correlation < -0.3) {

        texto +=
            "Foi observada uma associação negativa entre as variáveis analisadas no período. ";

    } else {

        texto +=
            "A relação estatística observada entre as variáveis analisadas foi relativamente fraca no período. ";

    }


    if (sentiment > 20) {

        texto +=
            "O sentimento agregado das notícias apresenta predominância positiva. ";

    } else if (sentiment < -20) {

        texto +=
            "O sentimento agregado das notícias apresenta predominância negativa. ";

    } else {

        texto +=
            "O sentimento agregado das notícias permanece próximo da região neutra. ";

    }


    texto +=
        `A análise utiliza ${formatNumber(
            news,
            0
        )} notícias associadas ao ativo. `;


    texto +=
        "Esses resultados representam associações estatísticas e temporais observadas nos dados e não permitem afirmar, isoladamente, que as narrativas causaram os movimentos de preço.";


    elemento.innerHTML =
        texto;

}


/*
============================================================
INTERPRETAÇÃO DE CORRELAÇÃO
============================================================
*/

function obterInterpretacaoCorrelacao(
    value
) {

    const correlation =
        Number(value);


    const absoluto =
        Math.abs(
            correlation
        );


    if (absoluto < 0.1) {

        return "Associação muito fraca.";

    }


    if (absoluto < 0.3) {

        return "Associação fraca.";

    }


    if (absoluto < 0.5) {

        return "Associação moderada.";

    }


    if (absoluto < 0.7) {

        return "Associação relativamente forte.";

    }


    return "Associação forte.";

}


/*
============================================================
DIREÇÃO
============================================================
*/

function obterDirecao(
    value
) {

    const correlation =
        Number(value);


    if (correlation > 0.1) {

        return "Positiva";

    }


    if (correlation < -0.1) {

        return "Negativa";

    }


    return "Próxima de neutra";

}


/*
============================================================
OPÇÕES DE GRÁFICOS COM DOIS EIXOS
============================================================
*/

function criarOpcoesGraficoDualAxis() {

    return {

        responsive: true,

        maintainAspectRatio: false,

        interaction: {

            mode: "index",

            intersect: false

        },

        plugins: {

            legend: {

                position: "top",

                align: "end",

                labels: {

                    usePointStyle: true,

                    boxWidth: 8,

                    padding: 16

                }

            }

        },

        scales: {

            x: {

                grid: {

                    display: false

                }

            },

            price: {

                position: "left",

                beginAtZero: false,

                grid: {

                    drawOnChartArea: true

                }

            },

            sentiment: {

                position: "right",

                min: -100,

                max: 100,

                grid: {

                    drawOnChartArea: false

                }

            },

            narrative: {

                position: "right",

                grid: {

                    drawOnChartArea: false

                }

            },

            volatility: {

                position: "right",

                grid: {

                    drawOnChartArea: false

                }

            }

        }

    };

}


/*
============================================================
FORMATAR DATA
============================================================
*/

function formatarData(
    value
) {

    if (!value) {

        return "";

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return String(
            value
        );

    }


    return date.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit"
        }
    );

}


/*
============================================================
MOSTRAR GRÁFICO VAZIO
============================================================
*/

function mostrarGraficoVazio(
    canvas,
    message
) {

    if (!canvas) {

        return;

    }


    const context =
        canvas.getContext(
            "2d"
        );


    context.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    context.font =
        "12px Arial";


    context.fillStyle =
        "#647b75";


    context.textAlign =
        "center";


    context.textBaseline =
        "middle";


    context.fillText(
        message,
        canvas.width / 2,
        canvas.height / 2
    );

}


/*
============================================================
ERRO NOS GRÁFICOS
============================================================
*/

function mostrarErroGraficos(
    message
) {

    const elementos =
        document.querySelectorAll(
            "canvas"
        );


    elementos.forEach(
        canvas => {

            mostrarGraficoVazio(
                canvas,
                "Erro ao carregar os dados."
            );

        }
    );


    const elemento =
        document.getElementById(
            "analysisInterpretation"
        );


    if (elemento) {

        elemento.textContent =
            message;

    }

}


/*
============================================================
DESTRUIR GRÁFICOS
============================================================
*/

function destruirGraficos() {

    Object.values(
        charts
    ).forEach(
        chart => {

            if (chart) {

                chart.destroy();

            }

        }
    );


    charts = {};

}


/*
============================================================
EVENTOS
============================================================
*/

if (coinSelector) {

    coinSelector.addEventListener(
        "change",
        () => {

            if (analysisData) {

                atualizarInterface();

            }

        }
    );

}


if (periodSelector) {

    periodSelector.addEventListener(
        "change",
        () => {

            if (analysisData) {

                atualizarInterface();

            }

        }
    );

}


if (refreshButton) {

    refreshButton.addEventListener(
        "click",
        carregarAnalise
    );

}


/*
============================================================
INICIALIZAÇÃO
============================================================
*/

document.addEventListener(
    "DOMContentLoaded",
    () => {

        carregarAnalise();

    }
);
