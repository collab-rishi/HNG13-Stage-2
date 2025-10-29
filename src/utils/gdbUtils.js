function randomMultiplier() {
  return Math.floor(Math.random() * (2000 - 1000 + 1)) + 1000;
}

function computeEstimatedGDP(population, exchangeRate) {
  if (!exchangeRate) return null; // handle null case
  return (population * randomMultiplier()) / exchangeRate;
}

module.exports = { computeEstimatedGDP };
