const path = require("path");
const fs = require("fs");
const { getSummaryImagePath } = require("../services/imageService")

/**
 * GET /countries/image
 * Serve the cached summary image
 */
async function getSummaryImage(req, res, next) {
  try {
    const imagePath = getSummaryImagePath();
    console.log(imagePath);

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: "Summary image not found" });
    }

    res.sendFile(path.resolve(imagePath));
  } catch (err) {
    next(err);
  }
}

module.exports = { getSummaryImage };
