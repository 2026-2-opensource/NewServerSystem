const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SavedIngredient extends Model {
    static associate(models) {
      SavedIngredient.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      SavedIngredient.belongsTo(models.Ingredient, { foreignKey: 'ingredientId', as: 'ingredient' });
    }
  }

  SavedIngredient.init(
    {
      memberId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
      ingredientId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull: false,
        references: { model: 'ingredients', key: 'ingredientId' },
      },
      discardCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      purchaseCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      currentlyOwned: {
        type: DataTypes.BOOLEAN,
        primaryKey: true,
        allowNull: false,
        defaultValue: false,
      },
      purchaseDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'SavedIngredient',
      tableName: 'saved_ingredients',
      timestamps: false,
    }
  );

  return SavedIngredient;
};
