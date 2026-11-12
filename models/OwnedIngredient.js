const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class OwnedIngredient extends Model {
    static associate(models) {
      OwnedIngredient.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      OwnedIngredient.belongsTo(models.Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });
      OwnedIngredient.belongsTo(models.Fridge, { foreignKey: 'fridgeId', as: 'fridge' });
      OwnedIngredient.hasMany(models.SharingPost, { foreignKey: 'ownedIngredientId', as: 'sharingPosts' });
      //OwnedIngredient.belongsTo(models.ExpiryDate, {foreignKey: 'expiryDate', as: 'expiry'});
    }
  }

  OwnedIngredient.init(
    {
      ownedIngredientId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
      ingredientId: {
        type: DataTypes.INTEGER,
        references: { model: 'ingredients', key: 'ingredientId' },
      },
      fridgeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'fridges', key: 'fridgeId' },
      },
      purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      expiryDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      quantity: {
        type: DataTypes.STRING(50),
        allowNull: true,
      },

      amount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
      },
      expiryType: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: '유통기한',
        comment: '유통기한/소비기한/제조일자',
      },
      memo: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      ingredientName: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '수기 입력 식재료명',
      },
      categoryInfo: {
        type: DataTypes.STRING(30),
        allowNull: true,
        comment: '수기 입력 카테고리',
      },
      storageMethod: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: '수기 입력 보관방법',
      },
      isSharing: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'OwnedIngredient',
      tableName: 'owned_ingredients',
      timestamps: true,
    }
  );

  return OwnedIngredient;
};
