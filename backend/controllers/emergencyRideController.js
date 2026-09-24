const { Op } = require("sequelize");
const db = require("../models/index");
const logAudit = require("../utils/logAudit");
const { getGuardianForUser } = require("../services/subscriptionService");

const EmergencyRide = db.emergencyrides;
const GuardianStudent = db.guardianstudents;
const Student = db.students;
const VehicleAssignment = db.vehicleassignments;
const Driver = db.drivers;
const Vehicle = db.vehicles;
const VehicleRoute = db.vehicleroutes;
const DriverService = db.driverservices;
const User = db.users;

// ─── Geographic Utilities ──────────────────────────────────────────────────────

/** Haversine distance in kilometers */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const AVG_SPEED_KMH = 30; // Average vehicle speed for ETA estimation

const ACTIVE_STATUSES = [
  "REQUESTED",
  "SEARCHING",
  "DRIVER_SELECTED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVING",
  "STUDENT_PICKED_UP",
  "IN_TRANSIT",
  "STUDENT_DROPPED_OFF",
];

const CANCELLABLE_STATUSES = [
  "REQUESTED",
  "SEARCHING",
  "DRIVER_SELECTED",
  "DRIVER_ACCEPTED",
  "DRIVER_ARRIVING",
];

const isCoordinate = (value, min, max) =>
  typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

const validateRequest = (body) => {
  const errors = {};
  ["studentId", "pickupAddress", "destinationAddress", "tripType", "emergencyReason"].forEach((field) => {
    if (typeof body[field] !== "string" || !body[field].trim()) errors[field] = "is required";
  });

  [
    ["pickupLatitude", -90, 90],
    ["pickupLongitude", -180, 180],
    ["destinationLatitude", -90, 90],
    ["destinationLongitude", -180, 180],
  ].forEach(([field, min, max]) => {
    if (!isCoordinate(body[field], min, max)) errors[field] = "must be a valid coordinate";
  });

  const pickupTime = new Date(body.requestedPickupTime);
  if (!body.requestedPickupTime || Number.isNaN(pickupTime.getTime())) {
    errors.requestedPickupTime = "must be a valid date";
  } else if (pickupTime <= new Date()) {
    errors.requestedPickupTime = "must be in the future";
  }

  return errors;
};

const rideIncludes = [
  { model: db.guardians, as: "guardian" },
  { model: Student, as: "student" },
  { model: Driver, as: "driver" },
  { model: Driver, as: "originalDriver" },
  { model: Vehicle, as: "vehicle" },
  { model: VehicleRoute, as: "route" },
];

const requestEmergencyRide = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const errors = validateRequest(req.body);
    if (Object.keys(errors).length) {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid emergency ride request", errors });
    }

    const guardianId = req.guardian.id;
    const { studentId } = req.body;
    const student = await Student.findByPk(studentId, { transaction });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({ message: "Student not found" });
    }
    if (!student.isActive) {
      await transaction.rollback();
      return res.status(400).json({ message: "Student is inactive" });
    }

    const link = await GuardianStudent.findOne({
      where: { guardianId, studentId },
      transaction,
    });
    if (!link) {
      await transaction.rollback();
      return res.status(403).json({ message: "Student is not linked to this guardian" });
    }

    const conflictingRide = await EmergencyRide.findOne({
      where: { studentId, status: { [Op.in]: ACTIVE_STATUSES } },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (conflictingRide) {
      await transaction.rollback();
      return res.status(409).json({ message: "Student already has an active emergency ride" });
    }

    const now = new Date();
    const assignment = await VehicleAssignment.findOne({
      where: {
        studentId,
        status: "active",
        isActive: true,
        effectiveFrom: { [Op.lte]: now },
        [Op.or]: [{ effectiveTo: null }, { effectiveTo: { [Op.gt]: now } }],
      },
      include: [
        { model: Vehicle, as: "vehicle", include: [{ model: Driver, as: "driver" }] },
        { model: VehicleRoute, as: "route" },
      ],
      order: [["effectiveFrom", "DESC"]],
      transaction,
    });

    const ride = await EmergencyRide.create(
      {
        guardianId,
        studentId,
        originalDriverId: assignment?.vehicle?.driver?.id || null,
        vehicleId: assignment?.vehicleId || null,
        routeId: assignment?.routeId || null,
        pickupAddress: req.body.pickupAddress.trim(),
        pickupLatitude: req.body.pickupLatitude,
        pickupLongitude: req.body.pickupLongitude,
        destinationAddress: req.body.destinationAddress.trim(),
        destinationLatitude: req.body.destinationLatitude,
        destinationLongitude: req.body.destinationLongitude,
        tripType: req.body.tripType.trim(),
        requestedPickupTime: new Date(req.body.requestedPickupTime),
        emergencyReason: req.body.emergencyReason.trim(),
        specialInstructions: req.body.specialInstructions?.trim() || null,
        status: "SEARCHING",
        requestedAt: now,
      },
      { transaction },
    );

    await transaction.commit();
    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_requested",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: { guardianId, studentId, status: ride.status },
    });

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    return res.status(201).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("requestEmergencyRide error:", error);
    return res.status(500).json({ message: "Failed to create emergency ride request" });
  }
};

