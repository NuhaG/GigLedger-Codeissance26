import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";

import { Header } from "@/components/Header";
import { TaxDeadlineBanner } from "@/components/TaxDeadlineBanner";
import { theme } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

export type TaxEstimate = {
  id: string;
  user_id: string | null;
  total_taxable_income: string | number;
  estimated_liability: string | number;
  tds_credits_applied: string | number;
  rag_context_used:
  | {
    regime?: string;
    standard_deduction?: number;
    agricultural_exemption?: string;
    notes?: string;
  }
  | string;
  calculated_at: string;
};

const DEFAULT_USER_ID = "97fc9b68-f8b6-497f-8dc4-a6829af235f7";

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

// Safely parse single or double-stringified JSON objects from Supabase
const parseRagContext = (rawContext: any) => {
  if (!rawContext) return {};
  let context = rawContext;

  while (typeof context === "string") {
    try {
      context = JSON.parse(context);
    } catch {
      break;
    }
  }
  return context;
};

const screenWidth = Dimensions.get("window").width;

type FilterKey = "15d" | "30d" | "month" | "3m" | "all";

const FILTER_OPTIONS: { key: FilterKey; label: string }[] = [
  { key: "15d", label: "15 Days" },
  { key: "30d", label: "30 Days" },
  { key: "month", label: "This Month" },
  { key: "3m", label: "3 Months" },
  { key: "all", label: "All Time" },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function HomeScreen() {
  const router = useRouter();
  const [estimate, setEstimate] = useState<TaxEstimate | null>(null);
  const [totalIncome, setTotalIncome] = useState<number>(0);
  const [totalExpense, setTotalExpense] = useState<number>(0);
  const [chartLabels, setChartLabels] = useState<string[]>(["No Data"]);
  const [incomeData, setIncomeData] = useState<number[]>([0]);
  const [expenseData, setExpenseData] = useState<number[]>([0]);
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>("30d");
  const [loading, setLoading] = useState<boolean>(true);

  const getYearMonthKey = (dateString: string): string => {
    if (!dateString) return "";
    const parts = dateString.split("-");
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`; // e.g. "2026-06"
    }
    return "";
  };

  const getFriendlyMonthName = (yearMonthKey: string): string => {
    if (!yearMonthKey) return "";
    const [_, monthStr] = yearMonthKey.split("-");
    const m = parseInt(monthStr, 10);
    if (m >= 1 && m <= 12) {
      return MONTH_NAMES[m - 1];
    }
    return yearMonthKey;
  };

  const fetchTransactionsSummary = async () => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("type, amount, date")
        .eq("user_id", DEFAULT_USER_ID);

      if (!error && data) {
        let incomeSum = 0;
        let expenseSum = 0;

        const monthlyIncomeMap: Record<string, number> = {};
        const monthlyExpenseMap: Record<string, number> = {};
        const uniqueMonthsSet = new Set<string>();

        const now = new Date();

        data.forEach((t) => {
          if (!t.date) return;
          const tDate = new Date(t.date);

          // Apply date filter
          if (selectedFilter !== "all") {
            if (selectedFilter === "month") {
              const dateParts = t.date.split("-");
              const tYear = parseInt(dateParts[0], 10);
              const tMonth = parseInt(dateParts[1], 10);
              const isCurrentMonth = tYear === now.getFullYear() && tMonth === (now.getMonth() + 1);
              if (!isCurrentMonth) return;
            } else {
              const daysMap: Record<string, number> = {
                "15d": 15,
                "30d": 30,
                "3m": 90,
              };
              const days = daysMap[selectedFilter];
              const cutoff = new Date(now);
              cutoff.setDate(cutoff.getDate() - days);
              if (tDate < cutoff) return;
            }
          }

          const val = parseFloat(String(t.amount || 0));
          if (t.type === "INCOME") {
            incomeSum += val;
          } else if (t.type === "EXPENSE") {
            expenseSum += val;
          }

          const key = getYearMonthKey(t.date);
          if (key) {
            uniqueMonthsSet.add(key);
            if (t.type === "INCOME") {
              monthlyIncomeMap[key] = (monthlyIncomeMap[key] || 0) + val;
            } else if (t.type === "EXPENSE") {
              monthlyExpenseMap[key] = (monthlyExpenseMap[key] || 0) + val;
            }
          }
        });

        setTotalIncome(incomeSum);
        setTotalExpense(expenseSum);

        const sortedMonthKeys = Array.from(uniqueMonthsSet).sort();

        if (sortedMonthKeys.length > 0) {
          const labels = sortedMonthKeys.map(getFriendlyMonthName);
          const incomes = sortedMonthKeys.map((key) => monthlyIncomeMap[key] || 0);
          const expenses = sortedMonthKeys.map((key) => monthlyExpenseMap[key] || 0);

          setChartLabels(labels);
          setIncomeData(incomes);
          setExpenseData(expenses);
        } else {
          setChartLabels(["No Data"]);
          setIncomeData([0]);
          setExpenseData([0]);
        }
      }
    } catch (err) {
      console.error("Failed to load transactions summary:", err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchLatestTaxEstimate();
      fetchTransactionsSummary();
    }, [selectedFilter])
  );

  const fetchLatestTaxEstimate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tax_estimates")
        .select("*")
        .eq("user_id", DEFAULT_USER_ID)
        .order("calculated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching tax estimate:", error.message, error.details);
      } else {
        setEstimate(data as TaxEstimate | null);
      }
    } catch (err) {
      console.error("Failed to load tax estimate:", err);
    } finally {
      setLoading(false);
    }
  };

  // Safe number conversions for numeric database strings
  const grossIncome = estimate?.total_taxable_income
    ? parseFloat(String(estimate.total_taxable_income))
    : 0;
  const grossLiability = estimate?.estimated_liability
    ? parseFloat(String(estimate.estimated_liability))
    : 0;
  const tdsCredits = estimate?.tds_credits_applied
    ? parseFloat(String(estimate.tds_credits_applied))
    : 0;
  const netPayable = Math.max(0, grossLiability - tdsCredits);

  // Parse rag_context_used safely
  const ragContext = parseRagContext(estimate?.rag_context_used);

  const liabilityPercent =
    grossIncome > 0 ? (grossLiability / grossIncome) * 100 : 0;
  const tdsPercent =
    grossLiability > 0 ? (tdsCredits / grossLiability) * 100 : 0;

  return (
    <View style={styles.container}>
      <Header
        eyebrow="Financial Intelligence"
        title="Dashboard"
        subtitle="Tax estimates & real-time liabilities"
        onMenuClose={() => {
          fetchLatestTaxEstimate();
          fetchTransactionsSummary();
        }}
      />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TaxDeadlineBanner />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.brandGreen} />
          </View>
        ) : (
          <>
            {/* Time Filter ScrollView */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {FILTER_OPTIONS.map((option) => {
                const isActive = option.key === selectedFilter;
                return (
                  <Pressable
                    key={option.key}
                    onPress={() => setSelectedFilter(option.key)}
                    style={[
                      styles.filterPill,
                      isActive && styles.filterPillActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterText,
                        isActive && styles.filterTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Income Card (Line Chart) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.eyebrow}>TOTAL INCOME</Text>
                <Text style={[styles.amount, { color: theme.colors.brandGreen }]}>
                  {formatCurrency(totalIncome)}
                </Text>
              </View>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: incomeData }],
                }}
                width={screenWidth - 64}
                height={160}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(91, 154, 111, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(23, 59, 43, ${opacity})`,
                  fillShadowGradient: theme.colors.brandGreen,
                  fillShadowGradientOpacity: 0.1,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: "bold",
                  },
                }}
                verticalLabelRotation={0}
                fromZero
                bezier
                withOuterLines={false}
                style={styles.chart}
              />
              <Pressable
                onPress={() => router.push("/expenses")}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={styles.linkText}>View Detailed Income</Text>
              </Pressable>
            </View>

            {/* Expense Card (Line Chart) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.eyebrow}>TOTAL EXPENSES</Text>
                <Text style={[styles.amount, { color: "#985743" }]}>
                  {formatCurrency(totalExpense)}
                </Text>
              </View>
              <LineChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: expenseData }],
                }}
                width={screenWidth - 64}
                height={160}
                yAxisLabel="₹"
                yAxisSuffix=""
                chartConfig={{
                  backgroundGradientFrom: theme.colors.surface,
                  backgroundGradientTo: theme.colors.surface,
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(152, 87, 67, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(23, 59, 43, ${opacity})`,
                  fillShadowGradient: "#985743",
                  fillShadowGradientOpacity: 0.1,
                  propsForLabels: {
                    fontSize: 10,
                    fontWeight: "bold",
                  },
                }}
                verticalLabelRotation={0}
                fromZero
                bezier
                withOuterLines={false}
                style={styles.chart}
              />
              <Pressable
                onPress={() => router.push("/expenses")}
                style={({ pressed }) => [
                  styles.linkButton,
                  pressed && styles.linkButtonPressed,
                ]}
              >
                <Text style={styles.linkText}>View Detailed Expenses</Text>
              </Pressable>
            </View>

            {estimate ? (
              <>
                {/* Visual Tax Metric Bar Chart */}
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.eyebrow}>TAX METRICS SUMMARY</Text>
                    <Text style={styles.dateLabel}>
                      {formatDate(estimate.calculated_at)}
                    </Text>
                  </View>

                  {/* Net Tax Hero Value */}
                  <View style={styles.heroRow}>
                    <View>
                      <Text style={styles.subtext}>Estimated Net Payable</Text>
                      <Text style={styles.netAmount}>{formatCurrency(netPayable)}</Text>
                    </View>
                    <View style={styles.regimeBadge}>
                      <Text style={styles.regimeBadgeText}>
                        {ragContext?.regime || "New Tax Regime"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.dashedDivider} />

                  {/* Visual Bar Graph */}
                  <Text style={styles.sectionLabel}>Liability vs. Income Scale</Text>

                  {/* Taxable Income Bar */}
                  <View style={styles.barContainer}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>Taxable Income</Text>
                      <Text style={styles.barValue}>{formatCurrency(grossIncome)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          { width: "100%", backgroundColor: theme.colors.brandGreen },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Estimated Liability Bar */}
                  <View style={styles.barContainer}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>Gross Liability</Text>
                      <Text style={styles.barValue}>{formatCurrency(grossLiability)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.min(100, Math.max(12, liabilityPercent * 2.5))}%`,
                            backgroundColor: theme.colors.danger,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* TDS Credits Bar */}
                  <View style={styles.barContainer}>
                    <View style={styles.barLabelRow}>
                      <Text style={styles.barLabel}>TDS Credits Offset</Text>
                      <Text style={styles.barValue}>-{formatCurrency(tdsCredits)}</Text>
                    </View>
                    <View style={styles.track}>
                      <View
                        style={[
                          styles.fill,
                          {
                            width: `${Math.min(100, Math.max(10, tdsPercent))}%`,
                            backgroundColor: theme.colors.warning,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {/* Detailed Breakdown Card */}
                <View style={styles.card}>
                  <Text style={styles.eyebrow}>TAX BREAKDOWN DETAILS</Text>

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Total Taxable Income</Text>
                    <Text style={styles.breakdownValue}>{formatCurrency(grossIncome)}</Text>
                  </View>

                  <View style={styles.dashedDivider} />

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Estimated Tax Liability</Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.danger }]}>
                      {formatCurrency(grossLiability)}
                    </Text>
                  </View>

                  <View style={styles.dashedDivider} />

                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>TDS Credits Applied</Text>
                    <Text style={[styles.breakdownValue, { color: theme.colors.warning }]}>
                      -{formatCurrency(tdsCredits)}
                    </Text>
                  </View>

                  <View style={styles.dashedDivider} />

                  <View style={styles.breakdownRow}>
                    <Text style={styles.boldLabel}>Net Outstanding Liability</Text>
                    <Text style={styles.boldValue}>{formatCurrency(netPayable)}</Text>
                  </View>

                  {ragContext?.notes && (
                    <View style={styles.notesBox}>
                      <Text style={styles.notesTitle}>AI Reasoning & Context</Text>
                      <Text style={styles.notesText}>{ragContext.notes}</Text>
                    </View>
                  )}
                </View>
              </>
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.pageBg,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    gap: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  loadingContainer: {
    paddingVertical: theme.spacing.xl,
    alignItems: "center",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    padding: theme.spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.card,
    gap: theme.spacing.sm,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontSize: theme.typography.eyebrow.fontSize,
    fontWeight: theme.typography.eyebrow.fontWeight,
    letterSpacing: theme.typography.eyebrow.letterSpacing,
    color: theme.colors.mutedSage.muted1,
  },
  dateLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedSage.muted3,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: theme.spacing.xs,
  },
  subtext: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted1,
  },
  netAmount: {
    fontSize: theme.fontSize.xxl,
    fontWeight: theme.typography.fontWeights.black,
    color: theme.colors.ink,
    fontFamily: theme.typography.fontMono,
  },
  regimeBadge: {
    backgroundColor: theme.colors.surfaceSubtle,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.full,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  regimeBadgeText: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  dashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
    marginVertical: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  barContainer: {
    gap: theme.spacing.xxs,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedSage.muted1,
  },
  barValue: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.ink,
  },
  track: {
    height: 8,
    width: "100%",
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.full,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: theme.radius.full,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  breakdownLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.mutedSage.muted1,
  },
  breakdownValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.ink,
  },
  boldLabel: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.ink,
  },
  boldValue: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.typography.fontWeights.black,
    fontFamily: theme.typography.fontMono,
    color: theme.colors.ink,
  },
  notesBox: {
    marginTop: theme.spacing.xs,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceSubtle,
    borderRadius: theme.radius.sm,
    gap: theme.spacing.xxs,
  },
  notesTitle: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  notesText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.mutedSage.muted1,
    lineHeight: 16,
  },
  amount: {
    fontSize: theme.fontSize.lg,
    fontWeight: theme.typography.fontWeights.bold,
    fontFamily: theme.typography.fontMono,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    alignSelf: "center",
    paddingBottom: theme.spacing.xs,
  },
  linkButton: {
    marginTop: theme.spacing.sm,
    paddingTop: theme.spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.borderLight,
  },
  linkButtonPressed: {
    opacity: 0.75,
  },
  linkText: {
    marginTop: 3,
    fontSize: theme.fontSize.sm,
    fontWeight: theme.typography.fontWeights.bold,
    color: theme.colors.brandGreen,
  },
  filterRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    paddingBottom: theme.spacing.md,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.pageBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterPillActive: {
    backgroundColor: theme.colors.ink,
    borderColor: theme.colors.ink,
  },
  filterText: {
    fontSize: 12,
    fontWeight: "800",
    color: theme.colors.mutedSage.muted1,
  },
  filterTextActive: {
    color: theme.colors.pageBg,
  },
});