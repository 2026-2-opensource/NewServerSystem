const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const { Member } = require('../models');

module.exports = () => {
  // 세션에 사용자 정보 저장
  passport.serializeUser((user, done) => {
    done(null, user.memberId);
  });

  // 세션에서 사용자 정보 복원
  passport.deserializeUser(async (id, done) => {
    try {
      const member = await Member.findByPk(id);
      done(null, member);
    } catch (err) {
      done(err);
    }
  });

  // 로컬 로그인 전략
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'memberId',
        passwordField: 'password',
        passReqToCallback: false,
      },
      async (memberId, password, done) => {
        try {
          const member = await Member.findByPk(memberId);
          if (!member) {
            return done(null, false, { message: '존재하지 않는 아이디입니다.' });
          }

          const isMatch = await bcrypt.compare(password, member.password);
          if (!isMatch) {
            return done(null, false, { message: '비밀번호가 일치하지 않습니다.' });
          }

          return done(null, member);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
};
