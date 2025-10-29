const countryService = require('../services/countryService');
const path = require('path');
const fs = require('fs');

async function refreshCountries(req, res, next) {
  try {
    const result = await countryService.refreshCountries();
    res.json({
      message: 'Countries refreshed successfully',
      total_countries: result.total,
      last_refreshed_at: result.refreshed_at
    });
  } catch (err) {
    res.status(503).json({
      error: 'External data source unavailable',
      details: err.message
    });
  }
}

async function getCountries(req, res, next) {
  try {
    const { region, currency, sort } = req.query;

    // validate sort values
    const allowedSorts = ['gdp_desc', 'gdp_asc', 'population_desc', 'population_asc'];
    const sortParam = allowedSorts.includes(sort) ? sort : null;

    const countries = await countryService.getAllCountries({ region, currency }, sortParam);
    res.json(countries);
  } catch (err) {
    next(err);
  }
}


async function getCountry(req, res, next) {
  try {
    const country = await countryService.getCountryByName(req.params.name);
    if (!country) return res.status(404).json({ error: 'Country not found' });
    res.json(country);
  } catch (err) {
    next(err);
  }
}

async function deleteCountry(req, res, next) {
  try {
    const deleted = await countryService.deleteCountryByName(req.params.name);
    if (!deleted) return res.status(404).json({ error: 'Country not found' });
    res.json({ message: 'Country deleted successfully' });
  } catch (err) {
    next(err);
  }
}

async function getImage(req, res, next) {
  const imagePath = path.join(__dirname, '../cache/summary.png');
  if (!fs.existsSync(imagePath)) return res.status(404).json({ error: 'Summary image not found' });
  res.sendFile(imagePath);
}

module.exports = { refreshCountries, getCountries, getCountry, deleteCountry, getImage };
