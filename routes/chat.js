const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { isLoggedIn } = require('../middleware/auth');
const { ChatMessage } = require('../models');

router.post('/start', isLoggedIn, chatController.startChat);
router.get('/room/:id', isLoggedIn, chatController.getRoom);
router.post('/room/:id/leave', isLoggedIn, chatController.leaveRoom);

//메시지 삭제 라우터
router.post('/message/:messageId/delete', isLoggedIn, async (req, res) => {
    try {
        const { messageId } = req.params;
        const message = await ChatMessage.findByPk(messageId);

        if (!message) {
            return res.status(404).json({ success: false, message: '메시지를 찾을 수 없습니다.' });
        }
        if (message.senderId !== req.user.memberId) {
            return res.status(403).json({ success: false, message: '본인이 보낸 메시지만 삭제할 수 있습니다.' });
        }

        await message.destroy();
        res.json({ success: true, message: '메시지가 삭제되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;