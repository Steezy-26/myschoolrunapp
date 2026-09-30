// screens/HistoryScreen.js  (guardian app)
import React, { useState } from "react";
import { Text, StyleSheet, View, RefreshControl } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../contexts/ThemeContext";
// OptionsScreenContainer is the DEFAULT export of DrawerOptionsScreen.js —
// importing it inside the { } braces gives `undefined` and crashes the screen.
import OptionsScreenContainer, {
  OptionsScreenHeader,
  OptionsSection,
  OptionsSectionLabel,
  OptionRow,
  OptionDivider,
} from "../components/DrawerOptionsScreen";

// Mock data - replace with actual API data
const MOCK_HISTORY = [
  {
    id: "1",
    date: "2024-01-15",
    route: "Morning Route A",
    status: "completed",
    stops: 6,
    completed: 6,
    duration: "45 min",
  },
  {
    id: "2",
    date: "2024-01-14",
    route: "Afternoon Route B",
    status: "completed",
    stops: 5,
    completed: 5,
    duration: "38 min",
  },
  {
    id: "3",
    date: "2024-01-13",
    route: "Morning Route A",
    status: "cancelled",
    stops: 6,
    completed: 2,
    duration: "15 min",
  },
  {
    id: "4",
    date: "2024-01-12",
    route: "Afternoon Route B",
    status: "completed",
    stops: 5,
    completed: 5,
    duration: "40 min",
  },
];

export default function HistoryScreen() {
  const { theme: T } = useTheme();

  const [refreshing, setRefreshing] = useState(false);
  const [history, setHistory] = useState(MOCK_HISTORY);

  const onRefresh = async () => {
    setRefreshing(true);
    // Fetch history from API
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "#4CAF50";
      case "cancelled":
        return "#ef4444";
      default:
        return "#FFA726";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return "checkmark-circle";
      case "cancelled":
        return "close-circle";
      default:
        return "time";
    }
  };

  const completedCount = history.filter((h) => h.status === "completed").length;
  const cancelledCount = history.filter((h) => h.status === "cancelled").length;

  const renderHistoryItem = (item) => (
    <View
      key={item.id}
      style={[
        styles.historyCard,
        { backgroundColor: T.surface, borderColor: T.border },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(item.status) + "20" },
            ]}
          >
            <Ionicons
              name={getStatusIcon(item.status)}
              size={14}
              color={getStatusColor(item.status)}
            />
            <Text
              style={[
                styles.statusText,
                { color: getStatusColor(item.status) },
              ]}
            >
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
          <Text style={[styles.dateText, { color: T.textMuted }]}>
            {item.date}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={T.textMuted} />
      </View>

      <Text style={[styles.routeName, { color: T.text }]}>{item.route}</Text>

      <View style={styles.cardStats}>
        <View style={styles.statItem}>
          <Ionicons name="location-outline" size={14} color={T.textMuted} />
          <Text style={[styles.statText, { color: T.textMuted }]}>
            {item.completed}/{item.stops} stops
          </Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={14} color={T.textMuted} />
          <Text style={[styles.statText, { color: T.textMuted }]}>
            {item.duration}
          </Text>
        </View>
      </View>
    </View>
  );

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
      <OptionsScreenHeader title="Trip History" />

      {/* Summary Section */}
      <OptionsSectionLabel label="Summary" />
      <OptionsSection>
        <OptionRow
          icon="calendar-outline"
          label="Total Trips"
          subtitle={`${history.length} trips`}
          rightElement={
            <Text style={[styles.countText, { color: T.accent }]}>
              {history.length}
            </Text>
          }
        />

        <OptionDivider />

        <OptionRow
          icon="checkmark-circle-outline"
          label="Completed"
          subtitle={`${completedCount} trips`}
          rightElement={
            <Text style={[styles.countText, { color: T.success }]}>
              {completedCount}
            </Text>
          }
        />

        <OptionDivider />

        <OptionRow
          icon="close-circle-outline"
          label="Cancelled"
          subtitle={`${cancelledCount} trips`}
          rightElement={
            <Text style={[styles.countText, { color: "#ef4444" }]}>
              {cancelledCount}
            </Text>
          }
        />
      </OptionsSection>

      {/* History List — plain map instead of a FlatList, because the
          container is already a ScrollView (nested lists break scrolling
          and pull-to-refresh) */}
      <OptionsSectionLabel label="Recent Trips" />
      <View style={styles.listContent}>
        {history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyIcon, { backgroundColor: T.accentDim }]}>
              <Ionicons name="time-outline" size={40} color={T.accent} />
            </View>
            <Text style={[styles.emptyTitle, { color: T.text }]}>
              No History
            </Text>
            <Text style={[styles.emptyBody, { color: T.textMuted }]}>
              Trips will appear here once your child starts their journey
            </Text>
          </View>
        ) : (
          history.map(renderHistoryItem)
        )}
      </View>
    </OptionsScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20 },

  historyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: "600" },
  dateText: { fontSize: 12 },

  routeName: { fontSize: 15, fontWeight: "600", marginBottom: 6 },

  cardStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: { fontSize: 12 },

  countText: { fontSize: 15, fontWeight: "700" },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
});
