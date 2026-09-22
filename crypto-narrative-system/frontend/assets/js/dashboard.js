/* ================================================================
   CRYPTO NARRATIVE SYSTEM
   DASHBOARD — CNS CORE 2.0
   ================================================================ */


/* ================================================================
   CONFIGURAÇÃO
   ================================================================ */

const API_BASE_URL = "https://crypto-narrative-system.onrender.com";

const REFRESH_COINS = 30000;
const REFRESH_NEWS = 20000;

let coinsData = [];
let newsData = [];

let sentimentChart = null;
let coinChart = null;

let currentCoinId = null;

let newsRefreshTimer = null;
let coinsRefreshTimer = null;

let toastTimer = null;


/* ================================================================
   UTILITÁRIOS
   ================================================================ */

function escapeHtml(value) {

    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function normalizeArray(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.data)) {
        return data.data;
    }

    if (data && Array.isArray(data.coins)) {
        return data.coins;
    }

    if (data && Array.isArray(data.news)) {
        return data.news;
    }

    return [];
}


function formatCurrency(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    if (Math.abs(number) >= 1) {

        return new Intl.NumberFormat(
            "en-US",
            {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: number >= 1000 ? 0 : 2
            }
        ).format(number);

    }


    return new Intl.NumberFormat(
        "en-US",
        {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 2,
            maximumFractionDigits: 8
        }
    ).format(number);
}


function formatCompactNumber(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    if (Math.abs(number) >= 1e12) {
        return `$${(number / 1e12).toFixed(2)}T`;
    }

    if (Math.abs(number) >= 1e9) {
        return `$${(number / 1e9).toFixed(2)}B`;
    }

    if (Math.abs(number) >= 1e6) {
        return `$${(number / 1e6).toFixed(2)}M`;
    }

    if (Math.abs(number) >= 1e3) {
        return `$${(number / 1e3).toFixed(2)}K`;
    }

    return formatCurrency(number);
}


function formatPercentage(value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "—";
    }

    const prefix = number > 0 ? "+" : "";

    return `${prefix}${number.toFixed(2)}%`;
}


function formatDate(value) {

    if (!value) {
        return "Data indisponível";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Data indisponível";
    }

    return new Intl.DateTimeFormat(
        "pt-BR",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    ).format(date);
}


function formatRelativeDate(value) {

    if (!value) {
        return "";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const now = Date.now();

    const difference = now - date.getTime();

    const minutes = Math.floor(
        difference / 60000
    );

    if (minutes < 1) {
        return "agora";
    }

    if (minutes < 60) {
        return `há ${minutes} min`;
    }

    const hours = Math.floor(
        minutes / 60
    );

    if (hours < 24) {
        return `há ${hours}h`;
    }

    const days = Math.floor(
        hours / 24
    );

    if (days < 7) {
        return `há ${days}d`;
    }

    return formatDate(value);
}


function getVariationClass(value) {

    const number = Number(value);

    if (number > 0) {
        return "positive";
    }

    if (number < 0) {
        return "negative";
    }

    return "neutral";
}


function getInitials(name) {

    if (!name) {
        return "?";
    }

    return String(name)
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part => part.charAt(0)
        )
        .join("")
        .toUpperCase();
}


function getCoinId(coin) {

    return (
        coin?.coinId ||
        coin?.id ||
        coin?.symbol ||
        ""
    );
}


function getCoinSymbol(coin) {

    return (
        coin?.symbol ||
        ""
    ).toString().toUpperCase();
}


async function fetchJson(url) {

    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });


    if (!response.ok) {

        throw new Error(
            `HTTP ${response.status}`
        );

    }


    return response.json();
}


/* ================================================================
   TOAST
   ================================================================ */

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "dashboardToast"
        );

    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast || !toastMessage) {
        return;
    }


    toast.classList.remove(
        "error",
        "warning",
        "show"
    );


    if (type === "error") {
        toast.classList.add("error");
    }

    if (type === "warning") {
        toast.classList.add("warning");
    }


    toastMessage.textContent = message;

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });


    clearTimeout(toastTimer);


    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 3500);
}


/* ================================================================
   ESTADO
   ================================================================ */

