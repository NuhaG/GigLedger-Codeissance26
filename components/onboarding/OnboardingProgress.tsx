import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "@/constants/theme";

interface OnboardingProgressProps {
  currentStep: number; // e.g. 1, 2, or 3
  totalSteps?: number; // default to 3
}

export function OnboardingProgress({ currentStep, totalSteps = 3 }: OnboardingProgressProps) {
  const pad = (n: number) => String(n).padStart(2, "0");

  // Ensure fill percentage calculates safely based on 1-based indexing
  const fillPct = Math.min(Math.max((currentStep / totalSteps) * 100, 0), 100);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.stepLabel}>
          STEP {pad(currentStep)} OF {pad(totalSteps)}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${fillPct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.xs,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stepLabel: {
    fontFamily: theme.typography.fontMono,
    fontSize: theme.typography.eyebrow.fontSize,
    fontWeight: theme.typography.fontWeights.black,
    letterSpacing: theme.typography.eyebrow.letterSpacing,
    color: theme.colors.onboarding.progress.stepActive,
  },
  track: {
    height: 8, // Made thicker for better visual hierarchy
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.onboarding.progress.track,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.onboarding.progress.fill,
  },
});