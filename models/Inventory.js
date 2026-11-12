const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Inventory extends Model {
    static associate(models) {
      Inventory.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
      Inventory.belongsTo(models.ParkItemTemplate, { foreignKey: 'templateId', as: 'template' });
    }
  }

  Inventory.init(
    {
      inventoryId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      memberId: {
        type: DataTypes.STRING(20),
        allowNull: false,
        references: { model: 'members', key: 'memberId' },
      },
      templateId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'park_item_templates', key: 'templateId' },
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      isNew: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'Inventory',
      tableName: 'inventories',
      timestamps: false,
    }
  );

  return Inventory;
};
