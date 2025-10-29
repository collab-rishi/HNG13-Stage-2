const express = require('express');
const router = express.Router();
const countryController = require('../controllers/countryController');

const imageController = require('../controllers/imageController');

router.post('/refresh', countryController.refreshCountries);
router.get('/', countryController.getCountries);
router.get('/image', imageController.getSummaryImage);
router.get('/:name', countryController.getCountry);
router.delete('/:name', countryController.deleteCountry);



module.exports = router;
