const axios = require('axios');

async function fetchCountries() {
  try {
    const response = await axios.get(
      'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies'
    );
    return response.data;
  } catch (err) {
    throw new Error('Countries API fetch failed');
  }
}

async function fetchExchangeRates() {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD');
    return response.data.rates;
  } catch (err) {
    throw new Error('Exchange Rates API fetch failed');
  }
}

module.exports = { fetchCountries, fetchExchangeRates };
