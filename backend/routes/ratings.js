const express = require("express");
const { passport, requireRole } = require("../config/passport");
const { requireProFeature } = require("../services/subscriptionService");
const {
  rateEmergencyDriver,
  getDriverRatings,
  getDriverRatingSummary,
} = require("../controllers/ratingController");

const router = express.Router();
const authenticate = passport.authenticate("jwt", { session: false });

// Guardian rates driver for an emergency ride
router.post(
  "/:id/rate",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  rateEmergencyDriver,
);

// Generic rate endpoint (if emergencyRideId passed in body)
router.post(
  "/rate",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  rateEmergencyDriver,
);

// Get ratings for a driver
router.get("/driver/:driverId", authenticate, getDriverRatings);

// Get rating summary for a driver
router.get("/driver/:driverId/summary", authenticate, getDriverRatingSummary);

module.exports = router;
