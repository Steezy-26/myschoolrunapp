// navigation/MainTabs.js
import React, { useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useSelector, useDispatch } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";

// Tab Screens
import HomeScreen from "../screens/HomeScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import StudentDetailScreen from "../screens/StudentDetailsScreen";
import RequestsScreen from "../screens/RequestsScreen";
import RoutesScreen from "../screens/RoutesScreen";
// Stack Screens
import ChatScreen from "../screens/ChatScreen";
import ConversationsScreen from "../screens/ConversationsScreen";
import NewConversationScreen from "../screens/NewConversationScreen";
import StudentsScreen from "../screens/StudentsScreen";
import AddStudentScreen from "../screens/AddStudentScreen";

// Drawer Screens
import VehicleScreen from "../screens/VehicleScreen";
import HistoryScreen from "../screens/HistoryScreen";
import AccountScreen from "../screens/AccountScreen";
import SettingsScreen from "../screens/SettingsScreen";
import PaymentScreen from "../screens/PaymentScreen";
import NotificationsSettingsScreen from "../screens/NotificationsSettingsScreen";
import SecurityScreen from "../screens/SecurityScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import EmergencyRideScreen from "../screens/EmergencyRideScreen";
import SelectChildForEmergencyScreen from "../screens/SelectChildForEmergencyScreen";
import EmergencyRideFormScreen from "../screens/EmergencyRideFormScreen";
import AvailableDriversScreen from "../screens/AvailableDriversScreen";
import EmergencyRideStatusScreen from "../screens/EmergencyRideStatusScreen";
import EmergencyRideTrackingScreen from "../screens/EmergencyRideTrackingScreen";
import RateEmergencyDriverScreen from "../screens/RateEmergencyDriverScreen";
import EmergencyRideHistoryScreen from "../screens/EmergencyRideHistoryScreen";
import EmergencyRideDetailsScreen from "../screens/EmergencyRideDetailsScreen";

import DrawerContent from "./Drawer";
import TransactionHistoryScreen from "../screens/TransactionHistoryScreen";
import AddPaymentMethodScreen from "../screens/AddPaymentMethodScreen";
import AboutLegalScreen from "../screens/AboutLegalScreen";
import SupportScreen from "../screens/SupportScreen";

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const StudentsStackNav = createNativeStackNavigator();
const MessagesStackNav = createNativeStackNavigator();
const TrackingStackNav = createNativeStackNavigator();
const EmergencyRideStackNav = createNativeStackNavigator();

// ── Nested Stacks ─────────────────────────────────────────────────────────────

function StudentsStack() {
  return (
    <StudentsStackNav.Navigator screenOptions={{ headerShown: false }}>
      <StudentsStackNav.Screen name="StudentsList" component={StudentsScreen} />
      <StudentsStackNav.Screen
        name="StudentDetail"
        component={StudentDetailScreen}
      />
      <StudentsStackNav.Screen name="AddStudent" component={AddStudentScreen} />

      <StudentsStackNav.Screen name="RouteDetail" component={RoutesScreen} />
    </StudentsStackNav.Navigator>
  );
}

function MessagesStack() {
  return (
    <MessagesStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MessagesStackNav.Screen
        name="ConversationsList"
        component={ConversationsScreen}
      />
      <MessagesStackNav.Screen name="ChatThread" component={ChatScreen} />
      <MessagesStackNav.Screen
        name="NewConversation"
        component={NewConversationScreen}
      />
    </MessagesStackNav.Navigator>
  );
}

function EmergencyRideStack() {
  return (
    <EmergencyRideStackNav.Navigator screenOptions={{ headerShown: false }}>
      <EmergencyRideStackNav.Screen
        name="EmergencyRideMenu"
        component={EmergencyRideScreen}
      />
      <EmergencyRideStackNav.Screen
        name="SelectChildForEmergency"
        component={SelectChildForEmergencyScreen}
      />
      <EmergencyRideStackNav.Screen
        name="EmergencyRideForm"
        component={EmergencyRideFormScreen}
      />
      <EmergencyRideStackNav.Screen
        name="AvailableDrivers"
        component={AvailableDriversScreen}
      />
      <EmergencyRideStackNav.Screen
        name="EmergencyRideStatus"
        component={EmergencyRideStatusScreen}
      />
      <EmergencyRideStackNav.Screen
        name="EmergencyRideTracking"
        component={EmergencyRideTrackingScreen}
      />
      <EmergencyRideStackNav.Screen
        name="RateEmergencyDriver"
        component={RateEmergencyDriverScreen}
      />
      <EmergencyRideStackNav.Screen
        name="EmergencyRideHistory"
        component={EmergencyRideHistoryScreen}
      />
      <EmergencyRideStackNav.Screen
        name="EmergencyRideDetails"
        component={EmergencyRideDetailsScreen}
      />
    </EmergencyRideStackNav.Navigator>
  );
}

// ── Tab Icon ──────────────────────────────────────────────────────────────────

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

// ── Bottom Tab Navigator ──────────────────────────────────────────────────────

function TabsNavigator() {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const s = tabStyles(T);

  const { notifications } = useSelector((s) => s.notifications);
  const unreadCount = notifications?.filter((n) => !n.read)?.length || 0;

  const { conversations } = useSelector((s) => s.messages);
  const messageUnreadCount = conversations?.reduce(
    (sum, c) => sum + (c.unreadCount || 0),
    0,
  );

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
        component={RoutesScreen}
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
              name={focused ? "paper-plane" : "paper-plane-outline"}
              focused={focused}
              T={T}
            />
          ),
        }}
      />

      <Tab.Screen
        name="Messages"
        component={MessagesStack}
        options={{
          tabBarLabel: "Messages",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={
                focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"
              }
              focused={focused}
              badgeCount={messageUnreadCount}
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
              badgeCount={unreadCount}
              T={T}
            />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

// ── Drawer Navigator ─────────────────────────────────────────────────────────

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
      <Drawer.Screen name="MainTabs" component={TabsNavigator} />
      <Drawer.Screen name="EmergencyRide" component={EmergencyRideStack} />
      <Drawer.Screen name="VehicleScreen" component={VehicleScreen} />
      <Drawer.Screen name="HistoryScreen" component={HistoryScreen} />
      <Drawer.Screen name="AccountScreen" component={AccountScreen} />
      <Drawer.Screen name="SettingsScreen" component={SettingsScreen} />
      <Drawer.Screen name="PaymentScreen" component={PaymentScreen} />
      <Drawer.Screen
        name="NotificationsSettingsScreen"
        component={NotificationsSettingsScreen}
      />
      <Drawer.Screen name="StudentsStack" component={StudentsStack} />
      <Drawer.Screen name="EditProfile" component={EditProfileScreen} />
      <Drawer.Screen name="Security" component={SecurityScreen} />
      <Drawer.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
      <Drawer.Screen name="AddPaymentMethod" component={AddPaymentMethodScreen} />
      <Drawer.Screen name="AboutLegalScreen" component={AboutLegalScreen} />
      <Drawer.Screen name="SupportScreen" component={SupportScreen} />
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
  
