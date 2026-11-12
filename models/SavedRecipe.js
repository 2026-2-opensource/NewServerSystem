const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SavedRecipe extends Model {
    static associate(models) {
      SavedRecipe.belongsTo(models.Recipe, { foreignKey: 'recipeId', as: 'recipe' });
      SavedRecipe.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
    }
  }

  SavedRecipe.init(
    {
      recipeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'recipes', key: 'recipeId' },
      },
      memberId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
    },
    {
      sequelize,
      modelName: 'SavedRecipe',
      tableName: 'saved_recipes',
      timestamps: false,
    }
  );

  return SavedRecipe;
};
