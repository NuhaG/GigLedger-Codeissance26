import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@/constants/theme";

interface OnboardingFooterProps {
  ctaLabel: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
}

export function OnboardingFooter({
  ctaLabel,
  onPress,
  disabled = false,
  loading = false,
  error,
}: OnboardingFooterProps) {
  const isFinishSetup = ctaLabel === "Finish setup";

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{error}</Text>}

      {/* Dynamic Sub-label when loading "Finish setup" */}
      {loading && isFinishSetup && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={theme.colors.onboarding.cta.background} />
          <Text style={styles.loadingText}>Fetching your transactions...</Text>
        </View>
      )}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (disabled || loading) && styles.buttonDisabled,
          pressed && !disabled && !loading && styles.buttonPressed,
        ]}
        onPress={onPress}
        disabled={disabled || loading}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || loading, busy: loading }}
      >
        {loading && !isFinishSetup ? (
          <ActivityIndicator color={theme.colors.onboarding.cta.text} />
        ) : (
          <Text style={[styles.buttonText, (disabled || loading) && styles.buttonTextDisabled]}>
            {ctaLabel}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: theme.spacing.sm,
  },
  errorText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.onboarding.feedback.errorText,
    textAlign: "center",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  loadingText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.mutedSage.muted1,
  },
  button: {
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.onboarding.cta.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.lg,
  },
  buttonDisabled: {
    backgroundColor: theme.colors.onboarding.cta.backgroundDisabled,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.onboarding.cta.text,
  },
  buttonTextDisabled: {
    color: theme.colors.onboarding.cta.textDisabled,
  },
});