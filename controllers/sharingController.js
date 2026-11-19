const { SharingPost, Member, OwnedIngredient, Ingredient, ChatRoom, Park, ParkItemTemplate, Inventory, Fridge, sequelize } = require('../models');
const { Op } = require('sequelize');

const SHARING_REWARD_POINTS = 50;
const CARBON_FACTOR = 2.0;

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
  const diffDays = Math.round((expiry - today) / (1000*60*60*24));
  return diffDays <= 3;
}

async function giveRandomParkItem(memberId, points = 0, transaction = null) {
  try {
    const options = transaction ? { transaction } : {};
    
    let park = await Park.findOne({ where: { memberId }, ...options });
    if (!park) park = await Park.create({ memberId, parkName: '나의 공원', totalPoints: 0 }, options);
    if (points > 0) await park.update({ totalPoints: (park.totalPoints || 0) + points }, options);

    const templates = await ParkItemTemplate.findAll(options);
    if (!templates.length) return null;

    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];

    const existing = await Inventory.findOne({
      where: { memberId, templateId: randomTemplate.templateId },
      ...options
    });

    if (existing) {
      await existing.update({ quantity: existing.quantity + 1, isNew: true }, options);
    } else {
      await Inventory.create({
        memberId,
        templateId: randomTemplate.templateId,
        quantity: 1,
        isNew: true,
      }, options);
    }
    await Member.update({ hasNewParkItem: true }, { where: { memberId }, ...options });
    return randomTemplate.itemName;
  } catch (err) {
    console.error('❌ 아이템 지급 오류:', err.message);
    return null;
  }
}

