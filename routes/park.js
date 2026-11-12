const express = require('express');
const router = express.Router();
const parkController = require('../controllers/parkController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/', isLoggedIn, parkController.getPark);
router.post('/place', isLoggedIn, parkController.placeItem);
router.post('/remove', isLoggedIn, parkController.removeItem);
router.post('/save', isLoggedIn, parkController.saveState);
router.get('/inventory', isLoggedIn, parkController.getInventory);

module.exports = router;
