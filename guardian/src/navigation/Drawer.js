// navigation/Drawer.js  (imported by MainTabs.js as "./Drawer")
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
import { LinearGradient } from "expo-linear-gradient";
import { getInitials } from "../utils/helpers";

// ── Primitives ────────────────────────────────────────────────────────────────

const Divider = ({ T }) => (
  <View style={[styles.divider, { backgroundColor: T.border }]} />
);

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

// ── Main Drawer ──────────────────────────────────────────────────────────────

export default function GuardianDrawerContent({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const { guardianProfile, students } = useSelector((s) => s.users);

  const studentCount = students?.length || 0;
  const displayName =
    user?.fullname || guardianProfile?.user?.fullname || "Guardian";

  // `fromDrawer: true` tells the destination screen it was opened from the
  // side menu, so its back button can reopen the menu (see useBackToMenu in
  // components/DrawerOptionsScreen.js).
  const goTo = (screen, params) => {
    navigation.dispatch(DrawerActions.closeDrawer());
    navigation.navigate(screen, { ...params, fromDrawer: true });
  };

  const goToTab = (tabScreen, params) => {
    navigation.dispatch(DrawerActions.closeDrawer());
    navigation.navigate("MainTabs", { screen: tabScreen, params });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => dispatch(LogoutUser()),
      },
    ]);
  };

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
            {guardianProfile?.profileImage ? (
              <Image
                source={{ uri: guardianProfile.profileImage }}
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
                style={[styles.onlineDot, { backgroundColor: "#4caf50" }]}
              />
              <Text style={styles.headerMetaText}>
                {studentCount} student{studentCount !== 1 ? "s" : ""}
              </Text>
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
        <Section T={T}>
          <DrawerItem
            icon="people-outline"
            label="My Students"
            subtitle={`${studentCount} child${studentCount !== 1 ? "ren" : ""} linked`}
            onPress={() => goTo("StudentsStack")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="alert-circle-outline"
            label="Emergency Ride"
            subtitle="PRO • Find alternative driver"
            onPress={() => goTo("EmergencyRide")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="car-outline"
            label="Emergency Ride History"
            subtitle="Past emergency rides & ratings"
            onPress={() =>
              goTo("EmergencyRide", { screen: "EmergencyRideHistory" })
            }
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="bus-outline"
            label="Vehicle & Driver"
            subtitle="Route details & driver info"
            onPress={() => goTo("VehicleScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="time-outline"
            label="Trip History"
            subtitle="Attendance & ride history"
            onPress={() => goTo("HistoryScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="card-outline"
            label="Payment"
            subtitle="Subscription & billing"
            onPress={() => goTo("PaymentScreen")}
            T={T}
          />
          <Divider T={T} />
          <DrawerItem
            icon="person-outline"
            label="Account"
            subtitle="Profile & security"
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
});
