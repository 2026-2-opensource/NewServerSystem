const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ExpiryDate extends Model {
    static associate(models) {
      ExpiryDate.hasMany(models.OwnedIngredient, { foreignKey: 'expiryDateId', as: 'ownedIngredients' });
    }
  }

  ExpiryDate.init(
    {
      expiryDate: {
        type: DataTypes.DATE,
        primaryKey: true,
        allowNull: false,
      },
      sharingAvailable: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: '유통기한에 의해 유도됨',
      },
      riskLevel: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '유통기한에 의해 유도됨',
      },
    },
    {
      sequelize,
      modelName: 'ExpiryDate',
      tableName: 'expiry_dates',
      timestamps: false,
    }
  );

  return ExpiryDate;
};
