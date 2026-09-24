module.exports = (sequelize, DataTypes) => {
  const Rating = sequelize.define(
    "ratings",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      emergencyRideId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      guardianId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      driverId: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 5,
        },
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      freezeTableName: true,
      timestamps: true,
      indexes: [
        { fields: ["driverId"] },
        { fields: ["guardianId"] },
        { fields: ["emergencyRideId"], unique: true },
      ],
    },
  );

  Rating.associate = (models) => {
    Rating.belongsTo(models.emergencyrides, {
      foreignKey: "emergencyRideId",
      as: "emergencyRide",
      onDelete: "CASCADE",
    });
    Rating.belongsTo(models.guardians, {
      foreignKey: "guardianId",
      as: "guardian",
      onDelete: "CASCADE",
    });
    Rating.belongsTo(models.drivers, {
      foreignKey: "driverId",
      as: "driver",
      onDelete: "CASCADE",
    });
  };

  return Rating;
};
