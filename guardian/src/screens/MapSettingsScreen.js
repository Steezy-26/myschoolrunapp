// screens/MapSettingsScreen.js  (guardian app)
import React, { useState, useEffect, useCallback } from "react";
import { Text } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useTheme } from "../contexts/ThemeContext";
import OptionsScreenContainer, {
  OptionsScreenHeader,
  OptionsSection,
  OptionRow,
  OptionDivider,
} from "../components/DrawerOptionsScreen";

const STORAGE_KEY = "@guardian_map_settings";

const DEFAULT_SETTINGS = {
  mapStyle: "standard", // "standard" | "satellite" | "hybrid"
  units: "km", // "km" | "mi"
  showTraffic: true,
  keepMapCentered: true, // auto-follow the bus as it moves
};

const MAP_STYLES = [
  { key: "standard", label: "Standard" },
  { key: "satellite", label: "Satellite" },
  { key: "hybrid", label: "Hybrid" },
];

const UNITS = [
  { key: "km", label: "Kilometers" },
  { key: "mi", label: "Miles" },
];

export default function MapSettingsScreen() {
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
        console.warn("Failed to load map settings:", err);
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
      console.warn("Failed to save map settings:", err);
    }
  }, []);

  const updateField = (field, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    persist({ ...settings, [field]: value });
  };

  const cycleValue = (field, options) => {
    const currentIndex = options.findIndex((o) => o.key === settings[field]);
    const next = options[(currentIndex + 1) % options.length];
    updateField(field, next.key);
  };

  const labelFor = (field, options) =>
    options.find((o) => o.key === settings[field])?.label ?? "";

  if (!loaded) return <OptionsScreenContainer />;

  return (
    <OptionsScreenContainer>
      <OptionsScreenHeader title="Map Preferences" />

      <OptionsSection>
        <OptionRow
          icon="layers-outline"
          label="Map Style"
          subtitle="How the tracking map is rendered"
          onPress={() => cycleValue("mapStyle", MAP_STYLES)}
          rightElement={
            <Text style={{ fontSize: 13, color: T.textMuted }}>
              {labelFor("mapStyle", MAP_STYLES)}
            </Text>
          }
        />
        <OptionDivider />
        <OptionRow
          icon="speedometer-outline"
          label="Distance Units"
          subtitle="Used for ETAs and stop distances"
          onPress={() => cycleValue("units", UNITS)}
          rightElement={
            <Text style={{ fontSize: 13, color: T.textMuted }}>
              {labelFor("units", UNITS)}
            </Text>
          }
        />
        <OptionDivider />
        <OptionRow
          icon="car-outline"
          label="Show Traffic"
          subtitle="Display live traffic on the map"
          onPress={() => updateField("showTraffic", !settings.showTraffic)}
          rightElement={
            <Text style={{ fontSize: 13, color: T.textMuted }}>
              {settings.showTraffic ? "On" : "Off"}
            </Text>
          }
        />
        <OptionDivider />
        <OptionRow
          icon="locate-outline"
          label="Auto-Follow Bus"
          subtitle="Keep the map centered on the bus while tracking"
          onPress={() =>
            updateField("keepMapCentered", !settings.keepMapCentered)
          }
          rightElement={
            <Text style={{ fontSize: 13, color: T.textMuted }}>
              {settings.keepMapCentered ? "On" : "Off"}
            </Text>
          }
        />
      </OptionsSection>
    </OptionsScreenContainer>
  );
}
