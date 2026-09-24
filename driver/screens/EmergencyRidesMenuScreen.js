import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Switch,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { DrawerActions } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchIncomingEmergencyRides,
  fetchDriverServices,
  saveDriverService,
} from "../lib/EmergencyRidesSlice";
import Toast from "react-native-toast-message";

export default function EmergencyRidesMenuScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();

  const { incomingRequests, currentRide, myService, isLoading } = useSelector(
    (state) => state.emergencyRides,
  );
  const { driverProfile } = useSelector((state) => state.users);

  useEffect(() => {
    dispatch(fetchIncomingEmergencyRides());
    dispatch(fetchDriverServices());
  }, [dispatch]);

  const isEmergencyEnabled = Boolean(myService?.isActive);

  const handleToggleActive = async (value) => {
    try {
      if (!myService) {
        // Create initial default service
        await dispatch(
          saveDriverService({
            origin: "Base Station",
            destination: "Service Area",
            originLatitude: 0,
            originLongitude: 0,
            destinationLatitude: 0,
            destinationLongitude: 0,
            price: 50.0,
            currency: "USD",
            isActive: value,
          }),
        ).unwrap();
      } else {
        await dispatch(
          saveDriverService({
            ...myService,
            isActive: value,
          }),
        ).unwrap();
      }
      Toast.show({
        type: "success",
        text1: value
          ? "Emergency rides activated!"
          : "Emergency rides deactivated",
      });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error || "Failed to update availability",
      });
    }
  };

  const pendingCount = incomingRequests?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: T.surface }]}
          onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
        >
          <Ionicons name="menu" size={22} color={T.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: T.text }]}>
            Emergency Rides
          </Text>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>
            Alternative Driver Portal
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Card */}
        <View
          style={[
            styles.card,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <View style={styles.cardRow}>
            <View
              style={[
                styles.iconWrap,
                {
                  backgroundColor: isEmergencyEnabled
                    ? "rgba(76,175,80,0.15)"
                    : "rgba(150,150,150,0.15)",
                },
              ]}
            >
              <Ionicons
                name="flash"
                size={24}
                color={isEmergencyEnabled ? "#4caf50" : T.textMuted}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: T.text }]}>
                Emergency Service Availability
              </Text>
              <Text style={[styles.cardSub, { color: T.textMuted }]}>
                {isEmergencyEnabled
                  ? "You are visible in emergency driver searches"
                  : "Turn on to receive emergency ride requests"}
              </Text>
            </View>
            <Switch
              value={isEmergencyEnabled}
              onValueChange={handleToggleActive}
              trackColor={{ false: "#767577", true: "#4caf50" }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Current Active Trip Card (if any) */}
        {currentRide && (
          <TouchableOpacity
            style={[
              styles.activeCard,
              { backgroundColor: T.accent, borderColor: T.accentBorder },
            ]}
            onPress={() =>
              navigation.navigate("EmergencyRideTrackingScreen", {
                rideId: currentRide.id,
              })
            }
            activeOpacity={0.9}
          >
            <View style={styles.activeHeader}>
              <View style={styles.activeTag}>
                <Ionicons name="pulse" size={14} color="#fff" />
                <Text style={styles.activeTagText}>TRIP IN PROGRESS</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            </View>
            <Text style={styles.activeTitle}>
              {currentRide.student?.fullName || "Student Ride"}
            </Text>
            <Text style={styles.activeSub}>
              Status: {currentRide.status.replace(/_/g, " ")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Menu Buttons Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text }]}>Manage</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.menuRow,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
          onPress={() => navigation.navigate("IncomingEmergencyRidesScreen")}
          activeOpacity={0.7}
        >
          <View style={[styles.menuIconWrap, { backgroundColor: T.accentDim }]}>
            <Ionicons name="notifications" size={22} color={T.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: T.text }]}>
              Incoming Requests
            </Text>
            <Text style={[styles.menuSub, { color: T.textMuted }]}>
              View and respond to ride requests
            </Text>
          </View>
          {pendingCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: T.accent }]}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          ) : (
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuRow,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
          onPress={() => navigation.navigate("AvailabilityToggleScreen")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.menuIconWrap,
              { backgroundColor: "rgba(33,150,243,0.15)" },
            ]}
          >
            <Ionicons name="pricetag" size={22} color="#2196f3" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: T.text }]}>
              Pricing & Service Setup
            </Text>
            <Text style={[styles.menuSub, { color: T.textMuted }]}>
              Base price, operating hours & area
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuRow,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
          onPress={() => navigation.navigate("EmergencyRideHistoryScreen")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.menuIconWrap,
              { backgroundColor: "rgba(156,39,176,0.15)" },
            ]}
          >
            <Ionicons name="time" size={22} color="#9c27b0" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: T.text }]}>
              Trip History
            </Text>
            <Text style={[styles.menuSub, { color: T.textMuted }]}>
              Past emergency rides driven
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.menuRow,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
          onPress={() => navigation.navigate("EmergencyRideRatingsScreen")}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.menuIconWrap,
              { backgroundColor: "rgba(255,193,7,0.15)" },
            ]}
          >
            <Ionicons name="star" size={22} color="#ffc107" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.menuLabel, { color: T.text }]}>
              Ratings & Feedback
            </Text>
            <Text style={[styles.menuSub, { color: T.textMuted }]}>
              Reviews from guardians
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  menuBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },
  headerSub: { fontSize: 12, marginTop: 1 },

  scrollContent: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 2 },

  activeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  activeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  activeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeTagText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  activeTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  activeSub: { color: "rgba(255,255,255,0.85)", fontSize: 13 },

  sectionHeader: { marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { fontSize: 15, fontWeight: "700" },
  menuSub: { fontSize: 12, marginTop: 2 },

  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
});
