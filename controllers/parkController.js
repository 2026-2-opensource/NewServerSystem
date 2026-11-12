const { Park, ParkItem, ParkItemTemplate, Inventory, Member } = require('../models');

const parkController = {
  getPark: async (req, res) => {
    try {
      const memberId = req.user.memberId;

      let park = await Park.findOne({ where: { memberId } });
      if (!park) {
        park = await Park.create({ memberId, parkName: `${req.user.memberName}의 공원` });
      }

      const placedItemsRaw = await ParkItem.findAll({
        where: { parkId: park.parkId, isPlaced: true },
        include: [{ model: ParkItemTemplate, as: 'template' }],
        order: [['zOrder', 'ASC']],
      });
      // 필요한 데이터만 추려서 넘김
      const placedItems = placedItemsRaw.map(item => ({
        parkItemId: item.parkItemId,
        templateId: item.templateId,
        posX: item.posX,
        posY: item.posY,
        sizeW: item.sizeW,
        sizeH: item.sizeH,
        rotate: item.rotate,
        direction: item.direction,
        template: item.template ? {
          itemImage: item.template.itemImage,
          itemName: item.template.itemName,
          defaultW: item.template.defaultW,
          defaultH: item.template.defaultH,
        } : null,
      }));

      const inventory = await Inventory.findAll({
        where: { memberId },
        include: [{ model: ParkItemTemplate, as: 'template' }],
      });

      const member = await Member.findByPk(memberId);
      const hasNewParkItem = member.hasNewParkItem;
      await member.update({ hasNewParkItem: false });
      await Inventory.update({ isNew: false }, { where: { memberId } });

      res.render('park/index', {
        title: '내 공원',
        layout: 'layouts/park',
        park,
        placedItems: JSON.stringify(placedItems),
        inventory,
        member,
        user: req.user,
        hasNewParkItem,
      });
    } catch (err) {
      console.error(err);
      req.flash('error', '공원 정보를 불러오는 중 오류가 발생했습니다.');
      res.redirect('/dashboard');
    }
  },

  placeItem: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { templateId, posX, posY } = req.body;

      const park = await Park.findOne({ where: { memberId } });
      if (!park) return res.status(404).json({ success: false, message: '공원 없음' });

      // 인벤토리 확인
      const invItem = await Inventory.findOne({ where: { memberId, templateId } });
      if (!invItem || invItem.quantity <= 0) {
        return res.status(400).json({ success: false, message: '인벤토리에 아이템이 없습니다.' });
      }

      // posX, posY를 소수점 허용 (FLOAT로 저장)
      const parkItem = await ParkItem.create({
        parkId: park.parkId,
        templateId,
        posX: parseFloat(posX) || 0,
        posY: parseFloat(posY) || 0,
        isPlaced: true,
      });

      await invItem.update({ quantity: invItem.quantity - 1 });

      const template = await ParkItemTemplate.findByPk(templateId);
      res.json({ success: true, parkItem: { ...parkItem.toJSON(), template } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: err.message });
    }
  },

  removeItem: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { parkItemId } = req.body;

      const park = await Park.findOne({ where: { memberId } });
      if (!park) return res.status(404).json({ success: false });

      const parkItem = await ParkItem.findOne({
        where: { parkItemId, parkId: park.parkId },
      });

      if (!parkItem) return res.status(404).json({ success: false });

      await parkItem.destroy();

      // 인벤토리 반환
      const invItem = await Inventory.findOne({ where: { memberId, templateId: parkItem.templateId } });
      if (invItem) {
        await invItem.update({ quantity: invItem.quantity + 1 });
      } else {
        await Inventory.create({ memberId, templateId: parkItem.templateId, quantity: 1 });
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  },

  saveState: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { items } = req.body;
      if (!items || !Array.isArray(items)) return res.json({ success: false });

      const park = await Park.findOne({ where: { memberId } });
      if (!park) return res.json({ success: false });

      // 각 아이템 위치/크기/회전 업데이트 (순서도 저장)
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        await ParkItem.update(
          {
            posX: parseFloat(item.x) || 0,
            posY: parseFloat(item.y) || 0,
            sizeW: parseFloat(item.w) || 10,
            sizeH: parseFloat(item.h) || 12,
            rotate: parseFloat(item.rotate) || 0,
            direction: item.direction || 'front',
            zOrder: i,
          },
          { where: { parkItemId: item.id, parkId: park.parkId } }
        );
      }

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  },

  getInventory: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const inventory = await Inventory.findAll({
        where: { memberId },
        include: [{ model: ParkItemTemplate, as: 'template' }],
      });
      res.json({ success: true, inventory });
    } catch (err) {
      res.status(500).json({ success: false });
    }
  },
};

module.exports = parkController;
