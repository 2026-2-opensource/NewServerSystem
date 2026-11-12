const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Park extends Model {
    static associate(models) {
      Park.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      Park.hasMany(models.ParkItem, { foreignKey: 'parkId', as: 'parkItems' });
    }
  }

  Park.init(
    {
      parkId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        unique: true,
        references: { model: 'members', key: 'memberId' },
      },
      parkName: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: '나의 공원',
      },
      level: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      totalPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'Park',
      tableName: 'parks',
      timestamps: true,
    }
  );

  return Park;
};
