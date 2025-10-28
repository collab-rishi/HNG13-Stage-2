require('dotenv').config();
const axios = require('axios');
const { Country, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const nodeHtmlToImage = require('node-html-to-image');

const COUNTRIES_API_URL = process.env.COUNTRIES_API_URL;
const EXCHANGE_API_URL = process.env.EXCHANGE_API_URL;

async function refreshCountries() {
  let countries, exchangeRates;
  const validationErrors = [];

  // --- Parallel fetch countries + exchange rates ---
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

      // --- Bulk insert/update ---
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

      // --- Metadata table ---
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
  const topCountries = await Country.findAll({
    order: [['estimated_gdp', 'DESC']],
    limit: 5,
  });

  const totalCountries = await Country.count();
  const lastRefreshed = new Date().toLocaleString();

  const html = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 40px; }
          h1 { color: #333; }
          p, ul { font-size: 16px; }
          li { margin-bottom: 5px; }
          .container { background: #fff; padding: 20px; border-radius: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Country Summary</h1>
          <p>Last refreshed: ${lastRefreshed}</p>
          <p>Total countries: ${totalCountries}</p>
          <p>Top 5 countries by GDP:</p>
          <ul>
            ${topCountries.map((c, i) =>
              `<li>${i + 1}. ${c.name} - ${c.estimated_gdp ? c.estimated_gdp.toLocaleString() : 'N/A'}</li>`
            ).join('')}
          </ul>
        </div>
      </body>
    </html>
  `;

  const cacheDir = path.join(__dirname, '../cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  await nodeHtmlToImage({
    output: path.join(cacheDir, 'summary.png'),
    html,
  });
}

module.exports = refreshCountries;
