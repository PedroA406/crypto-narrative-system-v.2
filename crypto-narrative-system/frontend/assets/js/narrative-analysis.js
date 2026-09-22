/* ============================================================
   CRYPTO NARRATIVE SYSTEM
   NARRATIVE INTELLIGENCE 2027
   ============================================================ */


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const API_BASE_URL = "https://crypto-narrative-system.onrender.com";

const ANALYSIS_ENDPOINT =
    `${API_BASE_URL}/market/narratives/analysis`;


/* ============================================================
   ESTADO
   ============================================================ */

const state = {

    data: null,

    charts: {},

    loading: false,

    autoRefresh: false,

    autoRefreshTimer: null,

    animations: true

};


/* ============================================================
   NOMES DAS NARRATIVAS
   ============================================================ */

const NARRATIVE_LABELS = {

    adoption:
        "Adoção",

    general:
        "Geral",

    institutional_investment:
        "Investimento institucional",

    market:
        "Mercado",

    mining:
        "Mineração",

    regulation:
        "Regulação",

    security:
        "Segurança",

    technology:
        "Tecnologia"

};


/* ============================================================
   CORES DAS NARRATIVAS
   ============================================================ */

const NARRATIVE_COLORS = {

    adoption:
        "#54c9e5",

    general:
        "#687589",

    institutional_investment:
        "#a27cff",

    market:
        "#628dff",

    mining:
        "#e9a85c",

    regulation:
        "#e8c267",

    security:
        "#ed6d7d",

    technology:
        "#37d6a0"

};


/* ============================================================
   CORES DE SENTIMENTO
   ============================================================ */

const SENTIMENT_COLORS = {

    positive:
        "#37d6a0",

    neutral:
        "#e8c267",

    negative:
        "#ed6d7d"

};


/* ============================================================
   NOMES DE SENTIMENTO
   ============================================================ */

const SENTIMENT_LABELS = {

    positive:
        "Positivo",

    neutral:
        "Neutro",

    negative:
        "Negativo"

};


/* ============================================================
   UTILITÁRIOS
   ============================================================ */

function getElement(id) {

    return document.getElementById(id);

}


function firstDefined(...values) {

    for (const value of values) {

        if (
            value !== undefined &&
            value !== null
        ) {

            return value;

        }

    }

    return null;

}


function numberValue(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return 0;

    }

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : 0;

}


function percent(value) {

    let number =
        numberValue(value);

    /*
       A API pode retornar:
       0.82
       ou
       82
    */

    if (
        Math.abs(number) <= 1
    ) {

        number *= 100;

    }

    return number;

}


function formatNumber(value) {

    return numberValue(value)
        .toLocaleString(
            "pt-BR",
            {
                maximumFractionDigits: 0
            }
        );

}


function formatDecimal(value, digits = 2) {

    return numberValue(value)
        .toLocaleString(
            "pt-BR",
            {
                minimumFractionDigits: digits,
                maximumFractionDigits: digits
            }
        );

}


function formatPercent(value) {

    return `${formatDecimal(percent(value), 1)}%`;

}


function narrativeLabel(value) {

    if (!value) {

        return "—";

    }

    return NARRATIVE_LABELS[value]
        || String(value)
            .replaceAll("_", " ")
            .replace(
                /\b\w/g,
                letter =>
                    letter.toUpperCase()
            );

}


function sentimentLabel(value) {

    return SENTIMENT_LABELS[value]
        || value
        || "—";

}


function narrativeColor(value) {

    return NARRATIVE_COLORS[value]
        || "#628dff";

}


