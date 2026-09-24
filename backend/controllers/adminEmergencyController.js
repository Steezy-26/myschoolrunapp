const db = require("../models");
const EmergencyRide = db.emergencyrides;
const Driver = db.drivers;
const Guardian = db.guardians;
const Student = db.students;
const Vehicle = db.vehicles;
const User = db.users;
const Rating = db.ratings;

/**
 * GET /api/admin/emergency-rides
 * Fetch all emergency rides with filter/pagination for admin overview
 */
const getAllEmergencyRides = async (req, res) => {
  try {
    const page = parseInt(req.query.page || 1, 10);
    const limit = parseInt(req.query.limit || 20, 10);
    const offset = (page - 1) * limit;
    const { status } = req.query;

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows } = await EmergencyRide.findAndCountAll({
      where,
      include: [
        {
          model: Guardian,
          as: "guardian",
          include: [{ model: User, as: "user", attributes: ["id", "fullname", "email", "phoneNumber"] }],
        },
        { model: Student, as: "student", attributes: ["id", "fullName"] },
        {
          model: Driver,
          as: "driver",
          include: [{ model: User, as: "user", attributes: ["id", "fullname", "phoneNumber"] }],
        },
        { model: Vehicle, as: "vehicle" },
      ],
      order: [["requestedAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      rides: rows,
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("getAllEmergencyRides error:", error);
    return res.status(500).json({ message: "Failed to fetch emergency rides" });
  }
};

/**
 * PATCH /api/admin/emergency-rides/drivers/:driverId/verification
 * Toggle driver emergency ride eligibility
 */
const toggleDriverEmergencyVerification = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { emergencyRideEnabled, identityVerified, licenseVerified } = req.body;

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (emergencyRideEnabled !== undefined) driver.emergencyRideEnabled = Boolean(emergencyRideEnabled);
    if (identityVerified !== undefined) driver.identityVerified = Boolean(identityVerified);
    if (licenseVerified !== undefined) driver.licenseVerified = Boolean(licenseVerified);

    await driver.save();

    return res.status(200).json({
      message: "Driver emergency verification updated successfully",
      driver: {
        id: driver.id,
        emergencyRideEnabled: driver.emergencyRideEnabled,
        identityVerified: driver.identityVerified,
        licenseVerified: driver.licenseVerified,
      },
    });
  } catch (error) {
    console.error("toggleDriverEmergencyVerification error:", error);
    return res.status(500).json({ message: "Failed to update driver verification" });
  }
};

/**
 * GET /api/admin/emergency-rides/stats
 * Emergency ride statistics for dashboard
 */
const getEmergencyStats = async (req, res) => {
  try {
    const totalRides = await EmergencyRide.count();
    const activeRides = await EmergencyRide.count({
      where: {
        status: [
          "REQUESTED", "SEARCHING", "DRIVER_SELECTED", "DRIVER_ACCEPTED",
          "DRIVER_ARRIVING", "STUDENT_PICKED_UP", "IN_TRANSIT"
        ],
      },
    });
    const completedRides = await EmergencyRide.count({ where: { status: "COMPLETED" } });
    const cancelledRides = await EmergencyRide.count({ where: { status: "CANCELLED" } });
    const eligibleDrivers = await Driver.count({ where: { emergencyRideEnabled: true, isActive: true } });

    return res.status(200).json({
      totalRides,
      activeRides,
      completedRides,
      cancelledRides,
      eligibleDrivers,
    });
  } catch (error) {
    console.error("getEmergencyStats error:", error);
    return res.status(500).json({ message: "Failed to fetch emergency stats" });
  }
};

module.exports = {
  getAllEmergencyRides,
  toggleDriverEmergencyVerification,
  getEmergencyStats,
};