const cancelEmergencyRide = async (req, res) => {
  try {
    const guardian = await getGuardianForUser(req.user.id);
    if (!guardian) return res.status(403).json({ message: "Active guardian profile is required" });

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, guardianId: guardian.id },
    });
    if (!ride) return res.status(404).json({ message: "Emergency ride not found" });
    if (!CANCELLABLE_STATUSES.includes(ride.status)) {
      return res.status(409).json({ message: "Emergency ride cannot be cancelled in its current status" });
    }

    ride.status = "CANCELLED";
    ride.cancelledAt = new Date();
    ride.cancellationReason = req.body.cancellationReason?.trim() || null;
    await ride.save();

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_cancelled",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: { reason: ride.cancellationReason, status: ride.status },
    });

    return res.status(200).json(ride);
  } catch (error) {
    console.error("cancelEmergencyRide error:", error);
    return res.status(500).json({ message: "Failed to cancel emergency ride" });
  }
};

// ─── Helper Functions ──────────────────────────────────────────────────────────

/**
 * Evaluate if a driver is eligible for an emergency ride
 * Returns { eligible: boolean, reasons: string[], distanceKm: number, price: number, currency: string, verificationStatus: string, rating: number, eta: number }
 */
const evaluateEmergencyRideDriverEligibility = (driver, ride) => {
  const reasons = [];
  let eligible = true;
  let distanceKm = 0;
  let price = 0;
  let currency = "USD";
  let rating = 0;
  let eta = null;

  // Basic driver checks
  if (!driver.isActive || !driver.user?.isActive) {
    reasons.push("driver inactive");
    eligible = false;
  }

  if (!driver.identityVerified || !driver.licenseVerified || !driver.user?.isVerified) {
    reasons.push("driver not verified");
    eligible = false;
  }

  if (!driver.emergencyRideEnabled) {
    reasons.push("emergency ride not enabled");
    eligible = false;
  }

  // Check if driver is handling another active ride (conflicting)
  if (driver.busyRide && driver.busyRide.status && 
      ["DRIVER_SELECTED", "DRIVER_ACCEPTED", "DRIVER_ARRIVING", "STUDENT_PICKED_UP", "IN_TRANSIT"].includes(driver.busyRide.status)) {
    reasons.push("driver busy");
    eligible = false;
  }

  // Vehicle checks
  if (!driver.vehicle) {
    reasons.push("no vehicle assigned");
    eligible = false;
  } else {
    const vehicle = driver.vehicle;
    
    if (!vehicle.isActive) {
      reasons.push("vehicle inactive");
      eligible = false;
    }

    if (!vehicle.vehicleVerified || !vehicle.insuranceVerified) {
      reasons.push("vehicle not verified");
      eligible = false;
    }

    if (vehicle.insuranceExpiry && new Date(vehicle.insuranceExpiry) <= new Date()) {
      reasons.push("vehicle insurance expired");
      eligible = false;
    }

    if (!vehicle.capacity || vehicle.capacity < 1) {
      reasons.push("insufficient vehicle capacity");
      eligible = false;
    }
  }

  // Service checks
  if (!driver.service) {
    reasons.push("no service configured");
    eligible = false;
  } else {
    const service = driver.service;

    if (!service.isActive) {
      reasons.push("service not active");
      eligible = false;
    }

    if (service.serviceType !== "emergency_transport" && service.serviceType !== ride.tripType) {
      reasons.push("service type mismatch");
      eligible = false;
    }

    // Check service availability by day and time
    const requestTime = new Date(ride.requestedPickupTime);
    const dayName = requestTime.toLocaleDateString('en-US', { weekday: 'long' });
    
    if (service.availableDays && !service.availableDays.includes(dayName)) {
      reasons.push("service unavailable on requested day");
      eligible = false;
    }

    if (service.availableHours) {
      const timeStr = requestTime.toTimeString().split(' ')[0]; // HH:MM:SS
      const [startHour, startMin] = (service.availableHours.start || "00:00").split(":").map(Number);
      const [endHour, endMin] = (service.availableHours.end || "23:59").split(":").map(Number);
      const [reqHour, reqMin] = timeStr.split(":").map(Number);

      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;
      const reqTime = reqHour * 60 + reqMin;

      if (reqTime < startTime || reqTime > endTime) {
        reasons.push("service unavailable at requested time");
        eligible = false;
      }
    }

    // Calculate distance from service origin to pickup
    if (service.originLatitude != null && service.originLongitude != null) {
      distanceKm = haversineDistance(
        parseFloat(service.originLatitude),
        parseFloat(service.originLongitude),
        parseFloat(ride.pickupLatitude),
        parseFloat(ride.pickupLongitude)
      );
    }

    price = parseFloat(service.price) || 0;
    currency = service.currency || "USD";
  }

  // Calculate ETA
  if (distanceKm > 0) {
    eta = Math.round((distanceKm / AVG_SPEED_KMH) * 60); // minutes
  }

  // Get driver rating (from any rating system if available)
  if (driver.rating != null) {
    rating = parseFloat(driver.rating);
  }

  return {
    eligible,
    reasons,
    distanceKm: Math.round(distanceKm * 10) / 10,
    price,
    currency,
    verificationStatus: driver.identityVerified && driver.licenseVerified ? "verified" : "unverified",
    rating,
    eta,
  };
};

