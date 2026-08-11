import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { apiRequest } from '../utils/api';

const { width } = Dimensions.get('window');

interface DailyPoint { date: string; value: number; }
interface TriggerStat { trigger: string; count: number; }
interface AnalyticsSummary {
  period_days: number;
  smoking_trend: DailyPoint[];
  craving_trend: DailyPoint[];
  stress_trend: DailyPoint[];
  common_triggers: TriggerStat[];
  high_risk_hours: { hour: number; count: number; label: string }[];
  avg_craving: number;
  avg_stress: number;
  total_cravings: number;
  total_cigarettes: number;
  interventions_completed: number;
  weekly_summary: { cravings_this_week: number; cigarettes_this_week: number; avg_craving_this_week: number };
}

// Simple bar chart component
function MiniBarChart({ data, color, maxValue }: { data: DailyPoint[]; color: string; maxValue?: number }) {
  const last14 = data.slice(-14);
  const max = maxValue ?? Math.max(...last14.map(d => d.value), 1);
  const barWidth = (width - 64) / 14 - 3;

  return (
    <View style={barStyles.container}>
      <View style={barStyles.bars}>
        {last14.map((d, i) => {
          const h = Math.max(4, (d.value / max) * 80);
          return (
            <View key={i} style={barStyles.barWrapper}>
              <View style={[barStyles.bar, { height: h, backgroundColor: color, opacity: d.value === 0 ? 0.15 : 1 }]} />
            </View>
          );
        })}
      </View>
      <View style={barStyles.labels}>
        {[last14[0], last14[6], last14[13]].map((d, i) => (
          <Text key={i} style={barStyles.label}>{d?.date?.slice(5) ?? ''}</Text>
        ))}
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  container: { marginTop: 8 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 88, gap: 3 },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 3, minHeight: 4 },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  label: { color: '#475569', fontSize: 10 },
});

