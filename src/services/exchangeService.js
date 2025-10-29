import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

export const fetchExchangeRates = async () => {
  try {
    const response = await axios.get(process.env.EXCHANGE_RATE_API_URL, {
      timeout: 10000,
    });

    if (response.data && response.data.rates) {
      return response.data.rates;
    }

    throw new Error("Invalid exchange rate data format");
  } catch (error) {
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
      throw new Error("Exchange rate API timeout");
    }
    throw new Error(
      `Could not fetch data from Exchange Rate API: ${error.message}`
    );
  }
};