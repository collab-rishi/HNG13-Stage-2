const express = require('express');
const refreshCountries = require('../services/refreshCountries');
const { Country, Sequelize, sequelize } = require('../models');
const fs = require('fs');
const path = require('path');
const { Op, fn, col } = require('sequelize');
const router = express.Router();

// ------------------------------
// POST /countries/refresh
// ------------------------------
router.post('/countries/refresh', async (req, res) => {
  try {
    const result = await refreshCountries();
    res.json(result);
  } catch (err) {
    if (err.details) {
      // Validation error format per spec
      return res.status(400).json({
        error: 'Validation failed',
        details: err.details,
      });
    } else if (err.apiName) {
      // External API failure per spec
      return res.status(503).json({
        error: 'External data source unavailable',
        details: `Could not fetch data from ${err.apiName}`,
      });
    } else {
      console.error(err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// ------------------------------
// GET /countries
// Supports ?region=, ?currency=, ?sort=gdp_desc|gdp_asc
// ------------------------------
router.get('/countries', async (req, res) => {
  try {
    const { region, currency, sort } = req.query;

    const where = { [Op.and]: [] };

    // Add filters safely
    if (region) {
      where[Op.and].push(
        Sequelize.where(fn('LOWER', col('region')), region.toLowerCase())
      );
    }

    if (currency) {
      where[Op.and].push(
        Sequelize.where(fn('LOWER', col('currency_code')), currency.toLowerCase())
      );
    }

    // If no filters applied, remove condition
    if (where[Op.and].length === 0) delete where[Op.and];

    const order = [];
    if (sort === 'gdp_desc') order.push(['estimated_gdp', 'DESC']);
    else if (sort === 'gdp_asc') order.push(['estimated_gdp', 'ASC']);

    const countries = await Country.findAll({ where, order });
    res.json(countries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------------
// GET /status
// ------------------------------
router.get('/status', async (req, res) => {
  try {
    const totalCountries = await Country.count();
    const [results] = await sequelize.query(
  "SELECT value FROM metadata WHERE `key` = 'last_refreshed_at' LIMIT 1");


    const lastRefreshed =
      results && results.length > 0 ? results[0].value : null;

    res.json({
      total_countries: totalCountries,
      last_refreshed_at: lastRefreshed,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------------
// GET /countries/image
// ------------------------------
router.get('/countries/image', (req, res) => {
  try {
    const imagePath = path.join(__dirname, '../cache/summary.png');
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Summary image not found' });
    }
    res.sendFile(imagePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------------
// GET /countries/:name → Case-insensitive
// ------------------------------
router.get('/countries/:name', async (req, res) => {
  const name = req.params.name;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: { name: 'is required' },
    });
  }

  try {
    const country = await Country.findOne({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('name')),
        name.toLowerCase()
      ),
    });

    if (!country) return res.status(404).json({ error: 'Country not found' });

    res.json(country);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ------------------------------
// DELETE /countries/:name → Case-insensitive
// ------------------------------
router.delete('/countries/:name', async (req, res) => {
  const name = req.params.name;

  if (!name || !name.trim()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: { name: 'is required' },
    });
  }

  try {
    const deleted = await Country.destroy({
      where: Sequelize.where(
        Sequelize.fn('LOWER', Sequelize.col('name')),
        name.toLowerCase()
      ),
    });

    if (!deleted) return res.status(404).json({ error: 'Country not found' });

    res.json({ message: `Country ${name} deleted successfully` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
