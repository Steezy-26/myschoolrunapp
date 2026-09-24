// screens/AboutLegalScreen.js
import React, { useState } from "react";
import { View, Text, Modal, StyleSheet, ScrollView, TouchableOpacity, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useTheme } from "../contexts/ThemeContext";
import OptionsScreenContainer, {
  OptionsScreenHeader,
  OptionsSection,
  OptionsSectionLabel,
  OptionRow,
  OptionDivider,
  TextBlock,
} from "../components/DrawerOptionsScreen";

export default function AboutLegalScreen() {
  const navigation = useNavigation();
  const { theme: T } = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState({ title: "", content: "", icon: "information-circle" });

  const showInfoModal = (title, content, icon = "information-circle") => {
    setModalData({ title, content, icon });
    setModalVisible(true);
  };

  const openWebsite = (url) => {
    Linking.openURL(url).catch(() => {});
  };

  const aboutAppContent = `
SchoolRun for Drivers (v2.4.1)

SchoolRun for Drivers empowers school bus drivers, van operators, and emergency transport providers to deliver safe, punctual, and stress-free transport for students.

Key Driver Capabilities:
• Smart Route Optimization: Efficient pickup and drop-off sequences with turn-by-turn guidance.
• Live Passenger Manifest: Real-time student boarding checklists and guardian notification sync.
• Emergency Ride Dispatch: Instant priority emergency pickup alerts with one-tap acceptance.
• Performance & Earnings: Transparent ride logs, guardian ratings, and payout summaries.
`;

  const whatsNewContent = `
What's New in Version 2.4.1:

⚡ Improved Emergency Ride Alerts
Enhanced audio and visual alert signals for urgent school run requests.

📍 Enhanced GPS Tracking Accuracy
Optimized background location updates for lower battery usage during long routes.

📋 Quick Student Attendance Toggle
One-tap student boarding confirmation with instant notification to guardians.

🌙 Dark Mode UI Enhancements
Refined theme colors for high visibility during early morning and late evening drives.
`;

  const permissionsContent = `
Data & Permissions Overview:

SchoolRun requires specific permissions to ensure student safety and route transparency during active school runs:

1. Location (Always Allow / While In Use)
Used exclusively during active routes to transmit live vehicle position to guardians and dispatchers.

2. Notifications
Used to deliver emergency ride requests, route adjustments, and schedule reminders.

3. Cellular Data & Background Refresh
Required to sync live student boarding updates when the app is in the background.

We never track your location outside of active driving shifts.
`;

  const licensesContent = `
Open Source Licenses & Attribution:

SchoolRun for Drivers is built using open-source software:

• React Native (MIT License) - Meta Platforms, Inc.
• React Navigation (MIT License) - Software Mansion / React Navigation Team
• Socket.IO Client (MIT License) - Automattic
• React Native Vector Icons (MIT License) - Joel Arvidsson
• React Native Maps (MIT License) - Airbnb / Community

Special thanks to all open-source contributors!
`;

  return (
    <OptionsScreenContainer>
      <OptionsScreenHeader title="About & Legal" />

      {/* Hero / Mission Text Block */}
      <TextBlock heading="SchoolRun For Drivers">
        Dedicated to connecting verified transport providers with families for safe, reliable school commutes across Zimbabwe.
      </TextBlock>

      <OptionsSectionLabel label="APP INFORMATION" />
      <OptionsSection>
        <OptionRow
          icon="information-circle-outline"
          label="About the App"
          subtitle="Mission, capabilities & features"
          onPress={() => showInfoModal("About SchoolRun Driver", aboutAppContent, "bus-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="sparkles-outline"
          label="What's New"
          subtitle="Version 2.4.1 highlights"
          onPress={() => showInfoModal("What's New in v2.4.1", whatsNewContent, "sparkles-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="shield-checkmark-outline"
          label="Data & Permissions"
          subtitle="What we collect and why"
          onPress={() => showInfoModal("Data & Permissions", permissionsContent, "shield-checkmark-outline")}
        />
        <OptionDivider />
        <OptionRow
          icon="code-outline"
          label="Open Source Licenses"
          subtitle="Third-party software libraries"
          onPress={() => showInfoModal("Open Source Licenses", licensesContent, "code-outline")}
        />
      </OptionsSection>

      <OptionsSectionLabel label="LEGAL DOCUMENTS" />
      <OptionsSection>
        <OptionRow
          icon="lock-closed-outline"
          label="Privacy Policy"
          subtitle="Read our data privacy policy"
          onPress={() => navigation.navigate("PrivacyPolicyScreen")}
        />
        <OptionDivider />
        <OptionRow
          icon="document-text-outline"
          label="Terms & Conditions"
          subtitle="Read driver terms of service"
          onPress={() => navigation.navigate("TermsScreen")}
        />
      </OptionsSection>

      <OptionsSectionLabel label="SUPPORT & SYSTEM" />
      <OptionsSection>
        <OptionRow
          icon="globe-outline"
          label="Official Website"
          subtitle="schoolrunapp.com"
          onPress={() => openWebsite("https://schoolrunapp.com")}
        />
        <OptionDivider />
        <OptionRow
          icon="phone-portrait-outline"
          label="App Version"
          rightElement={
            <Text style={{ fontSize: 13, color: T.textMuted, fontWeight: "600" }}>v2.4.1 (Build 240)</Text>
          }
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

