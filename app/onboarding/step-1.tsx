import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { BankSelector } from "@/components/onboarding/BankSelector";
import { theme } from "@/constants/theme";
import { useOnboarding } from "@/context/OnboardingContext";

export default function OnboardingStep1Screen() {
  const { selectedBank, setSelectedBank, isSubmittingStep1, step1Error, submitStep1 } =
    useOnboarding();

  const handleContinue = async () => {
    const success = await submitStep1();
    if (success) {
      router.replace("/onboarding/step-2");
    }
  };

  return (
    <OnboardingLayout
      step={2}
      eyebrow="Link your bank"
      title="Onboarding"
      subtitle="Connect your bank so we can track income and expenses automatically."
      footer={
        <OnboardingFooter
          ctaLabel="Continue"
          onPress={handleContinue}
          disabled={!selectedBank}
          loading={isSubmittingStep1}
          error={step1Error}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.headline}>Link your bank</Text>
        <Text style={styles.subtext}>
          Choose the bank your gig income lands in. This lets us surface your real cash flow.
        </Text>
      </View>

      <BankSelector selectedBank={selectedBank} onSelect={setSelectedBank} />
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
