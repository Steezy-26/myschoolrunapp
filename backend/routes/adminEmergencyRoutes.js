const express = require("express");
const { passport, requireRole } = require("../config/passport");
const {
  getAllEmergencyRides,
  toggleDriverEmergencyVerification,
  getEmergencyStats,
} = require("../controllers/adminEmergencyController");

const router = express.Router();
const authenticate = passport.authenticate("jwt", { session: false });

router.use(authenticate);
router.use(requireRole(["admin", "super-admin"]));

router.get("/all", getAllEmergencyRides);
router.get("/stats", getEmergencyStats);
router.patch("/drivers/:driverId/verification", toggleDriverEmergencyVerification);

module.exports = router;
