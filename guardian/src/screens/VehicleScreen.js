// screens/VehicleScreen.js  (guardian app)
import React, { useEffect, useState, useMemo } from "react";
import {
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import OptionsScreenContainer, {
  OptionsScreenHeader,
} from "../components/DrawerOptionsScreen";
import { getGuardianStudents } from "../lib/UserSlice";

// ── Helper: group students by vehicleRouteId ──────────────────────────────
const groupStudentsByRoute = (students) => {
  const groups = {};
  students.forEach((student) => {
    const routeId = student.vehicleRouteId || "unassigned";
    if (!groups[routeId]) {
      groups[routeId] = [];
    }
    groups[routeId].push(student);
  });
  return groups;
};

// ── Card Component ──────────────────────────────────────────────────────────
function VehicleGroupCard({
  routeId,
  students,
  onStudentPress,
  onViewRoute,
  navigation,
  T,
}) {
  const firstStudent = students[0];
  const route = firstStudent?.vehicleRoute;
  const vehicle = route?.vehicle;
  const driver = vehicle?.driver?.user;

  // ── Unassigned students ──────────────────────────────────────────────────
  if (routeId === "unassigned" || !vehicle) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: T.surface, borderColor: T.border },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.cardIcon, { backgroundColor: T.accentDim }]}>
            <Ionicons name="person-outline" size={20} color={T.textMuted} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: T.text }]}>
              No Vehicle Assigned
            </Text>
            <Text style={[styles.cardSub, { color: T.textMuted }]}>
              {students.length} student{students.length > 1 ? "s" : ""} without
              a vehicle
            </Text>
          </View>
        </View>
        <View style={styles.studentList}>
          {students.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.studentChip, { borderColor: T.border }]}
              onPress={() => onStudentPress(s.id)}
            >
              <Text style={[styles.studentChipText, { color: T.text }]}>
                {s.fullname || "Student"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  // ── Assigned students ────────────────────────────────────────────────────
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: T.surface, borderColor: T.border },
      ]}
    >
      {/* Header: vehicle info */}
      <View style={styles.cardHeader}>
        <View style={[styles.cardIcon, { backgroundColor: T.accentDim }]}>
          <Ionicons name="bus" size={20} color={T.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: T.text }]}>
            {vehicle.carMake} {vehicle.carModel}
          </Text>
          <Text style={[styles.cardSub, { color: T.textMuted }]}>
            {vehicle.registrationNumber} ·{" "}
            {vehicle.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: vehicle.isActive
                ? T.successDim
                : T.textMuted + "33",
            },
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              { color: vehicle.isActive ? T.success : T.textMuted },
            ]}
          >
            {vehicle.isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {/* Driver & Route summary */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="person-outline" size={14} color={T.textMuted} />
          <Text style={[styles.detailText, { color: T.text }]}>
            {driver?.fullname || "No driver"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="map-outline" size={14} color={T.textMuted} />
          <Text style={[styles.detailText, { color: T.text }]}>
            {route.routeName || "Unnamed Route"}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={14} color={T.textMuted} />
          <Text style={[styles.detailText, { color: T.text }]}>
            {route.startTime} – {route.estimatedEndTime}
          </Text>
        </View>
      </View>

      {/* Student chips */}
      <View style={styles.studentList}>
        {students.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.studentChip, { borderColor: T.border }]}
            onPress={() => onStudentPress(s.id)}
          >
            <Text style={[styles.studentChipText, { color: T.text }]}>
              {s.fullname || "Student"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Action buttons */}
      <View style={[styles.actionRow, { borderTopColor: T.border }]}>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: T.border }]}
          onPress={() => onViewRoute(route.id)}
        >
          <Ionicons name="eye-outline" size={16} color={T.accent} />
          <Text style={[styles.actionBtnText, { color: T.accent }]}>
            View Route
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { borderColor: T.border }]}
          onPress={() =>
            navigation.navigate("MainTabs", {
              screen: "Home",
              params: { routeId: route.id },
            })
          }
        >
          <Ionicons name="navigate-outline" size={16} color={T.accent} />
          <Text style={[styles.actionBtnText, { color: T.accent }]}>Track</Text>
        </TouchableOpacity>
        {driver?.id && (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: T.accent, borderColor: T.accent },
            ]}
            onPress={() => {
              // "Messages" is a tab inside MainTabs, so go through it
              // explicitly instead of relying on the drawer finding it.
              navigation.navigate("MainTabs", {
                screen: "Messages",
                params: {
                  screen: "NewConversation",
                  params: { userId: driver.id },
                },
              });
            }}
          >
            <Ionicons name="chatbubble-outline" size={16} color="#fff" />
            <Text style={[styles.actionBtnText, { color: "#fff" }]}>
              Message
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────

export default function VehicleScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const { students, isLoading } = useSelector((state) => state.users);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(getGuardianStudents());
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(getGuardianStudents());
    setRefreshing(false);
  };

  // Group students by vehicle route
  const grouped = useMemo(() => {
    if (!students || students.length === 0) return {};
    return groupStudentsByRoute(students);
  }, [students]);

  const routeIds = Object.keys(grouped);

  const handleStudentPress = (studentId) => {
    navigation.navigate("StudentsStack", {
      screen: "StudentDetail",
      params: { studentId },
    });
  };

  const handleViewRoute = (routeId) => {
    navigation.navigate("StudentsStack", {
      screen: "RouteDetail",
      params: { routeId },
    });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && !students) {
    return (
      <OptionsScreenContainer>
        <OptionsScreenHeader title="Vehicles & Routes" />
        <View style={styles.center}>
          <ActivityIndicator color={T.accent} size="large" />
        </View>
      </OptionsScreenContainer>
    );
  }

  // ── No students ──────────────────────────────────────────────────────────
  if (!students || students.length === 0) {
    return (
      <OptionsScreenContainer>
        <OptionsScreenHeader title="Vehicles & Routes" />
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIcon, { backgroundColor: T.accentDim }]}>
            <Ionicons name="people-outline" size={40} color={T.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>
            No Students Added
          </Text>
          <Text style={[styles.emptyBody, { color: T.textMuted }]}>
            Add a student first to see their vehicle and route information.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: T.accent }]}
            onPress={() =>
              // AddStudent lives inside StudentsStack, not at drawer level
              navigation.navigate("StudentsStack", { screen: "AddStudent" })
            }
          >
            <Text style={styles.primaryBtnText}>Add Student</Text>
          </TouchableOpacity>
        </View>
      </OptionsScreenContainer>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  // OptionsScreenContainer is already a ScrollView, so pull-to-refresh is
  // passed through it rather than nesting a second ScrollView.
  return (
    <OptionsScreenContainer
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={T.accent}
        />
      }
    >
      <OptionsScreenHeader title="Vehicles & Routes" />

      <View
        style={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
      >
        {routeIds.map((routeId) => (
          <VehicleGroupCard
            key={routeId}
            routeId={routeId}
            students={grouped[routeId]}
            onStudentPress={handleStudentPress}
            onViewRoute={handleViewRoute}
            navigation={navigation}
            T={T}
          />
        ))}
      </View>
    </OptionsScreenContainer>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginTop: 8 },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  primaryBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
    marginTop: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 6,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  detailText: { fontSize: 12 },

  studentList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  studentChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  studentChipText: { fontSize: 13, fontWeight: "500" },

  actionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 12, fontWeight: "600" },
});
