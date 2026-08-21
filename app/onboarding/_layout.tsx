import { Stack } from "expo-router";

import { theme } from "@/constants/theme";

export default function OnboardingLayoutRoute() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: theme.colors.pageBg },
      }}
    >
        
      <Stack.Screen name="step-0" />
      <Stack.Screen name="step-1" />
      <Stack.Screen name="step-2" />
    </Stack>
  );
}
