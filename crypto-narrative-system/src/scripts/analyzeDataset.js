require("dotenv").config();

const mongoose = require("mongoose");

const Post = require("../models/Post");


/* ============================================================
   CONFIGURAÇÃO
   ============================================================ */

const MONGODB_URI =
    process.env.MONGODB_URI ||
    process.env.MONGO_URI;


/* ============================================================
   FUNÇÕES AUXILIARES
   ============================================================ */

function porcentagem(valor, total) {

    if (!total) {
        return "0.00%";
    }

    return ((valor / total) * 100).toFixed(2) + "%";
}


function imprimirTitulo(titulo) {

    console.log("\n");
    console.log("=".repeat(80));
    console.log(titulo);
    console.log("=".repeat(80));
}


function imprimirDistribuicao(nome, dados, total) {

    console.log(`\n${nome}:`);

    const entradas = Object.entries(dados)
        .sort((a, b) => b[1] - a[1]);

    if (entradas.length === 0) {

        console.log("  Nenhum dado encontrado.");

        return;
    }

    for (const [chave, quantidade] of entradas) {

        console.log(
            `  ${String(chave).padEnd(30)} ` +
            `${String(quantidade).padStart(6)} ` +
            `(${porcentagem(quantidade, total)})`
        );
    }
}


function contarValores(lista) {

    const resultado = {};

    for (const valor of lista) {

        const chave =
            valor === undefined ||
            valor === null ||
            valor === ""
                ? "(vazio)"
                : String(valor);

        resultado[chave] =
            (resultado[chave] || 0) + 1;
    }

    return resultado;
}


/* ============================================================
   ANÁLISE PRINCIPAL
   ============================================================ */

