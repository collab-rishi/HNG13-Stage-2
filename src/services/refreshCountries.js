require('dotenv').config();
const axios = require('axios');
const { Country, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const COUNTRIES_API_URL = process.env.COUNTRIES_API_URL;
const EXCHANGE_API_URL = process.env.EXCHANGE_API_URL;

async function refreshCountries() {
  let countries, exchangeRates;

  // --- Parallel fetch for countries + exchange rates ---
  try {
    const [countriesRes, exchangeRes] = await Promise.all([
      axios.get(COUNTRIES_API_URL, { timeout: 10000 }),
      axios.get(EXCHANGE_API_URL, { timeout: 10000 }),
    ]);
    countries = countriesRes.data;
    exchangeRates = exchangeRes.data.rates;
  } catch (err) {
    const error = new Error('External data source unavailable');
    error.status = 503;
    error.details = 'Could not fetch countries or exchange rates';
    throw error;
  }

  const validationErrors = [];

  try {
    await sequelize.transaction(async (t) => {
      // --- Fetch existing countries once ---
      const existingCountries = await Country.findAll({
        attributes: ['id', 'name'],
        transaction: t,
      });
      const existingMap = new Map(
        existingCountries.map(c => [c.name.toLowerCase(), c.id])
      );

      const bulkData = [];

      for (const c of countries) {
        const errors = {};
        if (!c.name) errors.name = 'is required';
        if (!c.population) errors.population = 'is required';

        let currency_code = c.currencies?.[0]?.code || null;
        let exchange_rate = null;
        let estimated_gdp = null;

        if (currency_code && exchangeRates[currency_code]) {
          exchange_rate = exchangeRates[currency_code];
          const randomMultiplier = Math.floor(Math.random() * 1001) + 1000;
          estimated_gdp = Number(((c.population * randomMultiplier) / exchange_rate).toFixed(2));
        } else if (!currency_code) {
          estimated_gdp = 0;
        }

        if (Object.keys(errors).length > 0) {
          validationErrors.push({ country: c.name || 'unknown', details: errors });
          continue;
        }

        bulkData.push({
          id: existingMap.get(c.name.toLowerCase()) || undefined,
          name: c.name,
          capital: c.capital || null,
          region: c.region || null,
          population: c.population,
          currency_code,
          exchange_rate,
          estimated_gdp,
          flag_url: c.flag || null,
          last_refreshed_at: new Date(),
        });
      }

      // --- Bulk insert/update in one query ---
      if (bulkData.length > 0) {
        await Country.bulkCreate(bulkData, {
          updateOnDuplicate: [
            'capital', 'region', 'population',
            'currency_code', 'exchange_rate',
            'estimated_gdp', 'flag_url', 'last_refreshed_at'
          ],
          transaction: t,
        });
      }

      // --- Metadata table for last_refreshed_at ---
      await sequelize.query(
        `CREATE TABLE IF NOT EXISTS metadata (
          \`key\` VARCHAR(50) PRIMARY KEY,
          \`value\` DATETIME
        );`,
        { transaction: t }
      );

      await sequelize.query(
        `INSERT INTO metadata (\`key\`, \`value\`)
         VALUES ('last_refreshed_at', NOW())
         ON DUPLICATE KEY UPDATE \`value\` = NOW();`,
        { transaction: t }
      );
    });

    // --- Generate summary image asynchronously ---
    generateSummaryImage().catch(err =>
      console.error('Failed to generate summary image:', err)
    );

    // --- Throw validation errors if any ---
    if (validationErrors.length > 0) {
      const error = new Error('Validation failed');
      error.details = validationErrors.reduce((acc, e) => {
        acc[e.country] = e.details;
        return acc;
      }, {});
      error.status = 400;
      throw error;
    }

    return { message: 'Countries refreshed successfully' };
  } catch (err) {
    if (err.status) throw err;
    console.error('❌ Failed to refresh countries:', err.message);
    const error = new Error('Could not update database');
    error.status = 500;
    throw error;
  }
}

// --- Generate summary image ---
async function generateSummaryImage() {
  const countries = await Country.findAll({
    order: [['estimated_gdp', 'DESC']],
    limit: 5,
  });

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, 800, 600);

  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Country Summary', 250, 50);

  ctx.font = '16px Arial';
  ctx.fillText(`Last refreshed: ${new Date().toLocaleString()}`, 50, 90);

  const totalCountries = await Country.count();
  ctx.fillText(`Total countries: ${totalCountries}`, 50, 120);

  ctx.fillText('Top 5 countries by GDP:', 50, 160);
  countries.forEach((c, i) => {
    ctx.fillText(
      `${i + 1}. ${c.name} - ${c.estimated_gdp ? c.estimated_gdp.toLocaleString() : 'N/A'}`,
      70,
      190 + i * 30
    );
  });

  const cacheDir = path.join(__dirname, '../cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const imagePath = path.join(cacheDir, 'summary.png');
  await fs.promises.writeFile(imagePath, canvas.toBuffer('image/png'));
}

module.exports = refreshCountries;
