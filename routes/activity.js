const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { isLoggedIn } = require('../middleware/auth');
router.get('/', isLoggedIn, activityController.getActivity);
module.exports = router;
