const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ParkItemTemplate extends Model {
    static associate(models) {
      ParkItemTemplate.hasMany(models.ParkItem, { foreignKey: 'templateId', as: 'parkItems' });
      ParkItemTemplate.hasMany(models.Inventory, { foreignKey: 'templateId', as: 'inventories' });
    }
  }

  ParkItemTemplate.init(
    {
      templateId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      itemName: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      itemCategory: {
        type: DataTypes.STRING(20),
        allowNull: false,
        comment: '식물/가구/장식/동물',
      },
      itemEmoji: {
        type: DataTypes.STRING(10),
        allowNull: true,
      },
      itemImage: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: '이미지 파일 기본명 (방향 접미사 제외)',
      },
      defaultW: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 10,
        comment: '기본 너비 (%)',
      },
      defaultH: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 12,
        comment: '기본 높이 (%)',
      },
      itemDescription: {
        type: DataTypes.STRING(200),
        allowNull: true,
      },
      requiredPoints: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 10,
      },
      rarity: {
        type: DataTypes.STRING(10),
        allowNull: false,
        defaultValue: 'common',
        comment: 'common/rare/epic/legendary',
      },
      width: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
      height: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    },
    {
      sequelize,
      modelName: 'ParkItemTemplate',
      tableName: 'park_item_templates',
      timestamps: false,
    }
  );

  return ParkItemTemplate;
};