/**
 * Sort drivers by: 1) Availability 2) Distance 3) ETA 4) Rating 5) Price
 */
const sortEmergencyRideDrivers = (drivers) => {
  return drivers.sort((a, b) => {
    // 1. Eligible vs ineligible
    if (a.eligible !== b.eligible) {
      return a.eligible ? -1 : 1;
    }

    // Only sort eligible drivers further
    if (!a.eligible) return 0;

    // 2. Distance (closer first)
    if (a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm;
    }

    // 3. ETA (lower ETA first)
    if (a.eta !== b.eta) {
      return (a.eta ?? Infinity) - (b.eta ?? Infinity);
    }

    // 4. Rating (higher rating first)
    if (a.rating !== b.rating) {
      return b.rating - a.rating;
    }

    // 5. Price (lower price first)
    if (a.price !== b.price) {
      return a.price - b.price;
    }

    return 0;
  });
};

/**
 * Enforce single driver assignment - prevent two guardians from selecting same driver
 * Must be called INSIDE a transaction with lock
 */
const enforceSingleDriverAssignment = async (driverId, rideId, transaction) => {
  // Check if driver is already assigned to another ACTIVE emergency ride
  const conflictingRide = await EmergencyRide.findOne({
    where: {
      driverId,
      id: { [Op.ne]: rideId },
      status: { [Op.in]: ["DRIVER_SELECTED", "DRIVER_ACCEPTED", "DRIVER_ARRIVING", "STUDENT_PICKED_UP", "IN_TRANSIT"] },
    },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });

  return !conflictingRide;
};

// ─── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * GET /api/emergency-rides/:id/available-drivers
 * Find eligible drivers for an emergency ride
 */
