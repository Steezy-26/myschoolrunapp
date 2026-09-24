import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "../contexts/ThemeContext";
import {
  fetchDriverServices,
  saveDriverService,
} from "../lib/EmergencyRidesSlice";
import Toast from "react-native-toast-message";

export default function AvailabilityToggleScreen({ navigation }) {
  const { theme: T } = useTheme();
  const dispatch = useDispatch();

  const { myService, isSubmitting } = useSelector(
    (state) => state.emergencyRides,
  );
  const { driverAssignedVehicle } = useSelector((state) => state.vehicleroutes);

  const [price, setPrice] = useState("50.00");
  const [currency, setCurrency] = useState("USD");
  const [origin, setOrigin] = useState("Downtown Base");
  const [destination, setDestination] = useState("Metropolitan Area");

  useEffect(() => {
    dispatch(fetchDriverServices());
  }, [dispatch]);

  useEffect(() => {
    if (myService) {
      if (myService.price) setPrice(String(myService.price));
      if (myService.currency) setCurrency(myService.currency);
      if (myService.origin) setOrigin(myService.origin);
      if (myService.destination) setDestination(myService.destination);
    }
  }, [myService]);

  const handleSave = async () => {
    const numericPrice = parseFloat(price);
    if (isNaN(numericPrice) || numericPrice <= 0) {
      Toast.show({
        type: "error",
        text1: "Please enter a valid price",
      });
      return;
    }

    try {
      await dispatch(
        saveDriverService({
          vehicleId: driverAssignedVehicle?.id || undefined,
          origin: origin.trim() || "Base Location",
          destination: destination.trim() || "Coverage Area",
          originLatitude: 0,
          originLongitude: 0,
          destinationLatitude: 0,
          destinationLongitude: 0,
          serviceType: "emergency_transport",
          price: numericPrice,
          currency: currency.toUpperCase(),
          pricingType: "FIXED",
          isActive: myService?.isActive !== undefined ? myService.isActive : true,
        }),
      ).unwrap();

      Toast.show({
        type: "success",
        text1: "Pricing and service settings saved!",
      });
      navigation.goBack();
    } catch (error) {
      Toast.show({
        type: "error",
        text1: error || "Failed to save configuration",
      });
    }
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
        <Text style={[styles.headerTitle, { color: T.text }]}>
          Pricing & Service Setup
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: T.surface, borderColor: T.border },
          ]}
        >
          <Text style={[styles.fieldLabel, { color: T.text }]}>
            Base Trip Price
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: T.bg, borderColor: T.border },
            ]}
          >
            <Ionicons name="cash-outline" size={20} color={T.accent} />
            <TextInput
              style={[styles.input, { color: T.text }]}
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
              placeholder="50.00"
              placeholderTextColor={T.textMuted}
            />
            <Text style={[styles.currencyLabel, { color: T.textMuted }]}>
              {currency}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, { color: T.text, marginTop: 14 }]}>
            Primary Operating Base
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: T.bg, borderColor: T.border },
            ]}
          >
            <Ionicons name="location-outline" size={20} color={T.accent} />
            <TextInput
              style={[styles.input, { color: T.text }]}
              value={origin}
              onChangeText={setOrigin}
              placeholder="e.g. Central Station"
              placeholderTextColor={T.textMuted}
            />
          </View>

          <Text style={[styles.fieldLabel, { color: T.text, marginTop: 14 }]}>
            Coverage Zone / Destination Area
          </Text>
          <View
            style={[
              styles.inputWrap,
              { backgroundColor: T.bg, borderColor: T.border },
            ]}
          >
            <Ionicons name="navigate-outline" size={20} color={T.accent} />
            <TextInput
              style={[styles.input, { color: T.text }]}
              value={destination}
              onChangeText={setDestination}
              placeholder="e.g. City Suburban Radius"
              placeholderTextColor={T.textMuted}
            />
          </View>

          <Text style={[styles.noteText, { color: T.textMuted, marginTop: 14 }]}>
            Note: Guardians comparing alternative drivers will see your fixed price, rating, vehicle model, and estimated ETA before selecting you.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: T.accent }]}
          onPress={handleSave}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Service Settings</Text>
            </>
          )}
        </TouchableOpacity>
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

  scrollContent: { padding: 16, gap: 20 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
  },
  fieldLabel: { fontSize: 14, fontWeight: "700", marginBottom: 6 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  input: { flex: 1, fontSize: 15, fontWeight: "600" },
  currencyLabel: { fontSize: 14, fontWeight: "700" },
  noteText: { fontSize: 12, lineHeight: 18 },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 50,
    paddingVertical: 14,
  },
  saveBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
