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
  Alert,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchIncomingEmergencyRides,
  acceptEmergencyRide,
  rejectEmergencyRide,
} from "../lib/EmergencyRidesSlice";
import Toast from "react-native-toast-message";

function EmergencyRequestCard({ item, onAccept, onReject, processing, T }) {
  const [expanded, setExpanded] = useState(false);
  const guardian = item.guardian?.user || {};
  const student = item.student || {};

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: T.surface,
          borderColor: T.accentBorder,
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.badgeTag, { backgroundColor: T.accentDim }]}>
          <Ionicons name="flash" size={14} color={T.accent} />
          <Text style={[styles.badgeTagText, { color: T.accent }]}>
            EMERGENCY REQUEST
          </Text>
        </View>
        <Text style={[styles.priceTag, { color: T.text }]}>
          ${item.finalPrice || item.offeredPrice || "0.00"} {item.currency || "USD"}
        </Text>
      </View>

      <View style={styles.infoRow}>
        <Ionicons name="person-circle" size={32} color={T.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.guardianName, { color: T.text }]}>
            {guardian.fullname || "Guardian"}
          </Text>
          <Text style={[styles.studentSub, { color: T.textMuted }]}>
            Child: {student.fullName || "Student"}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setExpanded(!expanded)}
          style={styles.expandBtn}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={T.accent}
          />
        </TouchableOpacity>
      </View>

      {/* Pickup & Destination */}
      <View style={styles.locationContainer}>
        <View style={styles.locRow}>
          <View style={[styles.dot, { backgroundColor: "#4caf50" }]} />
          <Text style={[styles.locText, { color: T.text }]} numberOfLines={1}>
            Pickup: {item.pickupAddress}
          </Text>
        </View>
        <View style={styles.locRow}>
          <View style={[styles.dot, { backgroundColor: T.accent }]} />
          <Text style={[styles.locText, { color: T.text }]} numberOfLines={1}>
            Dropoff: {item.destinationAddress}
          </Text>
        </View>
      </View>

      {/* Expanded details */}
      {expanded && (
        <View style={[styles.expandedBox, { borderTopColor: T.border }]}>
          <Text style={[styles.detailTitle, { color: T.text }]}>
            Reason for Emergency:
          </Text>
          <Text style={[styles.detailText, { color: T.textMuted }]}>
            {item.emergencyReason || "Normal driver unavailable"}
          </Text>
          {item.specialInstructions ? (
            <>
              <Text style={[styles.detailTitle, { color: T.text, marginTop: 6 }]}>
                Special Instructions:
              </Text>
              <Text style={[styles.detailText, { color: T.textMuted }]}>
                {item.specialInstructions}
              </Text>
            </>
          ) : null}
        </View>
      )}

      {/* Action Buttons */}
      <View style={[styles.actionRow, { borderTopColor: T.border }]}>
        <TouchableOpacity
          style={[styles.declineBtn, { borderColor: T.border }]}
          onPress={() => onReject(item.id)}
          disabled={processing === item.id}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={18} color={T.textMuted} />
          <Text style={[styles.declineText, { color: T.textMuted }]}>
            Decline
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.acceptBtn, { backgroundColor: T.accent }]}
          onPress={() => onAccept(item.id)}
          disabled={processing === item.id}
          activeOpacity={0.85}
        >
          {processing === item.id ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.acceptText}>Accept Ride</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function IncomingEmergencyRidesScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();

  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(null);

  const { incomingRequests, isLoading } = useSelector(
    (state) => state.emergencyRides,
  );

  const loadRequests = async () => {
    try {
      await dispatch(fetchIncomingEmergencyRides()).unwrap();
    } catch (error) {
      // Toast error optional
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (id) => {
    setProcessing(id);
    try {
      const result = await dispatch(acceptEmergencyRide(id)).unwrap();
      Toast.show({
        type: "success",
        text1: "Ride accepted! Opening trip navigation...",
      });
      navigation.navigate("EmergencyRideTrackingScreen", { rideId: result.id });
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error || "Failed to accept ride",
      });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = (id) => {
    Alert.alert(
      "Decline Emergency Ride",
      "Are you sure you want to decline this emergency request?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Decline",
          style: "destructive",
          onPress: async () => {
            setProcessing(id);
            try {
              await dispatch(
                rejectEmergencyRide({
                  rideId: id,
                  rejectionReason: "Driver unavailable",
                }),
              ).unwrap();
              Toast.show({
                type: "info",
                text1: "Ride request declined",
              });
              await loadRequests();
            } catch (error) {
              Toast.show({
                type: "error",
                text1: error || "Failed to reject ride",
              });
            } finally {
              setProcessing(null);
            }
          },
        },
      ],
    );
  };

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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: T.text }]}>
            Incoming Emergency Requests
          </Text>
          <Text style={[styles.headerSub, { color: T.accent }]}>
            {incomingRequests?.length || 0} waiting for response
          </Text>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={T.accent} />
        </View>
      ) : !incomingRequests || incomingRequests.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: T.accentDim }]}>
            <Ionicons name="flash-outline" size={36} color={T.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: T.text }]}>
            No Emergency Requests
          </Text>
          <Text style={[styles.emptyBody, { color: T.textMuted }]}>
            When a guardian selects you for an emergency ride, requests will appear here instantly.
          </Text>
        </View>
      ) : (
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadRequests();
              }}
              tintColor={T.accent}
            />
          }
          renderItem={({ item }) => (
            <EmergencyRequestCard
              item={item}
              onAccept={handleAccept}
              onReject={handleReject}
              processing={processing}
              T={T}
            />
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
  headerSub: { fontSize: 12, fontWeight: "600", marginTop: 1 },

  list: { padding: 16, gap: 14 },
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
  emptyBody: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeTagText: { fontSize: 11, fontWeight: "700" },
  priceTag: { fontSize: 16, fontWeight: "800" },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  guardianName: { fontSize: 15, fontWeight: "700" },
  studentSub: { fontSize: 12, marginTop: 1 },
  expandBtn: { padding: 4 },

  locationContainer: { gap: 6, paddingVertical: 4 },
  locRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  locText: { fontSize: 13, fontWeight: "600", flex: 1 },

  expandedBox: {
    borderTopWidth: 1,
    paddingTop: 10,
    gap: 2,
  },
  detailTitle: { fontSize: 12, fontWeight: "700" },
  detailText: { fontSize: 12 },

  actionRow: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  declineBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 50,
    borderWidth: 1,
  },
  declineText: { fontSize: 13, fontWeight: "600" },
  acceptBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 50,
  },
  acceptText: { color: "#fff", fontSize: 13, fontWeight: "700" },
});
