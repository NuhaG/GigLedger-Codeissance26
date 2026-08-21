import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { OnboardingProvider, useOnboarding } from "@/context/OnboardingContext";

/**
 * There's no auth system, so "gating" is just a redirect based on the
 * locally-persisted onboarding state:
 * - not completed  -> force into /onboarding/step-1 or step-2 (resume point)
 * - completed       -> keep the person out of /onboarding entirely
 */
function NavigationGate() {
  const { state, isReady } = useOnboarding();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isReady) return;
    const inOnboarding = segments[0] === "onboarding";

    if (!state.onboardingCompleted) {
      const currentStepPath = `/onboarding/step-${state.currentStep}`;
      const currentRoute = "/" + segments.join("/");
      if (currentRoute !== currentStepPath) {
        router.replace(currentStepPath as any);
      }
      return;
    }

    if (state.onboardingCompleted && inOnboarding) {
      router.replace("/(tabs)");
    }
  }, [isReady, state.onboardingCompleted, state.currentStep, segments, router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.colors.pageBg }}>
      <SafeAreaProvider>
        <OnboardingProvider>
          <StatusBar style="dark" />
          <NavigationGate />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: theme.colors.pageBg },
            }}
          >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="onboarding" />
          </Stack>
        </OnboardingProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
