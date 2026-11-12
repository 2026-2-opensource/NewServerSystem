const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { isLoggedIn } = require('../middleware/auth');

router.get('/unread', isLoggedIn, notificationController.getUnread);
router.post('/:id/read', isLoggedIn, notificationController.markAsRead);

module.exports = router;