const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Member extends Model {
    static associate(models) {
      Member.hasMany(models.Fridge, { foreignKey: 'memberId', as: 'fridges' });
      Member.hasMany(models.OwnedIngredient, { foreignKey: 'memberId', as: 'ownedIngredients' });
      Member.hasMany(models.SavedIngredient, { foreignKey: 'memberId', as: 'savedIngredients' });
      Member.hasMany(models.SharingPost, { foreignKey: 'memberId', as: 'sharingPosts' });
      Member.hasMany(models.SavedRecipe, { foreignKey: 'memberId', as: 'savedRecipes' });
      Member.hasOne(models.Park, { foreignKey: 'memberId', as: 'park' });
    }
  }

  Member.init(
    {
      memberId: {
        type: DataTypes.STRING(20),
        primaryKey: true,
        allowNull: false,
      },
      memberName: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      password: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      city: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '주소 복합속성',
      },
      district: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '주소 복합속성',
      },
      dong: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '주소 복합속성',
      },
      contact: {
        type: DataTypes.STRING(20),
        allowNull: false,
      },
      cumulativeSavings: {
        type: DataTypes.BIGINT,
        allowNull: false,
        defaultValue: 0,
      },
      cumulativeCarbonReduction: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      totalConsumed: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      hasNewParkItem: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      sharingAgreement: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      sharingAgreementAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
    },
    {
      sequelize,
      modelName: 'Member',
      tableName: 'members',
      timestamps: true,
    }
  );

  return Member;
};
