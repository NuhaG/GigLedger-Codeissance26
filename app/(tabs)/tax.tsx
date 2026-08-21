import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Pressable,
  Modal,
  ActivityIndicator,
} from "react-native";
import {
  ShieldAlert,
  Info,
  CheckCircle2,
  TrendingDown,
  FileText,
  DollarSign,
  ArrowRight,
  Sparkles,
  X,
  PieChart,
  Wallet,
  Lock,
} from "lucide-react-native";

import { Header } from "@/components/Header";
import { theme } from "@/constants/theme";
// Adjust this import path to wherever you place the component
import GenerateITR from "@/components/GenerateITR";

// API Response Payload Schema Matching Your Backend JSON
interface TaxRule {
  id: string;
  title: string;
  description: string;
  deductibilityRate: string;
  status: string;
}

interface TaxWaterfall {
  totalGrossEarnings: number;
  flatBusinessDeduction: number;
  netTaxableIncome: number;
  tdsPaidByPlatforms: number;
  finalTaxSetAside: number;
}

interface RagContextUsed {
  regime: string;
  deemed_profit_rate: number;
  gross_receipts_ytd: number;
  taxable_deemed_profit: number;
  tds_credits_ytd: number;
  statutory_reference: string;
}

interface TaxScreenData {
  currentBalance: number;
  estimatedTaxLiability: number;
  safeToSpend: number;
  waterfall: TaxWaterfall;
  regime: string;
  ragContextUsed: RagContextUsed;
  assessmentYear: string;
  taxRulesDatabase?: TaxRule[]; // Optional since backend might not send it yet
}

interface TaxScreenProps {
  userId?: string;
}

