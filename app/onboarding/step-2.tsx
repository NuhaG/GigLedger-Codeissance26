import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { PlatformSelector } from "@/components/onboarding/PlatformSelector";
import { theme } from "@/constants/theme";
import { useOnboarding } from "@/context/OnboardingContext";

export default function OnboardingStep2Screen() {
  const { selectedPlatforms, togglePlatform, isSubmittingStep2, step2Error, submitStep2 } =
    useOnboarding();

  const handleFinish = async () => {
    const success = await submitStep2();
    if (success) {
      router.replace("/(tabs)");
    }
  };

  return (
    <OnboardingLayout
      step={3}
      eyebrow="Almost there"
      title="Onboarding"
      subtitle="Tell us which gig platforms you work with."
      footer={
        <OnboardingFooter
          ctaLabel="Finish setup"
          onPress={handleFinish}
          disabled={selectedPlatforms.length === 0}
          loading={isSubmittingStep2}
          error={step2Error}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.headline}>Your platforms</Text>
        <Text style={styles.subtext}>
          Pick every platform you earn from. You can select more than one - we'll pull in payout
          data for each.
        </Text>
      </View>

      <PlatformSelector selectedPlatforms={selectedPlatforms} onToggle={togglePlatform} />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  intro: {
    gap: theme.spacing.xxs,
    marginBottom: theme.spacing.xs,
  },
  headline: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.ink,
    letterSpacing: -0.5,
  },
  subtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted1,
    lineHeight: 20,
  },
});
