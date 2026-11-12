const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Ingredient extends Model {
    static associate(models) {
      Ingredient.hasMany(models.OwnedIngredient, { foreignKey: 'ingredientId', as: 'ownedIngredients' });
      Ingredient.hasMany(models.SavedIngredient, { foreignKey: 'ingredientId', as: 'savedIngredients' });
      Ingredient.hasMany(models.Recipe, { foreignKey: 'ingredientId', as: 'recipes' });
    }
  }

  Ingredient.init(
    {
      ingredientId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      ingredientName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      recommendedExpiry: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '날짜가 아닌 보관가능 기간의 개념 (일수)',
      },
      categoryInfo: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      storageMethod: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Ingredient',
      tableName: 'ingredients',
      timestamps: false,
    }
  );

  return Ingredient;
};
