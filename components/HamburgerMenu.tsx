import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChevronDown, LogOut, X } from "lucide-react-native";

import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { fetchFromFastAPI } from "@/lib/api";

const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

export type PendingAction = {
  id: string;
  user_id: string | null;
  agent_name: string;
  action_type: string;
  proposed_payload: Record<string, any>;
  agent_reasoning: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  created_at: string;
};

type HamburgerMenuProps = {
  visible: boolean;
  onClose: () => void;
  onSignOut?: () => void | Promise<void>;
  isSigningOut?: boolean;
};

const CATEGORIES = [
  "PERSONAL_TRANSFERS",
  "FOOD_AND_DINING",
  "SHOPPING",
  "TRAVEL_AND_TRANSPORT",
  "UTILITIES_TELECOM",
  "PROFESSIONAL_SERVICES",
  "SOFTWARE_SUBSCRIPTIONS",
  "OFFICE_BUSINESS_SUPPLIES",
  "RENT_WORKSPACE",
  "EDUCATION_TRAINING",
  "MARKETING_ADVERTISING",
  "BANKING_FINANCIAL_CHARGES",
  "INSURANCE",
  "HEALTHCARE_MEDICAL",
  "OTHER",
];

const DEFAULT_USER_ID = "97fc9b68-f8b6-497f-8dc4-a6829af235f7";

