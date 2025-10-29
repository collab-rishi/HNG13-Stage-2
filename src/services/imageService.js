const { createCanvas, registerFont } = require("canvas");
const fs = require("fs/promises");
const path = require("path");
require("dotenv").config();

// Use absolute cache directory
const CACHE_DIR = path.resolve(process.env.CACHE_DIR || "./cache");

// Register a fallback font for Linux environments
// You can bundle a TTF file in your project (e.g., assets/fonts/Roboto-Regular.ttf)
try {
  registerFont(path.join(__dirname, "../assets/fonts/Roboto-Regular.ttf"), { family: "Roboto" });
} catch (err) {
  console.warn("⚠️ Could not register custom font. Falling back to system fonts.");
}

const generateSummaryImage = async (countries = [], lastRefreshed) => {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });

    const totalCountries = countries.length;

    // Convert estimated_gdp to number and sort
    const topCountries = countries
      .filter(c => c.estimated_gdp != null)
      .sort((a, b) => Number(b.estimated_gdp) - Number(a.estimated_gdp))
      .slice(0, 5);

    const canvasWidth = 800;
    const canvasHeight = 600;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    gradient.addColorStop(0, "#1e3a8a");
    gradient.addColorStop(1, "#3b82f6");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Title
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Country Data Summary", canvasWidth / 2, 60);

    // Border/Card effect
    ctx.strokeStyle = "#60a5fa";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 100, 700, 420);

    // Total countries
    ctx.font = "bold 28px Roboto, sans-serif";
    ctx.fillStyle = "#fbbf24";
    ctx.textAlign = "left";
    ctx.fillText(`Total Countries: ${totalCountries}`, 80, 150);

    // Top 5 countries header
    ctx.font = "bold 24px Roboto, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("Top 5 Countries by GDP:", 80, 200);

    // Top countries list
    ctx.font = "20px Roboto, sans-serif";
    let yPosition = 240;
    topCountries.forEach((country, index) => {
      const gdpFormatted = country.estimated_gdp != null ? formatGDP(Number(country.estimated_gdp)) : "N/A";
      ctx.fillStyle = index === 0 ? "#fbbf24" : "#e5e7eb";
      ctx.fillText(`${index + 1}. ${country.name} - $${gdpFormatted}`, 100, yPosition);
      yPosition += 35;
    });

    // Last updated
    ctx.font = "italic 18px Roboto, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.textAlign = "center";
    const dateStr = lastRefreshed
      ? new Date(lastRefreshed).toLocaleString("en-US", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "Never";
    ctx.fillText(`Last Updated: ${dateStr}`, canvasWidth / 2, 560);

    // Save image
    const imagePath = path.join(CACHE_DIR, "summary.png");
    const buffer = canvas.toBuffer("image/png");
    await fs.writeFile(imagePath, buffer);

    console.log("✓ Summary image generated successfully");
    return imagePath;
  } catch (error) {
    console.error("✗ Failed to generate summary image:", error);
    throw error;
  }
};

const formatGDP = (gdp) => {
  if (gdp == null) return "N/A";

  const billion = 1_000_000_000;
  const trillion = 1_000_000_000_000;

  if (gdp >= trillion) return (gdp / trillion).toFixed(2) + "T";
  if (gdp >= billion) return (gdp / billion).toFixed(2) + "B";
  return (gdp / 1_000_000).toFixed(2) + "M";
};

const getSummaryImagePath = () => path.join(CACHE_DIR, "summary.png");

module.exports = { generateSummaryImage, getSummaryImagePath };
