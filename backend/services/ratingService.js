const db = require("../models");
const Rating = db.ratings;
const Driver = db.drivers;

/**
 * Recalculate average rating for a driver and save to Driver model
 */
const updateDriverAverageRating = async (driverId, transaction = null) => {
  try {
    const ratings = await Rating.findAll({
      where: { driverId },
      attributes: ["rating"],
      transaction,
    });

    if (!ratings || ratings.length === 0) {
      return 0;
    }

    const total = ratings.reduce((sum, r) => sum + r.rating, 0);
    const average = Math.round((total / ratings.length) * 10) / 10;

    await Driver.update(
      { rating: average },
      { where: { id: driverId }, transaction },
    );

    return average;
  } catch (error) {
    console.error("updateDriverAverageRating error:", error);
    throw error;
  }
};

module.exports = {
  updateDriverAverageRating,
};