export function HamburgerMenu({
  visible,
  onClose,
  onSignOut,
  isSigningOut = false,
}: HamburgerMenuProps) {
  const insets = useSafeAreaInsets();
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [loadingActions, setLoadingActions] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedCategoryMap, setSelectedCategoryMap] = useState<Record<string, string>>({});
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  useEffect(() => {
    if (visible) {
      fetchPendingActions();
    }
  }, [visible]);

  const fetchPendingActions = async () => {
    setLoadingActions(true);
    try {
      const { data, error } = await supabase
        .from("pending_actions")
        .select("*")
        .eq("status", "PENDING")
        .eq("user_id", DEFAULT_USER_ID)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Fetch error:", error);
      } else if (data) {
        setPendingActions(data as PendingAction[]);
      }
    } catch (err) {
      console.error("Failed to fetch pending actions:", err);
    } finally {
      setLoadingActions(false);
    }
  };

  const handleApprove = async (actionId: string) => {
    setActionLoadingId(actionId);
    try {
      // Try /api/pending-actions/{id}/approve first, fallback to /pending-actions/{id}/approve
      try {
        await fetchFromFastAPI(`/api/pending-actions/${actionId}/approve`, {
          method: "POST",
        });
      } catch (err) {
        console.log("Failed with /api prefix, trying without prefix...", err);
        await fetchFromFastAPI(`/pending-actions/${actionId}/approve`, {
          method: "POST",
        });
      }

      setPendingActions((prev) => prev.filter((item) => item.id !== actionId));
      Alert.alert("Success", "Action approved successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to approve action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (actionId: string) => {
    setActionLoadingId(actionId);
    try {
      // Try POST /api/pending-actions/{id}/reject (with prefix fallback) first, fallback to Supabase update
      try {
        try {
          await fetchFromFastAPI(`/api/pending-actions/${actionId}/reject`, {
            method: "POST",
          });
        } catch {
          await fetchFromFastAPI(`/pending-actions/${actionId}/reject`, {
            method: "POST",
          });
        }
      } catch (err) {
        console.log("Failed to reject via backend endpoint, updating Supabase directly...", err);
        const { error } = await supabase
          .from("pending_actions")
          .update({ status: "REJECTED" })
          .eq("id", actionId);
        if (error) throw error;
      }

      setPendingActions((prev) => prev.filter((item) => item.id !== actionId));
      Alert.alert("Success", "Action rejected successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to reject action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleClassifyAndSubmit = async (actionId: string, category: string) => {
    setActionLoadingId(actionId);
    try {
      const targetAction = pendingActions.find((a) => a.id === actionId);
      const updatedPayload = {
        ...(targetAction?.proposed_payload || {}),
        category,
        selected_category: category,
      };

      // 1. Update proposed_payload in Supabase first
      const { error: dbError } = await supabase
        .from("pending_actions")
        .update({
          proposed_payload: updatedPayload,
        })
        .eq("id", actionId);

      if (dbError) throw dbError;

      // 2. Trigger backend approve endpoint to execute approval transactions
      try {
        await fetchFromFastAPI(`/api/pending-actions/${actionId}/approve`, {
          method: "POST",
        });
      } catch (err) {
        console.log("Failed with /api prefix, trying without prefix...", err);
        await fetchFromFastAPI(`/pending-actions/${actionId}/approve`, {
          method: "POST",
        });
      }

      setPendingActions((prev) => prev.filter((item) => item.id !== actionId));
      Alert.alert("Success", "Transaction classified and approved successfully.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to submit classification.");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (!visible) return null;

  const handleSignOut = async () => {
    if (isSigningOut) return;
    if (onSignOut) {
      await onSignOut();
    }
  };

  return (
    <View style={styles.overlay}>
      {/* Backdrop */}
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      />

      {/* Drawer */}
      <View
        style={[
          styles.drawer,
          {
            paddingTop: insets.top + theme.spacing.sm,
            paddingBottom: insets.bottom + theme.spacing.md,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.drawerHeader}>
          <Text style={styles.brand}>Pending Actions</Text>

          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.closeButtonPressed,
            ]}
          >
            <X size={26} strokeWidth={2.2} color={theme.colors.ink} />
          </Pressable>
        </View>

        {/* Scrollable Pending Actions List */}
        <ScrollView
          style={styles.menuContent}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContentContainer}
        >
          {loadingActions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.brandGreen} />
            </View>
          ) : pendingActions.length === 0 ? (
            <Text style={styles.emptyText}>No pending actions required.</Text>
          ) : (
            pendingActions.map((action) => {
              const title =
                action.action_type === "RECONCILE_PAYOUT"
                  ? "Platform Payout Alert"
                  : action.action_type === "ADD_TRANSACTION"
                    ? "New Expense Detected"
                    : action.action_type === "UPDATE_TAX_ESTIMATE"
                      ? "Tax Estimate Update"
                      : action.action_type === "CLASSIFY_TRANSACTION"
                        ? "Classify Transaction"
                        : action.action_type.replace(/_/g, " ");

              const proposed = action.proposed_payload || {};
              const financialImpact = proposed.financial_impact || {};
              const taxSetAside = parseFloat(
                String(financialImpact.recommended_tax_set_aside || 0)
              );

              const isClassify = action.action_type === "CLASSIFY_TRANSACTION";

              return (
                <View key={action.id} style={styles.actionCard}>
                  {/* Header */}
                  <View style={styles.actionHeader}>
                    <Text style={styles.actionTitle} numberOfLines={1}>
                      {title}
                    </Text>
                    {/* <Text style={styles.agentBadge}>{action.agent_name}</Text> */}
                  </View>

                  {/* Message */}
                  <Text style={styles.actionReasoning}>
                    {action.agent_reasoning}
                  </Text>

                  {/* Tax Tag */}
                  {taxSetAside > 0 && (
                    <View style={styles.taxTag}>
                      <Text style={styles.taxTagText}>
                        AI Recommends: Reserve {formatCurrency(taxSetAside)} for Taxes
                      </Text>
                    </View>
                  )}

                  {/* Action Buttons */}
                  <View style={styles.cardActions}>
                    {actionLoadingId === action.id ? (
                      <ActivityIndicator size="small" color={theme.colors.brandGreen} />
                    ) : isClassify ? (
                      <View style={{ width: "100%", gap: theme.spacing.xs }}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.dropdownTrigger,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() => {
                            setActiveActionId(action.id);
                            setIsDropdownOpen(true);
                          }}
                        >
                          <Text style={styles.dropdownTriggerText} numberOfLines={1}>
                            {selectedCategoryMap[action.id]
                              ? selectedCategoryMap[action.id].replace(/_/g, " ")
                              : "Select Category"}
                          </Text>
                          <ChevronDown size={18} color={theme.colors.ink} />
                        </Pressable>

                        <Pressable
                          disabled={!selectedCategoryMap[action.id]}
                          style={({ pressed }) => [
                            styles.submitBtn,
                            !selectedCategoryMap[action.id] && styles.submitBtnDisabled,
                            pressed && selectedCategoryMap[action.id] && styles.btnPressed,
                          ]}
                          onPress={() =>
                            handleClassifyAndSubmit(action.id, selectedCategoryMap[action.id])
                          }
                        >
                          <Text
                            style={[
                              styles.submitBtnText,
                              !selectedCategoryMap[action.id] && styles.submitBtnTextDisabled,
                            ]}
                          >
                            Submit Classification
                          </Text>
                        </Pressable>
                      </View>
                    ) : (
                      <View style={styles.actionButtonsRow}>
                        <Pressable
                          style={({ pressed }) => [
                            styles.approveBtnHalf,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() => handleApprove(action.id)}
                        >
                          <Text style={styles.approveBtnText}>Approve</Text>
                        </Pressable>

                        <Pressable
                          style={({ pressed }) => [
                            styles.rejectBtnHalf,
                            pressed && styles.btnPressed,
                          ]}
                          onPress={() => handleReject(action.id)}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        {/* Category Picker Modal */}
        <Modal
          visible={isDropdownOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setIsDropdownOpen(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setIsDropdownOpen(false)}
          >
            <View style={styles.dropdownModal}>
              <Text style={styles.dropdownTitle}>Select Category</Text>
              <ScrollView style={styles.dropdownList} showsVerticalScrollIndicator={false}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat}
                    style={({ pressed }) => [
                      styles.categoryOption,
                      pressed && styles.categoryOptionPressed,
                    ]}
                    onPress={() => {
                      if (activeActionId) {
                        setSelectedCategoryMap((prev) => ({
                          ...prev,
                          [activeActionId]: cat,
                        }));
                      }
                      setIsDropdownOpen(false);
                    }}
                  >
                    <Text style={styles.categoryOptionText}>
                      {cat.replace(/_/g, " ")}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Pinned Sign Out */}
        <View style={styles.signOutContainer}>
          <View style={styles.divider} />

          <Pressable
            onPress={handleSignOut}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityLabel="Sign out and start over"
            accessibilityState={{
              disabled: isSigningOut,
              busy: isSigningOut,
            }}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && !isSigningOut && styles.signOutButtonPressed,
            ]}
          >
            {isSigningOut ? (
              <ActivityIndicator
                color={theme.colors.onboarding.feedback.errorText}
              />
            ) : (
              <>
                <LogOut
                  size={20}
                  strokeWidth={2.2}
                  color={theme.colors.onboarding.feedback.errorText}
                />
                <Text style={styles.signOutText}>Sign out</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    zIndex: 1000,
  },
  backdrop: {
    flex: 1,
    backgroundColor: theme.colors.overlayDark,
  },
  drawer: {
    width: "80%",
    height: "100%",
    backgroundColor: theme.colors.pageBg,
    paddingHorizontal: theme.spacing.md,
    ...theme.shadows.card,
  },
  drawerHeader: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
    paddingBottom: theme.spacing.xs,
  },
  brand: {
    fontSize: theme.fontSize.xl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.ink,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: theme.radius.full,
  },
  closeButtonPressed: {
    backgroundColor: theme.colors.border,
  },
  menuContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.md,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.md,
    alignItems: "center",
  },
  emptyText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted2,
    fontStyle: "italic",
  },
  actionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.xs,
  },
  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  agentBadge: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.brandGreen,
    textTransform: "uppercase",
  },
  actionType: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.mutedSage.muted1,
  },
  actionReasoning: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.ink,
    lineHeight: 20,
  },
  cardActions: {
    marginTop: theme.spacing.xs,
  },
  actionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
    flex: 1,
    marginRight: theme.spacing.xs,
  },
  taxTag: {
    textAlign: "center",
    backgroundColor: "#FFF9E6",
    borderWidth: 1,
    borderColor: "#FFE0B2",
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    marginTop: theme.spacing.xs,
  },
  taxTagText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: "#E65100",
  },
  approveBtn: {
    backgroundColor: theme.colors.brandGreen,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  approveBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.surface,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  approveBtnHalf: {
    flex: 1,
    backgroundColor: theme.colors.brandGreen,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectBtnHalf: {
    flex: 1,
    backgroundColor: "#FFEBE6",
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FFC4B5",
  },
  rejectBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: "#985743",
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
  },
  dropdownTriggerText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.ink,
  },
  submitBtn: {
    backgroundColor: theme.colors.brandGreen,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    backgroundColor: theme.colors.border,
  },
  submitBtnText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.surface,
  },
  submitBtnTextDisabled: {
    color: theme.colors.mutedSage.muted2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: theme.colors.overlayDark,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.spacing.lg,
  },
  dropdownModal: {
    width: "100%",
    maxHeight: "60%",
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    ...theme.shadows.card,
  },
  dropdownTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
    marginBottom: theme.spacing.sm,
  },
  dropdownList: {
    width: "100%",
  },
  categoryOption: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.borderLight,
  },
  categoryOptionPressed: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  categoryOptionText: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.ink,
  },
  btnPressed: {
    opacity: 0.75,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  signOutContainer: {
    marginTop: "auto",
  },
  signOutButton: {
    marginTop: 10,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.onboarding.feedback.errorBackground,
  },
  signOutButtonPressed: {
    opacity: 0.75,
  },
  signOutText: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.onboarding.feedback.errorText,
  },
});