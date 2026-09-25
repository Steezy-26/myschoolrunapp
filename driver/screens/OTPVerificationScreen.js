// OTPVerificationScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Keyboard,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@react-native-vector-icons/ionicons";
import { useDispatch, useSelector } from "react-redux";
import Toast from "react-native-toast-message";
import {
  resendVerificationOTP,
  verifyEmailVerification,
} from "../lib/AuthSlice";

const { width } = Dimensions.get("window");
const OTP_LENGTH = 6;
const MAX_OTP_ATTEMPTS = 5;

export default function OTPVerificationScreen({ navigation, route }) {
  const email = route?.params?.email || "";
  const dispatch = useDispatch();

  // Redux state
  const { isLoading, error, user } = useSelector((state) => state.auth);

  // Local state
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [timer, setTimer] = useState(59);
  const [canResend, setCanResend] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const inputRefs = useRef([]);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Timer countdown effect
  useEffect(() => {
    if (timer === 0) {
      setCanResend(true);
      return;
    }
    const interval = setTimeout(() => setTimer(timer - 1), 1000);
    return () => clearTimeout(interval);
  }, [timer]);

  // Fade in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, []);

  const startTimer = () => {
    setTimer(59);
    setCanResend(false);
  };

  const handleChange = (text, index) => {
    const val = text.replace(/[^0-9]/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = val;
    setOtp(newOtp);
    setErrorMessage("");

    if (val && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits are filled
    if (newOtp.every((d) => d !== "")) {
      setTimeout(() => handleVerify(), 300);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // ✅ FIXED: Added 'async' keyword and proper Redux integration
  const handleVerify = async () => {
    const code = otp.join("");

    // Validate OTP length
    if (code.length < OTP_LENGTH) {
      triggerShakeAnimation();
      setErrorMessage("Please enter all 6 digits");
      return;
    }

    // Prevent multiple submissions
    if (isLoading || isVerifying) return;

    setIsVerifying(true);
    setErrorMessage("");
    Keyboard.dismiss();

    try {
      // Dispatch the verification action
      const result = await dispatch(
        verifyEmailVerification({
          email,
          otp: code,
        }),
      ).unwrap();

      // ✅ Success - Email verified
      Toast.show({
        type: "success",
        text1: "Email Verified! ",
        text2: "Your email has been successfully verified",
        visibilityTime: 3000,
      });

      // ✅ Do NOT call navigation.reset here.
      // AppNavigator in App.js watches isAuthenticated, hasProfile, hasRoutes,
      // and hasSelectedRoute from Redux and will automatically mount the correct
      // screen (SetProfile → SetRoute → RouteSelection → Main) the moment
      // verifyEmailVerification sets isAuthenticated = true in the store.
    } catch (error) {
      // ❌ Handle verification failure
      console.error("Verification error:", error);

      // Extract error details
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || "Invalid verification code";
      setErrorMessage(errorMessage);
      triggerShakeAnimation();

      // Check if error contains remaining attempts
      let remainingAttempts = null;
      if (error?.remainingAttempts !== undefined) {
        remainingAttempts = error.remainingAttempts;
        setAttempts(MAX_OTP_ATTEMPTS - remainingAttempts);
      }

      // Show appropriate toast message
      if (error?.status === 423 || errorMessage.includes("locked")) {
        Toast.show({
          type: "error",
          text1: "Account Locked",
          text2: "Your account is temporarily locked. Please try again later.",
          visibilityTime: 4000,
        });
        setTimeout(() => navigation.goBack(), 2000);
      } else if (errorMessage.includes("expired")) {
        Toast.show({
          type: "warning",
          text1: "Code Expired",
          text2:
            "Your verification code has expired. A new code has been sent.",
          visibilityTime: 3000,
        });
        // Auto resend new OTP
        handleResend();
      } else if (remainingAttempts !== null && remainingAttempts <= 0) {
        Toast.show({
          type: "warning",
          text1: "Too Many Attempts",
          text2: "A new verification code has been sent to your email.",
          visibilityTime: 3000,
        });
        // Reset OTP and auto resend
        setOtp(Array(OTP_LENGTH).fill(""));
        setAttempts(0);
        handleResend();
      } else if (remainingAttempts !== null) {
        Toast.show({
          type: "error",
          text1: "Invalid Code",
          text2: `${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} remaining`,
          visibilityTime: 2500,
        });
      } else {
        Toast.show({
          type: "error",
          text1: "Verification Failed",
          text2: errorMessage,
          visibilityTime: 3000,
        });
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // ✅ FIXED: Added 'async' keyword
  const handleResend = async () => {
    if (!canResend || isLoading || isVerifying) return;

    try {
      await dispatch(resendVerificationOTP(email)).unwrap();

      // Reset OTP and timer
      setOtp(Array(OTP_LENGTH).fill(""));
      setAttempts(0);
      setErrorMessage("");
      startTimer();
      inputRefs.current[0]?.focus();

      Toast.show({
        type: "success",
        text1: "Code Sent",
        text2: "A new verification code has been sent to your email",
        visibilityTime: 3000,
      });
    } catch (error) {
      console.error("Resend error:", error);
      const errorMessage =
        typeof error === "string"
          ? error
          : error?.message || "Failed to resend OTP";

      Toast.show({
        type: "error",
        text1: "Something went wrong",
        text2: errorMessage,
        visibilityTime: 3000,
      });

      setErrorMessage(errorMessage);
    }
  };

  const triggerShakeAnimation = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -8,
        duration: 60,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 60,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const isComplete = otp.every((d) => d !== "");
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, "$1***$3");
  const remainingAttempts = MAX_OTP_ATTEMPTS - attempts;

  return (
    <View style={styles.container}>
      {/* Background glow */}
      <View style={styles.glowTop} />

      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="chevron-back" size={20} color="#fff" />
      </TouchableOpacity>

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
          onScrollBeginDrag={Keyboard.dismiss}
        >
          <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
            {/* Icon */}
            <View style={styles.iconWrapper}>
              <LinearGradient
                colors={["#3a0a0a", "#1a0505"]}
                style={styles.iconBg}
              >
                <Ionicons name="shield-checkmark" size={36} color="#e83030" />
              </LinearGradient>
              <View style={styles.iconRing} />
            </View>

            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>We've sent a 6-digit code to</Text>
            <Text style={styles.emailText}>{maskedEmail}</Text>

            {/* Attempts remaining */}
            {attempts > 0 && (
              <Text
                style={[
                  styles.attemptsText,
                  remainingAttempts <= 2 && styles.attemptsWarning,
                ]}
              >
                {remainingAttempts} attempt{remainingAttempts !== 1 ? "s" : ""}{" "}
                remaining
              </Text>
            )}

            {/* Error message */}
            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            {/* OTP inputs */}
            <Animated.View
              style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
            >
              {otp.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputRefs.current[i] = r)}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                    errorMessage ? styles.otpInputError : null,
                  ]}
                  value={digit}
                  onChangeText={(t) => handleChange(t, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  caretHidden
                  editable={!isLoading && !isVerifying}
                />
              ))}
            </Animated.View>

            {/* Timer & Resend */}
            <View style={styles.timerRow}>
              {isLoading || isVerifying ? (
                <ActivityIndicator size="small" color="#e83030" />
              ) : canResend ? (
                <TouchableOpacity
                  onPress={handleResend}
                  disabled={isLoading || isVerifying}
                >
                  <Text style={styles.resendActive}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend code in{" "}
                  <Text style={styles.timerCount}>
                    00:{timer.toString().padStart(2, "0")}
                  </Text>
                </Text>
              )}
            </View>

            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerify}
              activeOpacity={0.85}
              style={styles.verifyBtn}
              disabled={isLoading || isVerifying || !isComplete}
            >
              <LinearGradient
                colors={
                  isComplete && !isLoading && !isVerifying
                    ? ["#e83030", "#c01818"]
                    : ["#2a2a2a", "#1e1e1e"]
                }
                style={styles.verifyBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text
                  style={[
                    styles.verifyBtnText,
                    (!isComplete || isLoading || isVerifying) &&
                      styles.verifyBtnTextDim,
                  ]}
                >
                  {isVerifying
                    ? "Verifying..."
                    : isLoading
                      ? "Please wait..."
                      : "Verify & Continue"}
                </Text>
                {!isLoading && !isVerifying && (
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={isComplete ? "#fff" : "rgba(255,255,255,0.3)"}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Change Email */}
            <TouchableOpacity
              style={styles.changeRow}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.changeText}>
                Wrong email?{"  "}
                <Text style={styles.changeLink}>Change Email</Text>
              </Text>
            </TouchableOpacity>

            {/* Security Note */}
            <View style={styles.securityNote}>
              <Ionicons
                name="lock-closed"
                size={12}
                color="rgba(255,255,255,0.25)"
              />
              <Text style={styles.securityText}>
                Code expires in 10 minutes. Do not share it.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
  },
  glowTop: {
    position: "absolute",
    top: -80,
    alignSelf: "center",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(232,48,48,0.12)",
    shadowColor: "#e83030",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 20,
  },
  backBtn: {
    position: "absolute",
    top: 56,
    left: 20,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 28,
    paddingTop: 120,
  },
  iconWrapper: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  iconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(232,48,48,0.3)",
  },
  iconRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(232,48,48,0.15)",
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.45)",
    marginBottom: 4,
  },
  emailText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#e83030",
    marginBottom: 20,
  },
  attemptsText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 12,
  },
  attemptsWarning: {
    color: "#ff6b35",
  },
  errorText: {
    fontSize: 13,
    color: "#ff4444",
    marginBottom: 12,
    textAlign: "center",
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: (width - 56 - 50) / 6,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#1a1a1a",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.1)",
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  otpInputFilled: {
    backgroundColor: "#1f0808",
    borderColor: "#e83030",
  },
  otpInputError: {
    borderColor: "#ff4444",
  },
  timerRow: {
    marginBottom: 32,
    height: 24,
    justifyContent: "center",
  },
  timerText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  timerCount: {
    color: "#e83030",
    fontWeight: "700",
  },
  resendActive: {
    fontSize: 14,
    color: "#e83030",
    fontWeight: "700",
    textDecorationLine: "underline",
  },
  verifyBtn: {
    width: "100%",
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 18,
    elevation: 8,
    shadowColor: "#e03030",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  verifyBtnGradient: {
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  verifyBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  verifyBtnTextDim: {
    color: "rgba(255,255,255,0.35)",
  },
  changeRow: { marginBottom: 28 },
  changeText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  changeLink: {
    color: "#e83030",
    fontWeight: "700",
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  securityText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.25)",
  },
});
