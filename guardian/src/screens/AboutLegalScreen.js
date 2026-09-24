// screens/guardian/AboutLegalScreen.js
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

export default function AboutLegalScreen({ navigation }) {
  const { theme: T } = useTheme();
  const insets = useSafeAreaInsets();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: "", body: "", icon: "" });

  const appVersion = "1.0.0";
  const buildNumber = "102";
  const companyName = "SchoolRun Transport Solutions Inc.";
  const year = new Date().getFullYear();

  const appMissionText = `SchoolRun is built to eliminate daily commute anxiety for parents and guardians. We connect families with verified drivers and school transport services, offering live GPS tracking, instant safety alerts, emergency ride dispatch, and full transparency on every school run.`;

  const whatsNewContent = `
What's New in Version 1.0.0:

**Real-Time School Bus & Ride Tracking**
Track your child's journey live on the map with accurate ETAs.

**Instant Boarding & Drop-off Notifications**
Receive immediate alerts when your child boards the vehicle and arrives safely at school or home.

**Emergency School Run Dispatch**
Request priority emergency pickup whenever unexpected scheduling conflicts arise.

**Enhanced Child & Vehicle Profiles**
Manage student details, emergency contacts, and assigned drivers seamlessly.

**Refined Dark & Light Theme Interface**
Sleek, high-contrast design optimized for quick check-ins on the go.
`;

  const privacyPolicy = `
Privacy Policy

Last updated: September 2026

Your privacy and child safety are our highest priorities. This policy explains how SchoolRun collects, uses, and safeguards your personal data.

1. Information We Collect
- Guardian Account Details: Name, contact number, email, and home address.
- Student Information: Name, school name, pickup/drop-off locations.
- Real-Time Location: GPS coordinates during active school runs for tracking purposes.
- Device & Usage Data: Push token and app interaction logs.

2. How We Use Your Data
- To provide live ride tracking and student safety notifications.
- To dispatch emergency rides and facilitate driver-guardian communication.
- To improve transit routes and system reliability.

3. Data Security & Protection
All data is encrypted in transit (TLS 1.3) and at rest. We never sell or share your child's data with third-party advertisers.

4. Your Data Rights
You can request access to, correction of, or complete deletion of your data at any time via support@schoolrunapp.com.

5. Contact Us
For privacy inquiries, reach us at privacy@schoolrunapp.com.
`;

  const termsOfService = `
Terms of Service

Last updated: September 2026

1. Acceptance of Terms
By downloading or using SchoolRun Guardian, you agree to comply with these terms.

2. Service Overview
SchoolRun provides transit tracking, driver management, and emergency transport dispatch tools for parents and guardians.

3. Guardian Responsibilities
- Provide accurate student and address details.
- Ensure students are ready at designated pickup spots.
- Maintain accurate emergency contact details.

4. Safety & Driver Verification
All drivers undergo identity verification and background screening. Guardians are advised to verify driver details before boarding.

5. Subscriptions & Payments
Subscription plans auto-renew unless cancelled at least 24 hours before the end of the billing period.

6. Limitation of Liability
SchoolRun strives for maximum uptime and tracking accuracy but is not liable for indirect delays caused by cellular network outages or traffic conditions.

Contact: legal@schoolrunapp.com
`;

  const openLink = (url) => {
    Linking.openURL(url).catch(() =>
      Alert.alert("Error", "Could not open link"),
    );
  };

  const showModal = (title, body, icon = "document-text") => {
    setModalContent({ title, body, icon });
    setModalVisible(true);
  };

  const renderFormattedText = (bodyText, baseColor) => {
    if (!bodyText) return null;
    const lines = bodyText.split("\n");
    return lines.map((line, idx) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      if (parts.length > 1) {
        return (
          <Text key={idx} style={[styles.modalText, { color: baseColor }]}>
            {parts.map((part, pIdx) => {
              if (part.startsWith("**") && part.endsWith("**")) {
                return (
                  <Text key={pIdx} style={{ fontWeight: "700", color: baseColor }}>
                    {part.slice(2, -2)}
                  </Text>
                );
              }
              return part;
            })}
          </Text>
        );
      }
      return (
        <Text key={idx} style={[styles.modalText, { color: baseColor }]}>
          {line}
        </Text>
      );
    });
  };

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
          About SchoolRun
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
        {/* App Hero / Info Card */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <View style={styles.appInfo}>
            <View style={[styles.appIcon, { backgroundColor: T.accentDim || "#E8F0FE" }]}>
              <Ionicons name="bus-outline" size={38} color={T.accent} />
            </View>
            <Text style={[styles.appName, { color: T.text }]}>
              SchoolRun Guardian
            </Text>
            <Text style={[styles.appTagline, { color: T.accent }]}>
              Safe & Stress-Free School Commutes
            </Text>
            <View style={styles.versionBadge}>
              <Text style={[styles.appVersion, { color: T.textMuted }]}>
                Version {appVersion} ({buildNumber})
              </Text>
            </View>
          </View>

          {/* Mission Text */}
          <View style={[styles.missionBox, { backgroundColor: T.bg, borderColor: T.border }]}>
            <Text style={[styles.missionTitle, { color: T.text }]}>
              Our Mission
            </Text>
            <Text style={[styles.missionText, { color: T.textMuted }]}>
              {appMissionText}
            </Text>
          </View>
        </View>

        {/* Key Features Showcase */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Key App Features
          </Text>

          <View style={styles.featureGrid}>
            <View style={[styles.featureCard, { backgroundColor: T.bg }]}>
              <Ionicons name="location-outline" size={22} color={T.accent} />
              <Text style={[styles.featureCardTitle, { color: T.text }]}>
                Real-Time Tracking
              </Text>
              <Text style={[styles.featureCardDesc, { color: T.textMuted }]}>
                Live GPS map view with precise ETAs.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: T.bg }]}>
              <Ionicons name="notifications-outline" size={22} color="#4CAF50" />
              <Text style={[styles.featureCardTitle, { color: T.text }]}>
                Instant Alerts
              </Text>
              <Text style={[styles.featureCardDesc, { color: T.textMuted }]}>
                Boarding & safe drop-off notifications.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: T.bg }]}>
              <Ionicons name="alert-circle-outline" size={22} color="#FF9800" />
              <Text style={[styles.featureCardTitle, { color: T.text }]}>
                Emergency Rides
              </Text>
              <Text style={[styles.featureCardDesc, { color: T.textMuted }]}>
                Rapid dispatch for unexpected school runs.
              </Text>
            </View>

            <View style={[styles.featureCard, { backgroundColor: T.bg }]}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#9C27B0" />
              <Text style={[styles.featureCardTitle, { color: T.text }]}>
                Verified Drivers
              </Text>
              <Text style={[styles.featureCardDesc, { color: T.textMuted }]}>
                Screened & background-checked drivers.
              </Text>
            </View>
          </View>
        </View>

        {/* Release Notes & Updates */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Updates & Information
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("What's New in v1.0.0", whatsNewContent, "sparkles-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="sparkles-outline" size={20} color={T.accent} />
              <Text style={[styles.rowText, { color: T.text }]}>
                What's New in Version {appVersion}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Legal Documents */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Legal & Privacy
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("Privacy Policy", privacyPolicy, "shield-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="shield-outline" size={20} color={T.textMuted} />
              <Text style={[styles.rowText, { color: T.text }]}>
                Privacy Policy
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.row}
            onPress={() => showModal("Terms of Service", termsOfService, "document-text-outline")}
          >
            <View style={styles.rowLeft}>
              <Ionicons
                name="document-text-outline"
                size={20}
                color={T.textMuted}
              />
              <Text style={[styles.rowText, { color: T.text }]}>
                Terms of Service
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Contact & Support */}
        <View
          style={[
            styles.section,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: T.text }]}>
            Company & Contact Support
          </Text>

          <TouchableOpacity
            style={styles.row}
            onPress={() => openLink("mailto:support@schoolrunapp.com")}
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
            onPress={() => openLink("https://schoolrunapp.com")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={20} color={T.textMuted} />
              <Text style={[styles.rowText, { color: T.text }]}>
                Visit Official Website
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={T.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: T.textMuted }]}>
            Made with ❤️ for parents & guardians in Zimbabwe
          </Text>
          <Text style={[styles.copyrightText, { color: T.textMuted }]}>
            © {year} {companyName}
          </Text>
        </View>
      </ScrollView>

      {/* Modal for legal documents & updates */}
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
                <Ionicons name={modalContent.icon || "document-text"} size={22} color={T.accent} />
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
              {renderFormattedText(modalContent.body, T.text)}
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

  appInfo: {
    alignItems: "center",
    paddingVertical: 8,
  },
  appIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  appName: { fontSize: 22, fontWeight: "800" },
  appTagline: { fontSize: 13, fontWeight: "600", marginTop: 4 },
  versionBadge: { marginTop: 6 },
  appVersion: { fontSize: 12.5 },

  missionBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  missionTitle: { fontSize: 13, fontWeight: "700", marginBottom: 4 },
  missionText: { fontSize: 12.5, lineHeight: 19 },

  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  featureCard: {
    width: "48%",
    borderRadius: 12,
    padding: 12,
  },
  featureCardTitle: { fontSize: 13, fontWeight: "700", marginTop: 6, marginBottom: 2 },
  featureCardDesc: { fontSize: 11, lineHeight: 15 },

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
    gap: 4,
  },
  footerText: { fontSize: 12 },
  copyrightText: { fontSize: 11 },

  // Modal styles
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

