const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Recipe extends Model {
    static associate(models) {
      Recipe.belongsTo(models.Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });
      Recipe.hasMany(models.SavedRecipe, { foreignKey: 'recipeId', as: 'savedRecipes' });
    }
  }

  Recipe.init(
    {
      recipeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      recipeContent: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      recipeName: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      ingredientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'ingredients', key: 'ingredientId' },
      },
    },
    {
      sequelize,
      modelName: 'Recipe',
      tableName: 'recipes',
      timestamps: false,
    }
  );

  return Recipe;
};
