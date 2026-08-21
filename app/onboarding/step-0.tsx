import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { OnboardingFooter } from "@/components/onboarding/OnboardingFooter";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { theme } from "@/constants/theme";
import { useOnboarding } from "@/context/OnboardingContext";

const SPLASH_DURATION = 2000;

// ---------- Splash ----------
function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.85)).current;
  const dot1 = useRef(new Animated.Value(0.2)).current;
  const dot2 = useRef(new Animated.Value(0.2)).current;
  const dot3 = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
    ]).start();

    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 450, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0.2, duration: 450, easing: Easing.ease, useNativeDriver: true }),
        ])
      );
    pulse(dot1, 0).start();
    pulse(dot2, 150).start();
    pulse(dot3, 300).start();

    const timer = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 400, useNativeDriver: true }).start(onFinish);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.splashRoot, { opacity: fade }]}>
      <LinearGradient
        colors={["#0f3d2e", "#1a5c42", "#2f8f5f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <Animated.View style={[styles.splashContent, { transform: [{ scale }] }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="receipt-outline" size={40} color="#0f3d2e" />
        </View>
        <Text style={styles.splashTitle}>GigLedger</Text>
        <Text style={styles.splashTagline}>Taxes, simplified.</Text>
      </Animated.View>
      <View style={styles.dotsRow}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </Animated.View>
  );
}

// ---------- Main screen ----------
export default function OnboardingStep0Screen() {
  const { isSubmittingStep0, step0Error, submitStep0 } = useOnboarding();

  const [showSplash, setShowSplash] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [taxRegime, setTaxRegime] = useState<"normal" | "presumptive">("normal");
  const [presumptiveScheme, setPresumptiveScheme] = useState<"44AD" | "44ADA" | null>(null);

  const formFade = useRef(new Animated.Value(0)).current;
  const formSlide = useRef(new Animated.Value(24)).current;
  const schemeFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showSplash) {
      Animated.parallel([
        Animated.timing(formFade, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(formSlide, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showSplash]);

  const handleTaxRegimeChange = (val: "normal" | "presumptive") => {
    setTaxRegime(val);
    if (val === "normal") {
      setPresumptiveScheme(null);
      schemeFade.setValue(0);
    } else {
      setPresumptiveScheme("44AD");
      Animated.timing(schemeFade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    }
  };

  const handleCreateUser = async () => {
    if (!name.trim() || !email.trim()) return;
    const success = await submitStep0(name.trim(), email.trim(), taxRegime, presumptiveScheme);
    if (success) {
      router.replace("/onboarding/step-1");
    }
  };

  const isFormValid =
    name.trim().length > 0 &&
    email.trim().length > 0 &&
    (taxRegime === "normal" || presumptiveScheme !== null);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <OnboardingLayout
      step={1}
      eyebrow=""
      title="Onboarding"
      subtitle=""
      footer={
        <OnboardingFooter
          ctaLabel="Create user"
          onPress={handleCreateUser}
          disabled={!isFormValid}
          loading={isSubmittingStep0}
          error={step0Error}
        />
      }
    >
      <Animated.View
        style={[
          styles.formContainer,
          { opacity: formFade, transform: [{ translateY: formSlide }] },
        ]}
      >
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Full Name</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.inputWithIcon}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Rahul Singh"
              placeholderTextColor={theme.colors.textMuted}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Email */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email Address</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              style={styles.inputWithIcon}
              value={email}
              onChangeText={setEmail}
              placeholder="e.g. rahulsingh@gmail.com"
              placeholderTextColor={theme.colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        {/* Tax Regime */}
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Tax Regime</Text>
          <View style={styles.toggleRow}>
            <ToggleCard
              active={taxRegime === "normal"}
              icon="document-text-outline"
              title="Normal"
              onPress={() => handleTaxRegimeChange("normal")}
            />
            <ToggleCard
              active={taxRegime === "presumptive"}
              icon="sparkles-outline"
              title="Presumptive"
              onPress={() => handleTaxRegimeChange("presumptive")}
            />
          </View>
        </View>

        {/* Presumptive Scheme (Conditional) */}
        {taxRegime === "presumptive" && (
          <Animated.View style={[styles.fieldGroup, { opacity: schemeFade }]}>
            <Text style={styles.label}>Presumptive Scheme</Text>
            <View style={styles.toggleRow}>
              <ToggleCard
                active={presumptiveScheme === "44AD"}
                icon="storefront-outline"
                title="Section 44AD"
                subtitle="Business income"
                onPress={() => setPresumptiveScheme("44AD")}
              />
              <ToggleCard
                active={presumptiveScheme === "44ADA"}
                icon="briefcase-outline"
                title="Section 44ADA"
                subtitle="Professional income"
                onPress={() => setPresumptiveScheme("44ADA")}
              />
            </View>
          </Animated.View>
        )}
      </Animated.View>
    </OnboardingLayout>
  );
}

// ---------- Reusable toggle card ----------
function ToggleCard({
  active,
  icon,
  title,
  subtitle,
  onPress,
}: {
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scale, { toValue: 0.96, useNativeDriver: true, speed: 40 }).start();
  const onPressOut = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start();

  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.toggleOption, active && styles.toggleOptionActive]}
      >
        {active && (
          <View style={styles.checkBadge}>
            <Ionicons name="checkmark" size={11} color="#fff" />
          </View>
        )}
        <View style={[styles.toggleIconWrap, active && styles.toggleIconWrapActive]}>
          <Ionicons
            name={icon}
            size={18}
            color={active ? theme.colors.brandGreen : theme.colors.textMuted}
          />
        </View>
        <Text style={[styles.toggleText, active && styles.toggleTextActive]}>{title}</Text>
        {subtitle && <Text style={styles.toggleSubtext}>{subtitle}</Text>}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  // Splash
  splashRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  splashContent: {
    alignItems: "center",
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#e8f5ee",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  splashTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
  },
  splashTagline: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginTop: 6,
  },
  dotsRow: {
    position: "absolute",
    bottom: 64,
    flexDirection: "row",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },

  // Form
  formContainer: {
    gap: theme.spacing.md,
    marginTop: theme.spacing.xxs,
  },
  fieldGroup: {
    gap: 6,
  },
  label: {
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
    color: theme.colors.ink,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
  },
  inputWithIcon: {
    flex: 1,
    paddingVertical: 14,
    fontSize: theme.fontSize.md,
    color: theme.colors.ink,
  },
  toggleRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  toggleOption: {
    paddingVertical: 16,
    paddingHorizontal: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  toggleOptionActive: {
    borderColor: theme.colors.brandGreen,
    backgroundColor: "#f4f9f6",
    shadowColor: theme.colors.brandGreen,
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  toggleIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f1f1f1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  toggleIconWrapActive: {
    backgroundColor: "#e2f2e9",
  },
  checkBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.brandGreen,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.textMuted,
  },
  toggleTextActive: {
    color: theme.colors.ink,
    fontWeight: "700",
  },
  toggleSubtext: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSubtle,
    marginTop: 2,
  },
});