const getAvailableDrivers = async (req, res) => {
  try {
    const guardian = await getGuardianForUser(req.user.id);
    if (!guardian) return res.status(403).json({ message: "Active guardian profile is required" });

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, guardianId: guardian.id },
      include: [
        { model: Student, as: "student" },
      ],
    });

    if (!ride) return res.status(404).json({ message: "Emergency ride not found" });
    if (ride.status !== "SEARCHING") {
      return res.status(409).json({ message: "Emergency ride is no longer searching for drivers" });
    }

    // Find all active, verified drivers who have emergency transport enabled
    const drivers = await Driver.findAll({
      where: {
        isActive: true,
        identityVerified: true,
        licenseVerified: true,
        emergencyRideEnabled: true,
      },
      include: [
        {
          model: User,
          as: "user",
          where: { isActive: true, isVerified: true },
          attributes: ["id", "fullname", "isActive", "isVerified"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          where: { isActive: true, vehicleVerified: true, insuranceVerified: true },
          attributes: ["id", "carMake", "carModel", "registrationNumber", "capacity", "isActive", "vehicleVerified", "insuranceVerified", "insuranceExpiry"],
          required: true,
        },
        {
          model: DriverService,
          as: "service",
          where: { isActive: true, serviceType: { [Op.or]: ["emergency_transport", ride.tripType] } },
          attributes: ["id", "serviceType", "price", "currency", "availableDays", "availableHours", "originLatitude", "originLongitude"],
          required: true,
        },
        {
          model: EmergencyRide,
          as: "busyRide",
          where: {
            status: { [Op.in]: ["DRIVER_SELECTED", "DRIVER_ACCEPTED", "DRIVER_ARRIVING", "STUDENT_PICKED_UP", "IN_TRANSIT"] },
          },
          required: false,
        },
      ],
      attributes: ["id", "userId", "profileImage", "isActive", "identityVerified", "licenseVerified", "emergencyRideEnabled", "rating"],
      raw: false,
    });

    // Evaluate each driver
    const evaluatedDrivers = drivers.map((driver) => {
      const evaluation = evaluateEmergencyRideDriverEligibility(driver.toJSON(), ride.toJSON());
      return {
        ...evaluation,
        driver: {
          id: driver.id,
          fullname: driver.user?.fullname,
          profileImage: driver.profileImage,
          rating: driver.rating || 0,
          verificationStatus: evaluation.verificationStatus,
        },
        vehicle: driver.vehicle ? {
          id: driver.vehicle.id,
          make: driver.vehicle.carMake,
          model: driver.vehicle.carModel,
          registrationNumber: driver.vehicle.registrationNumber,
          capacity: driver.vehicle.capacity,
        } : null,
      };
    });

    // Sort by eligibility, distance, ETA, rating, price
    const sortedDrivers = sortEmergencyRideDrivers(evaluatedDrivers);

    // Return drivers with relevant details
    const result = sortedDrivers.map((d) => ({
      driver: d.driver,
      vehicle: d.vehicle,
      rating: d.rating,
      distance: d.distanceKm,
      eta: d.eta,
      price: d.price,
      currency: d.currency,
      verificationStatus: d.verificationStatus,
      eligible: d.eligible,
      reasons: d.reasons.length > 0 ? d.reasons : undefined,
    }));

    return res.status(200).json({
      availableDrivers: result,
      totalEligible: result.filter((d) => d.eligible).length,
      total: result.length,
    });
  } catch (error) {
    console.error("getAvailableDrivers error:", error);
    return res.status(500).json({ message: "Failed to fetch available drivers" });
  }
};

/**
 * POST /api/emergency-rides/:id/select-driver
 * Guardian selects a driver for the emergency ride
 */
