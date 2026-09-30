// screens/HomeScreen.js  (guardian app)
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Alert,
  Modal,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import Mapbox from "@rnmapbox/maps";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector, shallowEqual } from "react-redux";
import {
  DrawerActions,
  useNavigation,
  useFocusEffect,
} from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGuardianStudents } from "../lib/UserSlice";
import { haversineKm } from "../utils/helpers";
import { getRouteDirections } from "../utils/mapbox";
import Toast from "react-native-toast-message";
import {
  selectVehicleLocation,
  selectVehicleSpeed,
  selectVehicleHeading,
  selectTripStatus,
  selectCompletedStops,
  getCurrentVehicleLocation,
} from "../lib/VehicleTrackingSlice";

export default function HomeScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef(null);

  // ── Refs for route throttling ──────────────────────────────────────────
  const lastFetchedLocationRef = useRef(null);
  const lastCompletedStopsRef = useRef([]);

  // ── Redux selectors ───────────────────────────────────────────────────────
  const { guardianProfile, students, isLoading } = useSelector(
    (state) => state.users,
  );
  const { notifications } = useSelector((state) => state.notifications);

  // ── Local state ──────────────────────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetail, setShowStudentDetail] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(12);
  const [followVehicle, setFollowVehicle] = useState(true);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [nextStop, setNextStop] = useState(null);

  // ── Group students by vehicle + route ───────────────────────────────────
  // A guardian may have several children. If two of them ride the same
  // vehicle on the same route, they should show up as a single trackable
  // group rather than duplicate entries.
  const groups = useMemo(() => {
    const map = new Map();
    for (const student of students || []) {
      const vehicleId =
        student.vehicleRoute?.vehicleId ?? student.vehicleRoute?.vehicle?.id;
      const routeId = student.vehicleRoute?.id;
      const key =
        vehicleId && routeId
          ? `${vehicleId}:${routeId}`
          : `student:${student.id}`;

      if (!map.has(key)) {
        map.set(key, {
          key,
          vehicleId: vehicleId ?? null,
          routeId: routeId ?? null,
          route: student.vehicleRoute ?? null,
          students: [],
        });
      }
      map.get(key).students.push(student);
    }
    return Array.from(map.values());
  }, [students]);

  // Keep the selected group valid as students/groups load or change
  useEffect(() => {
    if (!groups.length) {
      setSelectedGroupKey(null);
      return;
    }
    if (!groups.some((g) => g.key === selectedGroupKey)) {
      setSelectedGroupKey(groups[0].key);
    }
  }, [groups, selectedGroupKey]);

  const selectedGroup =
    groups.find((g) => g.key === selectedGroupKey) ?? groups[0] ?? null;
  const primaryStudent = selectedGroup?.students?.[0] ?? null;
  const trackedVehicleId = selectedGroup?.vehicleId ?? null;
  // Vehicle profile (carMake, registration, etc.) — this comes straight from
  // the student's own route data, not the admin-only /active-vehicles list.
  const vehicleInfo = selectedGroup?.route?.vehicle ?? null;

  if (__DEV__) {
    // TEMP DIAGNOSTIC — remove once the map-pin/route-line issue is
    // confirmed fixed. If trackedVehicleId or route/stops are null here even
    // though the student clearly has a bus assigned, the field names this
    // screen expects (student.vehicleRoute.vehicleId / .vehicle.id / .stops)
    // don't match what getGuardianStudents() actually returns — check the
    // logged student object's real shape and adjust the `groups` derivation
    // above accordingly.
    // eslint-disable-next-line no-console
    console.log("[HomeScreen] students[0]:", students?.[0]);
    // eslint-disable-next-line no-console
    console.log("[HomeScreen] selectedGroup:", {
      key: selectedGroup?.key,
      vehicleId: selectedGroup?.vehicleId,
      routeId: selectedGroup?.routeId,
      stopsCount: selectedGroup?.route?.stops?.length,
    });
  }

  // ── Real-time tracking data for the selected vehicle ────────────────────
  const currentDriverLocation = useSelector(
    selectVehicleLocation(trackedVehicleId),
    shallowEqual,
  );
  const currentSpeed = useSelector(selectVehicleSpeed(trackedVehicleId));
  const currentHeading = useSelector(selectVehicleHeading(trackedVehicleId));
  const tripStatus = useSelector(selectTripStatus(trackedVehicleId));
  const completedStopIndexes = useSelector(
    selectCompletedStops(trackedVehicleId),
    shallowEqual,
  );

  // ── Derived data ─────────────────────────────────────────────────────────
  const unreadCount = notifications?.filter((n) => !n.read)?.length || 0;
  const studentCount = students?.length || 0;
  const speedKmh = Math.round((currentSpeed || 0) * 3.6);
  // "Online" is derived from real-time socket data: an active trip, or a
  // live position already received. (There's no admin-only activeVehicles
  // fallback here — guardians can't call that endpoint; see the fetch
  // effect below.)
  const isOnline = tripStatus === "active" || !!currentDriverLocation;
  // Extra vertical space reserved for the student/vehicle switcher row,
  // only present when a guardian tracks more than one group.
  const switcherOffset = groups.length > 1 ? 44 : 0;

  // ── Load data on focus ──────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      dispatch(getGuardianStudents());
    }, [dispatch]),
  );

  // Seed an initial position for the tracked vehicle via REST so the map
  // pin has *something* to show before the socket's first location tick
  // arrives (and works even if the socket is briefly disconnected).
  // NOTE: this previously called getAllActiveVehicleLocations(), which
  // hits /vehicle-tracking/active-vehicles — that endpoint is restricted to
  // admin/senior-teacher/sports-director/driver roles and 403s for
  // guardians, so `activeVehicles` (and anything derived from it) was
  // silently always empty. current-location/:vehicleId is guardian-permitted.
  useEffect(() => {
    if (!trackedVehicleId) return;
    dispatch(getCurrentVehicleLocation(trackedVehicleId))
      .unwrap?.()
      .then((res) => {
        if (__DEV__)
          console.log("[HomeScreen] getCurrentVehicleLocation ok:", res);
      })
      .catch((err) => {
        if (__DEV__)
          console.log("[HomeScreen] getCurrentVehicleLocation failed:", err);
      });
  }, [dispatch, trackedVehicleId]);

  const onRefresh = async () => {
    setRefreshing(true);
    const tasks = [dispatch(getGuardianStudents())];
    if (trackedVehicleId) {
      tasks.push(dispatch(getCurrentVehicleLocation(trackedVehicleId)));
    }
    await Promise.all(tasks);
    setRefreshing(false);
  };

  // ── Derive next stop from the selected group's route ────────────────────
  useEffect(() => {
    if (!trackedVehicleId) {
      setNextStop(null);
      return;
    }

    const route = selectedGroup?.route;
    if (route?.stops) {
      const sortedStops = [...route.stops].sort(
        (a, b) => a.stopOrder - b.stopOrder,
      );

      // Find the next stop based on completed stops
      const completedIndexes = completedStopIndexes || [];
      let nextIdx = 0;
      for (let i = 0; i < sortedStops.length; i++) {
        if (!completedIndexes.includes(i)) {
          nextIdx = i;
          break;
        }
      }

      setNextStop(nextIdx < sortedStops.length ? sortedStops[nextIdx] : null);
    } else {
      setNextStop(null);
    }
  }, [trackedVehicleId, selectedGroup, completedStopIndexes]);

  // ── Road-following route path (Mapbox Directions API) ───────────────────
  // Draws the path from the vehicle's current location to the remaining stops.
  // Updates when the vehicle moves, when a stop is completed, or when the route changes.
  useEffect(() => {
    let cancelled = false;
    const route = selectedGroup?.route;
    const stops = route?.stops;

    if (!stops || stops.length === 0) {
      setRouteCoordinates([]);
      return;
    }

    const sortedStops = [...stops]
      .sort((a, b) => a.stopOrder - b.stopOrder)
      .filter((s) => s.location?.latitude && s.location?.longitude);

    if (sortedStops.length === 0) {
      setRouteCoordinates([]);
      return;
    }

    // Determine the first uncompleted stop index
    const completed = completedStopIndexes || [];
    let startIdx = 0;
    for (let i = 0; i < sortedStops.length; i++) {
      if (!completed.includes(i)) {
        startIdx = i;
        break;
      }
    }

    // Remaining stops (from startIdx to end)
    const remainingStops = sortedStops.slice(startIdx);

    // Build waypoints: current location (if available) + remaining stops
    let waypoints = [];
    if (currentDriverLocation) {
      waypoints.push({
        latitude: currentDriverLocation.latitude,
        longitude: currentDriverLocation.longitude,
      });
    }
    // Add remaining stops (flatten the location object)
    waypoints = waypoints.concat(
      remainingStops.map((s) => ({
        latitude: s.location.latitude,
        longitude: s.location.longitude,
      })),
    );

    // If we have fewer than 2 points, fallback to straight line between stops
    if (waypoints.length < 2) {
      // Use the remaining stops (or all stops if no location)
      const fallbackPoints = remainingStops.map((s) => ({
        latitude: s.location.latitude,
        longitude: s.location.longitude,
      }));
      setRouteCoordinates(fallbackPoints);
      return;
    }

    setIsLoadingRoute(true);

    // Throttle: only fetch if location changed more than 50m or completed stops changed
    const lastLoc = lastFetchedLocationRef.current;
    let shouldFetch = true;
    if (lastLoc && currentDriverLocation) {
      const dist = haversineKm(
        lastLoc.latitude,
        lastLoc.longitude,
        currentDriverLocation.latitude,
        currentDriverLocation.longitude,
      );
      const stopsChanged =
        JSON.stringify(completed) !==
        JSON.stringify(lastCompletedStopsRef.current);
      if (dist < 0.05 && !stopsChanged) {
        shouldFetch = false; // location hasn't changed significantly
      }
    }

    if (!shouldFetch) {
      setIsLoadingRoute(false);
      return;
    }

    // Update refs
    lastFetchedLocationRef.current = currentDriverLocation
      ? { ...currentDriverLocation }
      : null;
    lastCompletedStopsRef.current = [...completed];

    getRouteDirections(waypoints)
      .then((result) => {
        if (cancelled) return;
        if (result?.coordinates?.length >= 2) {
          setRouteCoordinates(result.coordinates);
        } else {
          // Fallback to straight line between waypoints
          setRouteCoordinates(waypoints);
        }
      })
      .catch((err) => {
        console.error("[HomeScreen] Route directions failed:", err);
        if (!cancelled) setRouteCoordinates(waypoints);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingRoute(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedGroup?.routeId, currentDriverLocation, completedStopIndexes]);

  // ── ETA calculation ──────────────────────────────────────────────────────
  const [etaMinutes, setEtaMinutes] = useState(null);
  useEffect(() => {
    if (!currentDriverLocation || !nextStop?.location) {
      setEtaMinutes(null);
      return;
    }

    const calculateETA = () => {
      const dist = haversineKm(
        currentDriverLocation.latitude,
        currentDriverLocation.longitude,
        nextStop.location.latitude,
        nextStop.location.longitude,
      );

      const speed = currentSpeed || 0.1; // m/s, fallback to walking speed
      const timeHours = dist / (speed * 3.6);
      const timeMinutes = Math.round(timeHours * 60);

      setEtaMinutes(Math.max(1, timeMinutes));
    };

    calculateETA();
    const interval = setInterval(calculateETA, 30000);

    return () => clearInterval(interval);
  }, [currentDriverLocation, currentSpeed, nextStop]);

  // ── Map data ──────────────────────────────────────────────────────────────
  const centerCoord = currentDriverLocation
    ? [currentDriverLocation.longitude, currentDriverLocation.latitude]
    : [31.0335, -17.8252]; // Harare default — homeAddress is a plain
  // string (see Student Detail modal below), not geocoded, so it
  // can't be used as a map coordinate.

  const mapStyle =
    T.mode === "dark" ? Mapbox.StyleURL.Dark : Mapbox.StyleURL.Street;

  // ── Map controls ─────────────────────────────────────────────────────────
  const MIN_ZOOM = 3;
  const MAX_ZOOM = 19;

  const handleZoomIn = useCallback(() => {
    setZoomLevel((z) => {
      const next = Math.min(z + 1, MAX_ZOOM);
      cameraRef.current?.zoomTo(next, 300);
      return next;
    });
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel((z) => {
      const next = Math.max(z - 1, MIN_ZOOM);
      cameraRef.current?.zoomTo(next, 300);
      return next;
    });
  }, []);

  const handleRecenter = useCallback(() => {
    setFollowVehicle(true);
    setZoomLevel(14);
    cameraRef.current?.setCamera({
      centerCoordinate: centerCoord,
      zoomLevel: 14,
      animationMode: "flyTo",
      animationDuration: 600,
    });
  }, [centerCoord]);

  const handleMapTouchStart = useCallback(() => {
    setFollowVehicle(false);
  }, []);

  // ── Student selection ────────────────────────────────────────────────────
  const handleStudentSelect = (student) => {
    setSelectedStudent(student);
    setShowStudentDetail(true);
  };

  // ── Render stop markers ─────────────────────────────────────────────────
  const renderStopMarkers = () => {
    if (!selectedGroup?.route?.stops) return null;

    const stops = selectedGroup.route.stops;
    const completedIndexes = completedStopIndexes || [];

    return stops.map((stop, idx) => {
      if (!stop.location?.longitude) return null;
      const isCompleted = completedIndexes.includes(idx);
      const isNext = idx === completedIndexes.length && !isCompleted;

      return (
        <Mapbox.PointAnnotation
          key={stop.id || idx}
          id={`stop-${idx}`}
          coordinate={[stop.location.longitude, stop.location.latitude]}
        >
          <View
            style={[
              styles.stopMarker,
              isNext && {
                backgroundColor: T.accent,
                borderColor: "#fff",
                transform: [{ scale: 1.2 }],
              },
              isCompleted && {
                backgroundColor: T.success,
                borderColor: T.success,
              },
            ]}
          >
            {isCompleted ? (
              <Ionicons name="checkmark" size={10} color="#fff" />
            ) : (
              <Text style={styles.stopMarkerText}>{idx + 1}</Text>
            )}
          </View>
        </Mapbox.PointAnnotation>
      );
    });
  };

  // ── Render vehicle marker ──────────────────────────────────────────────
  const renderVehicleMarker = () => {
    if (!currentDriverLocation) return null;
    const loc = currentDriverLocation;

    return (
      <Mapbox.PointAnnotation
        id="vehicle"
        coordinate={[loc.longitude, loc.latitude]}
      >
        <View style={styles.vehicleDotWrap}>
          <View style={[styles.vehicleDot, { borderColor: T.surface }]}>
            <Ionicons
              name="navigate"
              size={12}
              color="#fff"
              style={{ transform: [{ rotate: `${currentHeading || 0}deg` }] }}
            />
          </View>
        </View>
      </Mapbox.PointAnnotation>
    );
  };

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Map */}
      <Mapbox.MapView
        style={styles.map}
        styleURL={mapStyle}
        onTouchStart={handleMapTouchStart}
      >
        <Mapbox.Camera
          ref={cameraRef}
          {...(followVehicle ? { centerCoordinate: centerCoord } : {})}
          defaultSettings={{ centerCoordinate: centerCoord, zoomLevel }}
          zoomLevel={zoomLevel}
          animationMode="flyTo"
          animationDuration={600}
        />

        {routeCoordinates.length >= 2 && (
          <Mapbox.ShapeSource
            id="route-path"
            shape={{
              type: "Feature",
              geometry: {
                type: "LineString",
                coordinates: routeCoordinates.map((c) => [
                  c.longitude,
                  c.latitude,
                ]),
              },
            }}
          >
            <Mapbox.LineLayer
              id="route-line"
              style={{
                lineColor: T.accent,
                lineWidth: 4,
                lineOpacity: 0.75,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </Mapbox.ShapeSource>
        )}

        {renderStopMarkers()}
        {renderVehicleMarker()}
      </Mapbox.MapView>

      {/* Top bar */}
      <View
        style={[
          styles.topBar,
          {
            top: insets.top + 16,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.topBtn, { backgroundColor: T.mapOverlay }]}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={22} color={T.text} />
        </TouchableOpacity>

        {/* fromDrawer: false → back on Vehicle returns here instead of
            reopening the side menu (this screen wasn't opened from the menu) */}
        <TouchableOpacity
          style={[styles.routePill, { backgroundColor: T.mapOverlay }]}
          onPress={() =>
            navigation.navigate("VehicleScreen", { fromDrawer: false })
          }
        >
          <Ionicons name="bus" size={13} color={T.accent} />
          <Text
            style={[styles.routePillText, { color: T.text }]}
            numberOfLines={1}
          >
            {selectedGroup?.route?.routeName ||
              vehicleInfo?.carMake ||
              "Tracking"}
          </Text>
          {isLoadingRoute && (
            <ActivityIndicator size="small" color={T.accent} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.notifBtn, { backgroundColor: T.mapOverlay }]}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={20} color={T.text} />
          {unreadCount > 0 && (
            <View style={[styles.notifBadge, { backgroundColor: T.accent }]}>
              <Text style={styles.notifBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Student / vehicle switcher — only shown when a guardian has more
          than one trackable group (kids on different vehicles/routes) */}
      {groups.length > 1 && (
        <View style={[styles.switcherWrap, { top: insets.top + 66 }]}>
          <FlatList
            data={groups}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(g) => g.key}
            contentContainerStyle={styles.switcherContent}
            renderItem={({ item }) => {
              const isActive = item.key === selectedGroupKey;
              const label = item.students
                .map((s) => s.fullname?.split(" ")[0] || "Student")
                .join(" & ");
              return (
                <TouchableOpacity
                  style={[
                    styles.switcherPill,
                    {
                      backgroundColor: isActive ? T.accent : T.mapOverlay,
                    },
                  ]}
                  onPress={() => {
                    setSelectedGroupKey(item.key);
                    setFollowVehicle(true);
                  }}
                >
                  <Ionicons
                    name="bus"
                    size={12}
                    color={isActive ? "#fff" : T.text}
                  />
                  <Text
                    style={[
                      styles.switcherPillText,
                      { color: isActive ? "#fff" : T.text },
                    ]}
                    numberOfLines={1}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}

      {/* Speed HUD - shows vehicle speed */}
      {currentSpeed > 0 && (
        <View
          style={[
            styles.speedHUD,
            {
              backgroundColor: T.mapOverlay,
              top: insets.top + 70 + switcherOffset,
            },
          ]}
        >
          <Text style={[styles.speedVal, { color: T.text }]}>{speedKmh}</Text>
          <Text style={[styles.speedUnit, { color: T.textMuted }]}>km/h</Text>
        </View>
      )}

      {/* Trip status banner */}
      {tripStatus === "active" && (
        <View
          style={[
            styles.tripStatusBanner,
            {
              backgroundColor: T.mapOverlay,
              top: insets.top + 70 + switcherOffset,
              left: 16,
            },
          ]}
        >
          <View style={styles.tripStatusDot}>
            <Ionicons name="play" size={10} color="#4CAF50" />
          </View>
          <Text style={[styles.tripStatusText, { color: T.text }]}>
            Trip in progress
          </Text>
        </View>
      )}

      {/* Map controls */}
      <View
        style={[
          styles.mapControls,
          {
            backgroundColor: T.mapOverlay,
            top:
              insets.top +
              (tripStatus === "active" ? 116 : 146) +
              switcherOffset,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={handleZoomIn}
          disabled={zoomLevel >= MAX_ZOOM}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="add"
            size={20}
            color={zoomLevel >= MAX_ZOOM ? T.textMuted : T.text}
          />
        </TouchableOpacity>
        <View
          style={[styles.mapControlDivider, { backgroundColor: T.border }]}
        />
        <TouchableOpacity
          style={styles.mapControlBtn}
          onPress={handleZoomOut}
          disabled={zoomLevel <= MIN_ZOOM}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="remove"
            size={20}
            color={zoomLevel <= MIN_ZOOM ? T.textMuted : T.text}
          />
        </TouchableOpacity>
      </View>

      {/* Recenter button */}
      <TouchableOpacity
        style={[
          styles.recenterBtn,
          {
            backgroundColor: followVehicle ? T.accent : T.mapOverlay,
            top:
              insets.top +
              (tripStatus === "active" ? 210 : 242) +
              switcherOffset,
          },
        ]}
        onPress={handleRecenter}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={followVehicle ? "locate" : "locate-outline"}
          size={20}
          color={followVehicle ? "#fff" : T.text}
        />
      </TouchableOpacity>

      {/* Bottom card */}
      <View
        style={[
          styles.bottomCard,
          {
            backgroundColor: T.bgSecondary,
            borderTopColor: T.border,
            paddingBottom: Platform.OS === "ios" ? insets.bottom + 20 : 20,
          },
        ]}
      >
        {/* Vehicle Status */}
        <View style={styles.statusRow}>
          <View style={styles.statusLeft}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isOnline ? T.success : T.textMuted },
              ]}
            />
            <Text style={[styles.statusText, { color: T.text }]}>
              {isOnline ? "Online" : "Offline"}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.statusRight}
            onPress={() =>
              primaryStudent && handleStudentSelect(primaryStudent)
            }
            disabled={!primaryStudent}
          >
            <Ionicons name="people" size={14} color={T.textMuted} />
            <Text style={[styles.statusCount, { color: T.text }]}>
              {studentCount} child{studentCount !== 1 ? "ren" : ""}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Next Stop / ETA */}
        {nextStop ? (
          <View style={styles.nextStopRow}>
            <View
              style={[
                styles.nextStopIcon,
                {
                  backgroundColor: T.accentDim,
                  borderColor: T.accentBorder,
                },
              ]}
            >
              <Ionicons name="location" size={18} color={T.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nextStopLabel, { color: T.textMuted }]}>
                {tripStatus === "active" ? "Next Stop" : "Upcoming Stop"}
              </Text>
              <Text
                style={[styles.nextStopName, { color: T.text }]}
                numberOfLines={1}
              >
                {nextStop.stopName}
              </Text>
              <Text
                style={[styles.nextStopAddr, { color: T.textMuted }]}
                numberOfLines={1}
              >
                {nextStop.location?.address || "Approaching..."}
              </Text>
            </View>
            {tripStatus === "active" && etaMinutes != null && (
              <View
                style={[
                  styles.etaBox,
                  {
                    backgroundColor: T.accentDim,
                    borderColor: T.accentBorder,
                  },
                ]}
              >
                <Text style={[styles.etaVal, { color: T.accent }]}>
                  {etaMinutes}
                </Text>
                <Text style={[styles.etaUnit, { color: T.accent }]}>min</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.noStopContainer}>
            <Ionicons name="map-outline" size={24} color={T.textMuted} />
            <Text style={[styles.noStopText, { color: T.textMuted }]}>
              {studentCount > 0
                ? "No stops scheduled for today"
                : "Link a student to track their journey"}
            </Text>
          </View>
        )}

        {/* Progress bar - shows stop completion */}
        {selectedGroup?.route?.stops && (
          <View style={styles.progressSection}>
            <Text style={[styles.progressLabel, { color: T.textMuted }]}>
              {completedStopIndexes?.length || 0} of{" "}
              {selectedGroup.route.stops.length} stops completed
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: T.border }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    backgroundColor: T.accent,
                    width: `${((completedStopIndexes?.length || 0) / Math.max(selectedGroup.route.stops.length, 1)) * 100}%`,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>

      {/* Student Detail Modal */}
      <Modal
        visible={showStudentDetail}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStudentDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, { backgroundColor: T.bgSecondary }]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: T.text }]}>
                Student Details
              </Text>
              <TouchableOpacity
                onPress={() => setShowStudentDetail(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>

            {selectedStudent && (
              <View style={styles.studentDetailContent}>
                <View style={styles.studentDetailAvatar}>
                  <Text style={styles.studentDetailAvatarText}>
                    {selectedStudent.user?.fullname?.charAt(0) || "S"}
                  </Text>
                </View>

                <Text style={[styles.studentDetailName, { color: T.text }]}>
                  {selectedStudent.user?.fullname || "Student"}
                </Text>

                <View style={styles.studentDetailRow}>
                  <Ionicons name="school" size={16} color={T.textMuted} />
                  <Text
                    style={[styles.studentDetailText, { color: T.textMuted }]}
                  >
                    {selectedStudent.schoolAddress || "No school assigned"}
                  </Text>
                </View>

                <View style={styles.studentDetailRow}>
                  <Ionicons name="home" size={16} color={T.textMuted} />
                  <Text
                    style={[styles.studentDetailText, { color: T.textMuted }]}
                  >
                    {selectedStudent.homeAddress || "No home address"}
                  </Text>
                </View>

                <View style={styles.studentDetailRow}>
                  <Ionicons name="bus" size={16} color={T.textMuted} />
                  <Text
                    style={[styles.studentDetailText, { color: T.textMuted }]}
                  >
                    {selectedStudent.vehicleRoute?.routeName ||
                      "No route assigned"}
                  </Text>
                </View>

                <View style={styles.studentDetailRow}>
                  <Ionicons name="time" size={16} color={T.textMuted} />
                  <Text
                    style={[styles.studentDetailText, { color: T.textMuted }]}
                  >
                    Status: {selectedStudent.isActive ? "Active" : "Inactive"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.viewRouteBtn, { backgroundColor: T.accent }]}
                  onPress={() => {
                    const group = groups.find((g) =>
                      g.students.some((s) => s.id === selectedStudent.id),
                    );
                    if (group) {
                      setSelectedGroupKey(group.key);
                      setFollowVehicle(true);
                    }
                    setShowStudentDetail(false);
                  }}
                >
                  <Text style={styles.viewRouteBtnText}>Track Journey</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Top Bar ──────────────────────────────────────────────────────────────
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  routePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  routePillText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    textAlign: "center",
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // ── Student / Vehicle Switcher ───────────────────────────────────────────
  switcherWrap: {
    position: "absolute",
    left: 16,
    right: 16,
  },
  switcherContent: {
    gap: 8,
    paddingRight: 16,
  },
  switcherPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  switcherPillText: {
    fontSize: 12,
    fontWeight: "600",
    maxWidth: 120,
  },

  // ── Speed HUD ──────────────────────────────────────────────────────────────
  speedHUD: {
    position: "absolute",
    right: 16,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
  },
  speedVal: { fontSize: 24, fontWeight: "800" },
  speedUnit: { fontSize: 10, fontWeight: "600" },

  // ── Trip Status Banner ────────────────────────────────────────────────────
  tripStatusBanner: {
    position: "absolute",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tripStatusDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "rgba(76,175,80,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  tripStatusText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // ── Map Controls ──────────────────────────────────────────────────────────
  mapControls: {
    position: "absolute",
    right: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  mapControlBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  mapControlDivider: {
    height: 1,
    marginHorizontal: 8,
  },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bottom Card ────────────────────────────────────────────────────────────
  bottomCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    padding: 16,
    gap: 12,
  },

  // ── Status Row ────────────────────────────────────────────────────────────
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusCount: {
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Next Stop ─────────────────────────────────────────────────────────────
  nextStopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nextStopIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  nextStopLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 2,
  },
  nextStopName: {
    fontSize: 15,
    fontWeight: "700",
  },
  nextStopAddr: {
    fontSize: 11,
    marginTop: 1,
  },
  etaBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    borderWidth: 1,
    minWidth: 52,
  },
  etaVal: { fontSize: 20, fontWeight: "800" },
  etaUnit: { fontSize: 10, fontWeight: "600" },

  // ── No Stop ──────────────────────────────────────────────────────────────
  noStopContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 12,
  },
  noStopText: {
    fontSize: 13,
    fontWeight: "500",
  },

  // ── Progress ──────────────────────────────────────────────────────────────
  progressSection: { gap: 6 },
  progressLabel: { fontSize: 11 },
  progressTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },

  // ── Controls ──────────────────────────────────────────────────────────────
  controls: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  primaryBtn: {
    borderRadius: 50,
    overflow: "hidden",
  },
  primaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // ── Map Markers ───────────────────────────────────────────────────────────
  stopMarker: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#888",
  },
  stopMarkerText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  vehicleDotWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(232,48,48,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  vehicleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#e83030",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },

  // ── Modal ──────────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  modalClose: {
    padding: 4,
  },

  // ── Student Detail Modal ──────────────────────────────────────────────────
  studentDetailContent: {
    alignItems: "center",
    gap: 12,
  },
  studentDetailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(232,48,48,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentDetailAvatarText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#e83030",
  },
  studentDetailName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  studentDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    paddingVertical: 6,
  },
  studentDetailText: {
    fontSize: 14,
    flex: 1,
  },
  viewRouteBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 50,
    marginTop: 8,
  },
  viewRouteBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