function setEngineStatus(
    status,
    title,
    message
) {

    const statusElement =
        document.getElementById(
            "engineStatus"
        );

    const titleElement =
        document.getElementById(
            "heroStatusTitle"
        );

    const textElement =
        document.getElementById(
            "heroStatusText"
        );


    if (statusElement) {

        statusElement.textContent =
            status;

    }


    if (titleElement) {

        titleElement.textContent =
            title;

    }


    if (textElement) {

        textElement.textContent =
            message;

    }
}


function updateLastUpdate() {

    const element =
        document.getElementById(
            "lastUpdate"
        );


    if (!element) {
        return;
    }


    element.textContent =
        `Atualizado às ${new Intl.DateTimeFormat(
            "pt-BR",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        ).format(new Date())}`;
}


/* ================================================================
   COINS
   ================================================================ */

async function loadCoins() {

    const container =
        document.getElementById(
            "coinsContainer"
        );


    if (!container) {
        return;
    }


    setAssetStatus(
        "Sincronizando"
    );


    try {

        const response =
            await fetchJson(
                `${API_BASE_URL}/market/coins`
            );


        const coins =
            normalizeArray(response);


        coinsData = coins;


        if (!coins.length) {

            renderEmptyState(
                container,
                "Nenhum ativo disponível",
                "A API não retornou ativos para o Dashboard."
            );

            updateMarketMetrics([]);

            setAssetStatus(
                "Sem dados"
            );

            return;
        }


        renderCoins(coins);

        updateMarketMetrics(coins);

        renderVariationList(coins);

        renderSentiment(coins);


        setAssetStatus(
            `${coins.length} ativos`
        );


        updateLastUpdate();


        setEngineStatus(
            "ONLINE",
            "Monitoramento ativo",
            `${coins.length} ativos disponíveis no mecanismo de mercado.`
        );


    } catch (error) {

        console.error(
            "Erro ao carregar ativos:",
            error
        );


        renderErrorState(
            container,
            "Não foi possível carregar os ativos.",
            "Verifique a disponibilidade da API de mercado."
        );


        setAssetStatus(
            "Erro de conexão"
        );


        setEngineStatus(
            "OFFLINE",
            "Dados indisponíveis",
            "Não foi possível consultar o mecanismo de mercado."
        );


        showToast(
            "Não foi possível carregar os ativos.",
            "error"
        );

    }
}


/* ================================================================
   RENDER COINS
   ================================================================ */

function renderCoins(coins) {

    const container =
        document.getElementById(
            "coinsContainer"
        );


    if (!container) {
        return;
    }


    container.innerHTML =
        coins.map(
            (coin, index) =>
                renderCoinCard(
                    coin,
                    index
                )
        ).join("");
}


function renderCoinCard(
    coin,
    index
) {

    const name =
        coin?.name ||
        "Ativo";


    const symbol =
        getCoinSymbol(coin);


    const id =
        getCoinId(coin);


    const price =
        formatCurrency(
            coin?.price
        );


    const change =
        Number(
            coin?.change24h
        );


    const marketCap =
        formatCompactNumber(
            coin?.marketCap
        );


    const volume =
        formatCompactNumber(
            coin?.volume
        );


    const changeClass =
        getVariationClass(
            change
        );


    const image =
        coin?.image ||
        "";


    const initials =
        getInitials(name);


    const safeId =
        encodeURIComponent(id);


    return `

        <article class="coin-card">

            <div class="coin-card-header">

                <div class="coin-identity">

                    <div class="coin-logo">

                        ${
                            image
                                ? `
                                    <img
                                        src="${escapeHtml(image)}"
                                        alt="${escapeHtml(name)}"
                                        loading="lazy"
                                        onerror="this.style.display='none'; this.nextElementSibling.style.display='grid';"
                                    >

                                    <span
                                        class="coin-logo-fallback"
                                        style="display:none;"
                                    >
                                        ${escapeHtml(initials)}
                                    </span>
                                `
                                : `
                                    <span class="coin-logo-fallback">
                                        ${escapeHtml(initials)}
                                    </span>
                                `
                        }

                    </div>


                    <div class="coin-name-wrap">

                        <span class="coin-name">
                            ${escapeHtml(name)}
                        </span>

                        <span class="coin-symbol">
                            ${escapeHtml(symbol)}
                        </span>

                    </div>

                </div>


                <span class="coin-rank">
                    #${index + 1}
                </span>

            </div>


            <div class="coin-price">
                ${escapeHtml(price)}
            </div>


            <div class="coin-change ${changeClass}">
                ${escapeHtml(formatPercentage(change))}
            </div>


            <div class="coin-details">


                <div class="coin-detail">

                    <span class="coin-detail-label">
                        Market Cap
                    </span>

                    <span class="coin-detail-value">
                        ${escapeHtml(marketCap)}
                    </span>

                </div>


                <div class="coin-detail">

                    <span class="coin-detail-label">
                        Volume
                    </span>

                    <span class="coin-detail-value">
                        ${escapeHtml(volume)}
                    </span>

                </div>


            </div>


            <button
                class="coin-chart-button"
                type="button"
                onclick="openCoinChart('${safeId}')"
            >

                <svg viewBox="0 0 24 24">

                    <path d="M4 19V5" />

                    <path d="M4 19H20" />

                    <path d="M7 15L11 11L14 13L20 6" />

                </svg>

                Ver gráfico

            </button>

        </article>

    `;
}


