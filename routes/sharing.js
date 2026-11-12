const express = require('express');
const router = express.Router();
const sharingController = require('../controllers/sharingController');
const { isLoggedIn } = require('../middleware/auth');
const { Block, Review, Notification } = require('../models');

router.get('/', isLoggedIn, sharingController.getIndex);
router.post('/create', isLoggedIn, sharingController.createPost);
router.get('/:id', isLoggedIn, sharingController.getPost);
router.post('/:id/complete', isLoggedIn, sharingController.completeSharing);
router.post('/:id/reserve', isLoggedIn, sharingController.toggleReserve);
router.post('/:id/complete', isLoggedIn, sharingController.completeSharing);
router.post('/:id/delete', isLoggedIn, sharingController.deletePost);
router.post('/:id/edit', isLoggedIn, sharingController.updatePost);

// 나눔법적관련
router.post('/agree-terms', isLoggedIn, async (req, res) => {
    try {
        await req.user.update({ 
            sharingAgreement: true, 
            sharingAgreementAt: new Date() 
        });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false });
    }
});

router.post('/report-user', isLoggedIn, async (req, res) => {
    try {
        const blockerId = req.user.memberId;
        const { blockedId, roomId } = req.body;

        if (blockerId === blockedId) {
            return res.json({ success: false, message: '자기 자신은 신고할 수 없습니다.' });
        }

        // 1. 단순 로그 남기기
        console.log(`🚨 [운영팀 신고접수] 신고자: ${blockerId} -> 피신고자: ${blockedId} (대화방 ID: ${roomId || '없음'})`);

        // 2. 자동 차단 데이터 생성 (이미 차단되어 있으면 가만히 둠)
        await Block.findOrCreate({
            where: { blockerId, blockedId }
        });

        // 3. 신고한 사람의 종 알림창으로 즉시 자동 접수 완료 알림 발송
        if (typeof Notification !== 'undefined') {
            await Notification.create({
                memberId: blockerId,
                type: 'SYSTEM',
                content: '🛡️ <b>신고 접수 완료:</b> 해당 사용자는 즉시 차단되었으며, 운영팀에서 대화 내역 정밀 검토에 착수했습니다.',
                link: '/sharing'
            });
        }

        res.json({ 
            success: true, 
            message: '신고 및 차단 처리가 정상적으로 접수되었습니다. 해당 사용자의 게시글은 회원님의 화면에서 즉시 숨김 처리됩니다.' 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

router.post('/submit-review', isLoggedIn, async (req, res) => {
    try {
        const { sharingId, revieweeId, rating, content } = req.body;
        const reviewerId = req.user.memberId;

        await Review.create({ sharingId, reviewerId, revieweeId, rating, content });

        // 상대방에게 후기 도착 알림
        if (typeof Notification !== 'undefined') {
            await Notification.create({
                memberId: revieweeId,
                type: 'REVIEW',
                content: `⭐ 따뜻한 후기가 도착했어요! (별점: ${rating}점)`,
                link: '/activity' // 후기를 모아보는 페이지로 연결 (임시)
            });
        }
        res.json({ success: true, message: '후기가 등록되었습니다.' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: '후기 등록 실패' });
    }
});

module.exports = router;
