import React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { OnboardingProgress } from "@/components/onboarding/OnboardingProgress";
import { theme } from "@/constants/theme";

interface OnboardingLayoutProps {
  step: 1 | 2 | 3;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}

export function OnboardingLayout({
  step,
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Custom Built-in Header */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + theme.spacing.sm }]}>
        {/* <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.tankDark} />
          </View>
          <Text style={styles.brandTitle}>GigLedger</Text>
        </View> */}

        {/* Dynamic Context Title & Subtitle */}
        {/* <View style={styles.titleSection}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text> : null}
          <Text style={styles.headerTitle}>Let's get you started</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View> */}
      </View>

      <View style={styles.progressWrap}>
        <OnboardingProgress currentStep={step} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>

      <View style={styles.footer}>{footer}</View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  headerContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.surfaceSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing.sm,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  logoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.waterGreenLight,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  titleSection: {
    gap: 2,
    marginTop: theme.spacing.xs,
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow.fontSize,
    fontWeight: theme.typography.eyebrow.fontWeight,
    letterSpacing: theme.typography.eyebrow.letterSpacing,
    color: theme.colors.mutedSage.muted1,
  },
  headerTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.ink,
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted1,
  },
  progressWrap: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: theme.spacing.xxl,
  },
  footer: {
    padding: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.pageBg,
  },
});