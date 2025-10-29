const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');
const statusController = require('../controllers/statusController');
const imageController = require('../controllers/imageController');

router.post('/countries/refresh', countryController.refreshCountries);
router.get('/countries', countryController.getCountries);
router.get('/countries/image', imageController.getSummaryImage);
router.get('/countries/:name', countryController.getCountry);
router.delete('/countries/:name', countryController.deleteCountry);

router.get('/status', statusController.getStatus);

module.exports = router;
