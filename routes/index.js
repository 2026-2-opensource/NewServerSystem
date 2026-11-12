const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.render('home/index', { title: '다시오숲', layout: 'layouts/landing' });
});

module.exports = router;
