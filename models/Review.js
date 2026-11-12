const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Review extends Model {
    static associate(models) {
      // 누가 누구에게 썼는지, 어떤 나눔글에 대한 것인지 연결
      Review.belongsTo(models.Member, { foreignKey: 'reviewerId', as: 'reviewer' });
      Review.belongsTo(models.Member, { foreignKey: 'revieweeId', as: 'reviewee' });
      Review.belongsTo(models.SharingPost, { foreignKey: 'sharingId', as: 'sharingPost' });
    }
  }

  Review.init({
    reviewId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    sharingId: { type: DataTypes.INTEGER, allowNull: false },
    reviewerId: { type: DataTypes.STRING(20), allowNull: false },
    revieweeId: { type: DataTypes.STRING(20), allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 5 },
    content: { type: DataTypes.TEXT, allowNull: true }
  }, { 
    sequelize, 
    modelName: 'Review', 
    tableName: 'reviews', 
    timestamps: true 
  });

  return Review;
};