import { configureStore, combineReducers } from "@reduxjs/toolkit";
import authReducer from "../lib/AuthSlice";
import userReducer from "../lib/UserSlice";
import vehicleRoutesReducer from "../lib/VehicleRoutesSlice";
import vehicleReducer from "../lib/VehicleSlice";
import vehicleTrackingReducer from "../lib/VehicleTrackingSlice";
import messagesReducer from "../lib/MessagesSlice";
import guardianRequestReducer from "../lib/GuardianRequestsSlice";
import notificationsReducer from "../lib/NotificationsSlice";
import emergencyRidesReducer from "../lib/EmergencyRidesSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  users: userReducer,
  vehicleroutes: vehicleRoutesReducer,
  vehicles: vehicleReducer,
  vehicletracking: vehicleTrackingReducer,
  messages: messagesReducer,
  guardianRequests: guardianRequestReducer,
  notifications: notificationsReducer,
  emergencyRides: emergencyRidesReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
