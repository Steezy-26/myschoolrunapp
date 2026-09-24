import React, { useEffect, useState } from "react";
import {
  Text,
  StyleSheet,
  View,
  TextInput,
  Image,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDispatch, useSelector } from "react-redux";
import { clearDriverError, setDriverProfile } from "../lib/UserSlice";
import Toast from "react-native-toast-message";
import {
  validateIdNumber,
  getRegistrationFormatStatus,
} from "../utils/helpers";

const SectionHeader = ({ icon, title, subtitle }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconWrap}>
      <Ionicons name={icon} size={18} color="#e83030" />
    </View>
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
    </View>
  </View>
);

const Field = ({
  label,
  placeholder,
  value,
  onChangeText,
  keyboardType = "default",
  required,
  icon,
  validation,
  validationMessage,
  maxLength,
}) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <View
      style={[
        styles.inputWrapper,
        validation === false && styles.inputError,
        validation === true && styles.inputSuccess,
      ]}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={16}
          color="rgba(255,255,255,0.3)"
          style={styles.fieldIcon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          icon && { paddingLeft: 36 },
          validation !== undefined &&
            validation !== null && { paddingRight: 32 },
        ]}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.25)"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="characters"
        maxLength={maxLength}
      />
      {validation !== undefined && validation !== null && (
        <View style={styles.validationIcon} pointerEvents="none">
          <Ionicons
            name={validation ? "checkmark-circle" : "alert-circle"}
            size={20}
            color={validation ? "#4CAF50" : "#e83030"}
          />
        </View>
      )}
    </View>
    {validationMessage && (
      <Text
        style={[
          styles.validationMessage,
          validation ? styles.validationSuccess : styles.validationError,
        ]}
      >
        {validationMessage}
      </Text>
    )}
  </View>
);

