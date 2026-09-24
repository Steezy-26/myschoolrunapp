// navigation/MainTabs.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";

// Tab screens
import HomeScreen from "../screens/HomeScreen";
import RoutesScreen from "../screens/RoutesScreen";
import RequestsScreen from "../screens/RequestsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import ChatScreen from "../screens/ChatScreen";
import ConversationsScreen from "../screens/ConversationsScreen";
import NewConversationScreen from "../screens/NewConversationScreen";
import CreateRouteScreen from "../screens/CreateRouteScreen";

// Drawer screens (sections)
import VehicleScreen from "../screens/VehicleScreen";
import StudentsScreen from "../screens/StudentsScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AccountScreen from "../screens/AccountScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SupportScreen from "../screens/SupportScreen";
import AboutLegalScreen from "../screens/AboutLegalScreen";

// Drawer screens (leaf / detail) — simple placeholder screens are provided
// below for routes that don't have a full screen yet. Replace each one with
// its real implementation as you build them.
import LiveLocationScreen from "../screens/LiveLocationScreen";
import MaintenanceScreen from "../screens/MaintenanceScreen";
import DocumentsScreen from "../screens/DocumentsScreen";
import AttendanceScreen from "../screens/AttendanceScreen";
import IncidentReportsScreen from "../screens/IncidentReportsScreen";
import PerformanceScreen from "../screens/PerformanceScreen";
import SecurityScreen from "../screens/SecurityScreen";
import PaymentScreen from "../screens/PaymentScreen";
import NotificationsSettingsScreen from "../screens/NotificationsSettingsScreen";
import LanguageScreen from "../screens/LanguageScreen";
import MapSettingsScreen from "../screens/MapSettingsScreen";
import DataUsageScreen from "../screens/DataUsageScreen";
import PrivacyPolicyScreen from "../screens/PrivacyPolicyScreen";
import TermsScreen from "../screens/TermsScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import ViewProfileScreen from "../screens/ViewProfileScreen";

import DrawerContent from "./Drawer";
import AddVehicleScreen from "../screens/AddVehicleScreen";
import EditVehicleScreen from "../screens/EditVehicleScreen";
import VehicleDetailScreen from "../screens/VehicleDetailsScreen";
import StudentListScreen from "../screens/StudentListScreen";
import EmergencyRidesMenuScreen from "../screens/EmergencyRidesMenuScreen";
import AvailabilityToggleScreen from "../screens/AvailabilityToggleScreen";
import IncomingEmergencyRidesScreen from "../screens/IncomingEmergencyRidesScreen";
import EmergencyRideDetailsScreen from "../screens/EmergencyRideDetailsScreen";
import EmergencyRideTrackingScreen from "../screens/EmergencyRideTrackingScreen";
import EmergencyRideHistoryScreen from "../screens/EmergencyRideHistoryScreen";
import EmergencyRideRatingsScreen from "../screens/EmergencyRideRatingsScreen";

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const ChatStackNav = createNativeStackNavigator();
const RoutesStackNav = createNativeStackNavigator();
const VehicleStackNav = createNativeStackNavigator();

// ── Nested stacks ─────────────────────────────────────────────────────────────

function ChatStack() {
  return (
    <ChatStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ChatStackNav.Screen
        name="ConversationsList"
        component={ConversationsScreen}
      />
      <ChatStackNav.Screen name="ChatThread" component={ChatScreen} />
      <ChatStackNav.Screen
        name="NewConversation"
        component={NewConversationScreen}
      />
    </ChatStackNav.Navigator>
  );
}

function RoutesStack() {
  return (
    <RoutesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <RoutesStackNav.Screen name="RoutesList" component={RoutesScreen} />
      <RoutesStackNav.Screen name="CreateRoute" component={CreateRouteScreen} />
    </RoutesStackNav.Navigator>
  );
}

function VehicleStack() {
  return (
    <VehicleStackNav.Navigator screenOptions={{ headerShown: false }}>
      <VehicleStackNav.Screen name="VehicleList" component={VehicleScreen} />
      <VehicleStackNav.Screen name="AddVehicle" component={AddVehicleScreen} />
      <VehicleStackNav.Screen
        name="VehicleDetail"
        component={VehicleDetailScreen}
      />
      <VehicleStackNav.Screen
        name="EditVehicle"
        component={EditVehicleScreen}
      />
    </VehicleStackNav.Navigator>
  );
}

// ── Tab icon ──────────────────────────────────────────────────────────────────

