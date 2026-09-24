/* ============================================================
   CRYPTO NARRATIVE SYSTEM
   NARRATIVE × PRICE
   ============================================================ */


const API_BASE_URL =
    window.API_BASE_URL ||
    "ttps://crypto-narrative-system.onrender.com";


let selectedPeriod =
    "30d";


let selectedAsset =
    "ALL";


let analysisData =
    null;


let scatterChart =
    null;


let timelineChart =
    null;


/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */

document.addEventListener(
    "DOMContentLoaded",
    initializeNarrativePrice
);


async function initializeNarrativePrice() {

    await loadAssets();

    await loadNarrativePriceAnalysis();

}


/* ============================================================
   CARREGAR ATIVOS
   ============================================================ */

async function loadAssets() {

    const selector =
        document.getElementById(
            "assetSelector"
        );


    if (!selector) {
        return;
    }


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/market/coins`,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const coins =
            await response.json();


        coins.forEach(
            coin => {

                const option =
                    document.createElement(
                        "option"
                    );


                option.value =
                    coin.coinId ||
                    coin.id;


                option.textContent =
                    `${coin.name} (${String(
                        coin.symbol || ""
                    ).toUpperCase()})`;


                selector.appendChild(
                    option
                );

            }
        );


    } catch (error) {

        console.error(
            "ERRO AO CARREGAR ATIVOS:",
            error
        );

    }

}


/* ============================================================
   CARREGAR ANÁLISE
   ============================================================ */

async function loadNarrativePriceAnalysis() {

    const status =
        document.getElementById(
            "priceAnalysisStatus"
        );


    if (status) {

        status.textContent =
            "Calculando relação entre narrativas e preços...";

    }


    try {

        const url =
            `${API_BASE_URL}/market/narrative-price` +
            `?period=${encodeURIComponent(
                selectedPeriod
            )}` +
            `&asset=${encodeURIComponent(
                selectedAsset
            )}`;


        const response =
            await fetch(
                url,
                {
                    cache:
                        "no-store"
                }
            );


        if (!response.ok) {

            const errorData =
                await response.json()
                    .catch(
                        () => ({})
                    );


            throw new Error(
                errorData.error ||
                `HTTP ${response.status}`
            );

        }


        analysisData =
            await response.json();


        renderAnalysis();


        if (status) {

            status.textContent =
                `Análise atualizada em ${formatDateTime(
                    analysisData.generatedAt
                )}.`;

        }


    } catch (error) {

        console.error(
            "ERRO AO CARREGAR NARRATIVE × PRICE:",
            error
        );


        if (status) {

            status.textContent =
                `Não foi possível carregar a análise: ${error.message}`;

        }

    }

}


/* ============================================================
   PERÍODO
   ============================================================ */

function changePricePeriod(
    period
) {

    if (
        ![
            "7d",
            "30d",
            "60d"
        ].includes(period)
    ) {

        return;

    }


    selectedPeriod =
        period;


    document
        .querySelectorAll(
            ".analysis-period-btn"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.period ===
                    period
                );

            }
        );


    loadNarrativePriceAnalysis();

}


/* ============================================================
   ATIVO
   ============================================================ */

function changePriceAsset(
    asset
) {

    selectedAsset =
        asset ||
        "ALL";


    loadNarrativePriceAnalysis();

}


/* ============================================================
   ATUALIZAR
   ============================================================ */

function refreshNarrativePrice() {

    loadNarrativePriceAnalysis();

}


/* ============================================================
   RENDER GERAL
   ============================================================ */

function renderAnalysis() {

    if (!analysisData) {
        return;
    }


    renderKPIs();

    renderScatterChart();

    renderTimelineChart();

    renderNarrativeTable();

    renderAssetCards();

    renderInterpretation();

}


/* ============================================================
   KPIS
   ============================================================ */

function renderKPIs() {

    const summary =
        analysisData.summary ||
        {};


    setText(
        "kpiAssets",
        summary.assets ??
        "—"
    );


    setText(
        "kpiNews",
        formatNumber(
            summary.news
        )
    );


    setText(
        "kpiNarrative",
        summary.dominantNarrative ||
        "—"
    );


    setText(
        "kpiCorrelation",
        formatCorrelation(
            summary.overallCorrelation
        )
    );


    setText(
        "kpiCorrelationLabel",
        summary.overallCorrelationLabel ||
        "Pearson"
    );

}


/* ============================================================
   SCATTER
   ============================================================ */

function renderScatterChart() {

    const canvas =
        document.getElementById(
            "narrativePriceScatter"
        );


    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    if (scatterChart) {

        scatterChart.destroy();

        scatterChart =
            null;

    }


    const relations =
        (
            analysisData.correlations ||
            []
        )
        .filter(
            item =>
                Number.isFinite(
                    Number(
                        item.averageNarrativeScore
                    )
                ) &&
                Number.isFinite(
                    Number(
                        item.averageReturn
                    )
                )
        );


    const points =
        relations.map(
            item => ({

                x:
                    Number(
                        item.averageNarrativeScore
                    ),

                y:
                    Number(
                        item.averageReturn
                    ),

                asset:
                    item.assetName,

                symbol:
                    item.symbol,

                narrative:
                    item.narrativeLabel,

                correlation:
                    item.correlation

            })
        );


    scatterChart =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "scatter",

                data: {

                    datasets: [

                        {

                            label:
                                "Narrativas × Preço",

                            data:
                                points,

                            pointRadius:
                                7,

                            pointHoverRadius:
                                9,

                            backgroundColor:
                                "#43d9b0",

                            borderColor:
                                "#43d9b0",

                            borderWidth:
                                1

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    plugins: {

                        legend: {

                            display:
                                false

                        },


                        tooltip: {

                            callbacks: {

                                label:
                                    function(
                                        context
                                    ) {

                                        const point =
                                            context.raw;


                                        return [

                                            `${point.asset} (${point.symbol})`,

                                            `Narrativa: ${point.narrative}`,

                                            `Força média: ${formatSigned(point.x)}`,

                                            `Retorno médio: ${formatPercent(point.y)}`,

                                            `Correlação: ${formatCorrelation(point.correlation)}`

                                        ];

                                    }

                            }

                        }

                    },


                    scales: {

                        x: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Intensidade narrativa média"

                            }

                        },


                        y: {

                            title: {

                                display:
                                    true,

                                text:
                                    "Retorno médio (%)"

                            }

                        }

                    }

                }

            }
        );

}


/* ============================================================
   TIMELINE
   ============================================================ */

function renderTimelineChart() {

    const canvas =
        document.getElementById(
            "narrativeTimelineChart"
        );


    if (
        !canvas ||
        typeof Chart ===
        "undefined"
    ) {

        return;

    }


    if (timelineChart) {

        timelineChart.destroy();

        timelineChart =
            null;

    }


    const timeline =
        analysisData.timeline ||
        [];


    const labels =
        timeline.map(
            item =>
                item.label
        );


    const narrative =
        timeline.map(
            item =>
                Number(
                    item.narrativeScore
                ) || 0
        );


    const returns =
        timeline.map(
            item =>
                Number(
                    item.marketReturn
                ) || 0
        );


    timelineChart =
        new Chart(
            canvas.getContext(
                "2d"
            ),
            {

                type:
                    "line",

                data: {

                    labels,

                    datasets: [

                        {

                            label:
                                "Pressão narrativa",

                            data:
                                narrative,

                            borderWidth:
                                2,

                            pointRadius:
                                2,

                            tension:
                                0.3

                        },


                        {

                            label:
                                "Retorno médio (%)",

                            data:
                                returns,

                            borderWidth:
                                2,

                            pointRadius:
                                2,

                            tension:
                                0.3

                        }

                    ]

                },


                options: {

                    responsive:
                        true,

                    maintainAspectRatio:
                        false,


                    interaction: {

                        mode:
                            "index",

                        intersect:
                            false

                    },


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


/* ============================================================
   TABELA
   ============================================================ */

function renderNarrativeTable() {

    const container =
        document.getElementById(
            "narrativeTable"
        );


    if (!container) {
        return;
    }


    const narratives =
        analysisData.narratives ||
        [];


    if (!narratives.length) {

        container.innerHTML = `
            <div class="empty-analysis">
                Não existem dados suficientes
                para o período selecionado.
            </div>
        `;

        return;

    }


    let html = `

        <table class="price-analysis-table">

            <thead>

                <tr>

                    <th>
                        NARRATIVA
                    </th>

                    <th>
                        NOTÍCIAS
                    </th>

                    <th>
                        CORRELAÇÃO
                    </th>

                    <th>
                        DIA SEGUINTE
                    </th>

                    <th>
                        RETORNO MÉDIO
                    </th>

                </tr>

            </thead>

            <tbody>

    `;


    narratives.forEach(
        item => {

            html += `

                <tr>

                    <td>
                        <strong>
                            ${escapeHtml(
                                item.narrativeLabel
                            )}
                        </strong>
                    </td>

                    <td>
                        ${formatNumber(
                            item.news
                        )}
                    </td>

                    <td class="${getCorrelationClass(
                        item.averageCorrelation
                    )}">

                        ${formatCorrelation(
                            item.averageCorrelation
                        )}

                    </td>

                    <td class="${getCorrelationClass(
                        item.averageNextDayCorrelation
                    )}">

                        ${formatCorrelation(
                            item.averageNextDayCorrelation
                        )}

                    </td>

                    <td>

                        ${formatPercent(
                            item.averageReturn
                        )}

                    </td>

                </tr>

            `;

        }
    );


    html += `

            </tbody>

        </table>

    `;


    container.innerHTML =
        html;

}


/* ============================================================
   CARDS DOS ATIVOS
   ============================================================ */

function renderAssetCards() {

    const container =
        document.getElementById(
            "assetAnalysisGrid"
        );


    if (!container) {
        return;
    }


    const assets =
        analysisData.assets ||
        [];


    if (!assets.length) {

        container.innerHTML = `
            <div class="empty-analysis">
                Não existem ativos disponíveis.
            </div>
        `;

        return;

    }


    container.innerHTML =
        assets.map(
            asset => `

                <article class="asset-analysis-card">

                    <div class="asset-analysis-card-header">

                        <div>

                            <div class="asset-name">
                                ${escapeHtml(
                                    asset.name ||
                                    "Ativo"
                                )}
                            </div>

                            <div class="asset-symbol">
                                ${escapeHtml(
                                    asset.symbol ||
                                    ""
                                )}
                            </div>

                        </div>

                    </div>


                    <div class="asset-stat">

                        <span>
                            Notícias
                        </span>

                        <strong>
                            ${formatNumber(
                                asset.news
                            )}
                        </strong>

                    </div>


                    <div class="asset-stat">

                        <span>
                            Narrativas
                        </span>

                        <strong>
                            ${asset.narratives ?? "—"}
                        </strong>

                    </div>


                    <div class="asset-stat">

                        <span>
                            Correlação média
                        </span>

                        <strong class="${getCorrelationClass(
                            asset.averageCorrelation
                        )}">

                            ${formatCorrelation(
                                asset.averageCorrelation
                            )}

                        </strong>

                    </div>


                    <div class="asset-stat">

                        <span>
                            Variação do período
                        </span>

                        <strong>

                            ${formatPercent(
                                asset.priceChange
                            )}

                        </strong>

                    </div>

                </article>

            `
        )
        .join("");

}


/* ============================================================
   INTERPRETAÇÃO
   ============================================================ */

function renderInterpretation() {

    const container =
        document.getElementById(
            "analysisInterpretation"
        );


    if (!container) {
        return;
    }


    const summary =
        analysisData.summary ||
        {};


    const narratives =
        analysisData.narratives ||
        [];


    if (!narratives.length) {

        container.innerHTML = `

            <div class="interpretation-card">

                <strong>
                    Dados insuficientes
                </strong>

                <p>
                    O período selecionado ainda não possui
                    observações suficientes para produzir
                    uma leitura estatística consistente.
                </p>

            </div>

        `;

        return;

    }


    const dominant =
        narratives[0];


    const correlation =
        summary.overallCorrelation;


    container.innerHTML = `

        <div class="interpretation-card">

            <strong>
                Narrativa mais presente
            </strong>

            <p>

                A narrativa com maior volume de notícias
                no período foi
                <strong>
                    ${escapeHtml(
                        dominant.narrativeLabel
                    )}
                </strong>.

            </p>

        </div>


        <div class="interpretation-card">

            <strong>
                Relação observada
            </strong>

            <p>

                A associação média calculada entre intensidade
                narrativa e retorno dos ativos foi

                <strong>
                    ${formatCorrelation(
                        correlation
                    )}
                </strong>.

                ${escapeHtml(
                    summary.overallCorrelationLabel ||
                    "Não foi possível classificar."
                )}

            </p>

        </div>


        <div class="interpretation-card">

            <strong>
                Importante
            </strong>

            <p>

                Uma correlação estatística não demonstra que
                uma narrativa provocou determinado movimento
                de preço. O indicador mostra apenas uma
                associação observada nos dados analisados.

            </p>

        </div>

    `;

}


/* ============================================================
   FUNÇÕES AUXILIARES
   ============================================================ */

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


function formatNumber(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }


    return new Intl.NumberFormat(
        "pt-BR"
    ).format(
        number
    );

}


function formatSigned(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }


    return (
        number >= 0
            ? "+"
            : ""
    ) +
    number.toFixed(2);

}


function formatPercent(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }


    return (
        number >= 0
            ? "+"
            : ""
    ) +
    number.toFixed(2) +
    "%";

}


function formatCorrelation(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }


    return (
        number >= 0
            ? "+"
            : ""
    ) +
    number.toFixed(2);

}


function getCorrelationClass(
    value
) {

    const number =
        Number(value);


    if (
        !Number.isFinite(
            number
        )
    ) {

        return "correlation-neutral";

    }


    if (
        number > 0.2
    ) {

        return "correlation-positive";

    }


    if (
        number < -0.2
    ) {

        return "correlation-negative";

    }


    return "correlation-neutral";

}


function formatDateTime(
    value
) {

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


    return new Intl.DateTimeFormat(
        "pt-BR",
        {

            dateStyle:
                "short",

            timeStyle:
                "medium"

        }
    ).format(
        date
    );

}


function escapeHtml(
    value
) {

    return String(
        value ??
        ""
    )
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
