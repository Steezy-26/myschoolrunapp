import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import api from "../utils/axiosInstance";

export default function EmergencyRideHistoryScreen({ navigation }) {
  const { theme: T } = useTheme();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await api.get("/emergency-rides/driver/history");
      setHistory(response.data?.rides || response.data || []);
    } catch (error) {
      // Endpoint fallback
      setHistory([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: T.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: T.surface }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>
          Emergency Ride History
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : history.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: T.accentDim }]}>
            <Ionicons name="time-outline" size={36} color={T.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>
            No Past Emergency Rides
          </Text>
          <Text style={[styles.emptyBody, { color: T.textMuted }]}>
            Your completed emergency trips will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                fetchHistory();
              }}
              tintColor={T.accent}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.card,
                { backgroundColor: T.surface, borderColor: T.border },
              ]}
              onPress={() =>
                navigation.navigate("EmergencyRideDetailsScreen", { ride: item })
              }
              activeOpacity={0.8}
            >
              <View style={styles.cardHeader}>
                <Text style={[styles.studentName, { color: T.text }]}>
                  {item.student?.fullName || "Emergency Ride"}
                </Text>
                <Text style={[styles.statusText, { color: item.status === "COMPLETED" ? "#4caf50" : T.accent }]}>
                  {item.status.replace(/_/g, " ")}
                </Text>
              </View>

              <Text style={[styles.dateText, { color: T.textMuted }]}>
                {new Date(item.requestedPickupTime || item.createdAt).toLocaleDateString()}
              </Text>

              <View style={styles.locRow}>
                <Ionicons name="location-outline" size={14} color={T.textMuted} />
                <Text style={[styles.locText, { color: T.textMuted }]} numberOfLines={1}>
                  {item.pickupAddress} → {item.destinationAddress}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
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
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700" },

  list: { padding: 16, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 14,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 17, fontWeight: "700" },
  emptyBody: { fontSize: 13, textAlign: "center" },

  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentName: { fontSize: 16, fontWeight: "700" },
  statusText: { fontSize: 12, fontWeight: "700" },
  dateText: { fontSize: 12 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locText: { fontSize: 13, flex: 1 },
});
