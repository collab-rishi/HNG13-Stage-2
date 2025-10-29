const { Country } = require('../models');

async function getStatus() {
  const totalCountries = await Country.count();

  // Get the latest refresh timestamp
  const latestCountry = await Country.findOne({
    order: [['last_refreshed_at', 'DESC']],
    attributes: ['last_refreshed_at'],
  });

  const lastRefreshedAt = latestCountry ? latestCountry.last_refreshed_at : null;

  return { total_countries: totalCountries, last_refreshed_at: lastRefreshedAt };
}

module.exports = { getStatus };
