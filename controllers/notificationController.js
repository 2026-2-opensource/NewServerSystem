const { Notification } = require('../models');

const notificationController = {
  // 안 읽은 알림 가져오기
  getUnread: async (req, res) => {
    try {
      const notifications = await Notification.findAll({
        where: { memberId: req.user.memberId, isRead: false },
        order: [['createdAt', 'DESC']]
      });
      res.json({ success: true, notifications });
    } catch (err) {
      console.error('알림 조회 에러:', err);
      res.status(500).json({ success: false, message: '알림 조회 실패' });
    }
  },

  // 알림 읽음 처리
  markAsRead: async (req, res) => {
    try {
      const { id } = req.params;
      await Notification.update(
        { isRead: true }, 
        { where: { notificationId: id, memberId: req.user.memberId } }
      );
      res.json({ success: true });
    } catch (err) {
      console.error('알림 읽음 처리 에러:', err);
      res.status(500).json({ success: false });
    }
  }
};

module.exports = notificationController;