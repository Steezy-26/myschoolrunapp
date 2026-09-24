"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, DataTypes) {
    await queryInterface.createTable("ratings", {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      emergencyRideId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: "emergencyrides", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      guardianId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "guardians", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      driverId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "drivers", key: "id" },
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex("ratings", ["driverId"]);
    await queryInterface.addIndex("ratings", ["guardianId"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ratings");
  },
};