const sharingController = {
  getIndex: async (req, res) => {
    try {
      const dong = req.user?.dong || '미설정';
      const district = req.user?.district || '미설정';
      const city = req.user?.city || '미설정';
      const memberId = req.user?.memberId;

      const filter = req.query.filter || 'all';
      const myPost = req.query.myPost;
      const targetMemberId = req.query.memberId;

      const excludeMyPost = req.query.excludeMyPost;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + 2);

      let blockedIds = [];
      if (memberId) {
          const { Block } = require('../models');
          const blocks = await Block.findAll({
            where: {[Op.or]: [
                      { blockerId: memberId }, // 내가 차단한 경우
                      { blockedId: memberId }  // 나를 차단한 경우
                  ]
                }
          });
          blockedIds = blocks.map(b => b.blockerId === memberId ? b.blockedId : b.blockerId);
      }

      let whereClause = {};
      
      // 구와 동이 모두 있어야만 필터링 되도록
      if (district && district !== '미설정' && dong && dong !== '미설정') {
        whereClause.district = district; 
        whereClause.dong = dong;
      } else {
        // 둘 중 하나라도 없을 경우
        if (district && district !== '미설정') whereClause.district = district;
        else if (dong && dong !== '미설정') whereClause.dong = dong;
        else if (city && city !== '미설정') whereClause.city = city;
      }

      if (filter === 'sharing' || filter === 'reserved') whereClause.sharingStatus = false;
      else if (filter === 'done') whereClause.sharingStatus = true;

      let andConditions = [];
      // 내 아이디와 같지 않은(Not Equal) 글만 가져오기
      if (excludeMyPost === 'true' && memberId) {
      andConditions.push({ memberId: { [Op.ne]: memberId } });
}

      // 차단한 유저가 존재하면 목록에서 원천 차단
      if (blockedIds.length > 0) {
          andConditions.push({ memberId: { [Op.notIn]: blockedIds } });
      }

      if (targetMemberId) { 
          andConditions.push({ memberId: targetMemberId }); 
      } else if (myPost === 'true' && memberId) { 
          andConditions.push({ memberId: memberId }); 
      }

      if (andConditions.length > 0) {
          whereClause[Op.and] = andConditions;
      }

      const [posts, rawMyIngredients] = await Promise.all([
        SharingPost.findAll({
          where: whereClause,
          include: [
            { model: Member, as: 'member', attributes: ['memberId', 'memberName', 'dong'] },
            {
              model: OwnedIngredient, as: 'ownedIngredient',
              include: [{ model: Ingredient, as: 'ingredient' }],
            }
          ],
          order: [['createdAt', 'DESC']],
        }),
        OwnedIngredient.findAll({
          where: { 
            memberId: memberId, 
            isSharing: false,
            expiryDate: { [Op.gte]: targetDate } 
          },
          attributes: {
            include: [
              [sequelize.literal('COALESCE(OwnedIngredient.ingredientName, ingredient.ingredientName)'), 'displayName']
            ]
          },
          include: [{ model: Ingredient, as: 'ingredient', attributes: ['ingredientName'] }],
          order: [
            ['expiryDate', 'ASC'],
            [sequelize.literal('COALESCE(OwnedIngredient.ingredientName, ingredient.ingredientName)'), 'ASC']
          ]
        })
      ]);

      const myIngredients = rawMyIngredients.map(ing => {
        const ingData = ing.toJSON();
        const todayDate = new Date(); 
        todayDate.setHours(0, 0, 0, 0);
        const expiryDate = new Date(ingData.expiryDate || Date.now()); 
        expiryDate.setHours(0, 0, 0, 0);
        const diffTime = expiryDate.getTime() - todayDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
        return {
          ...ingData,
          ddayText: diffDays < 0 ? 'D-Expired' : (diffDays === 0 ? 'D-Day' : `D-${diffDays}`),
          ddayClass: diffDays <= 0 ? 'badge-expired' : (diffDays <= 3 ? 'badge-urgent' : 'badge-safe')
        };
      });

      let finalPosts = posts || [];
      if (filter === 'sharing') {
        finalPosts = finalPosts.filter(p => !(p.postTitle && p.postTitle.startsWith('[예약중]')));
      } else if (filter === 'reserved') {
        finalPosts = finalPosts.filter(p => p.postTitle && p.postTitle.startsWith('[예약중]'));
      }

      const todayZero = new Date();
      todayZero.setHours(0, 0, 0, 0);

      finalPosts = finalPosts.filter(p => {
        if (!p.ownedIngredient || !p.ownedIngredient.expiryDate) return true; // 유통기한 정보가 없으면 일단 통과
        
        const exp = new Date(p.ownedIngredient.expiryDate);
        exp.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((exp - todayZero) / (1000 * 60 * 60 * 24));
        
        // 2일 이상 남은 게시글만 남기고 걸러냄
        return diffDays >= 2; 
      });

      const locationText = (district && district !== '미설정' && dong && dong !== '미설정') ? `${district} ${dong}` : (dong || '우리 동네');

      res.render('sharing/index', {
        title: '나눔 게시판', layout: 'layouts/main',
        posts: finalPosts, 
        filter,
        myPost,
        locationText,
        district,
        city,
        dong,
        user: req.user,
        myIngredients: myIngredients
      });
    } catch (err) {
      console.error('Sharing Index Error:', err);
      console.error('🚨 [나눔 게시판 렌더링 에러] 상세 원인:', err.stack || err.message);
      if (typeof req.flash === 'function') {
        req.flash('error', '게시판을 불러오는 중 오류가 발생했습니다.');
      }
      res.redirect('/');
    }
  },

  getPost: async (req, res) => {
    try {
      const { dong, district, city } = req.user;
      const currentUser = req.user.memberId;
      
      let whereClause = { sharingId: req.params.id };
      
      if (district && district !== '미설정' && dong && dong !== '미설정') {
        whereClause.district = district;
        whereClause.dong = dong;
      } else {
        if (district && district !== '미설정') whereClause.district = district;
        else if (dong && dong !== '미설정') whereClause.dong = dong;
      }


      const post = await SharingPost.findOne({
        where: whereClause,
        include: [
          { model: Member, as: 'member', attributes: ['memberId', 'memberName', 'dong', 'contact'] },
          {
            model: OwnedIngredient, as: 'ownedIngredient',
            include: [{ model: Ingredient, as: 'ingredient' }],
          }
        ],
      });

      if (!post) {
        req.flash('error', '게시물을 찾을 수 없거나 해당 지역의 나눔글이 아닙니다.');
        return res.redirect('/sharing');
      }

      let chatRooms = [];
      if (currentUser === post.memberId) {
          chatRooms = await ChatRoom.findAll({
              where: { sharingId: req.params.id, sellerLeft: false },
              include: [{ model: Member, as: 'buyer', attributes: ['memberName'] }],
              order: [['updatedAt', 'DESC']]
          });
      }

      res.render('sharing/detail', {
        title: '나눔 상세', layout: 'layouts/main', 
        post, 
        chatRooms,
        currentUser
      });
    } catch (err) {//에러 체크용 수정
      console.error('상세 페이지 에러:', err);
      res.status(500).send(`상세 페이지를 불러오지 못했습니다. 에러 원인: ${err.message}`);
    }
  },

  createPost: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { ownedIngredientId, postContent, postTitle, registeredQuantity } = req.body;
      const { city, district, dong } = req.user;

      function parseToMinUnit(qtyStr) {
        const num = parseFloat(String(qtyStr).match(/^[\d.]+/)?.[0] || 0);
        const unit = String(qtyStr).replace(/^[\d.]+/, '').trim().toLowerCase();
        
        if (['l', '리터'].includes(unit)) return { val: num * 1000, type: 'volume', base: 'ml' };
        if (['ml'].includes(unit)) return { val: num, type: 'volume', base: 'ml' };
        if (['kg', '킬로그램'].includes(unit)) return { val: num * 1000, type: 'weight', base: 'g' };
        if (['g'].includes(unit)) return { val: num, type: 'weight', base: 'g' };
        return { val: num, type: 'count', base: unit || '개' };
      }

      await sequelize.transaction(async (t) => {
        let finalIngredientId = ownedIngredientId || null;

        if (ownedIngredientId) {
            const ownedItem = await OwnedIngredient.findByPk(ownedIngredientId, { transaction: t });
            if (ownedItem) {
                // 1. 냉장고 원본 수량과 등록 수량을 최소 단위로 쪼개기
                const orig = parseToMinUnit(ownedItem.quantity);
                const reqQty = parseToMinUnit(registeredQuantity);
                const origAmount = parseInt(ownedItem.amount) || 0;

                // 2. 같은 단위 체계(무게/부피)일 때만 단위 변환 뺄셈 수행
                if (orig.type === reqQty.type && reqQty.val < orig.val) {
                    const remainingVal = orig.val - reqQty.val;
                    const ratio = reqQty.val / orig.val;
                    const sharedPrice = Math.floor(origAmount * ratio);

                    // 원래 수량 포맷 복원 (예: 1500ml -> 1.5L)
                    let formattedRemaining = '';
                    if (orig.base === 'ml') {
                        formattedRemaining = remainingVal >= 1000 ? `${remainingVal / 1000}L` : `${remainingVal}ml`;
                    } else if (orig.base === 'g') {
                        formattedRemaining = remainingVal >= 1000 ? `${remainingVal / 1000}kg` : `${remainingVal}g`;
                    } else {
                        formattedRemaining = `${remainingVal}${orig.base}`;
                    }

                    // 나눔용 새 식재료 분리 생성
                    const newItem = await OwnedIngredient.create({
                        memberId, ingredientId: ownedItem.ingredientId, fridgeId: ownedItem.fridgeId,
                        expiryDate: ownedItem.expiryDate, amount: sharedPrice,
                        quantity: registeredQuantity, ingredientName: ownedItem.ingredientName,
                        isSharing: true
                    }, { transaction: t });

                    // 💡 [수정 완료] 기존 냉장고 데이터 업데이트
                    // 수량(quantity)은 줄어들지만, 가격(amount)은 최초 등록액인 origAmount를 그대로 고정합니다.
                    await ownedItem.update({
                        quantity: formattedRemaining,
                        amount: origAmount // 👈 차감하지 않고 원래 영수증 가격 그대로 보존!
                    }, { transaction: t });

                    finalIngredientId = newItem.ownedIngredientId;
                } else {
                    // 수량이 같거나 체계가 다르면 통째로 나눔 처리
                    await ownedItem.update({ isSharing: true }, { transaction: t });
                }
            }
        }

        await SharingPost.create({
          memberId, ownedIngredientId: finalIngredientId,
          postContent: postContent || postTitle, postTitle: postTitle || postContent,
          registeredQuantity: registeredQuantity || '1개', sharingStatus: false,
          city: city || '미설정', district: district || '미설정', dong: dong || '미설정',
        }, { transaction: t });
      });

      req.flash('success', '나눔 게시물이 등록되었습니다!');
      res.redirect('/sharing');
    } catch (err) {
      console.error(err);
      req.flash('error', '게시물 등록 중 오류가 발생했습니다.');
      res.redirect('/sharing');
    }
  },

  toggleReserve: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const post = await SharingPost.findOne({ where: { sharingId: req.params.id, memberId } });

      if (!post) {
        req.flash('error', '권한이 없거나 게시글이 존재하지 않습니다.');
        return res.redirect('/sharing');
      }

      if (post.sharingStatus) {
        req.flash('error', '이미 나눔이 완료된 게시글입니다.');
        return res.redirect(`/sharing/${req.params.id}`);
      }

      if (post.postTitle.startsWith('[예약중] ')) {
        post.postTitle = post.postTitle.replace('[예약중] ', '');
        req.flash('success', '예약 상태가 해제되었습니다.');
      } else {
        post.postTitle = '[예약중] ' + post.postTitle;
        req.flash('success', '예약중 상태로 변경되었습니다.');
      }

      await post.save();
      res.redirect(`/sharing/${req.params.id}`);
    } catch (err) {
      console.error(err);
      req.flash('error', '오류가 발생했습니다.');
      res.redirect(`/sharing/${req.params.id}`);
    }
  },

  deletePost: async (req, res) => {
    try {
        const post = await SharingPost.findOne({ where: { sharingId: req.params.id, memberId: req.user.memberId } });
        if (!post) return res.redirect('/sharing');

        // 식재료가 연결되어 있다면 다시 내 냉장고로 반환 (나눔 취소)
        if (post.ownedIngredientId) {
            await OwnedIngredient.update({ isSharing: false }, { where: { ownedIngredientId: post.ownedIngredientId } });
        }
        await post.destroy();
        req.flash('success', '게시글이 삭제되었습니다.');
        res.redirect('/sharing');
    } catch (err) {
        res.redirect('/sharing');
    }
  },

  updatePost: async (req, res) => {
    try {
      const { postTitle, postContent, registeredQuantity } = req.body;
      const post = await SharingPost.findOne({
        where: { sharingId: req.params.id, memberId: req.user.memberId }
      });

      if (!post) {
        req.flash('error', '게시글을 찾을 수 없거나 수정 권한이 없습니다.');
        return res.redirect('/sharing');
      }

      await post.update({ postTitle, postContent, registeredQuantity});
      req.flash('success', '게시글이 성공적으로 수정되었습니다.');
      res.redirect(`/sharing/${req.params.id}`);
    } catch (err) {
      console.error(err);
      res.status(500).send('수정 중 서버 오류 발생');
    }
  },

  completeSharing: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { receiverId } = req.body; 
      
      if (!receiverId) {
        req.flash('error', '나눔을 제공받을 대상을 선택해주세요.');
        return res.redirect(`/sharing/${req.params.id}`);
      }

      let msg = '나눔 완료! ';
      let itemName = null;

      await sequelize.transaction(async (t) => {
        const post = await SharingPost.findOne({
          where: { sharingId: req.params.id, memberId },
          include: [{ model: OwnedIngredient, as: 'ownedIngredient' }],
          transaction: t
        });

        if (!post) throw new Error('권한이 없거나 게시물을 찾을 수 없습니다.');
        if (post.sharingStatus) throw new Error('이미 완료된 나눔입니다.');

        let finalTitle = post.postTitle;
        if (finalTitle.startsWith('[예약중] ')) {
            finalTitle = finalTitle.replace('[예약중] ', '');
        }
        await post.update({ sharingStatus: true, postTitle: finalTitle }, { transaction: t });

        const ownedItem = post.ownedIngredient;
        if (ownedItem) {
          const qtyMatch = (ownedItem.quantity || '').match(/^[\d.]+/);
          const originalQtyNum = qtyMatch ? parseFloat(qtyMatch[0]) : 1;
          const unitStr = (ownedItem.quantity || '').replace(/^[\d.]+/, '').trim();
          const originalPrice = parseInt(ownedItem.amount) || 0; // 내 냉장고에 기록되어 있던 원래 가격

          const deductQty = parseFloat(post.registeredQuantity);
          
          const ratio = Math.min(deductQty / originalQtyNum, 1);
          const sharedPrice = Math.floor(originalPrice * ratio);
          
          const remainingQtyNum = originalQtyNum - deductQty;

          if (remainingQtyNum <= 0) {
              // 수량이 완전히 0 이하가 되면 냉장고에서 완전히 사라지므로 삭제
              await post.update({ ownedIngredientId: null }, { transaction: t });
              await ownedItem.destroy({ transaction: t });
          } else {
              // 수량은 차감하지만 가격(amount)은 차감하지 않고 원래 가격을 그대로 고정
              ownedItem.quantity = `${remainingQtyNum}${unitStr}`;
              ownedItem.amount = originalPrice; // 👈 remainingPrice 대신 originalPrice로 고정!
              await ownedItem.save({ transaction: t });
          }

          // 상대방 냉장고에 나눔받은 식재료를 넣어주는 로직
          const receiverFridge = await Fridge.findOne({ where: { memberId: receiverId }, transaction: t });
          if (receiverFridge) {
            await OwnedIngredient.create({
              memberId: receiverId,
              ingredientId: ownedItem.ingredientId,
              fridgeId: receiverFridge.fridgeId,
              expiryDate: ownedItem.expiryDate,
              amount: sharedPrice, // 나눔받은 사람은 분할된 가격만큼 가치를 가져감
              quantity: `${deductQty}${unitStr}`,
              ingredientName: ownedItem.ingredientName,
              isSharing: false
            }, { transaction: t });
          }

          // 탄소 및 가계부 절약 통계 반영 로직
          if (ownedItem.expiryDate && isWithin3Days(ownedItem.expiryDate)) {
            const member = await Member.findByPk(memberId, { transaction: t });
            const weightKg = parseWeightKg(`${deductQty}${unitStr}`);
            const carbonReduced = Math.round(weightKg * CARBON_FACTOR * 100) / 100;

            await member.update({
              cumulativeSavings: (parseInt(member.cumulativeSavings) || 0) + sharedPrice,
              cumulativeCarbonReduction: (parseFloat(member.cumulativeCarbonReduction) || 0) + carbonReduced,
            }, { transaction: t });

            msg += `💰 ${sharedPrice.toLocaleString()}원 절약, 🌿 ${carbonReduced}kg CO₂ 절감! `;
          }
        }

        itemName = await giveRandomParkItem(memberId, SHARING_REWARD_POINTS, t);
      });

      const { ChatMessage, ChatRoom } = require('../models'); // 여기서 바로 불러오면 파일 상단에 없어도 무조건 작동합니다!
      
      const room = await ChatRoom.findOne({ 
          where: { sharingId: req.params.id, buyerId: receiverId } 
      });
      
      if (room) {
          await ChatMessage.create({
              roomId: room.roomId,
              senderId: memberId, // 나눔을 완료한 사람(판매자)
              content: '🎉 나눔이 완료되었습니다!<br>상대방을 위해 상단의 <b>[⭐ 후기 남기기]</b> 버튼을 눌러 따뜻한 후기를 작성해 주세요.',
              isSystem: true
          });
      }

      if (itemName) {
        msg += `🎁 [${itemName}] 획득! 공원에서 확인하세요 🌳`;
      } else {
        msg += '공원 포인트가 적립됐어요!';
      }

      req.flash('success', msg);
      res.redirect('back');
    } catch (err) {
      console.error(err);
      req.flash('error', err.message || '오류가 발생했습니다.');
      res.redirect(`back`);
    }
  }

};

module.exports = sharingController;