function TabIcon({ name, focused, badgeCount, T }) {
  const s = tabStyles(T);
  return (
    <View style={s.iconWrap}>
      <Ionicons
        name={name}
        size={22}
        color={focused ? T.accent : T.textMuted}
      />
      {badgeCount > 0 && (
        <View style={[s.badge, { backgroundColor: T.accent }]}>
          <Text style={s.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
        </View>
      )}
    </View>
  );
}

// ── Bottom tab navigator ──────────────────────────────────────────────────────

function MainTabsNavigator() {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const s = tabStyles(T);

  const { requests } = useSelector((s) => s.guardianRequests);
  const pendingCount = Array.isArray(requests)
    ? requests.filter((r) => r.status === "pending").length
    : 0;

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: T.bg,
          borderTopColor: T.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: Math.max(insets.bottom, 10),
          height: 60 + insets.bottom,
        },
        tabBarActiveTintColor: T.accent,
        tabBarInactiveTintColor: T.textMuted,
        tabBarLabelStyle: s.label,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: "Home",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              focused={focused}
              T={T}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Routes"
        component={RoutesStack}
        options={{
          tabBarLabel: "Routes",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "map" : "map-outline"}
              focused={focused}
              T={T}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Requests"
        component={RequestsScreen}
        options={{
          tabBarLabel: "Requests",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "people" : "people-outline"}
              focused={focused}
              badgeCount={pendingCount}
              T={T}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatStack}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={
                focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
              }
              focused={focused}
              T={T}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          tabBarLabel: "Notifications",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "notifications" : "notifications-outline"}
              focused={focused}
              T={T}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Drawer navigator (root) ───────────────────────────────────────────────────
// Every name used in Drawer.js's goTo() must appear as a Drawer.Screen here.

export default function MainTabs() {
  const { theme: T } = useTheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <DrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerStyle: { width: 320, backgroundColor: T.bg },
        drawerType: "slide",
        overlayColor: "rgba(0,0,0,0.5)",
        swipeEdgeWidth: 50,
        swipeMinDistance: 50,
      }}
    >
      {/* Primary content */}
      <Drawer.Screen name="MainTabs" component={MainTabsNavigator} />

      {/* Section hub screens */}
      <Drawer.Screen name="VehicleScreen" component={VehicleStack} />
      <Drawer.Screen name="StudentsScreen" component={StudentsScreen} />
      <Drawer.Screen name="HistoryScreen" component={HistoryScreen} />
      <Drawer.Screen name="AccountScreen" component={AccountScreen} />
      <Drawer.Screen name="SettingsScreen" component={SettingsScreen} />
      <Drawer.Screen name="SupportScreen" component={SupportScreen} />
      <Drawer.Screen name="AboutLegalScreen" component={AboutLegalScreen} />

      {/* Leaf screens navigated to directly from Drawer.js */}
      <Drawer.Screen name="LiveLocationScreen" component={LiveLocationScreen} />
      <Drawer.Screen name="MaintenanceScreen" component={MaintenanceScreen} />
      <Drawer.Screen name="DocumentsScreen" component={DocumentsScreen} />
      <Drawer.Screen name="AttendanceScreen" component={AttendanceScreen} />
      <Drawer.Screen
        name="IncidentReportsScreen"
        component={IncidentReportsScreen}
      />
      <Drawer.Screen name="PerformanceScreen" component={PerformanceScreen} />
      <Drawer.Screen name="SecurityScreen" component={SecurityScreen} />
      <Drawer.Screen name="PaymentScreen" component={PaymentScreen} />
      <Drawer.Screen
        name="NotificationsSettingsScreen"
        component={NotificationsSettingsScreen}
      />
      <Drawer.Screen name="LanguageScreen" component={LanguageScreen} />
      <Drawer.Screen name="MapSettingsScreen" component={MapSettingsScreen} />
      <Drawer.Screen name="DataUsageScreen" component={DataUsageScreen} />
      <Drawer.Screen
        name="PrivacyPolicyScreen"
        component={PrivacyPolicyScreen}
      />
      <Drawer.Screen name="TermsScreen" component={TermsScreen} />
      <Drawer.Screen name="EditProfileScreen" component={EditProfileScreen} />
      <Drawer.Screen name="ViewProfileScreen" component={ViewProfileScreen} />
      <Drawer.Screen name="StudentList" component={StudentListScreen} />
      <Drawer.Screen name="Requests" component={RequestsScreen} />

      {/* Emergency Ride screens */}
      <Drawer.Screen name="EmergencyRidesMenuScreen" component={EmergencyRidesMenuScreen} />
      <Drawer.Screen name="AvailabilityToggleScreen" component={AvailabilityToggleScreen} />
      <Drawer.Screen name="IncomingEmergencyRidesScreen" component={IncomingEmergencyRidesScreen} />
      <Drawer.Screen name="EmergencyRideDetailsScreen" component={EmergencyRideDetailsScreen} />
      <Drawer.Screen name="EmergencyRideTrackingScreen" component={EmergencyRideTrackingScreen} />
      <Drawer.Screen name="EmergencyRideHistoryScreen" component={EmergencyRideHistoryScreen} />
      <Drawer.Screen name="EmergencyRideRatingsScreen" component={EmergencyRideRatingsScreen} />
    </Drawer.Navigator>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const tabStyles = (T) =>
  StyleSheet.create({
    label: { fontSize: 11, fontWeight: "500", marginBottom: 4 },
    iconWrap: {
      position: "relative",
      alignItems: "center",
      justifyContent: "center",
    },
    badge: {
      position: "absolute",
      top: -6,
      right: -10,
      borderRadius: 10,
      minWidth: 16,
      height: 16,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 4,
      borderWidth: 1.5,
      borderColor: T.bg,
    },
    badgeText: { fontSize: 9, fontWeight: "700", color: "#fff" },
  });