const selectDriver = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const guardian = await getGuardianForUser(req.user.id);
    if (!guardian) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active guardian profile is required" });
    }

    const { driverId } = req.body;
    if (!driverId || typeof driverId !== "string") {
      await transaction.rollback();
      return res.status(400).json({ message: "driverId is required" });
    }

    // Fetch ride with lock
    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, guardianId: guardian.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    if (ride.status !== "SEARCHING") {
      await transaction.rollback();
      return res.status(409).json({ message: "Emergency ride is no longer searching for drivers" });
    }

    // Fetch driver with all necessary data (with lock)
    const driver = await Driver.findOne({
      where: { id: driverId },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "isActive", "isVerified"],
        },
        {
          model: Vehicle,
          as: "vehicle",
          where: { isActive: true, vehicleVerified: true, insuranceVerified: true },
          attributes: ["id", "capacity", "isActive", "vehicleVerified", "insuranceVerified", "insuranceExpiry"],
          required: true,
        },
        {
          model: DriverService,
          as: "service",
          where: { isActive: true, serviceType: { [Op.or]: ["emergency_transport", ride.tripType] } },
          attributes: ["id", "price", "currency", "availableDays", "availableHours", "originLatitude", "originLongitude"],
          required: true,
        },
      ],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!driver) {
      await transaction.rollback();
      return res.status(404).json({ message: "Driver not found or not available" });
    }

    // Re-validate driver eligibility (CRITICAL: do not trust earlier response)
    const validation = evaluateEmergencyRideDriverEligibility(driver.toJSON(), ride.toJSON());
    if (!validation.eligible) {
      await transaction.rollback();
      return res.status(409).json({
        message: "Driver is no longer eligible",
        reasons: validation.reasons,
      });
    }

    // Enforce single driver assignment (prevent double-booking)
    const canAssign = await enforceSingleDriverAssignment(driverId, ride.id, transaction);
    if (!canAssign) {
      await transaction.rollback();
      return res.status(409).json({ message: "Driver is already assigned to another ride" });
    }

    // Update ride with driver and vehicle
    ride.driverId = driverId;
    ride.vehicleId = driver.vehicle.id;
    ride.finalPrice = parseFloat(driver.service.price);
    ride.currency = driver.service.currency;
    ride.status = "DRIVER_SELECTED";

    await ride.save({ transaction });

    // Create audit log
    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_driver_selected",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: {
        driverId,
        vehicleId: driver.vehicle.id,
        price: ride.finalPrice,
        currency: ride.currency,
      },
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io && driver.userId) {
      req.io.to(`user-${driver.userId}`).emit("emergency-ride-selected", result);
      req.io.to(`driver-${driver.id}`).emit("emergency-ride-selected", result);
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("selectDriver error:", error);
    return res.status(500).json({ message: "Failed to select driver" });
  }
};

// ─── PHASE 9: Driver Accept/Reject ─────────────────────────────────────────────

/**
 * Verify driver authorization for emergency ride operations
 */
const getDriverForUser = async (userId) => {
  return await Driver.findOne({
    where: { userId },
    include: [{ model: User, as: "user" }],
  });
};

/**
 * POST /api/emergency-rides/:id/accept
 * Driver accepts the emergency ride
 */
const acceptEmergencyRide = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Get authenticated driver
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    // Validate driver status
    if (!driver.isActive) {
      await transaction.rollback();
      return res.status(409).json({ message: "Driver account is inactive" });
    }

    if (!driver.emergencyRideEnabled) {
      await transaction.rollback();
      return res.status(409).json({ message: "Emergency ride access is not enabled for this driver" });
    }

    if (!driver.identityVerified || !driver.licenseVerified) {
      await transaction.rollback();
      return res.status(409).json({ message: "Driver is not fully verified" });
    }

    // Fetch ride with lock
    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found or driver not assigned to this ride" });
    }

    if (ride.status !== "DRIVER_SELECTED") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Emergency ride cannot be accepted in ${ride.status} status`,
        currentStatus: ride.status,
      });
    }

    // Update ride status
    ride.status = "DRIVER_ACCEPTED";
    ride.acceptedAt = new Date();
    await ride.save({ transaction });

    // Create audit log
    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_accepted",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: { driverId: driver.id, acceptedAt: ride.acceptedAt },
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-accepted", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-accepted", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("acceptEmergencyRide error:", error);
    return res.status(500).json({ message: "Failed to accept emergency ride" });
  }
};

/**
 * POST /api/emergency-rides/:id/reject
 * Driver rejects the emergency ride
 */
const rejectEmergencyRide = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Get authenticated driver
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    // Validate driver status
    if (!driver.isActive) {
      await transaction.rollback();
      return res.status(409).json({ message: "Driver account is inactive" });
    }

    // Fetch ride with lock
    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found or driver not assigned to this ride" });
    }

    if (ride.status !== "DRIVER_SELECTED") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Emergency ride cannot be rejected in ${ride.status} status`,
        currentStatus: ride.status,
      });
    }

    // Reject the ride
    ride.status = "DRIVER_REJECTED";
    ride.rejectedAt = new Date();
    ride.rejectionReason = req.body.rejectionReason?.trim() || null;
    ride.driverId = null;
    ride.vehicleId = null;
    ride.finalPrice = null;

    await ride.save({ transaction });

    // Create audit log
    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_rejected",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: {
        driverId: driver.id,
        reason: ride.rejectionReason,
        rejectedAt: ride.rejectedAt,
      },
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-rejected", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-rejected", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("rejectEmergencyRide error:", error);
    return res.status(500).json({ message: "Failed to reject emergency ride" });
  }
};

