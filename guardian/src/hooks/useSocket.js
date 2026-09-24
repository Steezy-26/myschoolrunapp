/**
 * hooks/useSocket.js — Guardian App
 *
 * Call this ONCE at the root of the guardian app (e.g. in App.js or the
 * authenticated navigator).  Every inbound socket event is dispatched into
 * Redux from here — screens never register their own socket listeners.
 *
 * Responsibilities
 * ────────────────
 * 1. Connect the socket singleton when the user is authenticated.
 * 2. Join the user's personal room + all vehicles the guardian is tracking.
 * 3. Wire every driver→server→guardian broadcast event to the correct Redux action.
 * 4. Expose messaging helpers (joinConversation, sendTyping, etc.) to screens.
 * 5. Clean up on logout.
 *
 * What this hook does NOT do
 * ──────────────────────────
 * • It never emits vehicle/driver events — guardians are read-only on tracking.
 * • It does not manage location permissions (guardians don't share GPS).
 * • It does not duplicate any logic that already lives in a Redux thunk.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createSelector } from "@reduxjs/toolkit";

import {
  initGuardianSocket,
  disconnectGuardianSocket,
  joinUserRoom,
  leaveUserRoom,
  joinVehicleRoom,
  leaveVehicleRoom,
  leaveAllVehicleRooms,
  // Inbound listener pairs — tracking
  onVehicleLocationUpdate,
  offVehicleLocationUpdate,
  onVehicleStarted,
  offVehicleStarted,
  onVehicleStopArrival,
  offVehicleStopArrival,
  onVehicleApproachingStop,
  offVehicleApproachingStop,
  onVehicleDeparture,
  offVehicleDeparture,
  onVehicleEtaUpdate,
  offVehicleEtaUpdate,
  onVehicleDelayed,
  offVehicleDelayed,
  onVehicleAlert,
  offVehicleAlert,
  onTripEnded,
  offTripEnded,
  onDriverSOS,
  offDriverSOS,
  onVehicleRouteUpdate,
  offVehicleRouteUpdate,
  // Inbound listener pairs — notifications / messaging
  onNewNotification,
  offNewNotification,
  onNewAnnouncement,
  offNewAnnouncement,
  onNewMessage,
  offNewMessage,
  onUserTyping,
  offUserTyping,
  onMessageRead,
  offMessageRead,
  // Guardian-specific
  onGuardianRequestUpdate,
  offGuardianRequestUpdate,
  // Outbound messaging helpers (returned to callers)
  joinConversation,
  leaveConversation,
  sendTyping,
  markMessageRead,
  getSocket,
  isSocketHealthy,
} from "../utils/socket";

// ── Redux actions — import from YOUR actual slice files ───────────────────────
// Adjust the paths to match your guardian app's lib/ folder.
import {
  setVehicleLocation, // { vehicleId, latitude, longitude, speed, heading, accuracy, timestamp }
  setTripStatus, // "idle" | "active" | "ended"
  setCurrentStopIndex, // number
  setEtaMinutes, // number
  setVehicleDelayed, // { delayMinutes, reason }
  setDriverSOS, // full SOS payload
  setVehicleAlert, // alert payload
  setRouteUpdate, // updated route payload
} from "../lib/VehicleTrackingSlice"; // ← create or rename to match your slice

import {
  addMessage, // { conversationId, message }
  incrementUnread, // conversationId
  setTyping, // { conversationId, userId, isTyping }
  clearUnread, // conversationId
} from "../lib/MessagesSlice";

import {
  notificationReceived, // pushes a real-time notification into the list
} from "../lib/NotificationsSlice";

import {
  updateRequestStatus, // { requestId, status, ... }
} from "../lib/GuardianRequestsSlice";

// ── Selectors ─────────────────────────────────────────────────────────────────
const selectUser = (s) => s.auth?.user;
// IDs of vehicles the guardian's children are assigned to. Derived from the
// guardian's students (state.users.students), not a separate "tracking" slice
// — that key never existed in the root reducer (see store.js), so the old
// selector always returned []  and no vehicle rooms were ever joined.
//
// Wrapped in createSelector so it returns the SAME array reference when
// `students` hasn't changed. Without memoization, .map()/.filter()/Set
// build a brand-new array on every call, which useSelector sees as "changed"
// on every render — that both trips Redux's stability warning and causes
// effect #2 below (keyed on JSON.stringify(vehicleIds)) to do unnecessary
// join/leave room churn.
const selectStudents = (s) => s.users?.students ?? [];
const selectTrackedVehicles = createSelector([selectStudents], (students) => {
  const ids = students
    .map(
      (student) =>
        student.vehicleRoute?.vehicleId ?? student.vehicleRoute?.vehicle?.id,
    )
    .filter(Boolean);
  return [...new Set(ids)];
});
const selectCurrentConvoId = (s) =>
  s.messages?.currentConversations?.id ?? null;

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useGuardianSocket() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const vehicleIds = useSelector(selectTrackedVehicles);
  const currentConvoId = useSelector(selectCurrentConvoId);

  const [isConnected, setIsConnected] = useState(false);

  // Keep a ref to the current convoId so the message handler closure
  // always reads the latest value without being re-created every render.
  const currentConvoIdRef = useRef(currentConvoId);
  useEffect(() => {
    currentConvoIdRef.current = currentConvoId;
  }, [currentConvoId]);

  // ── 1. Connect & join personal room ──────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const socket = initGuardianSocket();
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
    };
    const onDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) setIsConnected(true);

    joinUserRoom(user.id);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      leaveUserRoom();
    };
  }, [user?.id]);

  // ── 2. Subscribe to each child's vehicle room ─────────────────────────────
  // vehicleIds is an array from the guardian's store, e.g. ["vehicle-uuid-1"]
  // This effect runs whenever the list changes (child added/removed from route).
  useEffect(() => {
    if (!vehicleIds?.length) return;

    vehicleIds.forEach((id) => joinVehicleRoom(id));

    return () => {
      vehicleIds.forEach((id) => leaveVehicleRoom(id));
    };
  }, [JSON.stringify(vehicleIds)]); // stringify prevents referential inequality loops

  // ── 3. Wire ALL inbound events → Redux ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // ── Real-time vehicle tracking ──────────────────────────────────────────

    /**
     * vehicle-location-update
     * Emitted by driver every ~2 s, re-broadcast by server to:
     *   • vehicle-${vehicleId} room (this guardian is in this room)
     *   • vehicle-tracking room (global fallback)
     *
     * Payload: { vehicleId, latitude, longitude, speed, heading, accuracy, routeId, timestamp }
     *
     * Guardian action: update the live map pin for this vehicle.
     */
    const handleLocationUpdate = (payload) => {
      dispatch(
        setVehicleLocation({
          vehicleId: payload.vehicleId,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed ?? 0, // m/s — UI converts to km/h
          heading: payload.heading ?? 0, // degrees 0–360
          accuracy: payload.accuracy ?? 0,
          routeId: payload.routeId ?? null,
          // These are included in the server's socketPayload (see
          // vehicleTrackingController.recordLocationUpdate) but were
          // previously dropped here, forcing the UI to re-derive "next stop"
          // client-side instead of trusting the server's value.
          currentStopId: payload.currentStopId ?? null,
          currentStopIndex: payload.currentStopIndex ?? null,
          nextStopId: payload.nextStopId ?? null,
          timestamp: payload.timestamp,
        }),
      );
      console.log("[GuardianSocket] Received location update:", payload);
    };

    const handleVehicleStarted = (payload) => {
      dispatch(
        setTripStatus({ vehicleId: payload.vehicleId, status: "active" }),
      );
      dispatch(
        notificationReceived({
          id: `trip-started-${payload.vehicleId}-${Date.now()}`,
          type: "trip_started",
          title: "Trip Started 🚌",
          body: "The bus has started its journey.",
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * vehicle-stop-arrival
     * Driver tapped "Arrived" at a stop.
     * Payload: { vehicleId, routeId, stopId, stopName, stopIndex, timestamp }
     *
     * Guardian action: advance the progress indicator and notify if this is
     * the child's stop.
     */
    const handleStopArrival = (payload) => {
      console.log(
        "[GuardianSocket] 📍 vehicle-stop-arrival received:",
        payload,
      );
      dispatch(
        setCurrentStopIndex({
          vehicleId: payload.vehicleId,
          stopIndex: payload.stopIndex,
          stopId: payload.stopId,
          stopName: payload.stopName,
        }),
      );
      dispatch(
        notificationReceived({
          id: `stop-arrival-${payload.stopId}-${Date.now()}`,
          type: "stop_arrival",
          title: `Bus at ${payload.stopName}`,
          body: "The bus has arrived at a stop.",
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          stopId: payload.stopId,
          stopName: payload.stopName,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * vehicle-approaching-stop
     * Payload: { vehicleId, routeId, stopId, stopName, etaMinutes, timestamp }
     *
     * Guardian action: update ETA countdown and show "Bus arriving soon" alert.
     */
    const handleApproachingStop = (payload) => {
      dispatch(
        setEtaMinutes({
          vehicleId: payload.vehicleId,
          etaMinutes: payload.etaMinutes,
          stopId: payload.stopId,
          stopName: payload.stopName,
        }),
      );
      dispatch(
        notificationReceived({
          id: `approaching-${payload.stopId}-${Date.now()}`,
          type: "approaching_stop",
          title: `Bus arriving in ${payload.etaMinutes} min ⏱`,
          body: `Approaching ${payload.stopName}.`,
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          stopId: payload.stopId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * vehicle-departure
     * Driver left a stop.
     * Payload: { vehicleId, routeId, stopId, stopName, timestamp }
     *
     * Guardian action: mark stop as departed, resume ETA to next stop.
     */
    const handleDeparture = (payload) => {
      dispatch(
        notificationReceived({
          id: `departure-${payload.stopId}-${Date.now()}`,
          type: "stop_departure",
          title: `Bus left ${payload.stopName}`,
          body: "The bus has departed and is heading to the next stop.",
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          stopId: payload.stopId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * vehicle-eta-update
     * Continuously updated by driver.
     * Payload: { vehicleId, routeId, stopId, etaMinutes, timestamp }
     *          (wrapped inside data.data in some versions — check your server)
     *
     * Guardian action: update ETA display in the tracking screen.
     */
    const handleEtaUpdate = (payload) => {
      const p = payload.data ?? payload; // handle both shapes
      dispatch(
        setEtaMinutes({
          vehicleId: p.vehicleId,
          etaMinutes: p.etaMinutes,
          stopId: p.stopId ?? null,
          stopName: p.stopName ?? null,
        }),
      );
    };

    /**
     * vehicle-delayed
     * Payload: { vehicleId, routeId, stopId, delayMinutes, location, timestamp }
     *
     * Guardian action: show delay banner and push notification.
     */
    const handleDelayed = (payload) => {
      dispatch(
        setVehicleDelayed({
          vehicleId: payload.vehicleId,
          delayMinutes: payload.delayMinutes,
          stopId: payload.stopId,
          location: payload.location,
        }),
      );
      dispatch(
        notificationReceived({
          id: `delayed-${payload.vehicleId}-${Date.now()}`,
          type: "vehicle_delayed",
          title: `Bus delayed by ${payload.delayMinutes} min ⏰`,
          body: "The bus is running behind schedule.",
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * vehicle-alert
     * Speed or safety alert from driver or automated system.
     * Payload: { vehicleId, title, message, alertType, timestamp }
     *
     * Guardian action: show alert banner.
     */
    const handleVehicleAlert = (payload) => {
      dispatch(setVehicleAlert(payload));
      dispatch(
        notificationReceived({
          id: `alert-${Date.now()}`,
          type: "vehicle_alert",
          title: payload.title ?? "Vehicle Alert ⚠️",
          body:
            payload.message ?? "An alert was triggered for your child's bus.",
          vehicleId: payload.vehicleId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * trip-ended
     * Payload: { vehicleId, routeId, finalLocation, completedStops, totalStops, timestamp }
     *
     * Guardian action: set trip status to "ended", show summary notification.
     */
    const handleTripEnded = (payload) => {
      dispatch(
        setTripStatus({ vehicleId: payload.vehicleId, status: "ended" }),
      );
      dispatch(
        notificationReceived({
          id: `trip-ended-${payload.vehicleId}-${Date.now()}`,
          type: "trip_ended",
          title: "Trip Completed 🏁",
          body: `The bus completed ${payload.completedStops ?? "all"} stops.`,
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * driver-sos
     * Emergency alert from driver.
     * Payload: { vehicleId, routeId, location, driverName, driverPhone, reason, timestamp }
     *
     * Guardian action: full-screen SOS alert, audio if possible.
     */
    const handleDriverSOS = (payload) => {
      dispatch(setDriverSOS(payload));
      dispatch(
        notificationReceived({
          id: `sos-${payload.vehicleId}-${Date.now()}`,
          type: "sos",
          title: "🚨 Emergency Alert",
          body: `Driver ${payload.driverName ?? ""} sent an SOS. Tap for details.`,
          vehicleId: payload.vehicleId,
          routeId: payload.routeId,
          createdAt: payload.timestamp ?? new Date().toISOString(),
          read: false,
          urgent: true,
        }),
      );
    };

    /**
     * vehicle-route-update
     * Route changed while trip is active.
     * Payload: { vehicleId, route, timestamp }
     *
     * Guardian action: refresh the route path on the map.
     */
    const handleRouteUpdate = (payload) => {
      dispatch(setRouteUpdate(payload));
    };

    // ── Notification / announcement events ──────────────────────────────────

    /**
     * new-notification
     * General server-pushed notification (e.g. from admin or school).
     * Payload: { title, body, type, userId?, vehicleId?, ... }
     */
    const handleNewNotification = (payload) => {
      dispatch(
        notificationReceived({
          // Prefer the backend's real notification id (this is a
          // DB-persisted record, unlike the synthetic client-side events
          // below) so it stays reconcilable with markNotificationAsRead and
          // with whatever getNotifications() returns on the next refresh.
          // Without this, the client-generated id and the server's id
          // diverge, causing duplicate entries and a notification that can
          // never actually be marked read server-side.
          id: payload.id ?? `notif-${Date.now()}`,
          type: payload.type ?? "general",
          title: payload.title,
          body: payload.body ?? payload.message ?? "",
          vehicleId: payload.vehicleId ?? null,
          createdAt: payload.createdAt ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    /**
     * new-announcement
     * Broadcast from school/admin.
     * Payload: { title, body, authorName, createdAt, ... }
     */
    const handleNewAnnouncement = (payload) => {
      dispatch(
        notificationReceived({
          id: payload.id ?? `announcement-${Date.now()}`,
          type: "announcement",
          title: payload.title,
          body: payload.body ?? payload.message ?? "",
          createdAt: payload.createdAt ?? new Date().toISOString(),
          read: false,
        }),
      );
    };

    // ── Messaging events ──────────────────────────────────────────────────────

    /**
     * new-message
     * Emitted by the messages service when a message is saved to the DB.
     * Payload: { conversationId, message: { id, senderId, senderName, message, createdAt, ... } }
     *
     * Guardian action:
     *   • If the message is in the currently open conversation → append it.
     *   • Otherwise → increment the unread badge.
     */
    const handleNewMessage = (payload) => {
      const { conversationId, message } = payload;
      if (!message) return;

      dispatch(addMessage({ conversationId, message }));

      // Only increment unread when the user is NOT looking at this conversation
      if (conversationId !== currentConvoIdRef.current) {
        dispatch(incrementUnread(conversationId));
      }
    };

    /**
     * user-typing
     * Server re-emits "typing" from the sender as "user-typing" to the room.
     * Payload: { userId, conversationId, isTyping }
     */
    const handleUserTyping = ({ userId, conversationId, isTyping }) => {
      if (userId === user.id) return; // ignore our own echo
      dispatch(setTyping({ conversationId, userId, isTyping }));
    };

    /**
     * message-read
     * Payload: { userId, conversationId, messageId }
     */
    const handleMessageRead = (payload) => {
      // Optional: mark message as read in UI
      // dispatch(markMessageDelivered(payload));
      console.log("[GuardianSocket→Redux] message-read", payload);
    };

    // ── Guardian-specific events ──────────────────────────────────────────────

    /**
     * guardian-request-update
     * Emitted by backend when a driver accepts/rejects a join request.
     * Payload: { requestId, status: "accepted"|"rejected", routeId, driverName, ... }
     */
    const handleGuardianRequestUpdate = (payload) => {
      dispatch(updateRequestStatus(payload));
      dispatch(
        notificationReceived({
          id: `request-${payload.requestId}-${Date.now()}`,
          type:
            payload.status === "accepted"
              ? "request_accepted"
              : "request_rejected",
          title:
            payload.status === "accepted"
              ? "Request Accepted ✅"
              : "Request Declined",
          body:
            payload.status === "accepted"
              ? `${payload.driverName ?? "The driver"} accepted your request.`
              : `${payload.driverName ?? "The driver"} declined your request.`,
          createdAt: new Date().toISOString(),
          read: false,
        }),
      );
    };

    // ── Register all listeners ───────────────────────────────────────────────
    onVehicleLocationUpdate(handleLocationUpdate);
    onVehicleStarted(handleVehicleStarted);
    onVehicleStopArrival(handleStopArrival);
    onVehicleApproachingStop(handleApproachingStop);
    onVehicleDeparture(handleDeparture);
    onVehicleEtaUpdate(handleEtaUpdate);
    onVehicleDelayed(handleDelayed);
    onVehicleAlert(handleVehicleAlert);
    onTripEnded(handleTripEnded);
    onDriverSOS(handleDriverSOS);
    onVehicleRouteUpdate(handleRouteUpdate);
    onNewNotification(handleNewNotification);
    onNewAnnouncement(handleNewAnnouncement);
    onNewMessage(handleNewMessage);
    onUserTyping(handleUserTyping);
    onMessageRead(handleMessageRead);
    onGuardianRequestUpdate(handleGuardianRequestUpdate);

    const rawSocket = getSocket();
    const handleEmergencyLocation = (payload) => {
      console.log("[GuardianSocket] emergency-location-update:", payload);
      dispatch(
        setVehicleLocation({
          vehicleId: payload.vehicleId || `emergency-${payload.rideId}`,
          latitude: payload.latitude,
          longitude: payload.longitude,
          speed: payload.speed ?? 0,
          heading: payload.heading ?? 0,
          accuracy: payload.accuracy ?? 0,
          timestamp: payload.timestamp,
        }),
      );
    };

    if (rawSocket) {
      rawSocket.on("emergency-location-update", handleEmergencyLocation);
      rawSocket.on("emergency-ride-accepted", (p) => console.log("emergency-ride-accepted", p));
      rawSocket.on("emergency-ride-arriving", (p) => console.log("emergency-ride-arriving", p));
      rawSocket.on("emergency-ride-picked-up", (p) => console.log("emergency-ride-picked-up", p));
      rawSocket.on("emergency-ride-started", (p) => console.log("emergency-ride-started", p));
      rawSocket.on("emergency-ride-completed", (p) => console.log("emergency-ride-completed", p));
    }

    return () => {
      offVehicleLocationUpdate(handleLocationUpdate);
      offVehicleStarted(handleVehicleStarted);
      offVehicleStopArrival(handleStopArrival);
      offVehicleApproachingStop(handleApproachingStop);
      offVehicleDeparture(handleDeparture);
      offVehicleEtaUpdate(handleEtaUpdate);
      offVehicleDelayed(handleDelayed);
      offVehicleAlert(handleVehicleAlert);
      offTripEnded(handleTripEnded);
      offDriverSOS(handleDriverSOS);
      offVehicleRouteUpdate(handleRouteUpdate);
      offNewNotification(handleNewNotification);
      offNewAnnouncement(handleNewAnnouncement);
      offNewMessage(handleNewMessage);
      offUserTyping(handleUserTyping);
      offMessageRead(handleMessageRead);
      offGuardianRequestUpdate(handleGuardianRequestUpdate);
      if (rawSocket) {
        rawSocket.off("emergency-location-update", handleEmergencyLocation);
        rawSocket.off("emergency-ride-accepted");
        rawSocket.off("emergency-ride-arriving");
        rawSocket.off("emergency-ride-picked-up");
        rawSocket.off("emergency-ride-started");
        rawSocket.off("emergency-ride-completed");
      }
    };
  }, [user?.id, dispatch]); // note: currentConvoId intentionally NOT in deps (uses ref)

  // ── 4. Cleanup on logout ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (!user?.id) {
        leaveAllVehicleRooms();
        disconnectGuardianSocket();
      }
    };
  }, [user?.id]);

  // ── 5. Expose helpers to screens ─────────────────────────────────────────
  /**
   * subscribeToVehicle
   * Call this from the tracking screen when the guardian opens a child's
   * live-tracking view.  The vehicle room subscription is already set up
   * by effect #2 above for known vehicles, but this lets screens
   * dynamically add a vehicle (e.g. after accepting a route request).
   */
  const subscribeToVehicle = useCallback((vehicleId) => {
    joinVehicleRoom(vehicleId);
  }, []);

  const unsubscribeFromVehicle = useCallback((vehicleId) => {
    leaveVehicleRoom(vehicleId);
  }, []);

  return {
    isConnected,
    // Vehicle subscription helpers (for tracking screens)
    subscribeToVehicle,
    unsubscribeFromVehicle,
    // Chat / messaging helpers (for chat screens)
    joinConversation,
    leaveConversation,
    sendTyping,
    markMessageRead,
    // Raw socket access (avoid where possible)
    getSocket,
    isSocketHealthy,
  };
}