/* ================================================================
   MARKET METRICS
   ================================================================ */

function updateMarketMetrics(coins) {

    const totalCoins =
        document.getElementById(
            "totalCoins"
        );


    const totalMarketCap =
        document.getElementById(
            "totalMarketCap"
        );


    const totalVolume =
        document.getElementById(
            "totalVolume"
        );


    const averageVariation =
        document.getElementById(
            "averageVariation"
        );


    if (!coins.length) {

        if (totalCoins) {
            totalCoins.textContent = "0";
        }

        if (totalMarketCap) {
            totalMarketCap.textContent = "—";
        }

        if (totalVolume) {
            totalVolume.textContent = "—";
        }

        if (averageVariation) {
            averageVariation.textContent = "—";
        }

        return;
    }


    const marketCap =
        coins.reduce(
            (total, coin) =>
                total +
                (
                    Number(coin?.marketCap) || 0
                ),
            0
        );


    const volume =
        coins.reduce(
            (total, coin) =>
                total +
                (
                    Number(coin?.volume) || 0
                ),
            0
        );


    const variations =
        coins
            .map(
                coin =>
                    Number(
                        coin?.change24h
                    )
            )
            .filter(
                Number.isFinite
            );


    const average =
        variations.length
            ? variations.reduce(
                (a, b) => a + b,
                0
            ) / variations.length
            : null;


    if (totalCoins) {

        totalCoins.textContent =
            coins.length.toString();

    }


    if (totalMarketCap) {

        totalMarketCap.textContent =
            formatCompactNumber(
                marketCap
            );

    }


    if (totalVolume) {

        totalVolume.textContent =
            formatCompactNumber(
                volume
            );

    }


    if (averageVariation) {

        averageVariation.textContent =
            formatPercentage(
                average
            );


        averageVariation.style.color =
            average > 0
                ? "#43d39e"
                : average < 0
                    ? "#ff7180"
                    : "#eef2f8";

    }

}


/* ================================================================
   VARIATION LIST
   ================================================================ */

function renderVariationList(coins) {

    const container =
        document.getElementById(
            "variationList"
        );


    if (!container) {
        return;
    }


    const sorted =
        [...coins]
            .sort(
                (a, b) =>
                    (
                        Number(b?.change24h) || 0
                    ) -
                    (
                        Number(a?.change24h) || 0
                    )
            )
            .slice(0, 8);


    if (!sorted.length) {

        container.innerHTML = `
            <div class="empty-state">
                <h3>Sem variações disponíveis</h3>
                <p>
                    Não existem dados de variação suficientes para exibir esta seção.
                </p>
            </div>
        `;

        return;
    }


    const maximum =
        Math.max(
            ...sorted.map(
                coin =>
                    Math.abs(
                        Number(
                            coin?.change24h
                        ) || 0
                    )
            ),
            1
        );


    container.innerHTML =
        sorted.map(
            coin => {

                const name =
                    coin?.name ||
                    getCoinSymbol(coin);


                const variation =
                    Number(
                        coin?.change24h
                    ) || 0;


                const absolute =
                    Math.abs(
                        variation
                    );


                const width =
                    Math.max(
                        5,
                        (
                            absolute /
                            maximum
                        ) * 100
                    );


                const variationClass =
                    getVariationClass(
                        variation
                    );


                const image =
                    coin?.image ||
                    "";


                return `

                    <div class="variation-item">

                        <div class="variation-identity">

                            ${
                                image
                                    ? `
                                        <img
                                            class="variation-mini-logo"
                                            src="${escapeHtml(image)}"
                                            alt="${escapeHtml(name)}"
                                            loading="lazy"
                                        >
                                    `
                                    : `
                                        <div class="variation-mini-logo">
                                        </div>
                                    `
                            }


                            <span class="variation-name">
                                ${escapeHtml(name)}
                            </span>

                        </div>


                        <div class="variation-track">

                            <div
                                class="variation-fill ${variationClass}"
                                style="width:${width}%"
                            ></div>

                        </div>


                        <span
                            class="variation-value ${variationClass}"
                        >
                            ${escapeHtml(
                                formatPercentage(
                                    variation
                                )
                            )}
                        </span>

                    </div>

                `;

            }
        ).join("");
}


