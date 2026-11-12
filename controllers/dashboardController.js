const { OwnedIngredient, Ingredient, SharingPost, Member, MonthlyStats } = require('../models');
const { Op } = require('sequelize');

const dashboardController = {
  // GET /dashboard
  getDashboard: async (req, res, next) => { // 1. next 인자 추가
    try {
      const memberId = req.user.memberId;
      const today = new Date();
      today.setHours(0, 0, 0, 0); 

      // 2. 모든 식재료 조회
      const allIngredients = await OwnedIngredient.findAll({
        where: { memberId, isSharing: false },
        include: [{ model: Ingredient, as: 'ingredient' }],
        order: [['expiryDate', 'ASC'], ['ingredientName', 'ASC']],
      });

      // 3. 필터링 및 D-Day 계산 (item 정의를 명확히 함)
      const urgentWithDays = allIngredients
        .filter(item => { // 여기서 item이 정의됨
          const expDate = new Date(item.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          const diff = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 3;
        })
        .map(item => {
          const expDate = new Date(item.expiryDate);
          expDate.setHours(0, 0, 0, 0);
          const diff = Math.floor((expDate - today) / (1000 * 60 * 60 * 24));
          return { 
            ...item.toJSON(), 
            daysLeft: diff,
            displayStatus: diff === 0 ? 'D-Day' : `D-${diff}` 
          };
        })
        .slice(0, 4);

      // 4. 나머지 데이터 조회
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const sharingCompleted = await SharingPost.count({
        where: { memberId, sharingStatus: true, createdAt: { [Op.gte]: thisMonthStart } },
      });

      const member = await Member.findByPk(memberId);
      const totalConsumed = member.totalConsumed || 0;

      let savingsDiff = 0, lastSavings = 0, thisTreeCount = 0, lastTreeCount = 0, treeDiff = 0;
      try {
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthStats = await MonthlyStats.findOne({
          where: { memberId, year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 }
        });
        lastSavings = parseInt(lastMonthStats?.savings || 0);
        const lastCarbon = parseFloat(lastMonthStats?.carbonReduction || 0);
        const thisSavings = parseInt(member.cumulativeSavings || 0);
        const thisCarbon = parseFloat(member.cumulativeCarbonReduction || 0);

        savingsDiff = thisSavings - lastSavings;
        thisTreeCount = Math.floor(thisCarbon / 0.55);
        lastTreeCount = Math.floor(lastCarbon / 0.55);
        treeDiff = thisTreeCount - lastTreeCount;
      } catch(e) {
        console.error('월별통계 오류:', e.message);
      }

      res.render('dashboard/index', {
        title: '대시보드',
        layout: 'layouts/main',
        urgentIngredients: urgentWithDays,
        sharingCompleted,
        totalConsumed,
        member,
        savingsDiff,
        lastSavings,
        thisTreeCount,
        lastTreeCount,
        treeDiff,
      });

    } catch (err) {
      console.error(err);
      next(err);
    }
  },
};

module.exports = dashboardController;