export function AnalyticsTab() {
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<7 | 30>(30);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiRequest(`/analytics/summary?days=${period}`);
      setData(res);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, [period]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#8b5cf6" /></View>;
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.noDataText}>No analytics data yet.</Text>
        <Text style={styles.noDataSub}>Start logging cravings and check-ins!</Text>
      </View>
    );
  }

  const TRIGGER_COLORS = ['#f97316', '#8b5cf6', '#0d9488', '#e11d48', '#3b82f6', '#84cc16', '#f59e0b', '#ec4899'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#8b5cf6" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>📊 Analytics</Text>
        <View style={styles.periodRow}>
          {([7, 30] as const).map(p => (
            <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodBtnActive]} onPress={() => setPeriod(p)}>
              <Text style={[styles.periodBtnText, period === p && styles.periodBtnTextActive]}>{p}d</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Weekly Summary Cards */}
      <Text style={styles.sectionTitle}>This Week</Text>
      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryValue}>{data.weekly_summary.cravings_this_week}</Text>
          <Text style={styles.summaryLabel}>Cravings</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#f97316' }]}>{data.weekly_summary.cigarettes_this_week}</Text>
          <Text style={styles.summaryLabel}>Cigarettes</Text>
        </View>
        <View style={styles.summaryCard}>
          <Text style={[styles.summaryValue, { color: '#8b5cf6' }]}>{data.weekly_summary.avg_craving_this_week.toFixed(1)}</Text>
          <Text style={styles.summaryLabel}>Avg Craving</Text>
        </View>
      </View>

      {/* Averages */}
      <View style={styles.avgRow}>
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>Avg Craving</Text>
          <Text style={styles.avgValue}>{data.avg_craving}/10</Text>
          <View style={styles.avgBar}>
            <View style={[styles.avgFill, { width: `${data.avg_craving * 10}%`, backgroundColor: '#8b5cf6' }]} />
          </View>
        </View>
        <View style={styles.avgCard}>
          <Text style={styles.avgLabel}>Avg Stress</Text>
          <Text style={styles.avgValue}>{data.avg_stress}/10</Text>
          <View style={styles.avgBar}>
            <View style={[styles.avgFill, { width: `${data.avg_stress * 10}%`, backgroundColor: '#e11d48' }]} />
          </View>
        </View>
      </View>

      {/* Craving Trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🌊 Craving Trend (14 days)</Text>
        <MiniBarChart data={data.craving_trend} color="#8b5cf6" maxValue={10} />
      </View>

      {/* Smoking Trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>🚬 Cigarettes per Day (14 days)</Text>
        <MiniBarChart data={data.smoking_trend} color="#f97316" />
      </View>

      {/* Stress Trend */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>😰 Stress Trend (14 days)</Text>
        <MiniBarChart data={data.stress_trend} color="#e11d48" maxValue={10} />
      </View>

      {/* Common Triggers */}
      {data.common_triggers.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>🎯 Common Triggers</Text>
          {data.common_triggers.map((t, i) => {
            const maxCount = data.common_triggers[0].count;
            const pct = (t.count / maxCount) * 100;
            return (
              <View key={i} style={styles.triggerRow}>
                <Text style={styles.triggerName}>{t.trigger}</Text>
                <View style={styles.triggerBarBg}>
                  <View style={[styles.triggerBarFill, { width: `${pct}%`, backgroundColor: TRIGGER_COLORS[i % TRIGGER_COLORS.length] }]} />
                </View>
                <Text style={styles.triggerCount}>{t.count}</Text>
              </View>
            );
          })}
        </View>
      )}

      {/* High Risk Hours */}
      {data.high_risk_hours.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>⏰ High-Risk Hours</Text>
          <View style={styles.hoursRow}>
            {data.high_risk_hours.map((h, i) => (
              <View key={i} style={styles.hourCard}>
                <Text style={styles.hourTime}>{h.label}</Text>
                <Text style={styles.hourCount}>{h.count}</Text>
                <Text style={styles.hourLabel}>cravings</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Totals */}
      <View style={styles.totalsRow}>
        <View style={styles.totalCard}>
          <Text style={styles.totalEmoji}>😤</Text>
          <Text style={styles.totalValue}>{data.total_cravings}</Text>
          <Text style={styles.totalLabel}>Total Cravings</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalEmoji}>🚬</Text>
          <Text style={styles.totalValue}>{data.total_cigarettes}</Text>
          <Text style={styles.totalLabel}>Total Cigarettes</Text>
        </View>
        <View style={styles.totalCard}>
          <Text style={styles.totalEmoji}>🧘</Text>
          <Text style={styles.totalValue}>{data.interventions_completed}</Text>
          <Text style={styles.totalLabel}>Interventions</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 40 },
  noDataText: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  noDataSub: { color: '#475569', fontSize: 14, marginTop: 6, textAlign: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#f0fdf4' },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: '#1e293b' },
  periodBtnActive: { backgroundColor: '#8b5cf6' },
  periodBtnText: { color: '#64748b', fontWeight: '600', fontSize: 13 },
  periodBtnTextActive: { color: '#fff' },
  sectionTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 4 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  summaryCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  summaryValue: { fontSize: 26, fontWeight: '800', color: '#8b5cf6' },
  summaryLabel: { color: '#64748b', fontSize: 11, marginTop: 4 },
  avgRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  avgCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14 },
  avgLabel: { color: '#64748b', fontSize: 12 },
  avgValue: { color: '#f0fdf4', fontSize: 20, fontWeight: '700', marginVertical: 4 },
  avgBar: { height: 6, backgroundColor: '#0f172a', borderRadius: 3, overflow: 'hidden' },
  avgFill: { height: '100%', borderRadius: 3 },
  chartCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  chartTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  sectionCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 },
  triggerName: { color: '#f0fdf4', fontSize: 13, width: 90 },
  triggerBarBg: { flex: 1, height: 10, backgroundColor: '#0f172a', borderRadius: 5, overflow: 'hidden' },
  triggerBarFill: { height: '100%', borderRadius: 5 },
  triggerCount: { color: '#64748b', fontSize: 12, width: 24, textAlign: 'right' },
  hoursRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourCard: { backgroundColor: '#0f172a', borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 60 },
  hourTime: { color: '#8b5cf6', fontSize: 12, fontWeight: '700' },
  hourCount: { color: '#f0fdf4', fontSize: 18, fontWeight: '800' },
  hourLabel: { color: '#475569', fontSize: 10 },
  totalsRow: { flexDirection: 'row', gap: 10 },
  totalCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  totalEmoji: { fontSize: 24, marginBottom: 4 },
  totalValue: { color: '#f0fdf4', fontSize: 22, fontWeight: '800' },
  totalLabel: { color: '#64748b', fontSize: 10, marginTop: 2, textAlign: 'center' },
});
