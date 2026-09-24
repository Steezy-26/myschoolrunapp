// screens/SupportScreen.js
import React, { useState } from "react";
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../contexts/ThemeContext";
import OptionsScreenContainer, {
  OptionsScreenHeader,
  OptionsSection,
  OptionsSectionLabel,
  OptionRow,
  OptionDivider,
} from "../components/DrawerOptionsScreen";

export default function SupportScreen() {
  const { theme: T } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: "", content: "", icon: "help-circle-outline" });

  const showInfoModal = (title, content, icon = "help-circle-outline") => {
    setModalData({ title, content, icon });
    setModalVisible(true);
  };

  const emailSupport = () => {
    Linking.openURL("mailto:support@schoolrunapp.com").catch(() =>
      Alert.alert("Error", "Could not open your email app."),
    );
  };

  const callEmergency = () => {
    Linking.openURL("tel:+263770000000").catch(() =>
      Alert.alert("Error", "Could not initiate call."),
    );
  };

  const faqContent = `
Driver Help Centre & FAQs:

1. How do I accept Emergency Rides?
Enable your availability on the home dashboard. When an emergency ride request is broadcast near your route, accept it to navigate directly to the student's pickup point.

2. How do student boarding confirmations work?
During an active route, tap 'Confirm Pickup' next to each student's name on your manifest to notify the guardian instantly.

3. How are driver ratings calculated?
Ratings are based on punctuality, route safety, and guardian feedback after completed school runs.

4. What if I encounter vehicle issues during a run?
Use the 'Report a Problem' button or contact dispatch immediately via the Emergency Support hotline.
`;

  const reportProblemContent = `
Report a Technical or Route Problem:

• App Issues: If live GPS or route navigation freezes, restart the app and verify cellular connectivity.
• Vehicle Breakdown: Tap 'Call Support Hotline' below to notify dispatch so an emergency backup driver can be routed.
• Email Logs: Send diagnostic logs to support@schoolrunapp.com.
`;

  const feedbackContent = `
Driver Feedback & Suggestions:

Your driving experience matters to us!
• Feature Requests: Tell us how we can improve navigation or manifest management.
• Route Feedback: Share details about road conditions or school pickup zones.
• Send your thoughts to feedback@schoolrunapp.com.
`;

  const emergencyContactsContent = `
24/7 Driver Emergency Contacts:

• School Run Dispatch Hotline: +263 77 000 0000
• Emergency Medical Dispatch: 994 / 112
• Roadside Assistance: +263 77 111 2222
`;

  return (
    <OptionsScreenContainer>
      <OptionsScreenHeader title="Support" />

      <OptionsSectionLabel label="DRIVER HELP & CONTACT" />
      <OptionsSection>
        <OptionRow
          icon="help-circle-outline"
          label="Help Centre"
          subtitle="FAQs and driver guides"
          onPress={() => showInfoModal("Help Centre & FAQs", faqContent, "help-circle-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="mail-outline"
          label="Contact Support"
          subtitle="Email support@schoolrunapp.com"
          onPress={emailSupport}
        />
        <OptionDivider />
        <OptionRow
          icon="call-outline"
          label="Emergency Support Hotline"
          subtitle="Call dispatch hotline (+263 77 000 0000)"
          onPress={callEmergency}
        />
      </OptionsSection>

      <OptionsSectionLabel label="FEEDBACK & ISSUES" />
      <OptionsSection>
        <OptionRow
          icon="flag-outline"
          label="Report a Problem"
          subtitle="Vehicle breakdown or app issue"
          onPress={() => showInfoModal("Report a Problem", reportProblemContent, "flag-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="chatbubble-outline"
          label="Send Feedback"
          subtitle="Help improve driver tools"
          onPress={() => showInfoModal("Send Feedback", feedbackContent, "chatbubble-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="alert-circle-outline"
          label="Emergency Contacts"
          subtitle="Medical & roadside assistance"
          onPress={() => showInfoModal("Emergency Contacts", emergencyContactsContent, "alert-circle-outline")}
        />
      </OptionsSection>

      {/* Info Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name={modalData.icon} size={22} color={T.accent || "#007AFF"} />
                <Text style={[styles.modalTitle, { color: T.text }]}>{modalData.title}</Text>
              </View>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={T.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalText, { color: T.text }]}>{modalData.content}</Text>
            </ScrollView>

            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: T.accent || "#007AFF" }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </OptionsScreenContainer>
  );
}

const styles = StyleSheet.create({
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
    marginBottom: 14,
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
  closeBtn: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  closeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

