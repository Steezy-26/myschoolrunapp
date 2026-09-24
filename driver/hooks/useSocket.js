import { useEffect, useRef, useState, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import * as Location from "expo-location";

// Socket singleton helpers
import {
  initSocket,
  disconnectSocket,
  joinUserRoom,
  joinDriverRoom,
  joinVehicleRoom,
  leaveUserRoom,
  leaveDriverRoom,
  leaveVehicleRoom,
  // Inbound listener pairs
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
  onNewNotification,
  offNewNotification,
  onNewAnnouncement,
  offNewAnnouncement,
  onDriverAssigned,
  offDriverAssigned,
  onRouteAssigned,
  offRouteAssigned,
  onUserTyping,
  offUserTyping,
  onMessageRead,
  offMessageRead,
  onDriverSOS,
  offDriverSOS,
  // Outbound emitters
  emitLocationUpdate,
  emitVehicleStarted,
  emitStopArrival,
  emitStopDeparture,
  emitApproachingStop,
  emitETAUpdate,
  emitTripEnded,
  emitVehicleDelayed,
  emitSOS,
  joinConversation,
  leaveConversation,
  sendTyping,
  getSocket,
  isSocketHealthy,
} from "../utils/socket";

// Redux actions
import {
  addRealTimeLocation,
  updateLastUpdate,
  markStopCompleted,
  setTripStatus,
} from "../lib/VehicleTrackingSlice";

import { addMessage, incrementUnread, setTyping } from "../lib/MessagesSlice";
import { addIncomingRequest, removeIncomingRequest } from "../lib/EmergencyRidesSlice";

// ── Selectors ─────────────────────────────────────────────────────────────────
const selectUser = (s) => s.auth?.user;
const selectVehicle = (s) => s.vehicleroutes?.driverAssignedVehicle;

// ── Hook ──────────────────────────────────────────────────────────────────────
export default function useSocketRedux() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const vehicle = useSelector(selectVehicle);

  const [isConnected, setIsConnected] = useState(false);
  const locationSubRef = useRef(null);
  const activeRouteRef = useRef(null); // set via setActiveRoute below
  const tripActiveRef = useRef(false);

  // ── 1. Init socket & join rooms when user is authenticated ────────────────
  useEffect(() => {
    if (!user?.id) return;

    const socket = initSocket();
    if (!socket) return;

    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    if (socket.connected) setIsConnected(true);

    // Join personal rooms
    joinUserRoom(user.id);
    if (user.driverId || user.id) joinDriverRoom(user.driverId || user.id);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      leaveUserRoom();
      leaveDriverRoom();
    };
  }, [user?.id]);

  // ── 2. Join vehicle room when assigned vehicle is known ───────────────────
  useEffect(() => {
    if (!vehicle?.id) return;
    joinVehicleRoom(vehicle.id);
    return () => leaveVehicleRoom();
  }, [vehicle?.id]);

  // ── 3. Wire ALL inbound events → Redux ───────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    // ── Tracking events ─────────────────────────────────────────────────────
    /**
     * vehicle-location-update — the driver emits this; the backend re-broadcasts
     * to vehicle-${vehicleId} and vehicle-tracking rooms so guardians receive it.
     * On the DRIVER side we also receive our own echo here (server echoes back to room).
     * We push it into VehicleTrackingSlice so the map can read the latest position.
     *
     * Payload: { vehicleId, latitude, longitude, speed, heading, routeId, timestamp }
     */
    const handleLocationUpdate = (payload) => {
      dispatch(addRealTimeLocation(payload));
      dispatch(updateLastUpdate());
    };

    const handleVehicleStarted = (payload) => {
      // Could dispatch a "tripStarted" action if you add one to VehicleTrackingSlice
      console.log("[Socket→Redux] vehicle-started", payload);
    };

    const handleStopArrival = (payload) => {
      console.log("[Socket→Redux] vehicle-stop-arrival", payload);
      // payload.stopIndex lets us update progress without a REST call —
      // this is the guardian-side counterpart to the driver's local
      // dispatch(markStopCompleted(...)) in HomeScreen. Without this, the
      // driver's own progress bar updates (local dispatch) but guardians
      // never see it since this handler was previously a no-op.
      if (payload?.stopIndex != null) {
        dispatch(markStopCompleted(payload.stopIndex));
      }
    };

    const handleApproachingStop = (payload) => {
      console.log("[Socket→Redux] vehicle-approaching-stop", payload);
    };

    const handleDeparture = (payload) => {
      console.log("[Socket→Redux] vehicle-departure", payload);
    };

    const handleEtaUpdate = (payload) => {
      console.log("[Socket→Redux] vehicle-eta-update", payload);
    };

    const handleDelayed = (payload) => {
      console.log("[Socket→Redux] vehicle-delayed", payload);
    };

    const handleAlert = (payload) => {
      console.log("[Socket→Redux] vehicle-alert", payload);
    };

    const handleTripEnded = (payload) => {
      console.log("[Socket→Redux] trip-ended", payload);
      // Same gap as handleStopArrival — guardians never saw the trip flip
      // to "ended" because nothing was dispatched here.
      dispatch(setTripStatus("ended"));
    };

    const handleSOS = (payload) => {
      console.log("[Socket→Redux] driver-sos", payload);
    };

    // ── Notification / announcement events ──────────────────────────────────
    const handleNewNotification = (payload) => {
      console.log("[Socket→Redux] new-notification", payload);
      // dispatch(addNotification(payload)) — wire to your notifications slice
    };

    const handleNewAnnouncement = (payload) => {
      console.log("[Socket→Redux] new-announcement", payload);
    };

    // ── Assignment events ────────────────────────────────────────────────────
    const handleDriverAssigned = (payload) => {
      console.log("[Socket→Redux] driver-assigned", payload);
      // dispatch(setAssignment(payload)) — AuthSlice already has setAssignment
    };

    const handleRouteAssigned = (payload) => {
      console.log("[Socket→Redux] route-assigned", payload);
    };

    // ── Emergency Ride events ───────────────────────────────────────────────
    const handleEmergencySelected = (payload) => {
      console.log("[Socket→Redux] emergency-ride-selected", payload);
      dispatch(addIncomingRequest(payload));
    };

    const handleEmergencyCancelled = (payload) => {
      console.log("[Socket→Redux] emergency-ride-cancelled", payload);
      if (payload?.id) {
        dispatch(removeIncomingRequest(payload.id));
      }
    };

    // ── Messaging events ─────────────────────────────────────────────────────
    /**
     * "new-message" is NOT in the socketHandler — the server emits it via the
     * messages service when a message is saved. Wire it to addMessage / incrementUnread.
     *
     * Expected payload: { conversationId, message: { id, senderId, message, createdAt, ... } }
     */
    const handleNewMessage = (payload) => {
      const { conversationId, message } = payload;
      dispatch(addMessage({ conversationId, message }));
      dispatch(incrementUnread(conversationId));
    };
    /**
     * "user-typing" — server re-emits as "user-typing" (not "typing") to the room.
     * Payload: { userId, conversationId, isTyping }
     */
    const handleUserTyping = ({ userId, conversationId, isTyping }) => {
      dispatch(setTyping({ conversationId, userId, isTyping }));
    };

    const handleMessageRead = (payload) => {
      console.log("[Socket→Redux] message-read", payload);
      // dispatch(markMessageRead(payload)) — no-op for driver side mostly
    };

    // Register all listeners
    onVehicleLocationUpdate(handleLocationUpdate);
    onVehicleStarted(handleVehicleStarted);
    onVehicleStopArrival(handleStopArrival);
    onVehicleApproachingStop(handleApproachingStop);
    onVehicleDeparture(handleDeparture);
    onVehicleEtaUpdate(handleEtaUpdate);
    onVehicleDelayed(handleDelayed);
    onVehicleAlert(handleAlert);
    onTripEnded(handleTripEnded);
    onDriverSOS(handleSOS);
    onNewNotification(handleNewNotification);
    onNewAnnouncement(handleNewAnnouncement);
    onDriverAssigned(handleDriverAssigned);
    onRouteAssigned(handleRouteAssigned);
    onUserTyping(handleUserTyping);
    onMessageRead(handleMessageRead);

    // new-message comes from the messages service, not socketHandler directly.
    // Use the raw socket for this one since we don't have a makeListeners pair yet.
    const rawSocket = getSocket();
    if (rawSocket) {
      rawSocket.on("new-message", handleNewMessage);
      rawSocket.on("emergency-ride-selected", handleEmergencySelected);
      rawSocket.on("emergency-ride-cancelled", handleEmergencyCancelled);
    }

    return () => {
      offVehicleLocationUpdate(handleLocationUpdate);
      offVehicleStarted(handleVehicleStarted);
      offVehicleStopArrival(handleStopArrival);
      offVehicleApproachingStop(handleApproachingStop);
      offVehicleDeparture(handleDeparture);
      offVehicleEtaUpdate(handleEtaUpdate);
      offVehicleDelayed(handleDelayed);
      offVehicleAlert(handleAlert);
      offTripEnded(handleTripEnded);
      offDriverSOS(handleSOS);
      offNewNotification(handleNewNotification);
      offNewAnnouncement(handleNewAnnouncement);
      offDriverAssigned(handleDriverAssigned);
      offRouteAssigned(handleRouteAssigned);
      offUserTyping(handleUserTyping);
      offMessageRead(handleMessageRead);
      if (rawSocket) {
        rawSocket.off("new-message", handleNewMessage);
        rawSocket.off("emergency-ride-selected", handleEmergencySelected);
        rawSocket.off("emergency-ride-cancelled", handleEmergencyCancelled);
      }
    };
  }, [user?.id, dispatch]);

  // ── 4. Location watch + real-time broadcast ───────────────────────────────
  /**
   * startTracking — call this when the driver presses "Start Trip".
   * Starts expo-location watch and broadcasts every position update via socket.
   *
   * @param {object} route  - The active route object (from VehicleRoutesSlice)
   * @param {object} vehicle - The assigned vehicle object
   */
  const startTracking = useCallback(
    async (route, vehicleObj) => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("[Tracking] Location permission denied");
        return null;
      }

      tripActiveRef.current = true;
      activeRouteRef.current = route;

      // Emit trip started event to server

      if (vehicleObj?.id) {
        joinVehicleRoom(vehicleObj.id);
      }

      if (vehicleObj?.id) {
        emitVehicleStarted(vehicleObj.id, route?.id, null);
      }

      // Grab one immediate fix before the watch starts. watchPositionAsync's
      // first callback can take a few seconds to fire, but the caller (e.g.
      // HomeScreen) needs a current position right away to draw the route
      // from the driver to the first stop as soon as "Start Trip" is tapped.
      let initialLocation = null;
      try {
        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation,
        });
        const { latitude, longitude, speed, heading, accuracy } =
          current.coords;
        initialLocation = { latitude, longitude };

        const payload = {
          vehicleId: vehicleObj?.id,
          routeId: route?.id,
          latitude,
          longitude,
          speed: speed ?? 0,
          heading: heading ?? 0,
          accuracy: accuracy ?? 0,
          timestamp: new Date().toISOString(),
        };

        emitLocationUpdate(payload);
        dispatch(addRealTimeLocation(payload));
        dispatch(updateLastUpdate());
      } catch (err) {
        console.warn("[Tracking] Could not get initial position:", err);
      }

      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 2000, // every 2 seconds
          distanceInterval: 5, // or every 5 metres
        },
        (loc) => {
          if (!tripActiveRef.current) return;

          const { latitude, longitude, speed, heading, accuracy } = loc.coords;

          const payload = {
            vehicleId: vehicleObj?.id,
            routeId: activeRouteRef.current?.id,
            latitude,
            longitude,
            speed: speed ?? 0, // m/s — convert to km/h in UI: speed * 3.6
            heading: heading ?? 0,
            accuracy: accuracy ?? 0,
            timestamp: new Date().toISOString(),
          };

          // 1. Emit to socket → server re-broadcasts to all subscribers (guardians)
          emitLocationUpdate(payload);

          // 2. Also update local Redux store (for the driver's own map)
          dispatch(addRealTimeLocation(payload));
          dispatch(updateLastUpdate());
        },
      );

      locationSubRef.current = sub;

      return initialLocation;
    },
    [dispatch, joinVehicleRoom],
  );

  /**
   * stopTracking — call when driver presses "End Trip" or leaves the Home screen.
   */
  const stopTracking = useCallback(
    (vehicleId, routeId, finalLocation, completedStops, totalStops) => {
      tripActiveRef.current = false;
      locationSubRef.current?.remove();
      locationSubRef.current = null;

      if (vehicleId) {
        emitTripEnded(
          vehicleId,
          routeId,
          finalLocation,
          completedStops,
          totalStops,
        );
      }
    },
    [],
  );

  /**
   * markArrived — call when driver taps "Arrived" at a stop.
   */
  const markArrived = useCallback((vehicleId, routeId, stop, stopIndex) => {
    emitStopArrival(vehicleId, routeId, stop.id, stop.stopName, stopIndex);
  }, []);

  /**
   * markDeparted — call when driver taps "Departed" / moves on from a stop.
   */
  const markDeparted = useCallback((vehicleId, routeId, stop) => {
    emitStopDeparture(vehicleId, routeId, stop.id, stop.stopName);
  }, []);

  /**
   * broadcastETA — call from the Home screen whenever ETA is recalculated.
   */
  const broadcastETA = useCallback((vehicleId, routeId, stopId, etaMinutes) => {
    emitETAUpdate(vehicleId, routeId, stopId, etaMinutes);
  }, []);

  /**
   * triggerSOS — call from any screen.
   */
  const triggerSOS = useCallback(
    (vehicleId, location, driverName, driverPhone) => {
      emitSOS(vehicleId, location, driverName, driverPhone, "emergency");
    },
    [],
  );

  // ── Cleanup on unmount / logout ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      locationSubRef.current?.remove();
      if (!user?.id) disconnectSocket();
    };
  }, [user?.id]);

  return {
    isConnected,
    // Tracking controls — call from HomeScreen
    startTracking,
    stopTracking,
    markArrived,
    markDeparted,
    broadcastETA,
    triggerSOS,
    // Messaging helpers — call from ChatScreen
    joinConversation,
    leaveConversation,
    sendTyping,
    // Raw socket access (rarely needed by screens)
    getSocket,
    isSocketHealthy,
  };
}