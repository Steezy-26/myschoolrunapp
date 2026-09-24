import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api, { resetLoggingOut } from "../utils/axiosInstance";

const initialState = {
  user: null,
  error: null,
  driverProfile: null,
  success: null,
  vehicle: null,
  route: null,
  assignment: null,
  verificationOTP: null,
  hasSelectedRoute: false,
  isLoading: false,
  isAuthenticated: false,
  isInitialized: false,
};

export const LoginUser = createAsyncThunk(
  "auth/LoginUser",
  async (credentials, thunkAPI) => {
    try {
      const response = await api.post("/auth/login", credentials);
      const userData = response.data.user;

      return userData;
    } catch (error) {
      if (error.response?.status === 423) {
        return thunkAPI.rejectWithValue(error.response.data.message);
      }
      if (error.response?.status === 429) {
        return thunkAPI.rejectWithValue(error.response.data.message);
      }
      return thunkAPI.rejectWithValue(
        error.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    }
  },
);

export const LogoutUser = createAsyncThunk(
  "auth/LogoutUser",
  async (_, thunkAPI) => {
    try {
      await api.post("/auth/logout", {});
      return true;
    } catch (error) {
      return true;
    } finally {
      setTimeout(() => {
        resetLoggingOut();
      }, 100);
    }
  },
);

export const SignupUser = createAsyncThunk(
  "auth/SignupUser",
  async (data, thunkAPI) => {
    try {
      if (data.password !== data.confirmPassword) {
        return thunkAPI.rejectWithValue("Passwords do not match");
      }
      const response = await api.post("/auth/signup", data);
      return response.data.user;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to sign up",
      );
    }
  },
);

export const forgotPassword = createAsyncThunk(
  "auth/forgot-password",
  async (data, thunkAPI) => {
    try {
      const response = await api.post("/auth/forgot-password", data);
      return response.data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to send reset email",
      );
    }
  },
);

export const validateResetToken = createAsyncThunk(
  "auth/validateResetToken",
  async ({ token, email }, thunkAPI) => {
    try {
      const response = await api.get(
        `/auth/validate-reset-token?token=${token}&email=${encodeURIComponent(email)}`,
      );

      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Invalid or expired token",
      );
    }
  },
);

export const resetPassword = createAsyncThunk(
  "auth/resetPassword",
  async (data, thunkAPI) => {
    try {
      if (data.newPassword !== data.confirmPassword) {
        return thunkAPI.rejectWithValue("Passwords do not match");
      }
      const response = await api.post("/auth/reset-password", {
        token: data.token,
        email: data.email,
        newPassword: data.newPassword,
      });
      return response.data.message;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to reset password",
      );
    }
  },
);

export const changePassword = createAsyncThunk(
  "auth/changePassword",
  async (passwords, thunkAPI) => {
    try {
      const response = await api.patch("/auth/change-password", passwords);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to change password",
      );
    }
  },
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/auth/me");

      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        return thunkAPI.rejectWithValue("");
      }
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch user data",
      );
    }
  },
);

export const updateHasSelectedRoute = createAsyncThunk(
  "auth/updateHasSelectedRoute",
  async (hasSelectedRoute) => {
    // No longer persisted to AsyncStorage on purpose — hasSelectedRoute is
    // meant to be a per-session choice, not something that survives an app
    // restart or a fresh login (routes/schedules can differ day to day).
    // App.js explicitly resets this to false on every boot; see there.
    return hasSelectedRoute;
  },
);

export const sendVerificationOTP = createAsyncThunk(
  "auth/sendVerificationOTP",
  async (email, thunkAPI) => {
    try {
      const response = await api.post("/auth/send-verification-otp", { email });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to send verification OTP",
      );
    }
  },
);

export const resendVerificationOTP = createAsyncThunk(
  "auth/resendVerificationOTP",
  async (email, thunkAPI) => {
    try {
      const response = await api.post("/auth/resend-verification-otp", email);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      return thunkAPI.rejectWithValue({
        message: errorData.message || "Failed to resend verification OTP",
        status: error.response?.status,
        remainingAttempts: errorData.remainingAttempts,
        data: errorData,
      });
    }
  },
);

