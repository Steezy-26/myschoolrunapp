import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import { fetchDriverRatings } from "../lib/EmergencyRidesSlice";

function StarRating({ rating }) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Ionicons
        key={i}
        name={i <= rating ? "star" : "star-outline"}
        size={16}
        color="#ffc107"
      />,
    );
  }
  return <View style={{ flexDirection: "row", gap: 2 }}>{stars}</View>;
}

export default function EmergencyRideRatingsScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();

  const [refreshing, setRefreshing] = useState(false);
  const { driverProfile } = useSelector((state) => state.users);
  const { ratings } = useSelector((state) => state.emergencyRides);

  const loadRatings = async () => {
    if (driverProfile?.id) {
      try {
        await dispatch(fetchDriverRatings(driverProfile.id)).unwrap();
      } catch (e) {
        // error handling optional
      } finally {
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    loadRatings();
  }, [driverProfile?.id]);

  const avgRating = driverProfile?.rating || 0;

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
          Driver Ratings & Feedback
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadRatings();
            }}
            tintColor={T.accent}
          />
        }
      >
        {/* Rating Summary Card */}
        <View
          style={[
            styles.summaryCard,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.bigRating, { color: T.text }]}>
            {avgRating ? Number(avgRating).toFixed(1) : "0.0"}
          </Text>
          <StarRating rating={Math.round(avgRating)} />
          <Text style={[styles.summaryCount, { color: T.textMuted }]}>
            Based on {ratings?.length || 0} guardian review{ratings?.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {/* Ratings List */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Guardian Reviews
          </Text>
        </View>

        {!ratings || ratings.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="chatbubbles-outline" size={32} color={T.textMuted} />
            <Text style={[styles.emptyText, { color: T.textMuted }]}>
              No reviews received yet.
            </Text>
          </View>
        ) : (
          ratings.map((item) => (
            <View
              key={item.id}
              style={[
                styles.reviewCard,
                { backgroundColor: T.surface, borderColor: T.border },
              ]}
            >
              <View style={styles.reviewHeader}>
                <Text style={[styles.guardianName, { color: T.text }]}>
                  {item.guardianName}
                </Text>
                <StarRating rating={item.rating} />
              </View>
              {item.comment ? (
                <Text style={[styles.commentText, { color: T.text }]}>
                  "{item.comment}"
                </Text>
              ) : null}
              <Text style={[styles.dateText, { color: T.textMuted }]}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>
          ))
        )}
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

  scrollContent: { padding: 16, gap: 16 },
  summaryCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  bigRating: { fontSize: 44, fontWeight: "800" },
  summaryCount: { fontSize: 13, marginTop: 4 },

  sectionHeader: { marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },

  emptyBox: {
    padding: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: { fontSize: 14 },

  reviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  guardianName: { fontSize: 15, fontWeight: "700" },
  commentText: { fontSize: 13, fontStyle: "italic", lineHeight: 18 },
  dateText: { fontSize: 11, alignSelf: "flex-end" },
});
