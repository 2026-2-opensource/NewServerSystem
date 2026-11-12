const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatRoom extends Model {
    static associate(models) {
      ChatRoom.belongsTo(models.SharingPost, { foreignKey: 'sharingId', as: 'sharingPost' });
      ChatRoom.belongsTo(models.Member, { foreignKey: 'sellerId', as: 'seller' });
      ChatRoom.belongsTo(models.Member, { foreignKey: 'buyerId', as: 'buyer' });
      ChatRoom.hasMany(models.ChatMessage, { foreignKey: 'roomId', as: 'messages' });
    }
  }

  ChatRoom.init(
    {
      roomId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      sharingId: { type: DataTypes.INTEGER, allowNull: false },
      sellerId: { type: DataTypes.STRING(20), allowNull: false },
      buyerId: { type: DataTypes.STRING(20), allowNull: false },
      sellerLeft: { type: DataTypes.BOOLEAN, defaultValue: false },
      buyerLeft: { type: DataTypes.BOOLEAN, defaultValue: false }
    },
    { sequelize, modelName: 'ChatRoom', tableName: 'chat_rooms', timestamps: true }
  );
  return ChatRoom;
};