function formatDate(value) {

    if (!value) {

        return "—";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }

    return date.toLocaleDateString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


function formatDateTime(value) {

    if (!value) {

        return "—";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "—";

    }

    return date.toLocaleString(
        "pt-BR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* ============================================================
   EXTRAÇÃO FLEXÍVEL DE CAMPOS
   ============================================================ */

function getNarrative(item) {

    return firstDefined(
        item.narrativa,
        item.narrative,
        item.narrativeML,
        item.key,
        item.name,
        item._id
    );

}


function getTotal(item) {

    return numberValue(
        firstDefined(
            item.total,
            item.quantidade,
            item.count,
            item.volume,
            item.valor
        )
    );

}


function getPercentage(item) {

    return percent(
        firstDefined(
            item.percentual,
            item.percentage,
            item.percent,
            item.proporcao
        )
    );

}


/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

function normalizeNarratives(list) {

    if (!Array.isArray(list)) {

        return [];

    }

    return list
        .map(item => ({

            key:
                getNarrative(item),

            total:
                getTotal(item),

            percentage:
                getPercentage(item)

        }))
        .filter(item => item.key);

}


function normalizeSentiments(list) {

    if (!Array.isArray(list)) {

        return [];

    }

    return list
        .map(item => ({

            key:
                firstDefined(
                    item.sentimento,
                    item.sentiment,
                    item.key,
                    item.name
                ),

            total:
                getTotal(item),

            percentage:
                getPercentage(item)

        }))
        .filter(item => item.key);

}


/* ============================================================
   API
   ============================================================ */

async function fetchAnalysis() {

    const response =
        await fetch(
            ANALYSIS_ENDPOINT,
            {
                method: "GET",
                headers: {
                    "Accept":
                        "application/json"
                },
                cache: "no-store"
            }
        );

    if (!response.ok) {

        throw new Error(
            `Erro HTTP ${response.status}`
        );

    }

    const json =
        await response.json();

    if (
        json.success === false
    ) {

        throw new Error(
            json.message
            || "A API retornou uma falha."
        );

    }

    return json.data || json;

}


/* ============================================================
   STATUS
   ============================================================ */

function setStatus(
    title,
    detail,
    connected = true
) {

    const status =
        getElement("analysisStatus");

    const detailElement =
        getElement("analysisStatusDetail");

    const dot =
        getElement("analysisStatusDot");

    const systemStatus =
        getElement("systemStatusText");

    if (status) {

        status.textContent =
            title;

    }

    if (detailElement) {

        detailElement.textContent =
            detail;

    }

    if (dot) {

        dot.style.background =
            connected
                ? "var(--green)"
                : "var(--red)";

        dot.style.boxShadow =
            connected
                ? "0 0 10px rgba(55,214,160,.5)"
                : "0 0 10px rgba(237,109,125,.5)";

    }

    if (systemStatus) {

        systemStatus.textContent =
            connected
                ? "Dados disponíveis"
                : "Falha na conexão";

    }

}


/* ============================================================
   KPI
   ============================================================ */

function renderSummary(data) {

    const resumo =
        data.resumo || {};

    const total =
        firstDefined(
            resumo.totalNoticias,
            data.totalNoticias
        );

    const confidence =
        firstDefined(
            resumo.confiancaMedia,
            data.confiancaMedia
        );

    const agreement =
        firstDefined(
            data.concordancia?.percentualConcordancia,
            data.concordancia?.concordancia,
            data.concordancia?.agreement,
            data.concordancia?.percentual
        );

    const latency =
        firstDefined(
            resumo.latenciaMediaHoras,
            data.latenciaColeta?.mediaHoras
        );


    getElement(
        "analysisNewsCount"
    ).textContent =
        formatNumber(total);


    getElement(
        "analysisConfidence"
    ).textContent =
        formatPercent(confidence);


    getElement(
        "analysisAgreement"
    ).textContent =
        formatPercent(agreement);


    getElement(
        "analysisLatency"
    ).textContent =
        `${formatDecimal(latency, 1)}h`;


    const period =
        resumo.periodo || {};


    getElement(
        "periodValue"
    ).textContent =
        `${formatDate(period.inicio)} — ${formatDate(period.fim)}`;


    getElement(
        "narrativeCount"
    ).textContent =
        firstDefined(
            resumo.quantidadeNarrativas,
            data.narrativas?.length,
            "—"
        );


    getElement(
        "generatedAt"
    ).textContent =
        formatDateTime(
            data.geradoEm
        );


    getElement(
        "footerGeneratedAt"
    ).textContent =
        formatDateTime(
            data.geradoEm
        );


    getElement(
        "analysisUpdate"
    ).textContent =
        `Atualizado ${formatDateTime(data.geradoEm)}`;

}


/* ============================================================
   DISTRIBUIÇÃO DE NARRATIVAS
   ============================================================ */

function renderNarrativeDistribution(data) {

    const narratives =
        normalizeNarratives(
            data.narrativas
        );


    const labels =
        narratives.map(
            item =>
                narrativeLabel(item.key)
        );


    const values =
        narratives.map(
            item =>
                item.total
        );


    const colors =
        narratives.map(
            item =>
                narrativeColor(item.key)
        );


    const total =
        values.reduce(
            (sum, value) =>
                sum + value,
            0
        );


    getElement(
        "donutTotal"
    ).textContent =
        formatNumber(total);


    renderChart(
        "narrativeDistributionChart",
        "doughnut",
        {
            labels,
            datasets: [
                {
                    data: values,
                    backgroundColor:
                        colors,
                    borderColor:
                        "#101620",
                    borderWidth:
                        3,
                    hoverOffset:
                        7
                }
            ]
        },
        {
            cutout:
                "74%",
            plugins: {
                legend: {
                    display:
                        false
                }
            }
        }
    );


    const legend =
        getElement(
            "narrativeDistributionLegend"
        );


    legend.innerHTML =
        narratives
            .map(item => {

                return `

                    <div class="legend-item">

                        <span
                            class="legend-color"
                            style="
                                background:${narrativeColor(item.key)}
                            "
                        ></span>

                        <span class="legend-name">
                            ${narrativeLabel(item.key)}
                        </span>

                        <strong class="legend-value">
                            ${formatNumber(item.total)}
                        </strong>

                    </div>

                `;

            })
            .join("");


    renderRanking(
        narratives
    );

}


/* ============================================================
   RANKING
   ============================================================ */

function renderRanking(narratives) {

    const container =
        getElement(
            "narrativeRanking"
        );


    if (!narratives.length) {

        container.innerHTML =
            `<div class="loading-state">
                Nenhuma narrativa disponível.
            </div>`;

        return;

    }


    const sorted =
        [...narratives]
            .sort(
                (a, b) =>
                    b.total - a.total
            );


    const max =
        sorted[0]?.total || 1;


    container.innerHTML =
        sorted
            .map(
                (item, index) => {

                    const width =
                        (item.total / max) * 100;

                    return `

                        <div class="ranking-item">

                            <span class="ranking-position">
                                ${String(index + 1).padStart(2, "0")}
                            </span>

                            <div class="ranking-main">

                                <div class="ranking-name">
                                    ${narrativeLabel(item.key)}
                                </div>

                                <div class="ranking-bar">

                                    <span
                                        style="
                                            width:${width}%;
                                        "
                                    ></span>

                                </div>

                            </div>

                            <strong class="ranking-value">
                                ${formatNumber(item.total)}
                            </strong>

                        </div>

                    `;

                }
            )
            .join("");

}


/* ============================================================
   EVOLUÇÃO TEMPORAL
   ============================================================ */

function renderTemporalEvolution(data) {

    const source =
        Array.isArray(
            data.evolucaoTemporal
        )
            ? data.evolucaoTemporal
            : [];


    if (!source.length) {

        return;

    }


    const periods =
        source.map(
            item =>
                firstDefined(
                    item.periodo,
                    item.mes,
                    item.label,
                    item.data,
                    `${item.ano || ""}-${item.mesNumero || ""}`
                )
        );


    const narrativeKeys =
        Object.keys(
            NARRATIVE_LABELS
        );


    const datasets =
        narrativeKeys.map(
            key => {

                const values =
                    source.map(
                        item => {

                            const narratives =
                                firstDefined(
                                    item.narrativas,
                                    item.narrative,
                                    item.categorias,
                                    {}
                                );


                            if (
                                Array.isArray(
                                    narratives
                                ))
                            {

                                const found =
                                    narratives.find(
                                        element =>
                                            getNarrative(element)
                                            === key
                                    );

                                return found
                                    ? getTotal(found)
                                    : 0;

                            }


                            if (
                                narratives
                                &&
                                typeof narratives === "object"
                            ) {

                                return numberValue(
                                    narratives[key]
                                );

                            }


                            return numberValue(
                                item[key]
                            );

                        }
                    );


                return {

                    label:
                        NARRATIVE_LABELS[key],

                    data:
                        values,

                    borderColor:
                        NARRATIVE_COLORS[key],

                    backgroundColor:
                        "transparent",

                    pointRadius:
                        1.8,

                    pointHoverRadius:
                        5,

                    borderWidth:
                        1.7,

                    tension:
                        .35

                };

            }
        );


    renderChart(
        "narrativeEvolutionChart",
        "line",
        {
            labels:
                periods,
            datasets
        },
        {
            interaction: {
                mode:
                    "index",
                intersect:
                    false
            },
            plugins: {
                legend: {
                    position:
                        "bottom",
                    labels: {
                        color:
                            "#8c97a8",
                        font: {
                            size:
                                9
                        },
                        boxWidth:
                            8,
                        boxHeight:
                            8,
                        padding:
                            15
                    }
                }
            },
            scales: {

                x: {

                    grid: {
                        color:
                            "rgba(255,255,255,.035)"
                    },

                    ticks: {
                        color:
                            "#657184",
                        font: {
                            size:
                                8
                        },
                        maxRotation:
                            0
                    }

                },

                y: {

                    beginAtZero:
                        true,

                    grid: {
                        color:
                            "rgba(255,255,255,.035)"
                    },

                    ticks: {
                        color:
                            "#657184",
                        font: {
                            size:
                                8
                        }
                    }

                }

            }

        }
    );


    const last =
        source[
            source.length - 1
        ];


    getElement(
        "temporalCurrent"
    ).textContent =
        firstDefined(
            last?.periodo,
            last?.mes,
            last?.label,
            "—"
        );


    renderTemporalSummary(
        source
    );

}


/* ============================================================
   RESUMO TEMPORAL
   ============================================================ */

function renderTemporalSummary(source) {

    const container =
        getElement(
            "temporalNarrativeSummary"
        );


    if (!source.length) {

        container.innerHTML =
            "";

        return;

    }


    const latest =
        source[
            source.length - 1
        ];


    const narratives =
        firstDefined(
            latest.narrativas,
            latest.narrative,
            latest.categorias,
            {}
        );


    let values = [];


    if (
        narratives &&
        typeof narratives === "object" &&
        !Array.isArray(narratives)
    ) {

        values =
            Object.entries(
                narratives
            )
            .map(
                ([key, value]) => ({
                    key,
                    total:
                        numberValue(value)
                })
            )
            .filter(
                item =>
                    item.total > 0
            );

    }


    if (!values.length) {

        container.innerHTML =
            "";

        return;

    }


    values.sort(
        (a,b) =>
            b.total - a.total
    );


    const top =
        values.slice(0,3);


    container.innerHTML =
        top
            .map(
                item => `

                    <div class="temporal-summary-item">

                        <span>
                            ${narrativeLabel(item.key)}
                        </span>

                        <strong>
                            ${formatNumber(item.total)}
                        </strong>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   SENTIMENTO
   ============================================================ */

function renderSentiments(data) {

    const sentiments =
        normalizeSentiments(
            data.sentimentos
        );


    const labels =
        sentiments.map(
            item =>
                sentimentLabel(item.key)
        );


    const values =
        sentiments.map(
            item =>
                item.total
        );


    const colors =
        sentiments.map(
            item =>
                SENTIMENT_COLORS[item.key]
                || "#687589"
        );


    renderChart(
        "sentimentDistributionChart",
        "doughnut",
        {
            labels,
            datasets: [
                {
                    data:
                        values,
                    backgroundColor:
                        colors,
                    borderColor:
                        "#101620",
                    borderWidth:
                        3
                }
            ]
        },
        {
            cutout:
                "65%",
            plugins: {
                legend: {
                    position:
                        "bottom",
                    labels: {
                        color:
                            "#8c97a8",
                        font: {
                            size:
                                9
                        },
                        boxWidth:
                            8,
                        padding:
                            14
                    }
                }
            }
        }
    );


    renderSentimentSummary(
        sentiments
    );


    renderNarrativeSentimentMatrix(
        data
    );

}


/* ============================================================
   RESUMO SENTIMENTO
   ============================================================ */

function renderSentimentSummary(
    sentiments
) {

    const container =
        getElement(
            "sentimentSummary"
        );


    container.innerHTML =
        sentiments
            .map(
                item => `

                    <div
                        class="
                            sentiment-item
                            ${item.key}
                        "
                    >

                        <span>
                            ${sentimentLabel(item.key)}
                        </span>

                        <strong>
                            ${formatNumber(item.total)}
                        </strong>

                    </div>

                `
            )
            .join("");

}


/* ============================================================
   MATRIZ NARRATIVA × SENTIMENTO
   ============================================================ */

function renderNarrativeSentimentMatrix(
    data
) {

    const source =
        Array.isArray(
            data.narrativaSentimento
        )
            ? data.narrativaSentimento
            : [];


    const narratives =
        Object.keys(
            NARRATIVE_LABELS
        );


    const sentiments =
        [
            "positive",
            "neutral",
            "negative"
        ];


    const lookup = {};


    source.forEach(item => {

        const narrative =
            firstDefined(
                item.narrativa,
                item.narrative
            );

        const sentiment =
            firstDefined(
                item.sentimento,
                item.sentiment
            );

        if (
            narrative &&
            sentiment
        ) {

            if (
                !lookup[narrative]
            ) {

                lookup[narrative] = {};

            }

            lookup[narrative][sentiment] =
                getTotal(item);

        }

    });


    renderMatrix(
        "narrativeSentimentMatrix",
        narratives,
        sentiments,
        lookup,
        narrativeLabel,
        sentimentLabel
    );

}


/* ============================================================
   MATRIZ NARRATIVA × MOEDA
   ============================================================ */

function renderCoinMatrix(data) {

    const source =
        Array.isArray(
            data.narrativaMoeda
        )
            ? data.narrativaMoeda
            : [];


    const narratives =
        Object.keys(
            NARRATIVE_LABELS
        );


    const coins =
        [
            ...new Set(
                source
                    .map(
                        item =>
                            firstDefined(
                                item.moeda,
                                item.coin,
                                item.ativo
                            )
                    )
                    .filter(Boolean)
            )
        ]
        .sort();


    const lookup = {};


    source.forEach(item => {

        const narrative =
            firstDefined(
                item.narrativa,
                item.narrative
            );

        const coin =
            firstDefined(
                item.moeda,
                item.coin,
                item.ativo
            );


        if (
            narrative &&
            coin
        ) {

            if (
                !lookup[narrative]
            ) {

                lookup[narrative] = {};

            }

            lookup[narrative][coin] =
                getTotal(item);

        }

    });


    renderMatrix(
        "narrativeCoinMatrix",
        narratives,
        coins,
        lookup,
        narrativeLabel,
        value =>
            String(value)
                .toUpperCase()
    );

}


/* ============================================================
   MATRIZ GENÉRICA
   ============================================================ */

function renderMatrix(
    containerId,
    rows,
    columns,
    lookup,
    rowFormatter,
    columnFormatter
) {

    const container =
        getElement(
            containerId
        );


    if (
        !columns.length
    ) {

        container.innerHTML =
            `<div class="loading-state">
                Nenhuma associação disponível.
            </div>`;

        return;

    }


    let html = `

        <table class="matrix-table">

            <thead>

                <tr>

                    <th>
                        NARRATIVA
                    </th>

                    ${columns
                        .map(
                            column =>
                                `<th>
                                    ${columnFormatter(column)}
                                </th>`
                        )
                        .join("")}

                </tr>

            </thead>

            <tbody>

    `;


    rows.forEach(row => {

        html += `

            <tr>

                <td>
                    ${rowFormatter(row)}
                </td>

        `;


        columns.forEach(column => {

            const value =
                numberValue(
                    lookup[row]?.[column]
                );


            html += `

                <td
                    style="
                        background:
                            rgba(
                                98,
                                141,
                                255,
                                ${Math.min(
                                    .15,
                                    value / 1000
                                )}
                            );
                    "
                >

                    <span class="matrix-number">
                        ${formatNumber(value)}
                    </span>

                </td>

            `;

        });


        html += `

            </tr>

        `;

    });


    html += `

            </tbody>

        </table>

    `;


    container.innerHTML =
        html;

}


/* ============================================================
   CONFIANÇA
   ============================================================ */

function renderConfidence(data) {

    const confidence =
        firstDefined(
            data.resumo?.confiancaMedia,
            data.confianca?.media,
            data.confianca?.mediaConfianca
        );


    const minimum =
        firstDefined(
            data.confianca?.min,
            data.confianca?.minima,
            data.confianca?.minConfidence
        );


    const maximum =
        firstDefined(
            data.confianca?.max,
            data.confianca?.maxima,
            data.confianca?.maxConfidence
        );


    const total =
        firstDefined(
            data.confianca?.total,
            data.resumo?.totalNoticias
        );


    const confidencePercent =
        percent(confidence);


    getElement(
        "confidenceRingValue"
    ).textContent =
        `${formatDecimal(confidencePercent,1)}%`;


    getElement(
        "confidenceMin"
    ).textContent =
        formatPercent(minimum);


    getElement(
        "confidenceMax"
    ).textContent =
        formatPercent(maximum);


    getElement(
        "confidenceTotal"
    ).textContent =
        formatNumber(total);


    getElement(
        "analysisConfidence"
    ).textContent =
        formatPercent(confidence);


    const ring =
        getElement(
            "confidenceRing"
        );


    const degrees =
        Math.min(
            360,
            Math.max(
                0,
                confidencePercent * 3.6
            )
        );


    ring.style.background =
        `
            conic-gradient(
                var(--blue)
                0deg
                ${degrees}deg,

                rgba(255,255,255,.05)
                ${degrees}deg
                360deg
            )
        `;


    getElement(
        "confidenceInterpretation"
    ).textContent =
        "A confiança é apresentada como um indicador relativo associado à classificação do modelo. Ela não deve ser interpretada automaticamente como probabilidade calibrada de acerto.";

}


/* ============================================================
   CONCORDÂNCIA
   ============================================================ */

function renderAgreement(data) {

    const agreementData =
        data.concordancia
        || {};


    const agreement =
        firstDefined(
            agreementData.percentualConcordancia,
            agreementData.concordancia,
            agreementData.agreement,
            agreementData.percentual
        );


    const agreementPercent =
        percent(agreement);


    const agreementCount =
        firstDefined(
            agreementData.concordantes,
            agreementData.agreementCount,
            agreementData.quantidadeConcordantes
        );


    const divergenceCount =
        firstDefined(
            agreementData.divergentes,
            agreementData.divergenceCount,
            agreementData.quantidadeDivergentes
        );


    getElement(
        "agreementValue"
    ).textContent =
        formatPercent(
            agreementPercent
        );


    getElement(
        "analysisAgreement"
    ).textContent =
        formatPercent(
            agreementPercent
        );


    getElement(
        "agreementCount"
    ).textContent =
        formatNumber(
            agreementCount
        );


    getElement(
        "divergenceCount"
    ).textContent =
        formatNumber(
            divergenceCount
        );


    getElement(
        "agreementBar"
    ).style.width =
        `${Math.min(
            100,
            Math.max(
                0,
                agreementPercent
            )
        )}%`;

}


/* ============================================================
   LATÊNCIA
   ============================================================ */

function renderLatency(data) {

    const summary =
        data.resumo
        || {};


    const latency =
        data.latenciaColeta
        || {};


    const minutes =
        firstDefined(
            summary.latenciaMediaMinutos,
            latency.mediaMinutos
        );


    const hours =
        firstDefined(
            summary.latenciaMediaHoras,
            latency.mediaHoras
        );


    const days =
        firstDefined(
            summary.latenciaMediaDias,
            latency.mediaDias
        );


    getElement(
        "latencyMinutes"
    ).textContent =
        formatDecimal(
            minutes,
            1
        );


    getElement(
        "latencyHours"
    ).textContent =
        formatDecimal(
            hours,
            2
        );


    getElement(
        "latencyDays"
    ).textContent =
        formatDecimal(
            days,
            2
        );


    getElement(
        "analysisLatency"
    ).textContent =
        `${formatDecimal(hours,1)}h`;

}


/* ============================================================
   CHART.JS
   ============================================================ */

function renderChart(
    canvasId,
    type,
    data,
    options = {}
) {

    const canvas =
        getElement(
            canvasId
        );


    if (!canvas) {

        return;

    }


    if (
        state.charts[canvasId]
    ) {

        state.charts[
            canvasId
        ].destroy();

    }


    const baseOptions = {

        responsive:
            true,

        maintainAspectRatio:
            false,

        animation:
            state.animations
                ? {
                    duration:
                        700
                }
                : false,

        plugins: {

            tooltip: {

                backgroundColor:
                    "#101620",

                borderColor:
                    "rgba(255,255,255,.1)",

                borderWidth:
                    1,

                titleColor:
                    "#f2f5fa",

                bodyColor:
                    "#a8b2c1",

                padding:
                    10,

                titleFont: {
                    size:
                        10
                },

                bodyFont: {
                    size:
                        9
                }

            },

            legend: {
                display:
                    false
            }

        }

    };


    const merged =
        mergeObjects(
            baseOptions,
            options
        );


    state.charts[
        canvasId
    ] =
        new Chart(
            canvas.getContext("2d"),
            {
                type,
                data,
                options:
                    merged
            }
        );

}


/* ============================================================
   MERGE
   ============================================================ */

function mergeObjects(
    target,
    source
) {

    const output = {
        ...target
    };


    Object.keys(source)
        .forEach(key => {

            if (
                source[key]
                &&
                typeof source[key] === "object"
                &&
                !Array.isArray(
                    source[key]
                )
            ) {

                output[key] =
                    mergeObjects(
                        target[key]
                        || {},
                        source[key]
                    );

            } else {

                output[key] =
                    source[key];

            }

        });


    return output;

}


/* ============================================================
   REFRESH
   ============================================================ */

async function refreshNarrativeAnalysis() {

    if (state.loading) {

        return;

    }


    state.loading =
        true;


    const button =
        getElement(
            "refreshButton"
        );


    if (button) {

        button.disabled =
            true;

    }


    setStatus(
        "Atualizando inteligência",
        "Consultando dados reais do núcleo analítico...",
        true
    );


    try {

        const data =
            await fetchAnalysis();


        state.data =
            data;


        renderSummary(
            data
        );


        renderNarrativeDistribution(
            data
        );


        renderTemporalEvolution(
            data
        );


        renderSentiments(
            data
        );


        renderCoinMatrix(
            data
        );


        renderConfidence(
            data
        );


        renderAgreement(
            data
        );


        renderLatency(
            data
        );


        setStatus(
            "Sistema operacional",
            "Análise carregada a partir da API.",
            true
        );


    } catch (error) {

        console.error(
            "ERRO NA ANÁLISE:",
            error
        );


        setStatus(
            "Falha na análise",
            error.message
                || "Não foi possível consultar a API.",
            false
        );


    } finally {

        state.loading =
            false;


        if (button) {

            button.disabled =
                false;

        }

    }

}


/* ============================================================
   AUTO REFRESH
   ============================================================ */

function configureAutoRefresh(
    enabled
) {

    state.autoRefresh =
        enabled;


    if (
        state.autoRefreshTimer
    ) {

        clearInterval(
            state.autoRefreshTimer
        );

        state.autoRefreshTimer =
            null;

    }


    if (enabled) {

        state.autoRefreshTimer =
            setInterval(
                () => {

                    refreshNarrativeAnalysis();

                },
                120000
            );

    }

}


/* ============================================================
   SIDEBAR
   ============================================================ */

function configureSidebar() {

    const sidebar =
        getElement(
            "sidebar"
        );

    const overlay =
        getElement(
            "sidebarOverlay"
        );

    const mobileButton =
        getElement(
            "mobileMenuButton"
        );


    if (mobileButton) {

        mobileButton.addEventListener(
            "click",
            () => {

                sidebar.classList.add(
                    "open"
                );

                overlay.classList.add(
                    "open"
                );

            }
        );

    }


    overlay.addEventListener(
        "click",
        closeSidebar
    );


    document
        .querySelectorAll(
            ".nav-item[data-scroll]"
        )
        .forEach(
            item => {

                item.addEventListener(
                    "click",
                    () => {

                        const target =
                            item.dataset.scroll;

                        const element =
                            getElement(
                                target
                            );


                        if (element) {

                            element.scrollIntoView(
                                {
                                    behavior:
                                        "smooth",
                                    block:
                                        "start"
                                }
                            );

                        }


                        document
                            .querySelectorAll(
                                ".nav-item"
                            )
                            .forEach(
                                nav =>
                                    nav.classList.remove(
                                        "active"
                                    )
                            );


                        item.classList.add(
                            "active"
                        );


                        closeSidebar();

                    }
                );

            }
        );

}


function closeSidebar() {

    getElement(
        "sidebar"
    ).classList.remove(
        "open"
    );


    getElement(
        "sidebarOverlay"
    ).classList.remove(
        "open"
    );

}


/* ============================================================
   MODAIS
   ============================================================ */

function openModal(id) {

    const modal =
        getElement(id);


    if (modal) {

        modal.classList.add(
            "open"
        );

    }

}


function closeModal(id) {

    const modal =
        getElement(id);


    if (modal) {

        modal.classList.remove(
            "open"
        );

    }

}


function configureModals() {

    getElement(
        "profileButton"
    ).addEventListener(
        "click",
        () => {

            openModal(
                "profileModal"
            );

        }
    );


    getElement(
        "settingsButton"
    ).addEventListener(
        "click",
        () => {

            openModal(
                "settingsModal"
            );

        }
    );


    document
        .querySelectorAll(
            "[data-close-modal]"
        )
        .forEach(
            button => {

                button.addEventListener(
                    "click",
                    () => {

                        closeModal(
                            button.dataset.closeModal
                        );

                    }
                );

            }
        );


    document
        .querySelectorAll(
            ".modal"
        )
        .forEach(
            modal => {

                modal.addEventListener(
                    "click",
                    event => {

                        if (
                            event.target === modal
                        ) {

                            modal.classList.remove(
                                "open"
                            );

                        }

                    }
                );

            }
        );

}


/* ============================================================
   CONFIGURAÇÕES
   ============================================================ */

function configureSettings() {

    const autoRefresh =
        getElement(
            "autoRefreshToggle"
        );


    const animation =
        getElement(
            "animationToggle"
        );


    if (autoRefresh) {

        autoRefresh.addEventListener(
            "change",
            event => {

                configureAutoRefresh(
                    event.target.checked
                );

            }
        );

    }


    if (animation) {

        animation.addEventListener(
            "change",
            event => {

                state.animations =
                    event.target.checked;

            }
        );

    }

}


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        configureSidebar();

        configureModals();

        configureSettings();

        refreshNarrativeAnalysis();

    }
);
