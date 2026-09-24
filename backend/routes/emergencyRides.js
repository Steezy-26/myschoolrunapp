const express = require("express");
const rateLimit = require("express-rate-limit");
const { passport, requireRole } = require("../config/passport");
const { requireProFeature } = require("../services/subscriptionService");
const {
  requestEmergencyRide,
  cancelEmergencyRide,
  getAvailableDrivers,
  selectDriver,
  acceptEmergencyRide,
  rejectEmergencyRide,
  markDriverArriving,
  markStudentPickedUp,
  startTrip,
  completeTrip,
} = require("../controllers/emergencyRideController");

const router = express.Router();
const authenticate = passport.authenticate("jwt", { session: false });

const emergencyRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 emergency requests per 15 minutes
  message: { message: "Too many emergency ride requests. Please wait a few minutes before trying again." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Guardian Operations ───────────────────────────────────────────────────────

router.post(
  "/request",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  emergencyRequestLimiter,
  requestEmergencyRide,
);

router.get(
  "/:id/available-drivers",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  getAvailableDrivers,
);

const { rateEmergencyDriver } = require("../controllers/ratingController");

router.post(
  "/:id/select-driver",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  selectDriver,
);

router.post(
  "/:id/rate",
  authenticate,
  requireRole("guardian"),
  requireProFeature,
  rateEmergencyDriver,
);

// ─── Driver Operations (PHASE 9 & 10) ──────────────────────────────────────────

router.post(
  "/:id/accept",
  authenticate,
  requireRole("driver"),
  acceptEmergencyRide,
);

router.post(
  "/:id/reject",
  authenticate,
  requireRole("driver"),
  rejectEmergencyRide,
);

router.post(
  "/:id/arriving",
  authenticate,
  requireRole("driver"),
  markDriverArriving,
);

router.post(
  "/:id/pickup",
  authenticate,
  requireRole("driver"),
  markStudentPickedUp,
);

router.post(
  "/:id/start",
  authenticate,
  requireRole("driver"),
  startTrip,
);

router.post(
  "/:id/complete",
  authenticate,
  requireRole("driver"),
  completeTrip,
);

// ─── Cancellation (Both Guardian & Driver) ─────────────────────────────────────

router.post(
  "/:id/cancel",
  authenticate,
  cancelEmergencyRide,
);

module.exports = router;

