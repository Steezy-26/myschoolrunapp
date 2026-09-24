// screens/guardian/SupportScreen.js
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../contexts/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SupportScreen({ navigation }) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "", icon: "help-circle" });

  const showModal = (title, body, icon = "help-circle") => {
    setModalContent({ title, body, icon });
    setModalVisible(true);
  };

  const emailSupport = () => {
    Linking.openURL("mailto:support@schoolrunapp.com").catch(() =>
      Alert.alert("Error", "Could not open email app."),
    );
  };

  const callSupport = () => {
    Linking.openURL("tel:+263770000000").catch(() =>
      Alert.alert("Error", "Could not make call."),
    );
  };

  const faqContent = `
Frequently Asked Questions (FAQs):

1. How do I track my child's school bus?
Navigate to the Home screen or Routes screen. Active school rides will display live GPS locations and accurate ETAs.

2. How do I request an Emergency Ride?
Tap 'Emergency Ride' in the side drawer menu, select your child, specify the pickup/drop-off points, and tap 'Find Drivers'.

3. How do I update my child's pickup location?
Go to 'My Students' in the side drawer menu, select your child's profile, and edit their default address.

4. What should I do if a driver is delayed?
Use the live tracking map to view traffic updates or tap 'Call Driver' directly from the active trip card.
`;

  const reportProblemContent = `
Report a Problem:

If you experience issues with tracking, driver dispatch, or account billing:

1. Take a screenshot of the issue if possible.
2. Email our technical support team at support@schoolrunapp.com with your account details.
3. For immediate assistance during an active school run, call our support line (+263 77 000 0000).
`;

  const feedbackContent = `
We Value Your Feedback!

Help us make SchoolRun even better for families:

• Suggest new features for child safety.
• Rate your daily transport experience.
• Share your thoughts by emailing feedback@schoolrunapp.com.
`;

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* Header */}
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
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={20} color={T.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: T.text }]}>
          Help & Support
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Support Section */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Assistance & FAQs
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("Help Centre & FAQs", faqContent, "help-circle-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="help-circle-outline" size={20} color={T.accent} />
              <Text style={[styles.rowText, { color: T.text }]}>
                Help Centre & FAQs
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={emailSupport}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="mail-outline" size={20} color={T.textMuted} />
              <Text style={[styles.rowText, { color: T.text }]}>
                Email Support (support@schoolrunapp.com)
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={callSupport}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="call-outline" size={20} color={T.textMuted} />
              <Text style={[styles.rowText, { color: T.text }]}>
                Call Support Hotline
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Report & Feedback */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Feedback & Issues
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("Report a Problem", reportProblemContent, "flag-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="flag-outline" size={20} color="#FF9800" />
              <Text style={[styles.rowText, { color: T.text }]}>
                Report a Problem
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("Send Feedback", feedbackContent, "chatbubble-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
              <Text style={[styles.rowText, { color: T.text }]}>
                Send App Feedback
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: T.textMuted }]}>
            SchoolRun Support Team • Available 24/7
          </Text>
        </View>
      </ScrollView>

      {/* Info Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: T.surface, borderColor: T.border },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name={modalContent.icon} size={22} color={T.accent} />
                <Text style={[styles.modalTitle, { color: T.text }]}>
                  {modalContent.title}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <Text style={[styles.modalText, { color: T.text }]}>
                {modalContent.body}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: T.accent }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeModalText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 12 },

  section: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  rowText: { fontSize: 14 },

  footer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  footerText: { fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxHeight: "82%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalBody: { maxHeight: "72%" },
  modalText: { fontSize: 13.5, lineHeight: 21 },
  closeModalBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeModalText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
