const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ChatMessage extends Model {
    static associate(models) {
      ChatMessage.belongsTo(models.ChatRoom, { foreignKey: 'roomId', as: 'room' });
      ChatMessage.belongsTo(models.Member, { foreignKey: 'senderId', as: 'sender', constraints: false });
    }
  }

  ChatMessage.init({
    messageId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roomId: { type: DataTypes.INTEGER, allowNull: false },
    senderId: { type: DataTypes.STRING(20), allowNull: true },
    content: { type: DataTypes.TEXT, allowNull: false },
    isSystem: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { sequelize, modelName: 'ChatMessage', tableName: 'chat_messages', timestamps: true });

  return ChatMessage;
};