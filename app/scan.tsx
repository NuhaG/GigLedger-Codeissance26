/**
 * app/(tabs)/scan.tsx
 * -------------------
 * Scan tab: capture/pick a receipt image → Gemini OCR → review/edit → classify.
 */

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, ImageIcon, PenLine, ScanLine } from "lucide-react-native";

import { Header } from "@/components/Header";
import { ReceiptEditForm } from "@/components/ReceiptEditForm";
import { theme } from "@/constants/theme";
import { extractReceiptData } from "@/lib/api/geminiOcr";
import { supabase } from "@/lib/supabase";
import { ReceiptData } from "@/types/receipt";

type ScanStep = "pick" | "processing" | "review";

const MOCK_USER_ID = "97fc9b68-f8b6-497f-8dc4-a6829af235f7";

const EMPTY_RECEIPT: ReceiptData = {
  amount: 0,
  transaction_type: "EXPENSE",
  date: new Date().toISOString().split("T")[0],
  vendor: "",
  timestamp: null,
  description: "",
  source_type: "MANUAL",
};

export default function ScanScreen() {
  const router = useRouter();
  const [step, setStep] = useState<ScanStep>("pick");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ReceiptData>(EMPTY_RECEIPT);
  const [ocrError, setOcrError] = useState<string | null>(null);

  const resetFlow = () => {
    setStep("pick");
    setImageUri(null);
    setReceiptData(EMPTY_RECEIPT);
    setOcrError(null);
  };

  const handleBack = () => {
    if (step !== "pick") {
      resetFlow();
    } else if (router.canGoBack()) {
      router.back();
    }
  };

  const processImage = async (uri: string, base64: string, mimeType: string) => {
    setImageUri(uri);
    setStep("processing");
    setOcrError(null);

    try {
      const data = await extractReceiptData(base64, mimeType);
      setReceiptData({ ...data, transaction_type: "EXPENSE" });
      setStep("review");
    } catch (err: any) {
      console.warn("OCR failed:", err.message);
      setOcrError(err.message);

      const fallbackPayload: ReceiptData = {
        ...EMPTY_RECEIPT,
        source_type: "RECEIPT_OCR",
        transaction_type: "EXPENSE",
      };

      setReceiptData(fallbackPayload);

      try {
        const { error: dbError } = await supabase.from("pending_actions").insert([
          {
            user_id: MOCK_USER_ID,
            agent_name: "ClassificationAgent",
            action_type: "CLASSIFY_TRANSACTION",
            proposed_payload: JSON.stringify(fallbackPayload),
            agent_reasoning: `OCR Extraction Failed: ${err.message}. Low clarity or missing details.`,
            status: "PENDING",
          },
        ]);

        if (dbError) {
          console.error("Failed to insert pending action:", dbError.message);
        }
      } catch (dbErr) {
        console.error("Database connection error:", dbErr);
      }

      setStep("review");
    }
  };

  const pickFromCamera = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Camera permission is required to take a photo.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mime = asset.mimeType || "image/jpeg";
      await processImage(asset.uri, asset.base64!, mime);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Required", "Gallery permission is required to choose a photo.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.8,
      allowsEditing: false,
      mediaTypes: ["images"],
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mime = asset.mimeType || "image/jpeg";
      await processImage(asset.uri, asset.base64!, mime);
    }
  };

  const enterManually = () => {
    setReceiptData({ ...EMPTY_RECEIPT, source_type: "MANUAL", transaction_type: "EXPENSE" });
    setStep("review");
  };

  const renderTopBar = () => (
    <View style={styles.topBar}>
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.backButton, pressed && styles.buttonPressed]}
        hitSlop={8}
      >
        <ArrowLeft color={theme.colors.ink} size={22} />
        <Text style={styles.backText}>Back</Text>
      </Pressable>
    </View>
  );

  if (step === "pick") {
    return (
      <View style={styles.container}>
        <Header eyebrow="Scan" title="Scan Receipt" />


        <View style={styles.pickContent}>
          <View style={styles.iconCircle}>
            <ScanLine color={theme.colors.primary} size={40} />
          </View>
          <Text style={styles.pickTitle}>Scan a Receipt</Text>
          <Text style={styles.pickSubtitle}>
            Take a photo or choose from your gallery.{"\n"}AI will extract the
            details automatically.
          </Text>

          <View style={styles.buttonGroup}>
            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={pickFromCamera}
            >
              <Camera color="#fff" size={20} />
              <Text style={styles.primaryButtonText}>Take Photo</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.outlineButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={pickFromGallery}
            >
              <ImageIcon color={theme.colors.primary} size={20} />
              <Text style={styles.outlineButtonText}>Choose from Gallery</Text>
            </Pressable>
          </View>

          <Pressable style={styles.manualLink} onPress={enterManually}>
            <PenLine color={theme.colors.textMuted} size={16} />
            <Text style={styles.manualLinkText}>Enter Manually</Text>
          </Pressable>

          {renderTopBar()}
        </View>
      </View>
    );
  }

  if (step === "processing") {
    return (
      <View style={styles.container}>
        <Header eyebrow="Scan" title="Scan Receipt" />
        {renderTopBar()}

        <View style={styles.processingContent}>
          {imageUri && (
            <Image source={{ uri: imageUri }} style={styles.previewImage} />
          )}
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.processingText}>
              Analyzing receipt with AI...
            </Text>
            <Text style={styles.processingSubtext}>
              This usually takes a few seconds.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header eyebrow="Scan" title="Scan Receipt" />
      {renderTopBar()}

      {ocrError && (
        <View style={styles.ocrWarning}>
          <Text style={styles.ocrWarningText}>
            ⚠️ AI extraction failed: {ocrError}{"\n"}A pending review action has been added to your queue.
          </Text>
        </View>
      )}
      {imageUri && (
        <Image source={{ uri: imageUri }} style={styles.reviewImage} />
      )}
      <ReceiptEditForm
        userId={MOCK_USER_ID}
        initialData={receiptData}
        onReset={resetFlow}
        onSuccess={() => { }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  topBar: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xs,
    backgroundColor: theme.colors.pageBg,
  },
  backButton: {
    marginTop: 80,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: theme.spacing.xs,
    paddingRight: theme.spacing.sm,
  },
  backText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.ink,
  },
  pickContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.colors.surfaceSubtle,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  pickTitle: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
    marginBottom: theme.spacing.xs,
  },
  pickSubtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: theme.spacing.xl,
  },
  buttonGroup: {
    width: "100%",
    gap: theme.spacing.sm,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    borderRadius: theme.radius.md,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
  },
  outlineButtonText: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  manualLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  manualLinkText: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  processingContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.xl,
  },
  previewImage: {
    width: 200,
    height: 260,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.lg,
    opacity: 0.7,
  },
  processingOverlay: {
    alignItems: "center",
    gap: theme.spacing.sm,
  },
  processingText: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.ink,
    marginTop: theme.spacing.sm,
  },
  processingSubtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textMuted,
  },
  ocrWarning: {
    backgroundColor: "#FFFBEB",
    padding: theme.spacing.sm,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  ocrWarningText: {
    fontSize: theme.fontSize.sm,
    color: "#92400E",
    lineHeight: 20,
  },
  reviewImage: {
    width: "100%",
    height: 150,
    resizeMode: "contain",
    marginVertical: theme.spacing.sm,
    opacity: 0.8,
  },
});