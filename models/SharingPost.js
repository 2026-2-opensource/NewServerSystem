const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SharingPost extends Model {
    static associate(models) {
      SharingPost.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      SharingPost.belongsTo(models.OwnedIngredient, { foreignKey: 'ownedIngredientId', as: 'ownedIngredient' });
      
      if (models.ChatRoom) {
          SharingPost.hasMany(models.ChatRoom, { foreignKey: 'sharingId', as: 'chatRooms' });
      }
    }
  }

  SharingPost.init(
    {
      sharingId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
      ownedIngredientId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'owned_ingredients', key: 'ownedIngredientId' },
      },
      postContent: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      postTitle: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      registeredQuantity: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1개',
      },
      sharingStatus: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'false=나눔중, true=나눔완료',
      },
      city: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      district: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      dong: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'SharingPost',
      tableName: 'sharing_posts',
      timestamps: true,
    }
  );

  return SharingPost;
};