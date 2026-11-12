const { Member, SharingPost } = require('../models');
const bcrypt = require('bcryptjs');

const settingsController = {
  // 1. 설정 화면 보여주기
  getSettings: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const recentSharing = await SharingPost.findAll({
        where: { memberId },
        order: [['createdAt', 'DESC']],
        limit: 8,
      });
      const recentActivities = recentSharing.map(s => ({
        text: s.sharingStatus ? `✅ 나눔 완료 · ${s.postContent.substring(0,25)}` : `🤝 나눔 등록 · ${s.postContent.substring(0,25)}`,
        date: new Date(s.createdAt).toLocaleDateString('ko-KR'),
      }));

      res.render('settings/index', {
        title: '설정', layout: 'layouts/main',
        recentActivities,
      });
    } catch (err) {
      console.error(err);
      res.redirect('/dashboard');
    }
  },

  // 2. 회원 정보 및 비밀번호 수정 (💡 시/구/동 개별 처리 업데이트)
  updateSettings: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      
      // 💡 [수정 핵심]: View에서 분리해서 넘겨주는 city, district, dong을 각각 받아옵니다.
      const { memberName, city, district, dong, contact, newPassword } = req.body;
      const member = await Member.findByPk(memberId);

      // 💡 개별 주소 조각들을 전부 DB 업데이트 객체에 포함시킵니다.
      const updateData = { memberName, city, district, dong, contact };

      // 새 비밀번호가 입력되었고, 공백이 아니며, 6자 이상일 때만 암호화해서 변경에 반영
      if (newPassword && newPassword.trim().length >= 6) {
        updateData.password = await bcrypt.hash(newPassword, 12);
      }

      // DB 정보 업데이트
      await member.update(updateData);

      // 💡 [매우 중요]: 현재 로그인된 세션 정보(req.user)도 쪼개진 주소로 각각 최신화합니다.
      // 이렇게 동기화해 줘야 나눔 게시판으로 즉시 이동했을 때 갱신된 구(district)를 정상 인식합니다!
      req.user.memberName = memberName;
      req.user.city = city;         // 세션에 '시/도' 최신화
      req.user.district = district; // 세션에 '시/군/구' 최신화 (나눔 게시글 구 단위 묶음 기준점)
      req.user.dong = dong;         // 세션에 '읍/면/동' 최신화
      req.user.contact = contact;
      
      // 만약 비밀번호가 실제로 변경되었다면 세션 내 정보도 동기화
      if (updateData.password) {
        req.user.password = updateData.password;
      }

      // 패스포트 세션을 안전하게 다시 구워줍니다
      req.login(req.user, (err) => {
        if (err) {
          console.error(err);
          req.flash('error', '세션 갱신 중 오류가 발생했습니다.');
          return res.redirect('/settings');
        }
        
        // 세션이 메모리/저장소에 완전히 기록된 것을 보장한 후 리다이렉트합니다.
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error(saveErr);
            req.flash('error', '세션 저장 중 오류가 발생했습니다.');
            return res.redirect('/settings');
          }
          req.flash('success', '정보가 성공적으로 저장되었습니다!');
          return res.redirect('/settings');
        });
      });

    } catch (err) {
      console.error(err);
      req.flash('error', '저장 중 오류가 발생했습니다.');
      res.redirect('/settings');
    }
  },

  // 3. 회원 탈퇴
  withdraw: async (req, res) => {
    try {
      const memberId = req.user.memberId;
      const { OwnedIngredient, Fridge, Park, ParkItem, Inventory, SharingPost: SP } = require('../models');
      
      // 공원 아이템 먼저 삭제
      const park = await Park.findOne({ where: { memberId } });
      if (park) await ParkItem.destroy({ where: { parkId: park.parkId } });
      
      await Inventory.destroy({ where: { memberId } });
      await Park.destroy({ where: { memberId } });
      await OwnedIngredient.destroy({ where: { memberId } });
      await SP.destroy({ where: { memberId } });
      await Fridge.destroy({ where: { memberId } });
      await Member.destroy({ where: { memberId } });
      req.logout((err) => {
        if (err) return res.redirect('/dashboard');
        res.redirect('/');
      });
    } catch (err) {
      console.error(err);
      req.flash('error', '탈퇴 중 오류가 발생했습니다.');
      res.redirect('/settings');
    }
  },
};

module.exports = settingsController;