// screens/StudentsScreen.js  (guardian app)
import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getGuardianStudents } from "../lib/UserSlice";
import {
  useBackToMenu,
  useHardwareBackToMenu,
} from "../components/DrawerOptionsScreen";

export default function StudentsScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  // Back arrow + Android hardware back: return to where the user came from
  // and reopen the side menu if they opened this screen from it.
  const goBackToMenu = useBackToMenu();
  useHardwareBackToMenu();

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

  const getStatusColor = (student) => {
    if (student.isActive && student.vehicleRoute) return "#4CAF50";
    if (student.isActive && !student.vehicleRoute) return "#FFA726";
    return "#ef4444";
  };

  const getStatusText = (student) => {
    if (student.isActive && student.vehicleRoute) return "On Route";
    if (student.isActive && !student.vehicleRoute) return "Pending Assignment";
    return "Inactive";
  };

  const renderStudentItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.studentCard,
        { backgroundColor: T.surface, borderColor: T.border },
      ]}
      onPress={() =>
        navigation.navigate("StudentDetail", { studentId: item.id })
      }
      activeOpacity={0.7}
    >
      <View style={styles.studentAvatar}>
        <Text style={styles.studentAvatarText}>
          {item.fullname?.charAt(0) || "S"}
        </Text>
      </View>

      <View style={styles.studentInfo}>
        <Text style={[styles.studentName, { color: T.text }]}>
          {item.fullname || "Student"}
        </Text>
        <Text style={[styles.studentRoute, { color: T.textMuted }]}>
          {item.vehicleRoute?.routeName || "No route assigned"}
        </Text>
      </View>

      <View style={styles.studentStatus}>
        <View
          style={[styles.statusDot, { backgroundColor: getStatusColor(item) }]}
        />
        <Text style={[styles.statusText, { color: T.textMuted }]}>
          {getStatusText(item)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading && students.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: T.bg }]}>
        <ActivityIndicator color={T.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      <View
        style={[
          styles.header,
          {
            borderBottomColor: T.border,
            paddingTop: insets.top + 10,
          },
        ]}
      >
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: T.surface }]}
          onPress={goBackToMenu}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={T.text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: T.text }]}>
            My Students
          </Text>
          <Text style={[styles.headerSub, { color: T.textMuted }]}>
            {students.length} child
            {students.length !== 1 ? "ren" : ""}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: T.surface }]}
          onPress={() => navigation.navigate("AddStudent")}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={22} color={T.text} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={students}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudentItem}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.accent}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: T.accentDim }]}>
              <Ionicons name="people-outline" size={40} color={T.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: T.text }]}>
              No Students Added
            </Text>
            <Text style={[styles.emptyBody, { color: T.textMuted }]}>
              Add your children to start tracking their school transport
            </Text>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: T.accent }]}
              onPress={() => navigation.navigate("AddStudent")}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addBtnText}>Add Student</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: 17, fontWeight: "700", letterSpacing: -0.2 },
  headerSub: { fontSize: 12, marginTop: 2 },

  listContent: { paddingHorizontal: 16, paddingTop: 12 },

  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(232,48,48,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#e83030",
  },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 15, fontWeight: "600" },
  studentRoute: { fontSize: 12, marginTop: 2 },
  studentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    marginRight: 4,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 14,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 18, fontWeight: "700" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 50,
    marginTop: 8,
  },
  addBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
