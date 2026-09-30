// screens/DataUsageScreen.js  (guardian app)
import React, { useState, useEffect, useCallback } from "react";
import { Switch } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import OptionsScreenContainer, {
  OptionsScreenHeader,
  OptionsSection,
  OptionRow,
  OptionDivider,
} from "../components/DrawerOptionsScreen";

const STORAGE_KEY = "@guardian_data_usage_settings";

const DEFAULT_SETTINGS = {
  offlineMaps: false,
  backgroundLocationUpdates: true, // keep receiving bus location while app is backgrounded
  wifiOnlySync: false,
  reduceMapDataUsage: false,
};

export default function DataUsageScreen() {
  const { theme: T } = useTheme();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
        }
      } catch (err) {
        console.warn("Failed to load data usage settings:", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    setSettings(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (err) {
      console.warn("Failed to save data usage settings:", err);
    }
  }, []);

  const toggle = (field) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    persist({ ...settings, [field]: !settings[field] });
  };

  const switchProps = (field) => ({
    value: settings[field],
    onValueChange: () => toggle(field),
    trackColor: { false: "#767577", true: T.accent },
    thumbColor: settings[field] ? "#fff" : "#f4f3f4",
  });

  if (!loaded) return <OptionsScreenContainer />;

  return (
    <OptionsScreenContainer>
      <OptionsScreenHeader title="Data Usage" />

      <OptionsSection>
        <OptionRow
          icon="download-outline"
          label="Offline Maps"
          subtitle="Cache map tiles near your child's route"
          onPress={() => toggle("offlineMaps")}
          rightElement={<Switch {...switchProps("offlineMaps")} />}
        />
        <OptionDivider />
        <OptionRow
          icon="navigate-outline"
          label="Background Location Updates"
          subtitle="Keep tracking the bus when the app isn't open"
          onPress={() => toggle("backgroundLocationUpdates")}
          rightElement={
            <Switch {...switchProps("backgroundLocationUpdates")} />
          }
        />
        <OptionDivider />
        <OptionRow
          icon="wifi-outline"
          label="Wi-Fi Only Sync"
          subtitle="Only sync trip history over Wi-Fi"
          onPress={() => toggle("wifiOnlySync")}
          rightElement={<Switch {...switchProps("wifiOnlySync")} />}
        />
        <OptionDivider />
        <OptionRow
          icon="cellular-outline"
          label="Reduce Map Data Usage"
          subtitle="Lower-resolution tiles on mobile data"
          onPress={() => toggle("reduceMapDataUsage")}
          rightElement={<Switch {...switchProps("reduceMapDataUsage")} />}
        />
      </OptionsSection>
    </OptionsScreenContainer>
  );
}
