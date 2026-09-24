// navigation/Drawer.js
import React from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { DrawerActions } from "@react-navigation/native";
import { useTheme } from "../contexts/ThemeContext";
import { LogoutUser } from "../lib/AuthSlice";
import { resetTrip } from "../lib/VehicleTrackingSlice";
import { LinearGradient } from "expo-linear-gradient";
import { getInitials } from "../utils/helpers";

// ── Primitives ────────────────────────────────────────────────────────────────

const Divider = ({ T }) => (
  <View style={[styles.divider, { backgroundColor: T.border }]} />
);

// A single row now represents an entire section (e.g. "Settings" opens a
// screen containing Appearance, Language, Map Preferences & Data Usage,
// instead of listing all four here).
const DrawerItem = ({
  icon,
  label,
  subtitle,
  onPress,
  T,
  rightElement,
  danger = false,
}) => (
  <TouchableOpacity
    style={styles.drawerItem}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.itemIconWrap,
        { backgroundColor: danger ? "rgba(255,68,68,0.1)" : T.surface },
      ]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={danger ? "#ff4444" : T.textSecondary}
      />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.itemLabel, { color: danger ? "#ff4444" : T.text }]}>
        {label}
      </Text>
      {subtitle ? (
        <Text
          style={[styles.itemSub, { color: T.textMuted }]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
    {rightElement !== undefined ? (
      rightElement
    ) : (
      <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
    )}
  </TouchableOpacity>
);

const Section = ({ children, T, style }) => (
  <View
    style={[
      styles.section,
      { backgroundColor: T.surface, borderColor: T.border },
      style,
    ]}
  >
    {children}
  </View>
);

// ── Main component ─────────────────────────────────────────────────────────────
export default function DrawerContent({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { driverProfile } = useSelector((s) => s.users);
  const { tripStatus } = useSelector((s) => s.vehicletracking);
  const { requests } = useSelector((s) => s.guardianRequests);
  const { driverRoutes, driverAssignedVehicle } = useSelector(
    (s) => s.vehicleroutes,
  );

  const pendingCount = Array.isArray(requests)
    ? requests.filter((r) => r.status === "pending").length
    : 0;

  // ── Helpers ─────────────────────────────────────────────────────────────────
  // Every name passed here must match a Drawer.Screen name= in MainTabs.js.
  const goTo = (screen) => {
    navigation.dispatch(DrawerActions.closeDrawer());
    navigation.navigate(screen);
  };

  // For screens nested inside the "MainTabs" tab navigator (e.g. Routes),
  // a plain goTo("Routes") won't resolve — it needs the nested-navigate form.
  const goToTab = (tabScreen, params) => {
    navigation.dispatch(DrawerActions.closeDrawer());
    navigation.navigate("MainTabs", { screen: tabScreen, params });
  };

  const handleLogout = () => {
    if (tripStatus === "active") {
      Alert.alert(
        "Trip in Progress",
        "You have an active trip. Logging out will end it. Continue?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Logout Anyway",
            style: "destructive",
            onPress: () => {
              dispatch(resetTrip());
              dispatch(LogoutUser());
            },
          },
        ],
      );
    } else {
      Alert.alert("Logout", "Are you sure you want to logout?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: () => dispatch(LogoutUser()),
        },
      ]);
    }
  };

  const displayName = user?.fullname || driverProfile?.fullName || "Driver";
  const vehicleName = driverAssignedVehicle
    ? `${driverAssignedVehicle.carMake || ""} ${driverAssignedVehicle.carModel || ""}`.trim()
    : null;
  const routeCount = driverRoutes?.length || 0;

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* ── Header ── */}
      <LinearGradient
        colors={[T.accent, "#a02020"]}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerInner}>
          <View style={styles.avatarWrap}>
            {driverProfile?.profileImage ? (
              <Image
                source={{ uri: driverProfile.profileImage }}
                style={styles.avatar}
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: "rgba(255,255,255,0.22)" },
                ]}
              >
                <Text style={styles.avatarInitials}>
                  {getInitials(displayName)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.headerName} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.headerEmail} numberOfLines={1}>
              {user?.email || ""}
            </Text>
            <View style={styles.headerMeta}>
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor:
                      tripStatus === "active" ? "#4caf50" : "#888",
                  },
                ]}
              />
              <Text style={styles.headerMetaText}>
                {tripStatus === "active" ? "On trip" : "Available"}
              </Text>
              {vehicleName ? (
                <>
                  <Text style={styles.headerMetaDot}>·</Text>
                  <Text style={styles.headerMetaText} numberOfLines={1}>
                    {vehicleName}
                  </Text>
                </>
              ) : null}
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.dispatch(DrawerActions.closeDrawer())}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* One row per group — each opens a screen listing that group's
            options (mirrors how Support / About & Legal already worked). */}
        <Section T={T}>
          <DrawerItem
            icon="flash-outline"
            label="Emergency Rides"
            subtitle="Alternative driver requests & pricing"
            onPress={() => goTo("EmergencyRidesMenuScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="bus-outline"
            label="Vehicle"
            subtitle="Live location, maintenance & documents"
            onPress={() => goTo("VehicleScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="people-outline"
            label="Students"
            subtitle="Student list & guardian requests"
            onPress={() => goTo("StudentsScreen")}
            T={T}
            rightElement={
              pendingCount > 0 ? (
                <View style={[styles.badge, { backgroundColor: T.accent }]}>
                  <Text style={styles.badgeText}>
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </Text>
                </View>
              ) : undefined
            }
          />
          <Divider T={T} />
          <DrawerItem
            icon="map-outline"
            label="Routes"
            subtitle={`${routeCount} route${routeCount !== 1 ? "s" : ""} set up`}
            onPress={() => goToTab("Routes")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="time-outline"
            label="History"
            subtitle="Trips driven & performance"
            onPress={() => goTo("HistoryScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="person-outline"
            label="Account"
            subtitle="Profile, security & payments"
            onPress={() => goTo("AccountScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="settings-outline"
            label="Settings"
            subtitle="Appearance, language & data"
            onPress={() => goTo("SettingsScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="help-buoy-outline"
            label="Support"
            subtitle="Help centre & feedback"
            onPress={() => goTo("SupportScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="information-circle-outline"
            label="About & Legal"
            subtitle="Version, privacy & terms"
            onPress={() => goTo("AboutLegalScreen")}
            T={T}
          />
        </Section>

        {/* ── Logout ── */}
        <Section T={T} style={{ marginTop: 12 }}>
          <DrawerItem
            icon="log-out-outline"
            label="Logout"
            onPress={handleLogout}
            T={T}
            danger
            rightElement={null}
          />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    paddingTop: Platform.OS === "ios" ? 52 : 36,
    paddingBottom: 20,
    paddingHorizontal: 18,
  },
  headerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingRight: 36,
  },
  avatarWrap: { flexShrink: 0 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { color: "#fff", fontSize: 20, fontWeight: "700" },
  headerName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 1,
  },
  headerEmail: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginBottom: 5,
  },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  onlineDot: { width: 7, height: 7, borderRadius: 4 },
  headerMetaText: { color: "rgba(255,255,255,0.75)", fontSize: 11 },
  headerMetaDot: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  closeBtn: {
    position: "absolute",
    top: Platform.OS === "ios" ? 52 : 36,
    right: 16,
    padding: 6,
  },

  scrollContent: { paddingTop: 16, paddingHorizontal: 12, paddingBottom: 20 },

  section: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
  },

  drawerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  itemIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  itemLabel: { fontSize: 15, fontWeight: "600" },
  itemSub: { fontSize: 11, marginTop: 1 },

  divider: { height: 0.5, marginHorizontal: 14 },

  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
});
