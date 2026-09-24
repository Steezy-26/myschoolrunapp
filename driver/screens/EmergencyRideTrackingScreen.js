import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import Mapbox from "@rnmapbox/maps";
import {
  markDriverArriving,
  markStudentPickedUp,
  startEmergencyTrip,
  completeEmergencyTrip,
} from "../lib/EmergencyRidesSlice";
import { getSocket } from "../utils/socket";
import Toast from "react-native-toast-message";

// Ensure Mapbox token initialized
Mapbox.setAccessToken(process.env.EXPO_PUBLIC_MAPBOX_TOKEN || "");

export default function EmergencyRideTrackingScreen({ route, navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const socket = getSocket();

  const { currentRide, isSubmitting } = useSelector(
    (state) => state.emergencyRides,
  );
  const ride = currentRide || route.params?.ride || null;

  const [status, setStatus] = useState(ride?.status || "DRIVER_ACCEPTED");
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (ride?.status) {
      setStatus(ride.status);
    }
  }, [ride]);

  useEffect(() => {
    if (ride?.id && socket) {
      socket.emit("join-emergency-ride", ride.id);
      return () => {
        socket.emit("leave-emergency-ride", ride.id);
      };
    }
  }, [ride?.id, socket]);

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg }]}>
        <Text style={{ color: T.text, textAlign: "center", marginTop: 60 }}>
          No active emergency ride selected.
        </Text>
        <TouchableOpacity
          style={[styles.backBtnCenter, { backgroundColor: T.accent }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pickupLat = parseFloat(ride.pickupLatitude) || 0;
  const pickupLng = parseFloat(ride.pickupLongitude) || 0;
  const destLat = parseFloat(ride.destinationLatitude) || 0;
  const destLng = parseFloat(ride.destinationLongitude) || 0;

  const handleArrivedAtPickup = async () => {
    setLoadingAction(true);
    try {
      await dispatch(markDriverArriving(ride.id)).unwrap();
      setStatus("DRIVER_ARRIVING");
      Toast.show({
        type: "success",
        text1: "Marked Arrived at Pickup!",
      });
    } catch (error) {
      Toast.show({ type: "error", text1: error || "Action failed" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStudentPickedUp = async () => {
    setLoadingAction(true);
    try {
      await dispatch(markStudentPickedUp(ride.id)).unwrap();
      setStatus("STUDENT_PICKED_UP");
      Toast.show({
        type: "success",
        text1: "Student Picked Up!",
      });
    } catch (error) {
      Toast.show({ type: "error", text1: error || "Action failed" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleStartTrip = async () => {
    setLoadingAction(true);
    try {
      await dispatch(startEmergencyTrip(ride.id)).unwrap();
      setStatus("IN_TRANSIT");
      Toast.show({
        type: "success",
        text1: "Trip Started to Destination!",
      });
    } catch (error) {
      Toast.show({ type: "error", text1: error || "Action failed" });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCompleteTrip = async () => {
    Alert.alert(
      "Complete Emergency Ride",
      "Confirm student has been safely dropped off at destination?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Complete Trip",
          style: "default",
          onPress: async () => {
            setLoadingAction(true);
            try {
              await dispatch(completeEmergencyTrip(ride.id)).unwrap();
              Toast.show({
                type: "success",
                text1: "Emergency Ride Completed!",
              });
              navigation.navigate("EmergencyRidesMenuScreen");
            } catch (error) {
              Toast.show({ type: "error", text1: error || "Completion failed" });
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: T.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: T.text }]}>
            Live Trip Tracking
          </Text>
          <Text style={[styles.headerSub, { color: T.accent }]}>
            Student: {ride.student?.fullName || "Child"}
          </Text>
        </View>
      </View>

      {/* Map View */}
      <View style={styles.mapContainer}>
        <Mapbox.MapView style={styles.map}>
          <Mapbox.Camera
            zoomLevel={13}
            centerCoordinate={[
              pickupLng || destLng || 0,
              pickupLat || destLat || 0,
            ]}
          />
          {pickupLat !== 0 && pickupLng !== 0 && (
            <Mapbox.PointAnnotation
              id="pickup"
              coordinate={[pickupLng, pickupLat]}
            >
              <View style={[styles.marker, { backgroundColor: "#4caf50" }]}>
                <Ionicons name="home" size={14} color="#fff" />
              </View>
            </Mapbox.PointAnnotation>
          )}

          {destLat !== 0 && destLng !== 0 && (
            <Mapbox.PointAnnotation
              id="destination"
              coordinate={[destLng, destLat]}
            >
              <View style={[styles.marker, { backgroundColor: T.accent }]}>
                <Ionicons name="flag" size={14} color="#fff" />
              </View>
            </Mapbox.PointAnnotation>
          )}
        </Mapbox.MapView>
      </View>

      {/* Bottom Action Controls */}
      <View
        style={[
          styles.controlsCard,
          { backgroundColor: T.surface, borderColor: T.border },
        ]}
      >
        <View style={styles.statusBadgeRow}>
          <View style={[styles.statusDot, { backgroundColor: T.accent }]} />
          <Text style={[styles.statusTitle, { color: T.text }]}>
            Current Stage: {status.replace(/_/g, " ")}
          </Text>
        </View>

        <Text style={[styles.addressText, { color: T.textMuted }]}>
          {status === "IN_TRANSIT"
            ? `Heading to Dropoff: ${ride.destinationAddress}`
            : `Heading to Pickup: ${ride.pickupAddress}`}
        </Text>

        {status === "DRIVER_ACCEPTED" && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: "#2196f3" }]}
            onPress={handleArrivedAtPickup}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="location" size={20} color="#fff" />
                <Text style={styles.btnText}>I Have Arrived at Pickup</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === "DRIVER_ARRIVING" && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: "#ff9800" }]}
            onPress={handleStudentPickedUp}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="school" size={20} color="#fff" />
                <Text style={styles.btnText}>Student Picked Up</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {status === "STUDENT_PICKED_UP" && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: T.accent }]}
            onPress={handleStartTrip}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#fff" />
                <Text style={styles.btnText}>Start Trip to Destination</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {(status === "IN_TRANSIT" || status === "STUDENT_DROPPED_OFF") && (
          <TouchableOpacity
            style={[styles.primaryActionBtn, { backgroundColor: "#4caf50" }]}
            onPress={handleCompleteTrip}
            disabled={loadingAction}
          >
            {loadingAction ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                <Text style={styles.btnText}>Complete Trip (Dropoff)</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },

  mapContainer: { flex: 1 },
  map: { width: "100%", height: "100%" },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },

  controlsCard: {
    padding: 18,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: 12,
  },
  statusBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusTitle: { fontSize: 16, fontWeight: "700" },
  addressText: { fontSize: 13, lineHeight: 18 },

  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 50,
    paddingVertical: 14,
    marginTop: 4,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  backBtnCenter: {
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginTop: 20,
  },
});