async function analisarDataset() {

    try {

        if (!MONGODB_URI) {

            throw new Error(
                "MONGODB_URI ou MONGO_URI não foi encontrado no arquivo .env."
            );
        }


        console.log("\n");
        console.log("╔══════════════════════════════════════════════════════════════════════════════╗");
        console.log("║                    ANÁLISE DO DATASET DE NOTÍCIAS                          ║");
        console.log("║                         CRYPTO NARRATIVE SYSTEM                            ║");
        console.log("╚══════════════════════════════════════════════════════════════════════════════╝");


        /* ========================================================
           CONEXÃO
           ======================================================== */

        console.log("\nConectando ao MongoDB...");

        await mongoose.connect(MONGODB_URI);

        console.log("MongoDB conectado com sucesso.");


        /* ========================================================
           BUSCAR DADOS
           ======================================================== */

        console.log("\nCarregando notícias...");

        const noticias = await Post.find({})
            .select({
                newsId: 1,
                title: 1,
                content: 1,
                source: 1,
                coin: 1,
                sentiment: 1,
                sentimentScore: 1,
                narrative: 1,
                url: 1,
                publishedAt: 1,
                createdAt: 1
            })
            .lean();

        const total = noticias.length;


        console.log(
            `Total de notícias encontradas: ${total.toLocaleString("pt-BR")}`
        );


        if (total === 0) {

            console.log("\nNenhuma notícia encontrada.");

            await mongoose.disconnect();

            return;
        }


        /* ========================================================
           1. INFORMAÇÕES GERAIS
           ======================================================== */

        imprimirTitulo("1. INFORMAÇÕES GERAIS DO DATASET");

        console.log(
            `Total de notícias.............: ${total.toLocaleString("pt-BR")}`
        );

        console.log(
            `Data da análise...............: ${new Date().toLocaleString("pt-BR")}`
        );


        /* ========================================================
           2. DUPLICIDADES
           ======================================================== */

        imprimirTitulo("2. VERIFICAÇÃO DE DUPLICIDADES");

        const ids = noticias
            .map(noticia => noticia.newsId)
            .filter(Boolean);

        const idsUnicos = new Set(ids);

        const quantidadeIdsDuplicados =
            ids.length - idsUnicos.size;

        console.log(
            `News IDs preenchidos..........: ${ids.length}`
        );

        console.log(
            `News IDs únicos...............: ${idsUnicos.size}`
        );

        console.log(
            `Possíveis duplicidades.......: ${quantidadeIdsDuplicados}`
        );


        /* ========================================================
           3. CAMPOS AUSENTES
           ======================================================== */

        imprimirTitulo("3. CAMPOS AUSENTES OU VAZIOS");

        let semTitulo = 0;
        let semConteudo = 0;
        let semUrl = 0;
        let semPublishedAt = 0;
        let semCoin = 0;
        let semSentiment = 0;
        let semNarrative = 0;
        let scoreZero = 0;


        for (const noticia of noticias) {

            if (!noticia.title || !noticia.title.trim()) {
                semTitulo++;
            }

            if (!noticia.content || !noticia.content.trim()) {
                semConteudo++;
            }

            if (!noticia.url || !noticia.url.trim()) {
                semUrl++;
            }

            if (!noticia.publishedAt) {
                semPublishedAt++;
            }

            if (!noticia.coin || !noticia.coin.trim()) {
                semCoin++;
            }

            if (!noticia.sentiment || !noticia.sentiment.trim()) {
                semSentiment++;
            }

            if (!noticia.narrative || !noticia.narrative.trim()) {
                semNarrative++;
            }

            if (
                noticia.sentimentScore === undefined ||
                noticia.sentimentScore === null ||
                noticia.sentimentScore === 0
            ) {
                scoreZero++;
            }
        }


        console.log(
            `Sem título...................: ${semTitulo} (${porcentagem(semTitulo, total)})`
        );

        console.log(
            `Sem conteúdo.................: ${semConteudo} (${porcentagem(semConteudo, total)})`
        );

        console.log(
            `Sem URL......................: ${semUrl} (${porcentagem(semUrl, total)})`
        );

        console.log(
            `Sem data de publicação.......: ${semPublishedAt} (${porcentagem(semPublishedAt, total)})`
        );

        console.log(
            `Sem moeda....................: ${semCoin} (${porcentagem(semCoin, total)})`
        );

        console.log(
            `Sem sentimento...............: ${semSentiment} (${porcentagem(semSentiment, total)})`
        );

        console.log(
            `Sem narrativa................: ${semNarrative} (${porcentagem(semNarrative, total)})`
        );

        console.log(
            `Sentiment score igual a zero: ${scoreZero} (${porcentagem(scoreZero, total)})`
        );


        /* ========================================================
           4. DISTRIBUIÇÃO DE SENTIMENTOS
           ======================================================== */

        imprimirTitulo("4. DISTRIBUIÇÃO DOS SENTIMENTOS");

        const sentimentos =
            contarValores(
                noticias.map(noticia => noticia.sentiment)
            );

        imprimirDistribuicao(
            "Sentimentos encontrados",
            sentimentos,
            total
        );


        /* ========================================================
           5. DISTRIBUIÇÃO DAS NARRATIVAS
           ======================================================== */

        imprimirTitulo("5. DISTRIBUIÇÃO DAS NARRATIVAS");

        const narrativas =
            contarValores(
                noticias.map(noticia => noticia.narrative)
            );

        imprimirDistribuicao(
            "Narrativas encontradas",
            narrativas,
            total
        );


        /* ========================================================
           6. DISTRIBUIÇÃO POR MOEDA
           ======================================================== */

        imprimirTitulo("6. DISTRIBUIÇÃO POR MOEDA");

        const moedas =
            contarValores(
                noticias.map(noticia => noticia.coin)
            );

        imprimirDistribuicao(
            "Moedas encontradas",
            moedas,
            total
        );


        /* ========================================================
           7. DISTRIBUIÇÃO POR FONTE
           ======================================================== */

        imprimirTitulo("7. DISTRIBUIÇÃO POR FONTE");

        const fontes =
            contarValores(
                noticias.map(noticia => noticia.source)
            );

        imprimirDistribuicao(
            "Principais fontes",
            fontes,
            total
        );


        /* ========================================================
           8. TAMANHO DOS TEXTOS
           ======================================================== */

        imprimirTitulo("8. ANÁLISE DO TAMANHO DOS TEXTOS");

        const tamanhos = noticias.map(noticia => {

            const titulo =
                noticia.title || "";

            const conteudo =
                noticia.content || "";

            return (
                titulo.length +
                conteudo.length
            );
        });


        const somaTamanhos =
            tamanhos.reduce(
                (totalAtual, tamanho) =>
                    totalAtual + tamanho,
                0
            );


        const tamanhoMedio =
            somaTamanhos / tamanhos.length;

        const tamanhoMinimo =
            Math.min(...tamanhos);

        const tamanhoMaximo =
            Math.max(...tamanhos);


        const muitoCurto =
            tamanhos.filter(
                tamanho => tamanho < 100
            ).length;

        const curto =
            tamanhos.filter(
                tamanho =>
                    tamanho >= 100 &&
                    tamanho < 300
            ).length;

        const medio =
            tamanhos.filter(
                tamanho =>
                    tamanho >= 300 &&
                    tamanho < 1000
            ).length;

        const longo =
            tamanhos.filter(
                tamanho =>
                    tamanho >= 1000 &&
                    tamanho < 3000
            ).length;

        const muitoLongo =
            tamanhos.filter(
                tamanho => tamanho >= 3000
            ).length;


        console.log(
            `Tamanho médio...............: ${tamanhoMedio.toFixed(2)} caracteres`
        );

        console.log(
            `Tamanho mínimo..............: ${tamanhoMinimo} caracteres`
        );

        console.log(
            `Tamanho máximo..............: ${tamanhoMaximo} caracteres`
        );

        console.log(
            `Muito curto (<100)..........: ${muitoCurto}`
        );

        console.log(
            `Curto (100-299).............: ${curto}`
        );

        console.log(
            `Médio (300-999).............: ${medio}`
        );

        console.log(
            `Longo (1000-2999)...........: ${longo}`
        );

        console.log(
            `Muito longo (3000+).........: ${muitoLongo}`
        );


        /* ========================================================
           9. DISTRIBUIÇÃO TEMPORAL
           ======================================================== */

        imprimirTitulo("9. DISTRIBUIÇÃO TEMPORAL DAS NOTÍCIAS");

        const porAno = {};
        const porMes = {};
        const porDia = {};


        for (const noticia of noticias) {

            if (!noticia.publishedAt) {
                continue;
            }

            const data =
                new Date(noticia.publishedAt);


            if (isNaN(data.getTime())) {
                continue;
            }


            const ano =
                data.getUTCFullYear();

            const mes =
                `${ano}-${String(
                    data.getUTCMonth() + 1
                ).padStart(2, "0")}`;

            const dia =
                `${ano}-${String(
                    data.getUTCMonth() + 1
                ).padStart(2, "0")}-${String(
                    data.getUTCDate()
                ).padStart(2, "0")}`;


            porAno[ano] =
                (porAno[ano] || 0) + 1;

            porMes[mes] =
                (porMes[mes] || 0) + 1;

            porDia[dia] =
                (porDia[dia] || 0) + 1;
        }


        imprimirDistribuicao(
            "Por ano",
            porAno,
            total
        );

        imprimirDistribuicao(
            "Por mês",
            porMes,
            total
        );


        console.log("\n20 dias com maior quantidade de notícias:");

        const diasOrdenados =
            Object.entries(porDia)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 20);


        for (const [dia, quantidade] of diasOrdenados) {

            console.log(
                `  ${dia} -> ${quantidade} notícias`
            );
        }


        /* ========================================================
           10. MATRIZ MOEDA × SENTIMENTO
           ======================================================== */

        imprimirTitulo("10. MATRIZ MOEDA × SENTIMENTO");

        const matrizMoedaSentimento = {};


        for (const noticia of noticias) {

            const moeda =
                noticia.coin || "(vazio)";

            const sentimento =
                noticia.sentiment || "(vazio)";


            if (!matrizMoedaSentimento[moeda]) {

                matrizMoedaSentimento[moeda] = {};
            }


            matrizMoedaSentimento[moeda][sentimento] =
                (
                    matrizMoedaSentimento[moeda][sentimento] ||
                    0
                ) + 1;
        }


        for (
            const [moeda, valores]
            of Object.entries(matrizMoedaSentimento)
        ) {

            console.log(
                `\n${moeda}:`
            );

            for (
                const [sentimento, quantidade]
                of Object.entries(valores)
            ) {

                console.log(
                    `  ${sentimento.padEnd(15)}: ${quantidade}`
                );
            }
        }


        /* ========================================================
           11. MATRIZ NARRATIVA × SENTIMENTO
           ======================================================== */

        imprimirTitulo("11. MATRIZ NARRATIVA × SENTIMENTO");

        const matrizNarrativaSentimento = {};


        for (const noticia of noticias) {

            const narrativa =
                noticia.narrative || "(vazio)";

            const sentimento =
                noticia.sentiment || "(vazio)";


            if (!matrizNarrativaSentimento[narrativa]) {

                matrizNarrativaSentimento[narrativa] = {};
            }


            matrizNarrativaSentimento[narrativa][sentimento] =
                (
                    matrizNarrativaSentimento[narrativa][sentimento] ||
                    0
                ) + 1;
        }


        for (
            const [narrativa, valores]
            of Object.entries(matrizNarrativaSentimento)
        ) {

            console.log(
                `\n${narrativa}:`
            );

            for (
                const [sentimento, quantidade]
                of Object.entries(valores)
            ) {

                console.log(
                    `  ${sentimento.padEnd(15)}: ${quantidade}`
                );
            }
        }


        /* ========================================================
           12. MATRIZ MOEDA × NARRATIVA
           ======================================================== */

        imprimirTitulo("12. MATRIZ MOEDA × NARRATIVA");

        const matrizMoedaNarrativa = {};


        for (const noticia of noticias) {

            const moeda =
                noticia.coin || "(vazio)";

            const narrativa =
                noticia.narrative || "(vazio)";


            if (!matrizMoedaNarrativa[moeda]) {

                matrizMoedaNarrativa[moeda] = {};
            }


            matrizMoedaNarrativa[moeda][narrativa] =
                (
                    matrizMoedaNarrativa[moeda][narrativa] ||
                    0
                ) + 1;
        }


        for (
            const [moeda, valores]
            of Object.entries(matrizMoedaNarrativa)
        ) {

            console.log(
                `\n${moeda}:`
            );

            for (
                const [narrativa, quantidade]
                of Object.entries(valores)
            ) {

                console.log(
                    `  ${narrativa.padEnd(25)}: ${quantidade}`
                );
            }
        }


        /* ========================================================
           13. AMOSTRA DAS NOTÍCIAS
           ======================================================== */

        imprimirTitulo("13. AMOSTRA DAS NOTÍCIAS");

        const amostra =
            noticias.slice(0, 10);


        amostra.forEach(
            (noticia, indice) => {

                console.log(
                    `\n--- NOTÍCIA ${indice + 1} ---`
                );

                console.log(
                    `ID: ${noticia.newsId || "(vazio)"}`
                );

                console.log(
                    `Título: ${noticia.title || "(vazio)"}`
                );

                console.log(
                    `Moeda: ${noticia.coin || "(vazio)"}`
                );

                console.log(
                    `Sentimento: ${noticia.sentiment || "(vazio)"}`
                );

                console.log(
                    `Score: ${
                        noticia.sentimentScore ??
                        "(vazio)"
                    }`
                );

                console.log(
                    `Narrativa: ${noticia.narrative || "(vazio)"}`
                );

                console.log(
                    `Fonte: ${noticia.source || "(vazio)"}`
                );

                console.log(
                    `Publicado em: ${
                        noticia.publishedAt ||
                        "(vazio)"
                    }`
                );

                console.log(
                    `URL: ${noticia.url || "(vazio)"}`
                );

                const texto =
                    noticia.content || "";

                console.log(
                    `Conteúdo: ${
                        texto.length > 250
                            ? texto.substring(0, 250) + "..."
                            : texto
                    }`
                );
            }
        );


        /* ========================================================
           14. VERIFICAÇÃO DE PREPARAÇÃO PARA MACHINE LEARNING
           ======================================================== */

        imprimirTitulo(
            "14. VERIFICAÇÃO DE PREPARAÇÃO PARA MACHINE LEARNING"
        );


        console.log("\n");


        const percentualSemConteudo =
            (semConteudo / total) * 100;


        const percentualSemTitulo =
            (semTitulo / total) * 100;


        const percentualNarrativaGeral =
            (narrativas.general / total) * 100;


        console.log(
            `Total de registros.................: ${total}`
        );

        console.log(
            `Registros sem conteúdo.............: ${semConteudo} (${percentualSemConteudo.toFixed(2)}%)`
        );

        console.log(
            `Registros sem título...............: ${semTitulo} (${percentualSemTitulo.toFixed(2)}%)`
        );

        console.log(
            `Narrativa "general"................: ${
                narrativas.general || 0
            } (${percentualNarrativaGeral.toFixed(2)}%)`
        );


        /* ========================================================
           ALERTA SOBRE NARRATIVAS
           ======================================================== */

        if (
            narrativas.general === total
        ) {

            console.log("\n");
            console.log(
                "⚠️ ATENÇÃO: TODAS AS NOTÍCIAS ESTÃO COM NARRATIVA 'GENERAL'."
            );

            console.log(
                "Isso indica que a classificação de narrativas precisa ser corrigida"
            );

            console.log(
                "antes de utilizar narrativa como variável para Machine Learning."
            );
        }


        else if (
            percentualNarrativaGeral > 80
        ) {

            console.log("\n");
            console.log(
                "⚠️ ATENÇÃO: A narrativa 'general' representa mais de 80% do dataset."
            );

            console.log(
                "É necessário verificar o equilíbrio das classes antes do treinamento."
            );
        }


        else {

            console.log("\n");
            console.log(
                "✓ As narrativas possuem mais de uma classe."
            );

            console.log(
                "Ainda será necessário verificar o equilíbrio entre as classes."
            );
        }


        /* ========================================================
           ALERTA SOBRE CONTEÚDO
           ======================================================== */

        if (
            percentualSemConteudo > 20
        ) {

            console.log("\n");

            console.log(
                "⚠️ ATENÇÃO: Mais de 20% das notícias estão sem conteúdo."
            );

            console.log(
                "Será necessário decidir se o treinamento utilizará título,"
            );

            console.log(
                "conteúdo ou título + conteúdo."
            );
        }

        else {

            console.log("\n");

            console.log(
                "✓ A quantidade de conteúdos ausentes está abaixo de 20%."
            );
        }


        /* ========================================================
           RECOMENDAÇÃO FINAL
           ======================================================== */

        imprimirTitulo("CONCLUSÃO DA AUDITORIA");

        console.log(
            "\nO dataset foi apenas analisado."
        );

        console.log(
            "Nenhum registro foi alterado, excluído ou atualizado."
        );

        console.log(
            "\nAntes de treinar os modelos de Machine Learning,"
        );

        console.log(
            "precisamos avaliar principalmente:"
        );

        console.log(
            "  1. Qualidade dos textos"
        );

        console.log(
            "  2. Distribuição dos sentimentos"
        );

        console.log(
            "  3. Distribuição das narrativas"
        );

        console.log(
            "  4. Distribuição das moedas"
        );

        console.log(
            "  5. Notícias duplicadas"
        );

        console.log(
            "  6. Notícias sem conteúdo"
        );

        console.log(
            "  7. Distribuição temporal"
        );

        console.log(
            "  8. Possíveis problemas de rotulagem"
        );

        console.log(
            "\nDepois dessa auditoria poderemos montar o dataset"
        );

        console.log(
            "de treinamento e testar os modelos de Machine Learning."
        );


        /* ========================================================
           FINALIZAÇÃO
           ======================================================== */

        await mongoose.disconnect();

        console.log("\n");
        console.log(
            "MongoDB desconectado."
        );

        console.log(
            "Análise concluída com sucesso."
        );

        console.log("\n");


    } catch (error) {

        console.error("\n");
        console.error(
            "ERRO DURANTE A ANÁLISE:"
        );

        console.error(
            error.message
        );

        console.error("\n");

        try {

            await mongoose.disconnect();

        } catch (erroDesconexao) {

            // Não fazer nada.
        }

        process.exit(1);
    }
}


/* ============================================================
   EXECUTAR
   ============================================================ */

analisarDataset();