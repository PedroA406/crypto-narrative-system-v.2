const axios = require("axios");
const Coin = require("../models/Coin");

async function collectCoins() {

    try {

        console.log("=================================");
        console.log("COLETANDO DADOS DA COINGECKO...");
        console.log("=================================");

        const response = await axios.get(
            "https://api.coingecko.com/api/v3/coins/markets",
            {
                params: {
                    vs_currency: "usd",
                    order: "market_cap_desc",
                    per_page: 10,
                    page: 1,
                    sparkline: false
                }
            }
        );

        const coins = response.data;

        console.log(`TOTAL DE MOEDAS: ${coins.length}`);

        for (const coin of coins) {

            await Coin.findOneAndUpdate(

                { coinId: coin.id },

                {
                    coinId: coin.id,
                    name: coin.name,
                    symbol: coin.symbol,
                    price: coin.current_price,
                    marketCap: coin.market_cap,
                    volume: coin.total_volume,
                    change24h: coin.price_change_percentage_24h,
                    image: coin.image,
                    lastUpdated: new Date()
                },

                {
                 upsert: true,
                 returnDocument: "after"
}
            );

            console.log(`✅ ${coin.name} salva`);
        }

        console.log("=================================");
        console.log("COLETA FINALIZADA");
        console.log("=================================");

    } catch (error) {

        console.error("ERRO NO COLLECTOR:");
        console.error(error.message);

    }

}

module.exports = collectCoins;