/* ================================================================
   SENTIMENT
   ================================================================ */

function renderSentiment(coins) {

    const counts = {
        positive: 0,
        neutral: 0,
        negative: 0
    };


    coins.forEach(
        coin => {

            const sentiment =
                String(
                    coin?.sentiment ||
                    "neutral"
                ).toLowerCase();


            if (
                sentiment === "positive" ||
                sentiment === "negative"
            ) {

                counts[sentiment]++;

            } else {

                counts.neutral++;

            }

        }
    );


    const total =
        coins.length;


    const center =
        document.getElementById(
            "sentimentTotal"
        );


    if (center) {
        center.textContent = total;
    }


    const legend =
        document.getElementById(
            "sentimentLegend"
        );


    if (legend) {

        const labels = {
            positive: "Positivo",
            neutral: "Neutro",
            negative: "Negativo"
        };


        legend.innerHTML =
            Object.entries(
                counts
            ).map(
                ([key, value]) => `

                    <div class="sentiment-legend-item">

                        <span
                            class="sentiment-dot ${key}"
                        ></span>

                        <span class="sentiment-name">
                            ${labels[key]}
                        </span>

                        <span class="sentiment-number">
                            ${value}
                        </span>

                    </div>

                `
            ).join("");

    }


    renderSentimentChart(
        counts
    );
}


function renderSentimentChart(counts) {

    const canvas =
        document.getElementById(
            "sentimentChart"
        );


    if (!canvas || !window.Chart) {
        return;
    }


    if (sentimentChart) {

        sentimentChart.destroy();

        sentimentChart = null;

    }


    sentimentChart =
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
                                counts.positive,
                                counts.neutral,
                                counts.negative
                            ],

                            backgroundColor: [
                                "#43d39e",
                                "#687386",
                                "#ff6575"
                            ],

                            borderWidth: 0,

                            hoverOffset: 5
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio: false,

                    cutout: "76%",

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            backgroundColor:
                                "#151b26",

                            borderColor:
                                "rgba(255,255,255,0.08)",

                            borderWidth: 1,

                            titleColor:
                                "#eef2f8",

                            bodyColor:
                                "#a8b0bd",

                            padding: 10

                        }

                    }
                }
            }
        );
}


/* ================================================================
   NEWS
   ================================================================ */

async function loadNews() {

    const container =
        document.getElementById(
            "newsContainer"
        );


    if (!container) {
        return;
    }


    setNewsStatus(
        "Sincronizando"
    );


    try {

        const response =
            await fetchJson(
                `${API_BASE_URL}/market/news`
            );


        const news =
            normalizeArray(response);


        newsData = news;


        renderNews(news);


        setNewsStatus(
            `${news.length} registros`
        );


    } catch (error) {

        console.error(
            "Erro ao carregar notícias:",
            error
        );


        renderErrorState(
            container,
            "Não foi possível carregar as notícias.",
            "A fonte de notícias não respondeu à consulta."
        );


        setNewsStatus(
            "Erro de conexão"
        );

    }
}


/* ================================================================
   RENDER NEWS
   ================================================================ */

function renderNews(news) {

    const container =
        document.getElementById(
            "newsContainer"
        );


    if (!container) {
        return;
    }


    if (!news.length) {

        renderEmptyState(
            container,
            "Nenhuma notícia disponível",
            "A API não retornou notícias para o Dashboard."
        );

        return;
    }


    const recent =
        [...news]
            .sort(
                (a, b) =>
                    new Date(
                        b?.publishedAt ||
                        b?.createdAt ||
                        0
                    ) -
                    new Date(
                        a?.publishedAt ||
                        a?.createdAt ||
                        0
                    )
            )
            .slice(0, 10);


    container.innerHTML =
        recent.map(
            article =>
                renderNewsCard(
                    article
                )
        ).join("");
}


