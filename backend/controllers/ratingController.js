const db = require("../models");
const logAudit = require("../utils/logAudit");
const { getGuardianForUser } = require("../services/subscriptionService");
const { updateDriverAverageRating } = require("../services/ratingService");

const Rating = db.ratings;
const EmergencyRide = db.emergencyrides;
const Driver = db.drivers;
const Guardian = db.guardians;
const User = db.users;

/**
 * POST /api/emergency-rides/:id/rate  or  POST /api/ratings
 * Guardian rates an emergency ride driver
 */
const rateEmergencyDriver = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const guardian = await getGuardianForUser(req.user.id);
    if (!guardian) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active guardian profile is required" });
    }

    const emergencyRideId = req.params.id || req.body.emergencyRideId;
    const { rating, comment } = req.body;

    if (!emergencyRideId) {
      await transaction.rollback();
      return res.status(400).json({ message: "emergencyRideId is required" });
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      await transaction.rollback();
      return res.status(400).json({ message: "Rating must be an integer between 1 and 5" });
    }

    const ride = await EmergencyRide.findOne({
      where: { id: emergencyRideId, guardianId: guardian.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found or unauthorized" });
    }

    if (ride.status !== "COMPLETED") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Only completed emergency rides can be rated. Current status: ${ride.status}`,
      });
    }

    if (!ride.driverId) {
      await transaction.rollback();
      return res.status(400).json({ message: "This ride has no assigned driver to rate" });
    }

    const existingRating = await Rating.findOne({
      where: { emergencyRideId },
      transaction,
    });

    if (existingRating) {
      await transaction.rollback();
      return res.status(409).json({ message: "This emergency ride has already been rated" });
    }

    const newRating = await Rating.create(
      {
        emergencyRideId: ride.id,
        guardianId: guardian.id,
        driverId: ride.driverId,
        rating: numericRating,
        comment: comment?.trim() || null,
      },
      { transaction },
    );

    // Update driver average rating
    const newAverage = await updateDriverAverageRating(ride.driverId, transaction);

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_driver_rated",
      entity: "Rating",
      entityId: newRating.id,
      metadata: {
        driverId: ride.driverId,
        emergencyRideId: ride.id,
        rating: numericRating,
        newDriverAverage: newAverage,
      },
      transaction,
    });

    await transaction.commit();

    return res.status(201).json({
      message: "Driver rated successfully",
      rating: newRating,
      driverAverageRating: newAverage,
    });
  } catch (error) {
    if (transaction && !transaction.finished) await transaction.rollback();
    console.error("rateEmergencyDriver error:", error);
    return res.status(500).json({ message: "Failed to rate driver" });
  }
};

/**
 * GET /api/ratings/driver/:driverId
 * Get ratings list for a driver
 */
const getDriverRatings = async (req, res) => {
  try {
    const { driverId } = req.params;
    const page = parseInt(req.query.page || 1, 10);
    const limit = parseInt(req.query.limit || 10, 10);
    const offset = (page - 1) * limit;

    const { count, rows } = await Rating.findAndCountAll({
      where: { driverId },
      include: [
        {
          model: Guardian,
          as: "guardian",
          include: [{ model: User, as: "user", attributes: ["fullname"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset,
    });

    return res.status(200).json({
      ratings: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt,
        guardianName: r.guardian?.user?.fullname || "Guardian",
      })),
      total: count,
      page,
      totalPages: Math.ceil(count / limit),
    });
  } catch (error) {
    console.error("getDriverRatings error:", error);
    return res.status(500).json({ message: "Failed to fetch driver ratings" });
  }
};

/**
 * GET /api/ratings/driver/:driverId/summary
 * Get summary stats for a driver
 */
const getDriverRatingSummary = async (req, res) => {
  try {
    const { driverId } = req.params;

    const driver = await Driver.findByPk(driverId);
    if (!driver) return res.status(404).json({ message: "Driver not found" });

    const totalRatings = await Rating.count({ where: { driverId } });

    return res.status(200).json({
      driverId,
      averageRating: driver.rating || 0,
      totalRatings,
    });
  } catch (error) {
    console.error("getDriverRatingSummary error:", error);
    return res.status(500).json({ message: "Failed to fetch rating summary" });
  }
};

module.exports = {
  rateEmergencyDriver,
  getDriverRatings,
  getDriverRatingSummary,
};
