const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class MonthlyStats extends Model {
    static associate(models) {
        MonthlyStats.belongsTo(models.Member, { foreignKey: 'memberId', as: 'member' });
    }
}

MonthlyStats.init(
    {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    memberId: { type: DataTypes.STRING(20), allowNull: false },
    year: { type: DataTypes.INTEGER, allowNull: false },
    month: { type: DataTypes.INTEGER, allowNull: false },
    savings: { type: DataTypes.BIGINT, defaultValue: 0 },
    carbonReduction: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
    },
    {
    sequelize,
    modelName: 'MonthlyStats',
    tableName: 'monthly_stats',
    timestamps: true,
    }
);

return MonthlyStats;
};