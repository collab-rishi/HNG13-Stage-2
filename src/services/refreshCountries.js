require('dotenv').config();
const axios = require('axios');
const { Country, sequelize, Sequelize } = require('../models');
const fs = require('fs');
const path = require('path');

const COUNTRIES_API_URL = process.env.COUNTRIES_API_URL;
const EXCHANGE_API_URL = process.env.EXCHANGE_API_URL;

async function refreshCountries() {
  let countries, exchangeRates;

  // --- Fetch country data ---
  try {
    const countriesRes = await axios.get(COUNTRIES_API_URL);
    countries = countriesRes.data;
  } catch (err) {
    const error = new Error('Failed to fetch countries data');
    error.apiName = 'REST Countries API';
    throw error;
  }

  // --- Fetch exchange rates ---
  try {
    const exchangeRes = await axios.get(EXCHANGE_API_URL);
    exchangeRates = exchangeRes.data.rates;
  } catch (err) {
    const error = new Error('Failed to fetch exchange rates');
    error.apiName = 'Exchange Rate API';
    throw error;
  }

  const validationErrors = [];

  try {
    await sequelize.transaction(async (t) => {
      for (const c of countries) {
        const errors = {};
        if (!c.name) errors.name = 'is required';
        if (!c.population) errors.population = 'is required';

        // Handle currency properly according to spec
        let currency_code = null;
        if (c.currencies && c.currencies.length > 0) {
          currency_code = c.currencies[0].code;
        }

        // Skip country if required fields missing
        if (Object.keys(errors).length > 0) {
          validationErrors.push({ country: c.name || 'unknown', details: errors });
          continue;
        }

        // --- Compute exchange_rate and estimated_gdp ---
        let exchange_rate = null;
        let estimated_gdp = null;

        if (!currency_code) {
          // No currencies array
          exchange_rate = null;
          estimated_gdp = 0;
        } else if (exchangeRates[currency_code]) {
          // Valid exchange rate found
          exchange_rate = exchangeRates[currency_code];
          const randomMultiplier = Math.floor(Math.random() * 1001) + 1000;
          estimated_gdp = Number(((c.population * randomMultiplier) / exchange_rate).toFixed(2));
        } else {
          // Currency code not found in exchange rates
          exchange_rate = null;
          estimated_gdp = null;
        }

        const existing = await Country.findOne({
          where: Sequelize.where(
            Sequelize.fn('LOWER', Sequelize.col('name')),
            c.name.toLowerCase()
          ),
          transaction: t,
        });

        const countryData = {
          name: c.name,
          capital: c.capital || null,
          region: c.region || null,
          population: c.population,
          currency_code,
          exchange_rate,
          estimated_gdp,
          flag_url: c.flag || null,
          last_refreshed_at: new Date(),
        };

        if (existing) {
          await existing.update(countryData, { transaction: t });
        } else {
          await Country.create(countryData, { transaction: t });
        }
      }

      // --- ✅ Auto-create metadata table if missing ---
      await sequelize.query(
        `
        CREATE TABLE IF NOT EXISTS metadata (
          \`key\` VARCHAR(50) PRIMARY KEY,
          \`value\` DATETIME
        );
      `,
        { transaction: t }
      );

      // --- ✅ Update global refresh timestamp (only after success) ---
      await sequelize.query(
        `
        INSERT INTO metadata (\`key\`, \`value\`)
        VALUES ('last_refreshed_at', NOW())
        ON DUPLICATE KEY UPDATE \`value\` = NOW();
      `,
        { transaction: t }
      );
    });

    // --- Generate summary image ---
    await generateSummaryImage();

    // --- Return validation errors (if any) in correct format ---
    if (validationErrors.length > 0) {
      const error = new Error('Validation failed');
      error.details = validationErrors.reduce((acc, e) => {
        acc[e.country] = e.details;
        return acc;
      }, {});
      throw error;
    }

    return { message: 'Countries refreshed successfully' };
  } catch (err) {
    if (err.details) throw err;
    console.error('❌ Failed to refresh countries:', err.message);
    throw new Error('Could not update database');
  }
}

// --- Generate summary image ---
async function generateSummaryImage() {
  const { createCanvas } = require('canvas');
  const countries = await Country.findAll({
    order: [['estimated_gdp', 'DESC']],
    limit: 5,
  });

  const canvas = createCanvas(800, 600);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, 800, 600);

  // Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Country Summary', 250, 50);

  // Timestamp
  ctx.font = '16px Arial';
  ctx.fillText(`Last refreshed: ${new Date().toLocaleString()}`, 50, 90);

  // Total countries
  const totalCountries = await Country.count();
  ctx.fillText(`Total countries: ${totalCountries}`, 50, 120);

  // Top 5 GDP list
  ctx.fillText('Top 5 countries by GDP:', 50, 160);
  countries.forEach((c, i) => {
    ctx.fillText(
      `${i + 1}. ${c.name} - ${
        c.estimated_gdp ? c.estimated_gdp.toLocaleString() : 'N/A'
      }`,
      70,
      190 + i * 30
    );
  });

  // Save to /cache/summary.png
  const cacheDir = path.join(__dirname, '../cache');
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });

  const imagePath = path.join(cacheDir, 'summary.png');
  fs.writeFileSync(imagePath, canvas.toBuffer('image/png'));
}

module.exports = refreshCountries;
