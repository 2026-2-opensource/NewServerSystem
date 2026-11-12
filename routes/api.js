const express = require('express');
const router = express.Router();
const ingredientSearchController = require('../controllers/ingredientSearchController');
const { isLoggedIn } = require('../middleware/auth');

router.post('/food/analyze', isLoggedIn, ingredientSearchController.analyze);

module.exports = router;