// ─── PHASE 10: Trip Lifecycle ──────────────────────────────────────────────────

/**
 * Valid status transitions
 */
const VALID_TRANSITIONS = {
  DRIVER_ACCEPTED: ["DRIVER_ARRIVING"],
  DRIVER_ARRIVING: ["STUDENT_PICKED_UP", "DRIVER_REJECTED"],
  STUDENT_PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["STUDENT_DROPPED_OFF"],
  STUDENT_DROPPED_OFF: ["COMPLETED"],
};

/**
 * Check if status transition is valid
 */
const isValidTransition = (fromStatus, toStatus) => {
  const allowedNextStates = VALID_TRANSITIONS[fromStatus];
  return allowedNextStates && allowedNextStates.includes(toStatus);
};

/**
 * Helper: Update ride status with validation
 */
const updateRideStatus = async (ride, newStatus, transaction, additionalUpdates = {}) => {
  if (!isValidTransition(ride.status, newStatus)) {
    throw new Error(`Invalid status transition from ${ride.status} to ${newStatus}`);
  }

  const updates = { status: newStatus, ...additionalUpdates };
  Object.keys(updates).forEach((key) => {
    ride[key] = updates[key];
  });

  await ride.save({ transaction });
};

/**
 * POST /api/emergency-rides/:id/arriving
 * Driver marks arriving at pickup location
 */
const markDriverArriving = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    if (ride.status !== "DRIVER_ACCEPTED") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Can only mark arriving from DRIVER_ACCEPTED status. Current: ${ride.status}`,
      });
    }

    await updateRideStatus(ride, "DRIVER_ARRIVING", transaction, {
      driverArrivedAt: new Date(),
    });

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_driver_arriving",
      entity: "EmergencyRide",
      entityId: ride.id,
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-arriving", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-arriving", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("markDriverArriving error:", error);
    return res.status(500).json({ message: error.message || "Failed to mark driver arriving" });
  }
};

/**
 * POST /api/emergency-rides/:id/pickup
 * Driver marks student picked up
 */
const markStudentPickedUp = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    if (ride.status !== "DRIVER_ARRIVING") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Can only mark pickup from DRIVER_ARRIVING status. Current: ${ride.status}`,
      });
    }

    await updateRideStatus(ride, "STUDENT_PICKED_UP", transaction, {
      studentPickedUpAt: new Date(),
    });

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_student_picked_up",
      entity: "EmergencyRide",
      entityId: ride.id,
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-picked-up", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-picked-up", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("markStudentPickedUp error:", error);
    return res.status(500).json({ message: error.message || "Failed to mark student picked up" });
  }
};

/**
 * POST /api/emergency-rides/:id/start
 * Driver starts the trip to destination
 */
