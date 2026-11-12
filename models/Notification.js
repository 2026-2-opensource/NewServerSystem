const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Notification extends Model {
    static associate(models) {
      Notification.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
    }
  }

  Notification.init({
    notificationId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    memberId: { type: DataTypes.STRING(20), allowNull: false },
    type: { type: DataTypes.STRING(20), allowNull: false }, // 'CHAT', 'REVIEW', 'SHARING' 등
    content: { type: DataTypes.STRING(255), allowNull: false },
    link: { type: DataTypes.STRING(255), allowNull: true },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { 
    sequelize, 
    modelName: 'Notification', 
    tableName: 'notifications', 
    timestamps: true 
  });

  return Notification;
};