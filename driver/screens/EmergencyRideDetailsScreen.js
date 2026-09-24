import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../contexts/ThemeContext";

export default function EmergencyRideDetailsScreen({ route, navigation }) {
  const { theme: T } = useTheme();
  const { ride } = route.params || {};

  if (!ride) {
    return (
      <View style={[styles.container, { backgroundColor: T.bg }]}>
        <Text style={{ color: T.text, textAlign: "center", marginTop: 40 }}>
          Ride details unavailable.
        </Text>
      </View>
    );
  }

  const guardian = ride.guardian?.user || {};
  const student = ride.student || {};
  const vehicle = ride.vehicle || {};

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
          Emergency Ride Details
        </Text>
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
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    ride.status === "COMPLETED"
                      ? "#4caf50"
                      : ride.status === "CANCELLED"
                      ? "#ff4444"
                      : T.accent,
                },
              ]}
            />
            <Text style={[styles.statusText, { color: T.text }]}>
              {ride.status.replace(/_/g, " ")}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: T.textMuted }]}>
            Requested: {new Date(ride.requestedPickupTime).toLocaleString()}
          </Text>
          <Text style={[styles.priceText, { color: T.accent }]}>
            Price: ${ride.finalPrice || ride.offeredPrice || "0.00"}{" "}
            {ride.currency || "USD"}
          </Text>
        </View>

        {/* Guardian & Student Info */}
        <View
          style={[
            styles.card,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Passenger Information
          </Text>
          <View style={styles.infoItem}>
            <Ionicons name="person" size={18} color={T.accent} />
            <Text style={[styles.infoText, { color: T.text }]}>
              Guardian: {guardian.fullname || "Guardian"} ({guardian.phone || "No phone"})
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="school" size={18} color={T.accent} />
            <Text style={[styles.infoText, { color: T.text }]}>
              Student: {student.fullName || "Student"}
            </Text>
          </View>
        </View>

        {/* Pickup & Destination */}
        <View
          style={[
            styles.card,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Route Information
          </Text>
          <View style={styles.infoItem}>
            <Ionicons name="location" size={18} color="#4caf50" />
            <Text style={[styles.infoText, { color: T.text }]}>
              Pickup: {ride.pickupAddress}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="flag" size={18} color={T.accent} />
            <Text style={[styles.infoText, { color: T.text }]}>
              Dropoff: {ride.destinationAddress}
            </Text>
          </View>
          {ride.emergencyReason ? (
            <View style={styles.infoItem}>
              <Ionicons name="alert-circle" size={18} color="#ff9800" />
              <Text style={[styles.infoText, { color: T.textMuted }]}>
                Reason: {ride.emergencyReason}
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
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

  scrollContent: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusText: { fontSize: 16, fontWeight: "700" },
  dateText: { fontSize: 12 },
  priceText: { fontSize: 16, fontWeight: "800" },

  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 10 },
  infoText: { fontSize: 14, flex: 1 },
});
