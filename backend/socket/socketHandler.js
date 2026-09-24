// socket/socketHandler.js
const connectedUsers = new Map(); // userId -> socketId
const userPeerIds = new Map(); // userId -> PeerJS peerId
const userSockets = new Map(); // userId -> socket
const {
  sendSOSAlert,
  sendTripStartNotification,
  sendTripEndNotification,
  sendArrivalNotification,
  sendStopArrivedNotification,
  sendDepartureNotification,
  sendDelayNotification,
} = require("../services/vehicleNotificationService");

/**
 * @param {import("socket.io").Server} io
 */
function initializeSocket(io) {
  io.on("connection", (socket) => {
    console.log(`🔌 New socket connection: ${socket.id}`);

    socket.emit("connected", {
      message: "Successfully connected",
      socketId: socket.id,
    });

    // ── User / role rooms ────────────────────────────────────────────────────
    socket.on("join-user", (userId) => {
      socket.userId = userId;
      socket.join(`user-${userId}`);
      connectedUsers.set(userId, socket.id);
      userSockets.set(userId, socket);

      console.log(
        `👤 User ${userId} joined their room. Total connected users: ${connectedUsers.size}`,
      );

      const peerId = userPeerIds.get(userId);
      if (peerId) {
        socket.emit("peer-id-registered", { userId, peerId });
      }

      socket.emit("user-joined", { userId, success: true });
    });

    socket.on("join-role", (roleId) => {
      socket.join(`role-${roleId}`);
      console.log(`Socket ${socket.id} joined role ${roleId}`);
    });

    socket.on("join-admin", () => {
      socket.join("admin-room");
      console.log(`Socket ${socket.id} joined admin room`);
    });

    // ── Conversation rooms ───────────────────────────────────────────────────
    socket.on("join-conversation", (conversationId) => {
      socket.join(`conversation-${conversationId}`);
      console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on("leave-conversation", (conversationId) => {
      socket.leave(`conversation-${conversationId}`);
      console.log(`Socket ${socket.id} left conversation ${conversationId}`);
    });

    // ── Typing indicator ─────────────────────────────────────────────────────
    socket.on("typing", ({ conversationId, isTyping }) => {
      socket.to(`conversation-${conversationId}`).emit("user-typing", {
        userId: socket.userId,
        conversationId,
        isTyping,
      });
    });

    // ── Message read receipt ─────────────────────────────────────────────────
    socket.on("mark-read", ({ conversationId, messageId }) => {
      socket.to(`conversation-${conversationId}`).emit("message-read", {
        userId: socket.userId,
        conversationId,
        messageId,
      });
    });

    // ── Discussion rooms ─────────────────────────────────────────────────────
    socket.on("join-discussion", (discussionId) => {
      socket.join(`discussion-${discussionId}`);
    });

    socket.on("leave-discussion", (discussionId) => {
      socket.leave(`discussion-${discussionId}`);
    });

    // ── Vehicle tracking rooms ───────────────────────────────────────────────────

    socket.on("join-vehicle-tracking", () => {
      socket.join("vehicle-tracking");
      console.log(`🚌 Socket ${socket.id} joined vehicle-tracking room`);
    });

    socket.on("leave-vehicle-tracking", () => {
      socket.leave("vehicle-tracking");
      console.log(`🚌 Socket ${socket.id} left vehicle-tracking room`);
    });

    // Optional: subscribe to a single vehicle (e.g. parent tracking their child's vehicle)
    socket.on("join-vehicle", (vehicleId) => {
      if (!vehicleId) return;
      socket.join(`vehicle-${vehicleId}`);
      console.log(`🚌 Socket ${socket.id} joined vehicle-${vehicleId} room`);
    });

    socket.on("leave-vehicle", (vehicleId) => {
      if (!vehicleId) return;
      socket.leave(`vehicle-${vehicleId}`);
    });

    // Driver joins their personal room to receive driver-targeted events
    // (driver-assigned, route-assigned, etc.)
    socket.on("join-driver", (driverId) => {
      if (!driverId) return;
      socket.driverId = driverId;
      socket.join(`driver-${driverId}`);
      console.log(`🚌 Driver ${driverId} joined driver-${driverId} room`);
      socket.emit("driver-joined", { driverId, success: true });
    });

    socket.on("leave-driver", (driverId) => {
      if (!driverId) return;
      socket.leave(`driver-${driverId}`);
      console.log(`🚌 Driver ${driverId} left driver-${driverId} room`);
    });

    // ── Emergency Ride Rooms & Real-Time Tracking ────────────────────────────
    socket.on("join-emergency-ride", (rideId) => {
      if (!rideId) return;
      socket.join(`emergency-ride-${rideId}`);
      console.log(`🚨 Socket ${socket.id} joined emergency-ride-${rideId} room`);
    });

    socket.on("leave-emergency-ride", (rideId) => {
      if (!rideId) return;
      socket.leave(`emergency-ride-${rideId}`);
      console.log(`🚨 Socket ${socket.id} left emergency-ride-${rideId} room`);
    });

    socket.on("emergency-location-update", (payload) => {
      if (!payload?.rideId) return;
      io.to(`emergency-ride-${payload.rideId}`).emit("emergency-location-update", payload);
      if (payload.guardianUserId) {
        io.to(`user-${payload.guardianUserId}`).emit("emergency-location-update", payload);
      }
    });

    // ── Driver Events (broadcast to guardians) ───────────────────────────────

    // When driver starts the trip
    socket.on("vehicle-started", async (payload) => {
      console.log(
        `🚌 BUS STARTED: Vehicle ${payload.vehicleId} started journey`,
      );
      io.to(`vehicle-${payload.vehicleId}`).emit("vehicle-started", payload);
      io.to("vehicle-tracking").emit("vehicle-started", payload);

      await sendTripStartNotification(
        payload.vehicleId,
        payload.routeId,
        payload.location,
        io,
      );
    });

    // When driver marks arrival at a stop
    socket.on("vehicle-stop-arrival", async (payload) => {
      console.log(
        `📍 BUS AT STOP: Vehicle ${payload.vehicleId} arrived at ${payload.stopName} (stop index ${payload.stopIndex})`,
      );
      // Include full payload (with stopIndex) so TrackScreen can update
      // currentStopIndex without a follow-up REST call
      io.to(`vehicle-${payload.vehicleId}`).emit(
        "vehicle-stop-arrival",
        payload,
      );
      io.to("vehicle-tracking").emit("vehicle-stop-arrival", payload);

      // FIX: this handler used to only rebroadcast the raw socket event —
      // it never created a Notification row or sent a push, so the driver
      // confirming "Arrived" never actually reached guardians as a real
      // notification (only as a live tracking update, which is a
      // different thing from what onNewNotification/push expects).
      await sendStopArrivedNotification(
        payload.vehicleId,
        payload.routeId,
        payload.stopId,
        payload.stopName,
        payload.stopIndex,
        io,
      );
    });

    // When vehicle departs from a stop
    socket.on("vehicle-departure", async (payload) => {
      console.log(
        `🚌 BUS DEPARTED: Vehicle ${payload.vehicleId} left ${payload.stopName}`,
      );
      io.to(`vehicle-${payload.vehicleId}`).emit("vehicle-departure", payload);

      await sendDepartureNotification(payload.vehicleId, payload.stopId, io);
    });

    // When vehicle route is updated
    socket.on("vehicle-route-update", (payload) => {
      console.log(
        `🗺️ ROUTE UPDATE: Vehicle ${payload.vehicleId} route updated`,
      );
      io.to(`vehicle-${payload.vehicleId}`).emit(
        "vehicle-route-update",
        payload,
      );
      io.to("vehicle-tracking").emit("vehicle-route-update", payload);
    });

    // When vehicle location changes
    socket.on("vehicle-location-update", (payload) => {
      io.to(`vehicle-${payload.vehicleId}`).emit(
        "vehicle-location-update",
        payload,
      );
      io.to("vehicle-tracking").emit("vehicle-location-update", payload);
    });

    // When ETA is updated
    socket.on("vehicle-eta-update", (payload) => {
      io.to(`vehicle-${payload.data?.vehicleId || payload.vehicleId}`).emit(
        "vehicle-eta-update",
        payload,
      );
    });

    // When vehicle is approaching a stop
    socket.on("vehicle-approaching-stop", async (payload) => {
      console.log(
        `⚠️ BUS APPROACHING: Vehicle ${payload.vehicleId} approaching ${payload.stopName}`,
      );
      io.to(`vehicle-${payload.vehicleId}`).emit(
        "vehicle-approaching-stop",
        payload,
      );

      await sendArrivalNotification(
        payload.vehicleId,
        payload.stopId,
        payload.etaMinutes,
        io,
      );
    });

    // When vehicle is delayed
    socket.on("vehicle-delayed", async (payload) => {
      console.log(
        `⏰ BUS DELAYED: Vehicle ${payload.vehicleId} delayed by ${payload.delayMinutes} minutes`,
      );
      io.to(`vehicle-${payload.vehicleId}`).emit("vehicle-delayed", payload);

      await sendDelayNotification(
        payload.vehicleId,
        payload.routeId,
        payload.stopId,
        payload.delayMinutes,
        payload.location,
        io,
      );
    });

    // Driver SOS alert
    socket.on("driver-sos", async (payload) => {
      console.log(
        `🚨 SOS ALERT: Vehicle ${payload.vehicleId} - Driver ${payload.driverName}`,
      );

      // Broadcast to all relevant rooms
      io.to(`vehicle-${payload.vehicleId}`).emit("driver-sos", payload);
      io.to("vehicle-tracking").emit("driver-sos", payload);
      io.to("admin-room").emit("driver-sos", payload);

      // Send SOS notifications to guardians and admins
      await sendSOSAlert(
        payload.vehicleId,
        payload.routeId,
        payload.location,
        payload.driverName,
        payload.driverPhone,
        io,
      );
    });

    // General notifications
    socket.on("new-notification", (payload) => {
      console.log(`🔔 NOTIFICATION: ${payload.title}`);
      if (payload.userId) {
        io.to(`user-${payload.userId}`).emit("new-notification", payload);
      } else if (payload.vehicleId) {
        io.to(`vehicle-${payload.vehicleId}`).emit("new-notification", payload);
      } else {
        io.to("vehicle-tracking").emit("new-notification", payload);
      }
    });

    // Vehicle alert (speeding, etc.)
    socket.on("vehicle-alert", (payload) => {
      console.log(`⚠️ BUS ALERT: ${payload.title}`);
      io.to(`vehicle-${payload.vehicleId}`).emit("vehicle-alert", payload);
    });

    // socket/socketHandler.js - Add this event handler
    socket.on("trip-ended", async (payload) => {
      console.log(`🏁 TRIP ENDED: Vehicle ${payload.vehicleId}`);
      io.to(`vehicle-${payload.vehicleId}`).emit("trip-ended", payload);
      io.to("vehicle-tracking").emit("trip-ended", payload);

      await sendTripEndNotification(
        payload.vehicleId,
        payload.routeId,
        payload.finalLocation,
        payload.completedStops,
        payload.totalStops,
        io,
      );
    });

    // ── WebRTC / PeerJS signaling ─────────────────────────────────────────────
    socket.on("register-peer-id", ({ userId, peerId }) => {
      userPeerIds.set(userId, peerId);
      console.log(`📡 PeerJS: User ${userId} registered peerId ${peerId}`);

      const userSocket = userSockets.get(userId);
      if (userSocket && userSocket.id !== socket.id) {
        userSocket.emit("peer-id-registered", { userId, peerId });
      }
    });

    socket.on(
      "call-user",
      ({ calleeId, callType, callerPeerId, callerInfo }) => {
        console.log(`📞 Call from ${socket.userId} to ${calleeId}`);
        io.to(`user-${calleeId}`).emit("incoming-call", {
          callerId: socket.userId,
          callerPeerId,
          callerInfo,
          callType,
        });
      },
    );

    socket.on("accept-call", ({ callerId, calleePeerId }) => {
      console.log(
        `✅ Call accepted: ${socket.userId} accepted call from ${callerId}`,
      );
      io.to(`user-${callerId}`).emit("call-accepted", {
        calleePeerId,
        acceptedBy: socket.userId,
      });
    });

    socket.on("reject-call", ({ callerId }) => {
      console.log(
        `❌ Call rejected: ${socket.userId} rejected call from ${callerId}`,
      );
      io.to(`user-${callerId}`).emit("call-rejected", {
        rejectedBy: socket.userId,
      });
    });

    socket.on("end-call", ({ otherUserId }) => {
      console.log(`🔚 Call ended between ${socket.userId} and ${otherUserId}`);
      io.to(`user-${otherUserId}`).emit("call-ended", {
        endedBy: socket.userId,
      });
    });

    socket.on("call-vehicley", ({ callerId }) => {
      console.log(`⏰ User ${socket.userId} is vehicley`);
      io.to(`user-${callerId}`).emit("call-vehicley");
    });

    // ── Driver assignment broadcasts ────────────────────────────────────────
    // These let the backend (or admin) push assignment changes to a specific driver.
    socket.on("driver-assigned", (payload) => {
      if (!payload?.driverId) return;
      io.to(`driver-${payload.driverId}`).emit("driver-assigned", payload);
      console.log(`👤 driver-assigned broadcast to driver-${payload.driverId}`);
    });

    socket.on("route-assigned", (payload) => {
      if (!payload?.driverId) return;
      io.to(`driver-${payload.driverId}`).emit("route-assigned", payload);
      console.log(`🗺️ route-assigned broadcast to driver-${payload.driverId}`);
    });

    // ── Error handling ───────────────────────────────────────────────────────
    socket.on("error", (error) => {
      console.error(`Socket error [${socket.id}]:`, error);
    });

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", (reason) => {
      const userId = socket.userId;
      if (userId) {
        connectedUsers.delete(userId);
        userSockets.delete(userId);
        console.log(`User ${userId} disconnected. Reason: ${reason}`);
      }
      console.log(
        `Socket ${socket.id} disconnected. Reason: ${reason}. Total connected users: ${connectedUsers.size}`,
      );
    });
  });

  console.log("✅ Socket.io handlers initialized");
}

module.exports = { initializeSocket, connectedUsers, userPeerIds };
