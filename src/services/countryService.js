const { Op, Sequelize } = require('sequelize'); 
const axios = require('axios');
const { Country, sequelize } = require('../models');
const { generateSummaryImage } = require('../services/imageService');

const REST_COUNTRIES_URL = 'https://restcountries.com/v2/all?fields=name,capital,region,population,flag,currencies';
const EXCHANGE_RATE_URL = 'https://open.er-api.com/v6/latest/USD';

async function refreshCountries() {
  let countriesData, exchangeRates;

  // 1️⃣ Fetch countries
  try {
    const countriesResp = await axios.get(REST_COUNTRIES_URL);
    countriesData = countriesResp.data;
  } catch (err) {
    throw new Error('Could not fetch data from RESTCountries API');
  }

  // 2️⃣ Fetch exchange rates
  try {
    const exchangeResp = await axios.get(EXCHANGE_RATE_URL);
    exchangeRates = exchangeResp.data.rates;
  } catch (err) {
    throw new Error('Could not fetch data from Exchange Rates API');
  }

  const refreshedAt = new Date();

  // 3️⃣ DB transaction to avoid partial updates
  const transaction = await sequelize.transaction();
  try {
    const countryRecords = [];

    for (const country of countriesData) {
      const currencyCode = country.currencies?.[0]?.code || null;
      const exchangeRate = currencyCode ? exchangeRates[currencyCode] || null : null;
      const randomMultiplier = Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;

      const estimatedGdp = (country.population && exchangeRate)
        ? (country.population * randomMultiplier) / exchangeRate
        : 0;

      const [record] = await Country.upsert({
        name: country.name,
        capital: country.capital || null,
        region: country.region || null,
        population: country.population,
        currency_code: currencyCode,
        exchange_rate: exchangeRate,
        estimated_gdp: estimatedGdp,
        flag_url: country.flag || null,
        last_refreshed_at: refreshedAt
      }, { transaction });

      countryRecords.push(record);
    }

    // Commit transaction after all upserts
    await transaction.commit();

    // 4️⃣ Generate summary image (full array passed)
    try {
      await generateSummaryImage(countryRecords, refreshedAt);
    } catch (imgErr) {
      console.error('Summary image generation failed:', imgErr.message);
    }

    return { total: countryRecords.length, refreshed_at: refreshedAt };

  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function getAllCountries(filters = {}, sort = null) {
  const where = {};
  if (filters.region) where.region = filters.region;
  if (filters.currency) where.currency_code = filters.currency;

  const order = [];
  if (sort === 'gdp_desc') order.push(['estimated_gdp', 'DESC']);
  if (sort === 'gdp_asc') order.push(['estimated_gdp', 'ASC']);
  if (sort === 'population_desc') order.push(['population', 'DESC']);
  if (sort === 'population_asc') order.push(['population', 'ASC']);

  return await Country.findAll({ where, order });
}

async function getCountryByName(name) {
  return await Country.findOne({
     where: Sequelize.where(
      Sequelize.fn('lower', Sequelize.col('name')),
      name.toLowerCase()
    ),
  });
}

async function deleteCountryByName(name) {
  return await Country.destroy({
    where: Sequelize.where(
      Sequelize.fn('lower', Sequelize.col('name')),
      name.toLowerCase()
    ),
  });
}

module.exports = {
  refreshCountries,
  getAllCountries,
  getCountryByName,
  deleteCountryByName
};