const GenderSelector = ({ value, onChange }) => {
  const options = ["male", "female", "other"];
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        Gender<Text style={styles.required}> *</Text>
      </Text>
      <View style={styles.genderRow}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt}
            style={[
              styles.genderOption,
              value === opt && styles.genderOptionActive,
            ]}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                opt === "male" ? "male" : opt === "female" ? "female" : "person"
              }
              size={14}
              color={value === opt ? "#fff" : "rgba(255,255,255,0.4)"}
            />
            <Text
              style={[
                styles.genderText,
                value === opt && styles.genderTextActive,
              ]}
            >
              {opt.charAt(0).toUpperCase() + opt.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const formatDate = (d) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const DateField = ({ label, value, onChangeText, required }) => {
  const [show, setShow] = useState(false);
  const dateValue = value ? new Date(value) : new Date();

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShow(false);
      if (event.type === "set" && selectedDate) {
        onChangeText(formatDate(selectedDate));
      }
      return;
    }
    // iOS: keep the spinner open, just track the picked value
    if (selectedDate) {
      onChangeText(formatDate(selectedDate));
    }
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>
      <TouchableOpacity
        style={styles.inputWrapper}
        activeOpacity={0.75}
        onPress={() => setShow(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={16}
          color="rgba(255,255,255,0.3)"
          style={styles.fieldIcon}
        />
        <Text
          style={[
            styles.input,
            { paddingLeft: 36 },
            !value && { color: "rgba(255,255,255,0.25)" },
          ]}
        >
          {value || "YYYY-MM-DD"}
        </Text>
      </TouchableOpacity>

      {show && (
        <>
          <DateTimePicker
            value={dateValue}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleChange}
            themeVariant="dark"
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity
              style={styles.dateDoneBtn}
              onPress={() => setShow(false)}
            >
              <Text style={styles.dateDoneText}>Done</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

const ImagePickerTile = ({ label, uri, onPick, onRemove, required }) => (
  <View style={styles.fieldWrap}>
    <Text style={styles.label}>
      {label}
      {required && <Text style={styles.required}> *</Text>}
    </Text>
    <TouchableOpacity
      style={styles.imageTile}
      onPress={onPick}
      activeOpacity={0.8}
    >
      {uri ? (
        <>
          <Image
            source={{ uri }}
            style={styles.imagePreview}
            resizeMode="cover"
          />
          <View style={styles.imageOverlay}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.imageOverlayText}>Change</Text>
          </View>
          {onRemove && (
            <TouchableOpacity
              style={styles.imageRemoveBtn}
              onPress={onRemove}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={14} color="#fff" />
            </TouchableOpacity>
          )}
        </>
      ) : (
        <>
          <View style={styles.imagePlaceholderIcon}>
            <Ionicons name="camera-outline" size={20} color="#e83030" />
          </View>
          <Text style={styles.imagePlaceholderText}>Tap to upload</Text>
          <Text style={styles.imagePlaceholderSub}>
            JPG, PNG, JPEG up to 15MB
          </Text>
        </>
      )}
    </TouchableOpacity>
  </View>
);

export default function SetProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.users);

  const [formData, setFormData] = useState({
    idNumber: "",
    licenseNumber: "",
    gender: "",
    profileImage: null,
    carMake: "",
    carModel: "",
    vehicleImage: null,
    registrationNumber: "",
    capacity: "",
    lastServiceDate: "",
    nextServiceDate: "",
    insuranceExpiry: "",
  });

  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registrationNumberValidation, setRegistrationNumberValidation] =
    useState(null);

  const update = (field) => (value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (field === "registrationNumber") {
      const validation = getRegistrationFormatStatus(value);
      setRegistrationNumberValidation(validation);
    }
  };

  const pickImage = async (fieldName) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission required", "Please allow access to your photos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setFormData((prev) => ({ ...prev, [fieldName]: result.assets[0] }));
    }
  };

  const validateStep1 = () => {
    const idValidation = validateIdNumber(formData.idNumber);
    if (!idValidation.isValid) {
      Toast.show({
        type: "error",
        text1: "Invalid ID Number",
        text2: "Please enter a valid ID number",
      });
      return false;
    }

    if (!formData.idNumber || !formData.licenseNumber || !formData.gender) {
      Toast.show({
        type: "error",
        text1: "Missing Fields",
        text2: "Please fill in ID number, driver's license and gender",
      });

      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.registrationNumber) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2: "Registration number is required.",
      });
      return false;
    }

    const registrationValidation = getRegistrationFormatStatus(
      formData.registrationNumber,
    );

    if (!registrationValidation || !registrationValidation.valid) {
      Toast.show({
        type: "error",
        text1: "Invalid Registration Number",
      });
      return false;
    }

    if (
      !formData.carMake ||
      !formData.carModel ||
      !formData.registrationNumber ||
      !formData.capacity
    ) {
      Toast.show({
        type: "error",
        text1: "Missing fields",
        text2:
          "Car make, model, registration number and capacity are required.",
      });

      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);

    try {
      // Prepare profile data for API
      const profileData = {
        idNumber: formData.idNumber,
        licenseNumber: formData.licenseNumber,
        gender: formData.gender,
        profileImage: formData.profileImage,
        carMake: formData.carMake,
        carModel: formData.carModel,
        vehicleImage: formData.vehicleImage,
        registrationNumber: formData.registrationNumber,
        capacity: parseInt(formData.capacity, 10),
        lastServiceDate: formData.lastServiceDate || null,
        nextServiceDate: formData.nextServiceDate || null,
        insuranceExpiry: formData.insuranceExpiry || null,
      };

      await dispatch(setDriverProfile(profileData)).unwrap();

      Toast.show({
        type: "success",
        text1: "Profile Created!",
        text2: "Your driver profile has been set up successfully.",
      });

      // FIX: previously called navigation.reset({ index: 0, routes: [{ name: "SetRoute" }] })
      // here. That silently failed — at this exact moment App.js's Stack.Navigator
      // still only has "SetProfile" mounted (profileComplete hasn't flipped to true
      // in React state yet), so "SetRoute" isn't a registered route to reset to.
      // React Navigation drops that reset call with no visible error, which is
      // exactly why the screen stayed stale after a successful submit.
      //
      // No manual navigation needed — setDriverProfile's fulfilled case updates
      // state.users.driverProfile, which flips App.js's `hasProfile`/`profileComplete`
      // to true and re-renders the Stack.Navigator straight into "SetRoute"
      // automatically. This mirrors the same fix already applied on the guardian
      // app's route-creation screen.
    } catch (error) {
      Toast.show({
        type: "error",
        text1: "Profile Creation Failed",
        text2: error || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    return () => {
      dispatch(clearDriverError());
    };
  }, []);

  const StepBar = () => (
    <View style={styles.stepBar}>
      {[1, 2].map((s) => (
        <React.Fragment key={s}>
          <View
            style={[
              styles.stepDot,
              step >= s && styles.stepDotActive,
              step > s && styles.stepDotDone,
            ]}
          >
            {step > s ? (
              <Ionicons name="checkmark" size={12} color="#fff" />
            ) : (
              <Text style={[styles.stepNum, step >= s && styles.stepNumActive]}>
                {s}
              </Text>
            )}
          </View>
          {s < 2 && (
            <View style={[styles.stepLine, step > s && styles.stepLineDone]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {step === 2 ? (
          <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Complete Profile</Text>
          <Text style={styles.headerSub}>
            {step === 1 ? "Personal Details" : "Vehicle Details"}
          </Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      <StepBar />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {step === 1 && (
            <>
              <SectionHeader
                icon="person-outline"
                title="Personal Information"
                subtitle="Your identification details"
              />

              <ImagePickerTile
                label="Profile Photo"
                uri={formData.profileImage?.uri}
                onPick={() => pickImage("profileImage")}
                onRemove={() =>
                  setFormData((prev) => ({ ...prev, profileImage: null }))
                }
              />

              <Field
                label="ID Number"
                placeholder="Enter your national ID number"
                value={formData.idNumber}
                onChangeText={update("idNumber")}
                icon="card-outline"
              />

              <Field
                label="Driver's License Number"
                placeholder="Enter your driver's license number"
                value={formData.licenseNumber}
                onChangeText={update("licenseNumber")}
                icon="document-text-outline"
                required
              />

              <GenderSelector
                value={formData.gender}
                onChange={update("gender")}
              />

              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={handleNext}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#e83030", "#c01818"]}
                  style={styles.primaryBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryBtnText}>Next — Vehicle Info</Text>
                  <Ionicons name="arrow-forward" size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {step === 2 && (
            <>
              <SectionHeader
                icon="car-outline"
                title="Vehicle Information"
                subtitle="Details about your vehicle"
              />

              <ImagePickerTile
                label="Vehicle Photo"
                uri={formData.vehicleImage?.uri}
                onPick={() => pickImage("vehicleImage")}
                onRemove={() =>
                  setFormData((prev) => ({ ...prev, vehicleImage: null }))
                }
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Car Make"
                    placeholder="e.g. Toyota"
                    value={formData.carMake}
                    onChangeText={update("carMake")}
                    icon="car-sport-outline"
                    required
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <Field
                    label="Car Model"
                    placeholder="e.g. Hiace"
                    value={formData.carModel}
                    onChangeText={update("carModel")}
                    required
                  />
                </View>
              </View>

              <Field
                label="Registration Number"
                placeholder="e.g. ABC 1234"
                value={formData.registrationNumber}
                onChangeText={update("registrationNumber")}
                icon="barcode-outline"
                required
                validation={
                  registrationNumberValidation
                    ? registrationNumberValidation.valid
                    : undefined
                }
                validationMessage={
                  registrationNumberValidation
                    ? registrationNumberValidation.message
                    : ""
                }
                maxLength={7}
              />

              <Field
                label="Capacity"
                placeholder="e.g. 4"
                value={formData.capacity}
                onChangeText={update("capacity")}
                keyboardType="numeric"
                required
              />

              <SectionHeader
                icon="construct-outline"
                title="Service & Insurance"
                subtitle="Keep your records up to date"
              />

              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Last Service Date"
                    value={formData.lastServiceDate}
                    onChangeText={update("lastServiceDate")}
                  />
                </View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}>
                  <DateField
                    label="Next Service Date"
                    value={formData.nextServiceDate}
                    onChangeText={update("nextServiceDate")}
                  />
                </View>
              </View>

              <DateField
                label="Insurance Expiry"
                value={formData.insuranceExpiry}
                onChangeText={update("insuranceExpiry")}
                required
              />

              <TouchableOpacity
                style={[styles.primaryBtn, isSubmitting && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#e83030", "#c01818"]}
                  style={styles.primaryBtnGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryBtnText}>
                    {isSubmitting ? "Submitting..." : "Submit Profile"}
                  </Text>
                  {!isSubmitting && (
                    <Ionicons name="checkmark" size={18} color="#fff" />
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0d" },

  // ── Header ──
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  headerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },

  // ── Step bar ──
  stepBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 0,
  },
  stepDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1e1e1e",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: {
    borderColor: "#e83030",
    backgroundColor: "#1f0808",
  },
  stepDotDone: {
    backgroundColor: "#e83030",
    borderColor: "#e83030",
  },
  stepNum: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.3)" },
  stepNumActive: { color: "#e83030" },
  stepLine: {
    width: 60,
    height: 2,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  stepLineDone: { backgroundColor: "#e83030" },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 48,
    paddingTop: 4,
  },

  // ── Section header ──
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    marginTop: 8,
  },
  sectionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(232,48,48,0.12)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232,48,48,0.2)",
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.35)",
    marginTop: 1,
  },

  // ── Fields ──
  fieldWrap: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginBottom: 7,
  },
  required: { color: "#e83030" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 50,
    paddingHorizontal: 14,
  },
  fieldIcon: { position: "absolute", left: 13 },
  input: {
    color: "#ffffff",
    fontSize: 14,
    flex: 1,
    height: "100%",
    paddingLeft: 4,
  },
  dateDoneBtn: {
    alignSelf: "flex-end",
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#e83030",
  },
  dateDoneText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  inputError: { borderColor: "#e83030" },
  inputSuccess: { borderColor: "#4CAF50" },
  validationIcon: {
    position: "absolute",
    right: 14,
  },
  validationMessage: {
    fontSize: 11,
    marginTop: 5,
    marginLeft: 2,
  },
  validationError: { color: "#e83030" },
  validationSuccess: { color: "#4CAF50" },

  // ── Gender ──
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  genderOptionActive: {
    backgroundColor: "#1f0808",
    borderColor: "#e83030",
  },
  genderText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
  },
  genderTextActive: { color: "#ffffff" },

  // ── Image tile ──
  imageTile: {
    height: 130,
    borderRadius: 14,
    backgroundColor: "#1a1a1a",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.08)",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: 4,
  },
  imagePreview: { ...StyleSheet.absoluteFillObject },
  imageRemoveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  imageOverlayText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  imagePlaceholderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(232,48,48,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  imagePlaceholderSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
    marginTop: 3,
  },

  // ── Row layout ──
  row: { flexDirection: "row" },

  // ── Primary button ──
  primaryBtn: {
    borderRadius: 50,
    overflow: "hidden",
    marginTop: 24,
    marginBottom: 8,
    elevation: 8,
    shadowColor: "#e03030",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
  },
  primaryBtnGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
