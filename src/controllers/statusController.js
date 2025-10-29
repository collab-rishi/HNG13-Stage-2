const statusService = require('../services/statusService');

async function getStatus(req, res, next) {
  try {
    const status = await statusService.getStatus();
    res.json(status);
  } catch (err) {
    next(err);
  }
}

module.exports = { getStatus };
