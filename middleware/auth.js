// 로그인 체크 미들웨어
const isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash('error', '로그인이 필요한 서비스입니다.');
  res.redirect('/auth/login');
};

// 비로그인 체크 미들웨어 (이미 로그인된 경우 대시보드로)
const isNotLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect('/dashboard');
};

module.exports = { isLoggedIn, isNotLoggedIn };