export const verifyEmailVerification = createAsyncThunk(
  "auth/verifyEmailVerification",
  async ({ email, otp }, thunkAPI) => {
    try {
      const response = await api.post("/auth/verify-email-otp", { email, otp });
      return response.data.user;
    } catch (error) {
      // Extract complete error details for better handling
      const errorData = error.response?.data || {};
      return thunkAPI.rejectWithValue({
        message: errorData.message || "Failed to verify email",
        status: error.response?.status,
        remainingAttempts: errorData.remainingAttempts,
        isLocked: errorData.isLocked,
        lockUntil: errorData.lockUntil,
        data: errorData,
      });
    }
  },
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.error = null;
      state.isLoading = false;
    },
    setVehicle: (state, action) => {
      state.vehicle = action.payload;
    },
    setRoute: (state, action) => {
      state.route = action.payload;
    },
    setAssignment: (state, action) => {
      state.assignment = action.payload;
    },

    setHasSelectedRoute: (state, action) => {
      state.hasSelectedRoute = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
    },
    clearAuthState: () => {
      return { ...initialState };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(LoginUser.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(LoginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = !!action.payload.isVerified;
        state.error = null;
        state.hasSelectedRoute = false;
      })
      .addCase(LoginUser.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
        state.hasSelectedRoute = false;
      });

    builder
      .addCase(getCurrentUser.pending, (state) => {
        if (!state.user) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isInitialized = true;
        state.error = null;
        state.hasSelectedRoute = false;
      })
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.isLoading = false;
        // Only clear auth on actual 401, not on empty string (which you send for 401)
        if (action.payload === "" || action.payload === "Session expired") {
          state.user = null;
          state.isAuthenticated = false;
        }
        state.isInitialized = true;
        state.error = null;
      });

    builder
      .addCase(LogoutUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(LogoutUser.fulfilled, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
        state.hasSelectedRoute = false;
      })
      .addCase(LogoutUser.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;
        state.error = null;
      });

    builder
      .addCase(SignupUser.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(SignupUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(SignupUser.rejected, (state, action) => {
        state.error = action.payload;
        state.isLoading = false;
      });

    builder
      .addCase(sendVerificationOTP.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendVerificationOTP.fulfilled, (state, action) => {
        state.verificationOTP = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(sendVerificationOTP.rejected, (state, action) => {
        state.error = action.payload;
        state.isLoading = false;
      });

    builder
      .addCase(resendVerificationOTP.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resendVerificationOTP.fulfilled, (state, action) => {
        state.verificationOTP = action.payload;
        state.isLoading = false;
        state.error = null;
      })
      .addCase(resendVerificationOTP.rejected, (state, action) => {
        state.error = action.payload;
        state.isLoading = false;
      });

    builder
      .addCase(verifyEmailVerification.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyEmailVerification.fulfilled, (state, action) => {
        // FIX: previously only set state.verificationOTP = action.payload
        // and never set isAuthenticated. OTPVerificationScreen.js's own
        // comment says it relies entirely on App.js's state-driven
        // navigator to advance past the OTP screen once isAuthenticated
        // flips true — with that never actually happening here, the app
        // silently stayed on the OTP screen after a successful
        // verification, which read as "signup never navigates anywhere."
        // action.payload is the verified user object (see this thunk's
        // definition: `return response.data.user`), so it belongs in
        // state.user, matching the LoginUser.fulfilled pattern above —
        // not in state.verificationOTP, which should stay reserved for
        // sendVerificationOTP/resendVerificationOTP's responses.
        state.user = action.payload;
        state.isAuthenticated = true;
        state.isLoading = false;
        state.error = null;
        state.hasSelectedRoute = false;
      })
      .addCase(verifyEmailVerification.rejected, (state, action) => {
        state.error = action.payload;
        state.isLoading = false;
      });

    builder
      .addCase(forgotPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(validateResetToken.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(validateResetToken.fulfilled, (state) => {
        state.isLoading = false;
        state.error = null;
      })
      .addCase(validateResetToken.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    // Reset Password
    builder
      .addCase(resetPassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(changePassword.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.isLoading = false;
        state.success = action.payload;
        state.error = null;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });

    builder
      .addCase(updateHasSelectedRoute.fulfilled, (state, action) => {
        state.hasSelectedRoute = action.payload;
      })
      .addCase(updateHasSelectedRoute.rejected, (state, action) => {
        state.hasSelectedRoute = action.payload;
      });
  },
});

export const {
  reset,
  logout,
  clearAuthState,
  setVehicle,
  setRoute,
  setAssignment,
  setHasSelectedRoute,
} = authSlice.actions;
export default authSlice.reducer;