const startTrip = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    if (ride.status !== "STUDENT_PICKED_UP") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Can only start trip from STUDENT_PICKED_UP status. Current: ${ride.status}`,
      });
    }

    await updateRideStatus(ride, "IN_TRANSIT", transaction, {
      tripStartedAt: new Date(),
    });

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_trip_started",
      entity: "EmergencyRide",
      entityId: ride.id,
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-started", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-started", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("startTrip error:", error);
    return res.status(500).json({ message: error.message || "Failed to start trip" });
  }
};

/**
 * POST /api/emergency-rides/:id/complete
 * Driver completes the trip (student dropped off)
 */
const completeTrip = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    const driver = await getDriverForUser(req.user.id);
    if (!driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active driver profile is required" });
    }

    const ride = await EmergencyRide.findOne({
      where: { id: req.params.id, driverId: driver.id },
      transaction,
      lock: transaction.LOCK.UPDATE,
      include: [{ model: Student, as: "student" }],
    });

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    if (ride.status !== "IN_TRANSIT") {
      await transaction.rollback();
      return res.status(409).json({
        message: `Can only complete from IN_TRANSIT status. Current: ${ride.status}`,
      });
    }

    // Mark student dropped off
    ride.status = "STUDENT_DROPPED_OFF";
    ride.studentDroppedOffAt = new Date();
    await ride.save({ transaction });

    // Immediately transition to COMPLETED
    ride.status = "COMPLETED";
    ride.completedAt = new Date();
    await ride.save({ transaction });

    // CRITICAL: Do not modify student's permanent vehicle assignment
    // Emergency ride is just a temporary transportation event

    await logAudit({
      userId: req.user.id,
      action: "emergency_ride_completed",
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: {
        completedAt: ride.completedAt,
        studentId: ride.studentId,
        driverId: driver.id,
      },
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-completed", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-completed", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("completeTrip error:", error);
    return res.status(500).json({ message: error.message || "Failed to complete trip" });
  }
};

/**
 * POST /api/emergency-rides/:id/cancel
 * Updated to handle both guardian and driver cancellations
 */
const cancelEmergencyRideRequest = async (req, res) => {
  const transaction = await db.sequelize.transaction();

  try {
    // Check if cancelling as guardian or driver
    const guardian = await getGuardianForUser(req.user.id);
    const driver = await getDriverForUser(req.user.id);

    if (!guardian && !driver) {
      await transaction.rollback();
      return res.status(403).json({ message: "Active guardian or driver profile is required" });
    }

    let ride;

    if (guardian) {
      // Guardian cancellation
      ride = await EmergencyRide.findOne({
        where: { id: req.params.id, guardianId: guardian.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    } else {
      // Driver cancellation
      ride = await EmergencyRide.findOne({
        where: { id: req.params.id, driverId: driver.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
    }

    if (!ride) {
      await transaction.rollback();
      return res.status(404).json({ message: "Emergency ride not found" });
    }

    // Guardian can cancel at certain statuses
    if (guardian) {
      if (!CANCELLABLE_STATUSES.includes(ride.status)) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Emergency ride cannot be cancelled in ${ride.status} status`,
        });
      }
    }

    // Driver cannot cancel once accepted (trip commitment)
    if (driver && ride.status !== "DRIVER_SELECTED") {
      await transaction.rollback();
      return res.status(409).json({
        message: "Driver cannot cancel after accepting the ride",
      });
    }

    ride.status = "CANCELLED";
    ride.cancelledAt = new Date();
    ride.cancellationReason = req.body.cancellationReason?.trim() || null;
    await ride.save({ transaction });

    const actionBy = guardian ? "guardian" : "driver";
    await logAudit({
      userId: req.user.id,
      action: `emergency_ride_cancelled_by_${actionBy}`,
      entity: "EmergencyRide",
      entityId: ride.id,
      metadata: {
        reason: ride.cancellationReason,
        cancelledBy: actionBy,
      },
      transaction,
    });

    await transaction.commit();

    const result = await EmergencyRide.findByPk(ride.id, { include: rideIncludes });
    if (req.io) {
      req.io.to(`emergency-ride-${ride.id}`).emit("emergency-ride-cancelled", result);
      if (result.guardian?.userId) {
        req.io.to(`user-${result.guardian.userId}`).emit("emergency-ride-cancelled", result);
      }
      if (result.driver?.userId) {
        req.io.to(`user-${result.driver.userId}`).emit("emergency-ride-cancelled", result);
      }
    }
    return res.status(200).json(result);
  } catch (error) {
    if (!transaction.finished) await transaction.rollback();
    console.error("cancelEmergencyRideRequest error:", error);
    return res.status(500).json({ message: "Failed to cancel emergency ride" });
  }
};

module.exports = {
  requestEmergencyRide,
  cancelEmergencyRide: cancelEmergencyRideRequest,
  getAvailableDrivers,
  selectDriver,
  acceptEmergencyRide,
  rejectEmergencyRide,
  markDriverArriving,
  markStudentPickedUp,
  startTrip,
  completeTrip,
  evaluateEmergencyRideDriverEligibility,
  sortEmergencyRideDrivers,
  enforceSingleDriverAssignment,
  validateRequest,
  ACTIVE_STATUSES,
  CANCELLABLE_STATUSES,
  VALID_TRANSITIONS,
  haversineDistance,
  getDriverForUser,
};
