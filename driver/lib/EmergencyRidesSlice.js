import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../utils/axiosInstance";

const initialState = {
  incomingRequests: [],
  currentRide: null,
  completedRides: [],
  myService: null,
  ratings: [],
  ratingSummary: { averageRating: 0, totalRatings: 0 },
  isLoading: false,
  isSubmitting: false,
  error: null,
  success: null,
};

export const fetchIncomingEmergencyRides = createAsyncThunk(
  "emergencyRides/fetchIncoming",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/emergency-rides/driver/incoming");
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch incoming emergency requests",
      );
    }
  },
);

export const acceptEmergencyRide = createAsyncThunk(
  "emergencyRides/accept",
  async (rideId, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/accept`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to accept emergency ride",
      );
    }
  },
);

export const rejectEmergencyRide = createAsyncThunk(
  "emergencyRides/reject",
  async ({ rideId, rejectionReason }, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/reject`, {
        rejectionReason,
      });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to reject emergency ride",
      );
    }
  },
);

export const markDriverArriving = createAsyncThunk(
  "emergencyRides/markArriving",
  async (rideId, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/arriving`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to mark arriving",
      );
    }
  },
);

export const markStudentPickedUp = createAsyncThunk(
  "emergencyRides/markPickedUp",
  async (rideId, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/pickup`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to mark student picked up",
      );
    }
  },
);

export const startEmergencyTrip = createAsyncThunk(
  "emergencyRides/startTrip",
  async (rideId, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/start`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to start emergency trip",
      );
    }
  },
);

export const completeEmergencyTrip = createAsyncThunk(
  "emergencyRides/completeTrip",
  async (rideId, thunkAPI) => {
    try {
      const response = await api.post(`/emergency-rides/${rideId}/complete`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to complete emergency trip",
      );
    }
  },
);

export const fetchDriverServices = createAsyncThunk(
  "emergencyRides/fetchServices",
  async (_, thunkAPI) => {
    try {
      const response = await api.get("/driver-services/my-services");
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch driver services",
      );
    }
  },
);

export const saveDriverService = createAsyncThunk(
  "emergencyRides/saveService",
  async (serviceData, thunkAPI) => {
    try {
      const response = await api.post("/driver-services", serviceData);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to save driver service configuration",
      );
    }
  },
);

export const fetchDriverRatings = createAsyncThunk(
  "emergencyRides/fetchRatings",
  async (driverId, thunkAPI) => {
    try {
      const response = await api.get(`/ratings/driver/${driverId}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || "Failed to fetch driver ratings",
      );
    }
  },
);

const emergencyRidesSlice = createSlice({
  name: "emergencyRides",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearSuccess: (state) => {
      state.success = null;
    },
    setCurrentRide: (state, action) => {
      state.currentRide = action.payload;
    },
    addIncomingRequest: (state, action) => {
      const exists = state.incomingRequests.some((r) => r.id === action.payload.id);
      if (!exists) {
        state.incomingRequests.unshift(action.payload);
      }
    },
    removeIncomingRequest: (state, action) => {
      state.incomingRequests = state.incomingRequests.filter(
        (r) => r.id !== action.payload,
      );
    },
    updateRideStatus: (state, action) => {
      if (state.currentRide && state.currentRide.id === action.payload.id) {
        state.currentRide = action.payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // fetchIncomingEmergencyRides
      .addCase(fetchIncomingEmergencyRides.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchIncomingEmergencyRides.fulfilled, (state, action) => {
        state.isLoading = false;
        state.incomingRequests = Array.isArray(action.payload)
          ? action.payload
          : action.payload.requests || [];
      })
      .addCase(fetchIncomingEmergencyRides.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // acceptEmergencyRide
      .addCase(acceptEmergencyRide.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(acceptEmergencyRide.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.currentRide = action.payload;
        state.incomingRequests = state.incomingRequests.filter(
          (r) => r.id !== action.payload.id,
        );
        state.success = "Emergency ride accepted!";
      })
      .addCase(acceptEmergencyRide.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })
      // rejectEmergencyRide
      .addCase(rejectEmergencyRide.pending, (state) => {
        state.isSubmitting = true;
        state.error = null;
      })
      .addCase(rejectEmergencyRide.fulfilled, (state, action) => {
        state.isSubmitting = false;
        state.incomingRequests = state.incomingRequests.filter(
          (r) => r.id !== action.payload.id,
        );
        if (state.currentRide?.id === action.payload.id) {
          state.currentRide = null;
        }
        state.success = "Emergency ride rejected";
      })
      .addCase(rejectEmergencyRide.rejected, (state, action) => {
        state.isSubmitting = false;
        state.error = action.payload;
      })
      // markDriverArriving
      .addCase(markDriverArriving.fulfilled, (state, action) => {
        state.currentRide = action.payload;
      })
      // markStudentPickedUp
      .addCase(markStudentPickedUp.fulfilled, (state, action) => {
        state.currentRide = action.payload;
      })
      // startEmergencyTrip
      .addCase(startEmergencyTrip.fulfilled, (state, action) => {
        state.currentRide = action.payload;
      })
      // completeEmergencyTrip
      .addCase(completeEmergencyTrip.fulfilled, (state, action) => {
        state.currentRide = null;
        state.completedRides.unshift(action.payload);
        state.success = "Emergency ride completed!";
      })
      // fetchDriverServices
      .addCase(fetchDriverServices.fulfilled, (state, action) => {
        state.myService = Array.isArray(action.payload)
          ? action.payload[0]
          : action.payload;
      })
      // saveDriverService
      .addCase(saveDriverService.fulfilled, (state, action) => {
        state.myService = action.payload;
        state.success = "Service configuration saved!";
      })
      // fetchDriverRatings
      .addCase(fetchDriverRatings.fulfilled, (state, action) => {
        state.ratings = action.payload.ratings || [];
      });
  },
});

export const {
  clearError,
  clearSuccess,
  setCurrentRide,
  addIncomingRequest,
  removeIncomingRequest,
  updateRideStatus,
} = emergencyRidesSlice.actions;

export default emergencyRidesSlice.reducer;
