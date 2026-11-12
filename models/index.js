'use strict';

const { Sequelize } = require('sequelize');
const config = require('../config/config');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    define: dbConfig.define,
    pool: dbConfig.pool,
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// 모델 로드
db.Member = require('./Member')(sequelize);
db.Fridge = require('./Fridge')(sequelize);
db.Ingredient = require('./Ingredient')(sequelize);
db.OwnedIngredient = require('./OwnedIngredient')(sequelize);
db.SavedIngredient = require('./SavedIngredient')(sequelize);
db.Recipe = require('./Recipe')(sequelize);
db.SavedRecipe = require('./SavedRecipe')(sequelize);
db.SharingPost = require('./SharingPost')(sequelize);
db.ExpiryDate = require('./ExpiryDate')(sequelize);
db.Park = require('./Park')(sequelize);
db.ParkItemTemplate = require('./ParkItemTemplate')(sequelize);
db.ParkItem = require('./ParkItem')(sequelize);
db.Inventory = require('./Inventory')(sequelize);
db.MonthlyStats = require('./MonthlyStats')(sequelize);
db.ChatRoom = require('./ChatRoom')(sequelize, Sequelize);
db.ChatMessage = require('./ChatMessage')(sequelize, Sequelize);
db.Notification = require('./Notification')(sequelize, Sequelize);
db.Review = require('./Review')(sequelize, Sequelize);
db.Block = require('./Block')(sequelize, Sequelize);

// 관계 설정
Object.keys(db).forEach((modelName) => {
  if (db[modelName] && db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