export default function TaxScreen({ userId = "97fc9b68-f8b6-497f-8dc4-a6829af235f7" }: TaxScreenProps) {
  const [taxData, setTaxData] = useState<TaxScreenData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRule, setSelectedRule] = useState<TaxRule | null>(null);

  // Default rules database to keep the UI tabs working if backend doesn't return them
  const defaultRulesDatabase: TaxRule[] = [
    {
      id: "44ADA",
      title: "Section 44ADA - Presumptive Taxation",
      description:
        "Applies to qualifying gig workers and freelancers with gross receipts up to ₹75 Lakhs. Deems 50% of gross receipts as profit without requiring detailed expense auditing.",
      deductibilityRate: "50% Gross Allowance",
      status: "Active Regime",
    },
    {
      id: "SEC_194O",
      title: "Section 194-O - E-Commerce Platform TDS",
      description:
        "Platforms like Zomato, Swiggy, and Uber deduct statutory TDS on gross payout amounts. Effective Oct 1, 2024, standard TDS rate is 0.1% (5% under Sec 206AA if PAN/Aadhaar is not furnished).",
      deductibilityRate: "Statutory Credit",
      status: "Applicable",
    },
  ];

  useEffect(() => {
    const fetchTaxSummary = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`https://army-mantis-enable.ngrok-free.dev/tax/summary/${userId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch tax summary from the database.");
        }

        const data = await response.json();

        // Attach the default rules database if the backend response doesn't include it
        setTaxData({
          ...data,
          taxRulesDatabase: data.taxRulesDatabase || defaultRulesDatabase,
        });
      } catch (err: any) {
        console.warn("API fetch failed, falling back to default structure:", err.message);
        setTaxData({
          currentBalance: 78500.0,
          estimatedTaxLiability: 6140.0,
          safeToSpend: 72360.0,
          waterfall: {
            totalGrossEarnings: 124800.0,
            flatBusinessDeduction: 62400.0,
            netTaxableIncome: 62400.0,
            tdsPaidByPlatforms: 3120.0,
            finalTaxSetAside: 6140.0,
          },
          regime: "Section 44ADA (PRESUMPTIVE)",
          ragContextUsed: {
            regime: "44ADA",
            deemed_profit_rate: 0.50,
            gross_receipts_ytd: 124800.0,
            taxable_deemed_profit: 62400.0,
            tds_credits_ytd: 3120.0,
            statutory_reference: "Section 44ADA read with Section 115BAC slabs for AY 2026-27",
          },
          assessmentYear: "2026-27",
          taxRulesDatabase: defaultRulesDatabase,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTaxSummary();
  }, [userId]);

  if (isLoading || !taxData) {
    return (
      <View style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={theme.colors.brandGreen} />
        <Text style={styles.loadingText}>Syncing tax engine records...</Text>
      </View>
    );
  }

  // Safe-to-spend and waterfall metrics pulled directly from your JSON fields
  const safeToSpend = taxData.safeToSpend;
  const grossReceiptsYTD = taxData.waterfall.totalGrossEarnings;
  const presumptiveDeduction = taxData.waterfall.flatBusinessDeduction;
  const netTaxableIncome = taxData.waterfall.netTaxableIncome;
  const tdsCreditsApplied = taxData.waterfall.tdsPaidByPlatforms;

  const safePercent = Math.min(
    Math.max(
      Math.round((safeToSpend / taxData.currentBalance) * 100),
      0
    ),
    100
  );
  const reservePercent = 100 - safePercent;
  const isHighReserve = reservePercent >= 15;

  return (
    <View style={styles.container}>
      <Header
        eyebrow="Tax Optimization & Transparency"
        title="Tax Engine"
        subtitle={`Sec 44ADA Assumptions (AY ${taxData.assessmentYear})`}
      />

      <ScrollView
        style={styles.flexOne}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* VISUAL WALLET METER HERO CARD */}
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.walletIconContainer}>
              <Wallet size={18} color={theme.colors.brandGreen} />
              <Text style={styles.walletTitleText}>Digital Wallet Breakdown</Text>
            </View>
            <View style={styles.heroTag}>
              <Sparkles size={11} color={theme.colors.brandGreen} />
              <Text style={styles.heroTagText}>Real-Time Liquidity</Text>
            </View>
          </View>

          {/* PRIMARY NUMBER — the one thing that matters most */}
          <View style={styles.primaryAmountBlock}>
            <Text style={styles.primaryAmountLabel}>Safe to Spend</Text>
            <Text style={styles.primaryAmountValue}>
              ₹{safeToSpend.toLocaleString("en-IN")}
            </Text>
            <Text style={styles.primaryAmountHint}>
              What's left after your tax reserve is set aside
            </Text>
          </View>

          {/* SECONDARY STATS — bank balance vs. tax reserve, side by side */}
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatChip}>
              <View style={styles.heroStatIconWrap}>
                <Wallet size={12} color={theme.colors.surface} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.heroStatLabel}>Bank Balance</Text>
                <Text style={styles.heroStatValue}>
                  ₹{taxData.currentBalance.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>

            <View style={[styles.heroStatChip, styles.heroStatChipWarning]}>
              <View style={styles.heroStatIconWrap}>
                <Lock size={12} color={theme.colors.warning} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.heroStatLabel}>Tax Reserve</Text>
                <Text style={styles.heroStatValue}>
                  ₹{taxData.estimatedTaxLiability.toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          </View>

          {/* VISUAL METER */}
          <View style={styles.visualWalletContainer}>
            <View style={styles.barLabelRow}>
              <Text style={styles.barLabelGreen}>{safePercent}% Available Cash</Text>
              <Text style={styles.barLabelLock}>{reservePercent}% Tax Locked</Text>
            </View>

            <View style={styles.barTrack}>
              <View style={[styles.barFillGreen, { flex: safePercent / 100 }]} />
              <View style={[styles.barFillReserve, { flex: reservePercent / 100 }]} />
            </View>
          </View>

          {/* URGENCY NUDGE — only surfaces when the reserve is a meaningful chunk */}
          {isHighReserve && (
            <View style={styles.urgencyBanner}>
              <ShieldAlert size={13} color={theme.colors.warning} />
              <Text style={styles.urgencyBannerText}>
                {reservePercent}% of your balance is locked for taxes — avoid dipping into it.
              </Text>
            </View>
          )}
        </View>

        {/* SECTION 44ADA TAX CALCULATION WATERFALL */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>44ADA Tax Calculation Waterfall</Text>
          <Pressable
            style={styles.infoPill}
            onPress={() => setSelectedRule(taxData.taxRulesDatabase?.[0] || null)}
          >
            <Info size={12} color={theme.colors.brandGreen} />
            <Text style={styles.infoPillText}>Assumptions</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          {/* Gross Receipts */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLeft}>
              <View style={[styles.iconCircle, styles.bgSuccess]}>
                <DollarSign size={14} color={theme.colors.brandGreen} />
              </View>
              <View>
                <Text style={styles.waterfallTitle}>Total Gross Earnings</Text>
                <Text style={styles.waterfallSubtext}>Aggregated platform gross receipts (YTD)</Text>
              </View>
            </View>
            <Text style={styles.waterfallValuePositive}>
              +₹{grossReceiptsYTD.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.waterfallConnector} />

          {/* Presumptive Flat Deduction */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLeft}>
              <View style={[styles.iconCircle, styles.bgMuted]}>
                <TrendingDown size={14} color={theme.colors.mutedSage.muted1} />
              </View>
              <View style={styles.flexShrink}>
                <Text style={styles.waterfallTitle}>50% Flat Expense Deduction (Sec 44ADA)</Text>
                <Text style={styles.waterfallSubtext}>Deemed deduction covering all business expenses.</Text>
              </View>
            </View>
            <Text style={styles.waterfallValueNegative}>
              -₹{presumptiveDeduction.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.waterfallConnector} />

          {/* Net Taxable Income */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLeft}>
              <View style={[styles.iconCircle, styles.bgInfo]}>
                <PieChart size={14} color={theme.colors.ink} />
              </View>
              <View>
                <Text style={styles.waterfallTitle}>Net Taxable Income</Text>
                <Text style={styles.waterfallSubtext}>Declared taxable base under 44ADA</Text>
              </View>
            </View>
            <Text style={styles.waterfallValueNeutral}>
              ₹{netTaxableIncome.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.waterfallConnector} />

          {/* Statutory TDS Recovered */}
          <View style={styles.waterfallRow}>
            <View style={styles.waterfallLeft}>
              <View style={[styles.iconCircle, styles.bgSuccess]}>
                <CheckCircle2 size={14} color={theme.colors.brandGreen} />
              </View>
              <View>
                <Text style={styles.waterfallTitle}>Statutory TDS Credits (Sec 194-O)</Text>
                <Text style={styles.waterfallSubtext}>Withheld by e-commerce/gig platforms</Text>
              </View>
            </View>
            <Text style={styles.waterfallValuePositive}>
              -₹{tdsCreditsApplied.toLocaleString("en-IN")}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Final Set-Aside Liability */}
          <View style={styles.waterfallTotalRow}>
            <View>
              <Text style={styles.totalLabel}>Final Tax Set-Aside Required</Text>
              <Text style={styles.totalSublabel}>{taxData.ragContextUsed.statutory_reference}</Text>
            </View>
            <Text style={styles.totalValue}>
              ₹{taxData.waterfall.finalTaxSetAside.toLocaleString("en-IN")}
            </Text>
          </View>
        </View>

        {/* TAX RULES & LEGAL DATABASE */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Tax Rules & Legal Database</Text>
          <Text style={styles.sectionSub}>RAG Knowledge Base</Text>
        </View>

        <View style={styles.databaseList}>
          {taxData.taxRulesDatabase?.map((item) => (
            <Pressable
              key={item.id}
              style={({ pressed }) => [styles.dbCard, pressed && styles.dbCardPressed]}
              onPress={() => setSelectedRule(item)}
            >
              <View style={styles.dbCardHeader}>
                <View style={styles.dbCardTitleRow}>
                  <FileText size={16} color={theme.colors.brandGreen} />
                  <Text style={styles.dbCardTitle}>{item.title}</Text>
                </View>
                <View style={styles.dbTag}>
                  <Text style={styles.dbTagText}>{item.status}</Text>
                </View>
              </View>

              <Text style={styles.dbDescription} numberOfLines={2}>
                {item.description}
              </Text>

              <View style={styles.dbFooter}>
                <Text style={styles.dbRateText}>
                  Impact: <Text style={styles.dbRateHighlight}>{item.deductibilityRate}</Text>
                </Text>
                <View style={styles.viewDetailLink}>
                  <Text style={styles.viewDetailText}>Explain Statute</Text>
                  <ArrowRight size={12} color={theme.colors.brandGreen} />
                </View>
              </View>
            </Pressable>
          ))}
        </View>

        {/* GENERATE ITR — single button, sits at the bottom of the page */}
        <GenerateITR />
      </ScrollView>

      {/* STATUTE EXPLAINABILITY MODAL */}
      <Modal
        visible={!!selectedRule}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedRule(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={() => setSelectedRule(null)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <ShieldAlert size={20} color={theme.colors.brandGreen} />
                <Text style={styles.modalTitle}>Tax Rule Explainability</Text>
              </View>
              <Pressable onPress={() => setSelectedRule(null)} style={styles.closeBtn}>
                <X size={18} color={theme.colors.ink} />
              </Pressable>
            </View>

            {selectedRule && (
              <View style={styles.modalBody}>
                <View style={styles.rulePillContainer}>
                  <Text style={styles.rulePillLabel}>Rule Applied</Text>
                  <Text style={styles.rulePillValue}>{selectedRule.id}</Text>
                </View>

                <Text style={styles.modalSectionHeading}>{selectedRule.title}</Text>
                <Text style={styles.modalDescription}>{selectedRule.description}</Text>

                <View style={styles.modalAssumptionBox}>
                  <Text style={styles.assumptionBoxHeader}>Backend Tax Assumptions</Text>
                  <View style={styles.assumptionRow}>
                    <Text style={styles.assumptionKey}>Presumptive Allowance</Text>
                    <Text style={styles.assumptionVal}>
                      {taxData.ragContextUsed.deemed_profit_rate * 100}% Gross Income
                    </Text>
                  </View>
                  <View style={styles.assumptionRow}>
                    <Text style={styles.assumptionKey}>Assessment Year</Text>
                    <Text style={styles.assumptionVal}>{taxData.assessmentYear}</Text>
                  </View>
                </View>

                <Pressable
                  style={styles.modalCloseButton}
                  onPress={() => setSelectedRule(null)}
                >
                  <Text style={styles.modalCloseButtonText}>Acknowledge & Close</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  centerState: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: theme.spacing.sm,
    color: theme.colors.mutedSage.muted1,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.medium,
  },
  flexOne: {
    flex: 1,
  },
  flexShrink: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
    gap: theme.spacing.md,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    ...theme.shadows.card,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  walletIconContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  walletTitleText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.surface,
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(91, 154, 111, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: theme.radius.full,
  },
  heroTagText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  primaryAmountBlock: {
    marginBottom: theme.spacing.md,
  },
  primaryAmountLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.mutedSage.muted1,
  },
  primaryAmountValue: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.brandGreen,
    marginTop: 4,
  },
  primaryAmountHint: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
    marginTop: 4,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  heroStatChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: theme.radius.sm,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  heroStatChipWarning: {
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
  },
  heroStatIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  heroStatLabel: {
    fontSize: 15,
    color: theme.colors.mutedSage.muted1,
  },
  heroStatValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.surface,
    marginTop: 2,
  },
  visualWalletContainer: {
    gap: 6,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barLabelGreen: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  barLabelLock: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.warning,
  },
  barTrack: {
    height: 12,
    borderRadius: theme.radius.full,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    flexDirection: "row",
    overflow: "hidden",
    gap: 2,
  },
  barFillGreen: {
    backgroundColor: theme.colors.brandGreen,
    borderRadius: theme.radius.full,
  },
  barFillReserve: {
    backgroundColor: theme.colors.warning,
    borderRadius: theme.radius.full,
  },
  urgencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: theme.radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.md,
  },
  urgencyBannerText: {
    flex: 1,
    fontSize: theme.fontSize.micro,
    lineHeight: 16,
    color: theme.colors.surface,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  sectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  sectionSub: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
  },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: theme.colors.waterGreenLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.full,
  },
  infoPillText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.ink,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
  },
  waterfallRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  waterfallLeft: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    flex: 1,
    paddingRight: theme.spacing.xs,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  bgSuccess: {
    backgroundColor: theme.colors.waterGreenLight,
  },
  bgMuted: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  bgInfo: {
    backgroundColor: theme.colors.borderLight,
  },
  waterfallTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.ink,
  },
  waterfallSubtext: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
    marginTop: 2,
    lineHeight: 14,
  },
  waterfallValuePositive: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  waterfallValueNegative: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.danger,
  },
  waterfallValueNeutral: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  waterfallConnector: {
    width: 2,
    height: 14,
    backgroundColor: theme.colors.borderLight,
    marginLeft: 13,
    marginVertical: 4,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  waterfallTotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: theme.colors.surfaceSubtle,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },
  totalLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  totalSublabel: {
    fontSize: 10,
    color: theme.colors.mutedSage.muted1,
    maxWidth: 200,
  },
  totalValue: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.brandGreen,
  },
  databaseList: {
    gap: theme.spacing.xs,
  },
  dbCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
  },
  dbCardPressed: {
    backgroundColor: theme.colors.surfaceSubtle,
  },
  dbCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  dbCardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  dbCardTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  dbTag: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dbTagText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.medium,
    color: theme.colors.mutedSage.muted1,
  },
  dbDescription: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedSage.muted1,
    lineHeight: 18,
  },
  dbFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.xs,
    paddingTop: theme.spacing.xs,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  dbRateText: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
  },
  dbRateHighlight: {
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  viewDetailLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewDetailText: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.brandGreen,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalBackdrop: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.card * 1.5,
    borderTopRightRadius: theme.radius.card * 1.5,
    padding: theme.spacing.lg,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    gap: theme.spacing.xs,
  },
  rulePillContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  rulePillLabel: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
  },
  rulePillValue: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
    backgroundColor: theme.colors.waterGreenLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  modalSectionHeading: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  modalDescription: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted1,
    lineHeight: 20,
  },
  modalAssumptionBox: {
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.md,
    marginVertical: theme.spacing.xs,
    gap: 8,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
  },
  assumptionBoxHeader: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
    marginBottom: 2,
  },
  assumptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  assumptionKey: {
    fontSize: theme.fontSize.micro,
    color: theme.colors.mutedSage.muted1,
  },
  assumptionVal: {
    fontSize: theme.fontSize.micro,
    fontWeight: theme.typography.fontWeights.semibold,
    color: theme.colors.ink,
  },
  modalCloseButton: {
    backgroundColor: theme.colors.ink,
    borderRadius: theme.radius.sm,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: theme.spacing.xs,
  },
  modalCloseButtonText: {
    color: theme.colors.surface,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
  },
});