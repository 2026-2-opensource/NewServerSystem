const passport = require('passport');
const bcrypt = require('bcryptjs');
const { Member, Park, Fridge } = require('../models');

const authController = {
  // GET /auth/login
  getLogin: (req, res) => {
    res.render('auth/login', {
      title: '로그인',
      layout: 'layouts/auth',
    });
  },

  // POST /auth/login
  postLogin: (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        req.flash('error', info.message);
        return res.redirect('/auth/login');
      }
      req.logIn(user, (err) => {
        if (err) return next(err);
        req.flash('success', `환영합니다, ${user.memberName}님!`);
        return res.redirect('/dashboard');
      });
    })(req, res, next);
  },

  // GET /auth/register
  getRegister: (req, res) => {
    res.render('auth/register', {
      title: '회원가입',
      layout: 'layouts/auth',
    });
  },

  // POST /auth/register
  postRegister: async (req, res) => {
    try {
      const { memberId, memberName, password, city, district, dong, contact } = req.body;

      const existing = await Member.findByPk(memberId);
      if (existing) {
        req.flash('error', '이미 사용 중인 아이디입니다.');
        return res.redirect('/auth/register');
      }

      const hashedPw = await bcrypt.hash(password, 12);

      const newMember = await Member.create({
        memberId,
        memberName,
        password: hashedPw,
        city,
        district,
        dong,
        contact,
      });

      // 기본 냉장고 생성
      await Fridge.create({ fridgeName: '기본 냉장고', memberId: newMember.memberId });

      // 기본 공원 생성
      await Park.create({ memberId: newMember.memberId, parkName: `${memberName}의 공원` });

      req.flash('success', '회원가입이 완료되었습니다. 로그인해주세요.');
      res.redirect('/auth/login');
    } catch (err) {
      console.error(err);
      req.flash('error', '회원가입 중 오류가 발생했습니다.');
      res.redirect('/auth/register');
    }
  },

  // GET /auth/logout
  logout: (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.flash('success', '로그아웃되었습니다.');
      res.redirect('/');
    });
  },
  getFindPassword: (req, res) => {
    res.render('auth/find-password', {
      title: '비밀번호 찾기',
      layout: 'layouts/auth', // 로그인/회원가입과 동일한 깔끔한 레이아웃 적용
    });
  },

  // 💡 새로 추가할 메서드 2: 본인 확인 및 비밀번호 변경 처리
  postFindPassword: async (req, res) => {
    try {
      const { memberId, memberName, phone1, phone2, phone3, newPassword } = req.body;

      // 1. EJS에서 쪼개진 전화번호를 DB의 'contact' 필드 형식(010-XXXX-XXXX)으로 합치기
      const fullContact = `${phone1}-${phone2}-${phone3}`;

      // 2. DB에서 아이디, 이름, 연락처가 모두 일치하는 회원 찾기
      const member = await Member.findOne({
        where: {
          memberId: memberId,
          memberName: memberName,
          contact: fullContact, // 👈 DB 모델 컬럼명인 contact를 사용합니다!
        },
      });

      // 3. 일치하는 회원이 없는 경우
      if (!member) {
        return res.send('<script>alert("입력하신 정보와 일치하는 회원 정보가 없습니다."); history.back();</script>');
      }

      // 4. 새 비밀번호 암호화 (회원가입과 동일하게 bcrypt에 salt 12 적용)
      const hashedPw = await bcrypt.hash(newPassword, 12);

      // 5. 비밀번호 업데이트 및 저장
      member.password = hashedPw;
      await member.save();

      // 성공 메시지를 플래시(flash)에 담아서 로그인 페이지로 전달
      req.flash('success', '비밀번호가 성공적으로 변경되었습니다. 다시 로그인해주세요.');
      res.redirect('/auth/login');

    } catch (err) {
      console.error(err);
      // 에러 발생 시 알림창 띄우고 이전 화면으로 이동
      res.send('<script>alert("비밀번호 변경 중 오류가 발생했습니다. 다시 시도해 주세요."); history.back();</script>');
    }
  },
};

module.exports = authController;
