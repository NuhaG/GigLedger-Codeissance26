import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
} from "react-native";

const N8N_WEBHOOK_URL =
  "https://shaurya2208.app.n8n.cloud/webhook/generate-itr-report";

const MOCK_USER_ID = "97fc9b68-f8b6-497f-8dc4-a6829af235f7";

export default function GenerateITR() {
  const [generating, setGenerating] = useState(false);

  const generateITRReport = async () => {
    if (generating) return;

    try {
      setGenerating(true);

      console.log("Requesting ITR-3 report...");

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: MOCK_USER_ID,
          financial_year: "2025-26",
          assessment_year: "2026-27",
        }),
      });

      const result = await response.json();

      console.log("n8n response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
          result.message ||
          `Failed to generate ITR report (${response.status})`
        );
      }

      Alert.alert(
        "ITR Report Generated",
        `Your ITR-3 report has been generated and sent to ${result.email}.`
      );
    } catch (error) {
      console.error("Failed to generate ITR report:", error);

      Alert.alert(
        "ITR Report Error",
        error instanceof Error
          ? error.message
          : "Unable to generate the ITR report."
      );
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Pressable
      onPress={generateITRReport}
      disabled={generating}
      style={({ pressed }) => [
        styles.button,
        pressed && !generating && styles.buttonPressed,
        generating && styles.buttonDisabled,
      ]}
    >
      {generating ? (
        <>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.buttonText}>Generating...</Text>
        </>
      ) : (
        <Text style={styles.buttonText}>Generate ITR Report</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: 16,
    backgroundColor: "#1F6F5B",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});