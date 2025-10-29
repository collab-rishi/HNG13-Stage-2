const { createCanvas, registerFont } = require("@napi-rs/canvas");
const fs = require('fs');
const path = require('path');

async function generateSummaryImage(countries, refreshedAt) {
  const width = 800;
  const height = 600;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);

  // Title
  ctx.fillStyle = '#333';
  ctx.font = 'bold 30px Arial';
  ctx.fillText('Countries Summary', 250, 50);

  // Total countries
  ctx.font = '20px Arial';
  ctx.fillText(`Total countries: ${countries.length}`, 50, 100);

  // Top 5 countries by GDP
  ctx.fillText('Top 5 Countries by Estimated GDP:', 50, 150);
  const top5 = countries.slice(0, 5);
  top5.forEach((country, index) => {
    ctx.fillText(
      `${index + 1}. ${country.name} - GDP: ${Number(country.estimated_gdp).toLocaleString()}`,
      70,
      180 + index * 30
    );
  });

  // Last refreshed timestamp
  ctx.fillText(`Last Refreshed: ${refreshedAt.toISOString()}`, 50, 350);

  // Save image
  const filePath = path.join(__dirname, '../cache/summary.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(filePath, buffer);
}

module.exports = { generateSummaryImage };
