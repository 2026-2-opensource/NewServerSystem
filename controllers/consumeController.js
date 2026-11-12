const { OwnedIngredient, Member, Park, ParkItemTemplate, Inventory } = require('../models');

const CARBON_FACTOR = 0.4;

function parseWeightKg(quantity) {
  if (!quantity) return 0.3;
  const q = String(quantity).toLowerCase();
  const num = parseFloat(q.match(/[\d.]+/)?.[0] || 0.3);
  if (q.includes('kg')) return num;
  if (q.includes('g')) return num / 1000;
  if (q.includes('l') || q.includes('리터')) return num * 0.97;
  if (q.includes('ml')) return num / 1000;
  return 0.3;
}

function isWithin3Days(expiryDate) {
  const today = new Date(); today.setHours(0,0,0,0);
  const expiry = new Date(expiryDate); expiry.setHours(0,0,0,0);
  const diffDays = Math.ceil((expiry - today) / (1000*60*60*24));
  return diffDays <= 3 && diffDays >= 0;
}

async function giveRandomParkItem(memberId) {
  try {
    let park = await Park.findOne({ where: { memberId } });
    if (!park) park = await Park.create({ memberId, parkName: '나의 공원', totalPoints: 0 });

    const templates = await ParkItemTemplate.findAll();
    if (!templates.length) {
      console.log('⚠️ ParkItemTemplate 없음 - seed.js 실행 필요');
      return null;
    }

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    const existing = await Inventory.findOne({
      where: { memberId, templateId: randomTemplate.templateId }
    });

    if (existing) {
      await existing.update({ quantity: existing.quantity + 1, isNew: true });
    } else {
      await Inventory.create({
        memberId,
        templateId: randomTemplate.templateId,
        quantity: 1,
        isNew: true,
      });
    }

    
    return randomTemplate.itemName;
  } catch (err) {
    console.error('❌ 아이템 지급 오류:', err.message);
    return null;
  }
}

const consumeController = {

  // 기존 소비 + 부분 소비
  consume: async (req, res) => {

    try {

      const memberId = req.user.memberId;
      const { id } = req.params;
      const { usedAmount } = req.body;

      const item = await OwnedIngredient.findOne({
        where: {
          ownedIngredientId: id,
          memberId
        }
      });

      if (!item) {
        return res.json({
          success: false,
          message: '아이템을 찾을 수 없습니다.'
        });
      }

      const originalQuantity = item.quantity || '';

      const currentNumber = parseFloat(originalQuantity);

      // 숫자 없으면 전체 소비
      if (isNaN(currentNumber)) {
        const isExpired = (() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const expiry = new Date(item.expiryDate); expiry.setHours(0,0,0,0);
          return expiry < today;
        })();
        await item.destroy();
        if (isExpired) return res.json({ success: true, message: null });
        const itemName0 = await giveRandomParkItem(memberId);
        const msg0 = itemName0 ? `소비 완료! 🎁 [${itemName0}] 획득! 공원에서 확인하세요 🌳` : '소비 완료!';
        return res.json({ success: true, message: msg0 });
      }

      const unit = originalQuantity.replace(/[0-9.\s]/g, '');

      const remain = currentNumber - parseFloat(usedAmount || currentNumber);

      // ===== 전부 소비 =====
      if (remain <= 0) {

        const withinDeadline = isWithin3Days(item.expiryDate);

        const isExpired = (() => {
          const today = new Date(); today.setHours(0,0,0,0);
          const expiry = new Date(item.expiryDate); expiry.setHours(0,0,0,0);
          return expiry < today;
        })();

        if (isExpired) {
          await item.destroy();
          return res.json({ success: true, message: null });
        }

        if (!withinDeadline) {
          await item.destroy();
          const memberForCount2 = await Member.findByPk(memberId);
          await memberForCount2.update({
            totalConsumed: (parseInt(memberForCount2.totalConsumed) || 0) + 1,
          });
          const itemName2 = await giveRandomParkItem(memberId);
          if (itemName2) await Member.findByPk(memberId).then(m => m.update({ hasNewParkItem: true }));
          const msg2 = itemName2 ? `소비 완료! 🎁 [${itemName2}] 획득! 공원에서 확인하세요 🌳` : '소비 완료!';
          return res.json({ success: true, message: msg2 });
        }

        let msg = '소비 완료! ';

        const itemName = await giveRandomParkItem(memberId);

        if (withinDeadline) {

          const member = await Member.findByPk(memberId);

          const savedAmount = parseInt(item.amount) || 0;

          const weightKg = parseWeightKg(item.quantity);

          const carbonReduced =
            Math.round(weightKg * CARBON_FACTOR * 100) / 100;

          await member.update({
            cumulativeSavings:
              (parseInt(member.cumulativeSavings) || 0) + savedAmount,

            cumulativeCarbonReduction:
              (parseFloat(member.cumulativeCarbonReduction) || 0)
              + carbonReduced,
          });

          msg += `💰 ${savedAmount.toLocaleString()}원 절약, 🌿 ${carbonReduced}kg CO₂ 절감! `;
        }

        if (itemName) {
          msg += `🎁 [${itemName}] 획득! 공원에서 확인하세요 🌳`;
          await Member.findByPk(memberId).then(m => m.update({ hasNewParkItem: true }));
        }

        await item.destroy();
        const memberForCount = await Member.findByPk(memberId);
        await memberForCount.update({
          totalConsumed: (parseInt(memberForCount.totalConsumed) || 0) + 1,
        });

        return res.json({
          success: true,
          message: msg
        });
      }

      // ===== 부분 소비 =====
      item.quantity = `${remain}${unit}`;

      await item.save();

      return res.json({
        success: true,
        message: `남은 수량: ${item.quantity}`
      });

    } catch (err) {

      console.error(err);

      return res.json({
        success: false,
        message: '오류가 발생했습니다.'
      });
    }
  },

  // 폐기
  discard: async (req, res) => {

    try {

      const memberId = req.user.memberId;

      const { id } = req.params;

      const item = await OwnedIngredient.findOne({
        where: {
          ownedIngredientId: id,
          memberId
        }
      });

      if (!item) {
        return res.redirect('/fridge');
      }

      await item.destroy();

      req.flash('success', '폐기 처리되었습니다.');

      res.redirect('/fridge');

    } catch (err) {

      console.error(err);

      res.redirect('/fridge');
    }
  },
};


module.exports = consumeController;
