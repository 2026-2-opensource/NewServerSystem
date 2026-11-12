const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Block extends Model {
    static associate(models) {
      Block.belongsTo(models.Member, { foreignKey: 'blockerId', as: 'blocker' });
      Block.belongsTo(models.Member, { foreignKey: 'blockedId', as: 'blocked' });
    }
  }

  Block.init({
    blockId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    blockerId: { type: DataTypes.STRING(20), allowNull: false }, // 차단한 사람
    blockedId: { type: DataTypes.STRING(20), allowNull: false }  // 차단된 사람
  }, { sequelize, modelName: 'Block', tableName: 'blocks', timestamps: true });

  return Block;
};