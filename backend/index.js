require("dotenv").config();
const express = require("express");
const db = require("./models/index");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");
const passport = require("passport");
const cookieParser = require("cookie-parser");
const createAdminIfEmpty = require("./bootstrap/createAdminIfEmpty");

//------Jobs-------------------
const trackingCleanupJob = require("./jobs/trackingCleanupJob");

// ── Middleware ────────────────────────────────────────────────────────────────
const auditMiddleware = require("./middleware/auditMiddleware");

// ── Routes ────────────────────────────────────────────────────────────────────
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
const announcements = require("./routes/announcements");
const vehicles = require("./routes/vehicles");
const vehicleRoutes = require("./routes/vehicleRoutes");
const driverAssignments = require("./routes/vehicleDriverAssignment");
const auditlogs = require("./routes/auditlogs");
const notifications = require("./routes/notifications");
const vehicletracking = require("./routes/vehicleTracking");
const messages = require("./routes/messages");
const vehiclealerts = require("./routes/vehicleAlerts");
const studenttracking = require("./routes/studentTracking");
const pushtokens = require("./routes/pushnotifications");
const guardianrequests = require("./routes/guardianRequests");
const subscriptions = require("./routes/subscriptions");
const driverServices = require("./routes/driverServices");
const emergencyRides = require("./routes/emergencyRides");
const ratings = require("./routes/ratings");
const adminEmergency = require("./routes/adminEmergencyRoutes");
// ── Real-time handlers ────────────────────────────────────────────────────────
const { initializeSocket } = require("./socket/socketHandler");
const { initializePeer } = require("./socket/peerHandler");

// ─────────────────────────────────────────────────────────────────────────────

const app = express();
const server = http.createServer(app);
trackingCleanupJob.start();

// ── CORS Configuration (must be before routes) ────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL, // From env variable
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (
      allowedOrigins.indexOf(origin) !== -1 ||
      process.env.NODE_ENV !== "production"
    ) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Required for cookies
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["Set-Cookie"],
  optionsSuccessStatus: 200,
};

// ── Socket.io with proper CORS ────────────────────────────────────────────────
// Mobile apps (React Native / Expo) send requests with no Origin header.
// Socket.io must be configured to allow these, otherwise the polling handshake
// is rejected with a CORS error that manifests as "websocket error" on the client.
const io = socketIo(server, {
  path: "/socket.io",
  cors: {
    // Allow all origins when no CLIENT_URL is set (dev / devtunnel), or
    // specifically allow configured origins. Mobile apps have no Origin header
    // so a function that passes those through is required.
    origin: (origin, callback) => {
      // No origin = mobile app or curl — always allow.
      if (!origin) return callback(null, true);
      // Configured origins.
      if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // In non-production allow everything.
      if (process.env.NODE_ENV !== "production") return callback(null, true);
      callback(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST"],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 10000,
  // Server transport order: polling first so the HTTP handshake completes
  // before the engine attempts a WebSocket upgrade. Required for proxies /
  // devtunnels that buffer HTTP but may drop raw WS upgrade packets.
  transports: ["polling", "websocket"],
  allowEIO3: true,
  allowUpgrades: true,
  perMessageDeflate: false,
  httpCompression: false,
});

// ── Attach io to every request so controllers can broadcast via req.io ────────
app.set("io", io);
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// ── PeerJS ────────────────────────────────────────────────────────────────────
initializePeer(server, app);

// ── Register all Socket.io event handlers ─────────────────────────────────────
initializeSocket(io);

// ── Database ──────────────────────────────────────────────────────────────────
db.sequelize
  .authenticate()
  .then(() => {
    console.log("Database connection successful");
    if (process.env.NODE_ENV !== "production") {
      return db.sequelize.sync();
    }
  })
  .catch((error) => console.error("Database connection failed:", error));

// ── Global middleware (order matters!) ────────────────────────────────────────
app.use(cors(corsOptions)); // CORS must be before routes
app.use(cookieParser()); // Add cookie parser before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Security headers (with proper CSP for your frontend)
app.use((req, res, next) => {
  // More permissive CSP for development
  const isProd = process.env.NODE_ENV === "production";

  res.setHeader(
    "Content-Security-Policy",
    isProd
      ? [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com",
          "worker-src blob:",
          "style-src 'self' 'unsafe-inline' https://api.mapbox.com https://cdnjs.cloudflare.com",
          "img-src 'self' data: blob: https://*.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "connect-src 'self' https://*.mapbox.com https://events.mapbox.com wss://*.mapbox.com https://nominatim.openstreetmap.org https://api.mapbox.com https://a.tile.openstreetmap.org https://b.tile.openstreetmap.org https://c.tile.openstreetmap.org",
          "font-src 'self' data: https://*.mapbox.com https://cdnjs.cloudflare.com",
        ].join("; ")
      : "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Additional security headers
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("Referrer-Policy", "no-referrer-when-downgrade");

  next();
});

app.use(auditMiddleware);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(path.join(__dirname, "admin/dist")));

// ── API routes ────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicles);
app.use("/api/vehicleroutes", vehicleRoutes);
app.use("/api/driverassignment", driverAssignments);
app.use("/api/auditlogs", auditlogs);
app.use("/api/notifications", notifications);
app.use("/api/vehicle-tracking", vehicletracking);
app.use("/api/messages", messages);
app.use("/api/student-tracking", studenttracking);
app.use("/api/vehicle-alerts", vehiclealerts);
app.use("/api/announcements", announcements);
app.use("/api/push-tokens", pushtokens);
app.use("/api/guardian-requests", guardianrequests);
app.use("/api/subscriptions", subscriptions);
app.use("/api/driver-services", driverServices);
app.use("/api/emergency-rides", emergencyRides);
app.use("/api/ratings", ratings);
app.use("/api/admin/emergency-rides", adminEmergency);

// ── SPA fallback (must be after API routes) ──────────────────────────────────
app.get(/^(?!\/api\/).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "admin/dist", "index.html"));
});

// ── Error handling middleware ─────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ message: "CORS blocked" });
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    server.listen(process.env.APP_PORT || 3000, () => {
      console.log(`🚀 Server running on port ${process.env.APP_PORT || 3000}`);
      console.log(`📍 CORS enabled for origins: ${allowedOrigins.join(", ")}`);
      console.log(`🔒 Environment: ${process.env.NODE_ENV || "development"}`);
    });

    await createAdminIfEmpty();
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