function renderNewsCard(article) {

    const title =
        article?.title ||
        "Notícia sem título";


    const source =
        article?.source ||
        "Fonte não informada";


    const coin =
        article?.coin ||
        "Mercado";


    const publishedAt =
        article?.publishedAt ||
        article?.createdAt;


    const sentiment =
        String(
            article?.sentiment ||
            "neutral"
        ).toLowerCase();


    const sentimentClass =
        [
            "positive",
            "negative",
            "neutral"
        ].includes(sentiment)
            ? sentiment
            : "neutral";


    const url =
        article?.url ||
        "";


    return `

        <article class="news-item">


            <span
                class="news-sentiment-bar ${sentimentClass}"
            ></span>


            <div class="news-main">

                <a
                    class="news-title"
                    ${
                        url
                            ? `
                                href="${escapeHtml(url)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            `
                            : ""
                    }
                >
                    ${escapeHtml(title)}
                </a>


                <div class="news-meta">

                    <span class="news-coin">
                        ${escapeHtml(coin)}
                    </span>

                    <span class="news-source">
                        ${escapeHtml(source)}
                    </span>

                    <span class="news-date">
                        ${escapeHtml(
                            formatRelativeDate(
                                publishedAt
                            )
                        )}
                    </span>

                </div>

            </div>


            ${
                url
                    ? `
                        <a
                            class="news-open"
                            href="${escapeHtml(url)}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >

                            Abrir

                            <svg viewBox="0 0 24 24">

                                <path d="M14 5H19V10" />

                                <path d="M10 14L19 5" />

                                <path d="M19 14V19H5V5H10" />

                            </svg>

                        </a>
                    `
                    : ""
            }


        </article>

    `;
}


/* ================================================================
   STATUS
   ================================================================ */

function setAssetStatus(text) {

    const element =
        document.getElementById(
            "assetStatus"
        );


    if (element) {
        element.textContent = text;
    }
}


function setNewsStatus(text) {

    const element =
        document.getElementById(
            "newsStatus"
        );


    if (element) {
        element.textContent = text;
    }
}


/* ================================================================
   EMPTY / ERROR
   ================================================================ */

function renderEmptyState(
    container,
    title,
    message
) {

    container.innerHTML = `

        <div class="empty-state">

            <h3>
                ${escapeHtml(title)}
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

            <button
                type="button"
                onclick="refreshDashboard()"
            >
                Tentar novamente
            </button>

        </div>

    `;
}


function renderErrorState(
    container,
    title,
    message
) {

    container.innerHTML = `

        <div class="empty-state">

            <h3>
                ${escapeHtml(title)}
            </h3>

            <p>
                ${escapeHtml(message)}
            </p>

            <button
                type="button"
                onclick="refreshDashboard()"
            >
                Tentar novamente
            </button>

        </div>

    `;
}


/* ================================================================
   CHART
   ================================================================ */

async function openCoinChart(coinId) {

    const decodedId =
        decodeURIComponent(
            coinId || ""
        );


    if (!decodedId) {

        showToast(
            "Identificador do ativo não disponível.",
            "error"
        );

        return;
    }


    currentCoinId =
        decodedId;


    const modal =
        document.getElementById(
            "coinChartModal"
        );


    if (!modal) {
        return;
    }


    const coin =
        coinsData.find(
            item =>
                getCoinId(item) ===
                decodedId
        );


    prepareChartModal(
        coin
    );


    modal.classList.add(
        "open"
    );


    document.body.classList.add(
        "modal-open"
    );


    await loadCoinChart(
        decodedId
    );
}


function prepareChartModal(coin) {

    const title =
        document.getElementById(
            "chartModalTitle"
        );


    const symbol =
        document.getElementById(
            "chartModalSymbol"
        );


    const logo =
        document.getElementById(
            "chartModalLogo"
        );


    const fallback =
        document.getElementById(
            "chartModalLogoFallback"
        );


    if (title) {

        title.textContent =
            coin?.name ||
            "Ativo";

    }


    if (symbol) {

        symbol.textContent =
            getCoinSymbol(
                coin
            );

    }


    if (logo) {

        const image =
            coin?.image ||
            "";


        if (image) {

            logo.innerHTML = `

                <img
                    src="${escapeHtml(image)}"
                    alt=""
                    onerror="this.remove();"
                >

            `;

        } else if (fallback) {

            fallback.textContent =
                getInitials(
                    coin?.name
                );

        }

    }


    const currentPrice =
        document.getElementById(
            "chartCurrentPrice"
        );


    if (currentPrice) {

        currentPrice.textContent =
            formatCurrency(
                coin?.price
            );

    }


    const change =
        document.getElementById(
            "chartChange"
        );


    if (change) {

        const value =
            Number(
                coin?.change24h
            );


        change.textContent =
            formatPercentage(
                value
            );


        change.className =
            getVariationClass(
                value
            );

    }


    const observations =
        document.getElementById(
            "chartObservations"
        );


    if (observations) {

        observations.textContent =
            "Carregando";

    }
}


/* ================================================================
   LOAD CHART
   ================================================================ */

async function loadCoinChart(
    coinId
) {

    const chartContainer =
        document.getElementById(
            "modalChartContainer"
        );


    const loading =
        document.getElementById(
            "chartLoading"
        );


    const error =
        document.getElementById(
            "chartError"
        );


    const observations =
        document.getElementById(
            "chartObservations"
        );


    if (chartContainer) {
        chartContainer.classList.remove(
            "hidden"
        );
    }


    if (loading) {
        loading.classList.remove(
            "hidden"
        );
    }


    if (error) {
        error.classList.add(
            "hidden"
        );
    }


    if (coinChart) {

        coinChart.destroy();

        coinChart = null;

    }


    try {

        const response =
            await fetchJson(
                `${API_BASE_URL}/market/coins/${encodeURIComponent(
                    coinId
                )}/history?period=day`
            );


        const prices =
            Array.isArray(
                response?.prices
            )
                ? response.prices
                : [];


        if (!prices.length) {

            throw new Error(
                "Histórico vazio."
            );

        }


        renderCoinChart(
            prices
        );


        if (observations) {

            observations.textContent =
                `${prices.length} pontos`;

        }


    } catch (requestError) {

        console.error(
            "Erro ao carregar gráfico:",
            requestError
        );


        if (chartContainer) {
            chartContainer.classList.add(
                "hidden"
            );
        }


        if (error) {

            error.textContent =
                "Não foi possível carregar o histórico deste ativo.";

            error.classList.remove(
                "hidden"
            );

        }

    } finally {

        if (loading) {

            loading.classList.add(
                "hidden"
            );

        }

    }
}


/* ================================================================
   RENDER CHART
   ================================================================ */

function renderCoinChart(
    prices
) {

    const canvas =
        document.getElementById(
            "coinChart"
        );


    if (!canvas || !window.Chart) {
        return;
    }


    const normalized =
        prices
            .map(
                item => {

                    if (
                        Array.isArray(item) &&
                        item.length >= 2
                    ) {

                        return {
                            timestamp:
                                Number(
                                    item[0]
                                ),

                            price:
                                Number(
                                    item[1]
                                )
                        };

                    }


                    if (
                        item &&
                        typeof item === "object"
                    ) {

                        return {
                            timestamp:
                                Number(
                                    item.timestamp ||
                                    item.time ||
                                    item.date
                                ),

                            price:
                                Number(
                                    item.price
                                )
                        };

                    }


                    return null;

                }
            )
            .filter(
                item =>
                    item &&
                    Number.isFinite(
                        item.timestamp
                    ) &&
                    Number.isFinite(
                        item.price
                    )
            );


    if (!normalized.length) {
        return;
    }


    const labels =
        normalized.map(
            item =>
                new Date(
                    item.timestamp
                ).toLocaleTimeString(
                    "pt-BR",
                    {
                        hour: "2-digit",
                        minute: "2-digit"
                    }
                )
        );


    const values =
        normalized.map(
            item =>
                item.price
        );


    const first =
        values[0];


    const last =
        values[
            values.length - 1
        ];


    const variation =
        first !== 0
            ? (
                (
                    last -
                    first
                ) /
                first
            ) *
            100
            : 0;


    const change =
        document.getElementById(
            "chartChange"
        );


    if (change) {

        change.textContent =
            formatPercentage(
                variation
            );

        change.className =
            getVariationClass(
                variation
            );

    }


    if (coinChart) {

        coinChart.destroy();

    }


    const context =
        canvas.getContext(
            "2d"
        );


    const gradient =
        context.createLinearGradient(
            0,
            0,
            0,
            380
        );


    gradient.addColorStop(
        0,
        "rgba(110, 126, 255, 0.25)"
    );


    gradient.addColorStop(
        1,
        "rgba(110, 126, 255, 0)"
    );


    coinChart =
        new Chart(
            canvas,
            {
                type: "line",

                data: {

                    labels,

                    datasets: [

                        {

                            data: values,

                            borderColor:
                                "#8290ff",

                            backgroundColor:
                                gradient,

                            borderWidth: 2,

                            pointRadius: 0,

                            pointHoverRadius: 4,

                            pointHoverBackgroundColor:
                                "#8290ff",

                            fill: true,

                            tension: 0.35

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

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            backgroundColor:
                                "#141a26",

                            borderColor:
                                "rgba(255,255,255,0.08)",

                            borderWidth: 1,

                            titleColor:
                                "#8f9aaa",

                            bodyColor:
                                "#eef2f8",

                            padding: 11,

                            callbacks: {

                                label:
                                    context =>
                                        ` ${formatCurrency(
                                            context.parsed.y
                                        )}`

                            }

                        }

                    },

                    scales: {

                        x: {

                            grid: {

                                color:
                                    "rgba(255,255,255,0.035)",

                                drawBorder: false

                            },

                            ticks: {

                                color:
                                    "#505b6c",

                                maxTicksLimit: 7,

                                font: {
                                    size: 9
                                }

                            }

                        },

                        y: {

                            grid: {

                                color:
                                    "rgba(255,255,255,0.035)",

                                drawBorder: false

                            },

                            ticks: {

                                color:
                                    "#505b6c",

                                font: {
                                    size: 9
                                },

                                callback:
                                    value =>
                                        formatCurrency(
                                            value
                                        )

                            }

                        }

                    }

                }

            }
        );
}


/* ================================================================
   CLOSE CHART
   ================================================================ */

function closeCoinChart() {

    const modal =
        document.getElementById(
            "coinChartModal"
        );


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "open"
    );


    document.body.classList.remove(
        "modal-open"
    );


    currentCoinId = null;


    if (coinChart) {

        coinChart.destroy();

        coinChart = null;

    }
}


/* ================================================================
   REFRESH
   ================================================================ */

async function refreshDashboard() {

    const button =
        document.getElementById(
            "refreshButton"
        );


    if (button) {

        button.disabled = true;

        button.classList.add(
            "loading"
        );

    }


    try {

        await Promise.all([
            loadCoins(),
            loadNews()
        ]);


        updateLastUpdate();


        showToast(
            "Dashboard atualizado.",
            "success"
        );


    } finally {

        if (button) {

            button.disabled = false;

            button.classList.remove(
                "loading"
            );

        }

    }
}


/* ================================================================
   MOBILE MENU
   ================================================================ */

function initializeMobileMenu() {

    const button =
        document.getElementById(
            "mobileMenuButton"
        );


    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (!button || !sidebar) {
        return;
    }


    button.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "open"
            );

        }
    );


    document.querySelectorAll(
        ".nav-item"
    ).forEach(
        item => {

            item.addEventListener(
                "click",
                () => {

                    sidebar.classList.remove(
                        "open"
                    );

                }
            );

        }
    );
}


/* ================================================================
   KEYBOARD
   ================================================================ */

function initializeKeyboard() {

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key === "Escape"
            ) {

                closeCoinChart();

            }

        }
    );
}


/* ================================================================
   AUTO REFRESH
   ================================================================ */

function initializeRefresh() {

    clearInterval(
        coinsRefreshTimer
    );

    clearInterval(
        newsRefreshTimer
    );


    coinsRefreshTimer =
        setInterval(
            loadCoins,
            REFRESH_COINS
        );


    newsRefreshTimer =
        setInterval(
            loadNews,
            REFRESH_NEWS
        );
}


/* ================================================================
   INITIALIZATION
   ================================================================ */

async function initializeDashboard() {

    initializeMobileMenu();

    initializeKeyboard();

    initializeRefresh();


    setEngineStatus(
        "ONLINE",
        "Inicializando sistema",
        "Consultando os dados disponíveis..."
    );


    await Promise.allSettled([
        loadCoins(),
        loadNews()
    ]);

}


/* ================================================================
   START
   ================================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeDashboard
    );

} else {

    initializeDashboard();

}
