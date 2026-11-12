const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isNotLoggedIn } = require('../middleware/auth');

router.get('/login', isNotLoggedIn, authController.getLogin);
router.post('/login', isNotLoggedIn, authController.postLogin);
router.get('/register', isNotLoggedIn, authController.getRegister);
router.post('/register', isNotLoggedIn, authController.postRegister);
router.get('/logout', authController.logout);
router.get('/find-password', isNotLoggedIn, authController.getFindPassword);
router.post('/find-password', isNotLoggedIn, authController.postFindPassword);
module.exports = router;
