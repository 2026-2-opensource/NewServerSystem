const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { isLoggedIn } = require('../middleware/auth');
router.get('/', isLoggedIn, settingsController.getSettings);
router.post('/update', isLoggedIn, settingsController.updateSettings);
router.post('/withdraw', isLoggedIn, settingsController.withdraw);
module.exports = router;
