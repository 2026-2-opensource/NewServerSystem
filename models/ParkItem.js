const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ParkItem extends Model {
    static associate(models) {
      ParkItem.belongsTo(models.Park, { foreignKey: 'parkId', as: 'park' });
      ParkItem.belongsTo(models.ParkItemTemplate, { foreignKey: 'templateId', as: 'template' });
    }
  }

  ParkItem.init(
    {
      parkItemId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      parkId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'parks', key: 'parkId' },
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'park_item_templates', key: 'templateId' },
      },
      posX: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      posY: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      sizeW: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 10,
      },
      sizeH: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 12,
      },
      rotate: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
      direction: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: 'front',
      },
      isPlaced: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '배치여부 (false=인벤토리, true=공원에 배치됨)',
      },
      zOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      sequelize,
      modelName: 'ParkItem',
      tableName: 'park_items',
      timestamps: true,
    }
  );

  return ParkItem;
};
