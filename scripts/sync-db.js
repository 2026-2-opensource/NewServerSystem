require('dotenv').config({ path: '../.env' });
const { sequelize } = require('../models');

async function syncDB() {
  try {
    await sequelize.authenticate();
    console.log('✅ DB 연결 성공');
    // alter:true → 기존 테이블 구조 변경 (컬럼 추가/수정)
    // force:true → 테이블 전부 DROP 후 재생성 (주의: 데이터 삭제됨)
    await sequelize.sync({ alter: true });
    console.log('✅ 모든 테이블 동기화 완료');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB 동기화 오류:', err);
    process.exit(1);
  }
}

syncDB();
