const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Fridge extends Model {
    static associate(models) {
      Fridge.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      Fridge.hasMany(models.OwnedIngredient, { foreignKey: 'fridgeId', as: 'ownedIngredients' });
    }
  }

  Fridge.init(
    {
      fridgeId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      fridgeName: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
    },
    {
      sequelize,
      modelName: 'Fridge',
      tableName: 'fridges',
      timestamps: true,
    }
  );

  return Fridge;
};
