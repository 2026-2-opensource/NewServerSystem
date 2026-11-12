const { SharingPost, OwnedIngredient, Member, MonthlyStats, ChatRoom} = require('../models');
const { Op } = require('sequelize');

const activityController = {
  getActivity: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const today = new Date();
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const sharingCompleted = await SharingPost.count({
        where: { memberId, sharingStatus: true },
      });
      const member = await Member.findByPk(memberId);

      // 최근 3개월 통계
      const months = [];
      for (let i = 2; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
      }

      const monthlyData = await Promise.all(months.map(async (m) => {
        const isCurrentMonth = m.year === today.getFullYear() && m.month === today.getMonth() + 1;
        if (isCurrentMonth) {
          return {
            label: `${m.month}월`,
            savings: parseInt(member.cumulativeSavings || 0),
            carbon: parseFloat(member.cumulativeCarbonReduction || 0),
          };
        }
        const stat = await MonthlyStats.findOne({ where: { memberId, year: m.year, month: m.month } });
        return {
          label: `${m.month}월`,
          savings: parseInt(stat?.savings || 0),
          carbon: parseFloat(stat?.carbonReduction || 0),
        };
      }));

      const totalConsumed = member.totalConsumed || 0;

      // 최근 나눔 활동
      const recentSharing = await SharingPost.findAll({
        where: { memberId },
        order: [['createdAt', 'DESC']],
        limit: 10,
      });

      const recentActivities = recentSharing.map(s => ({
        text: s.sharingStatus ? `나눔 완료 · ${s.postContent.substring(0,20)}` : `나눔 등록 · ${s.postContent.substring(0,20)}`,
        date: new Date(s.createdAt).toLocaleDateString('ko-KR'),
      }));

      const myPosts = await SharingPost.findAll({
        where: { memberId },
        order: [['createdAt', 'DESC']],
      });
      const ongoingPosts = myPosts.filter(p => !p.sharingStatus);
      const completedPosts = myPosts.filter(p => p.sharingStatus);

      let myChats = [];
      if (ChatRoom) {
          myChats = await ChatRoom.findAll({
              where: {
                  [Op.or]: [
                      { sellerId: String(memberId), sellerLeft: false },
                      { buyerId: String(memberId), buyerLeft: false }
                  ]
              },
              include: [
                  { model: Member, as: 'seller', attributes: ['memberName'] },
                  { model: Member, as: 'buyer', attributes: ['memberName'] },
                  // 강제 조인(required: true)을 빼서, 게시글이 없어도 채팅방이 살아있으면 무조건 불러오게 방어
                  { model: SharingPost, as: 'sharingPost', attributes: ['postTitle', 'sharingStatus'], required: false }
              ],
              order: [['updatedAt', 'DESC']]
          });
      }
      const ongoingChats = myChats.filter(room => !room.sharingPost || !room.sharingPost.sharingStatus);
      const completedChats = myChats.filter(room => room.sharingPost && room.sharingPost.sharingStatus);


      res.render('activity/index', {
        title: '내 활동', layout: 'layouts/main',
        sharingCompleted, totalConsumed, member, recentActivities,
        monthlyData: JSON.stringify(monthlyData),
        recentActivities,
        ongoingPosts, completedPosts, ongoingChats, completedChats, currentUser: req.user
      });
      
    } catch (err) {
      console.error("대시보드 로드 에러:",err);
      res.redirect('/dashboard');
    }
  },
};

module.exports = activityController;
