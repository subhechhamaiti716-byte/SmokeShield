import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '../utils/api';

interface DashboardTabProps {
  onNavigateToTab: (tab: string) => void;
  triggerRefresh: boolean;
}

const HEALTH_MILESTONES = [
  { id: '1', title: 'Heart rate & blood pressure drop', durationHours: 2, desc: 'Your pulse returns to a normal resting rate.' },
  { id: '2', title: 'Carbon Monoxide drops to normal', durationHours: 12, desc: 'Oxygen levels in your blood return to normal.' },
  { id: '3', title: 'Circulation & lung function improve', durationHours: 24, desc: 'Your heart attack risk begins to drop.' },
  { id: '4', title: 'Taste and smell senses improve', durationHours: 48, desc: 'Nerve endings start regrowing.' },
  { id: '5', title: 'Nicotine completely leaves body', durationHours: 72, desc: 'Withdrawal symptoms peak but will decline.' },
];

export function DashboardTab({ onNavigateToTab, triggerRefresh }: DashboardTabProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      
      // Load progress
      const progData = await apiRequest('/recovery/progress');
      setProgress(progData);

      // Load latest prediction
      try {
        const predData = await apiRequest('/predictions/relapse/latest');
        setPrediction(predData);
      } catch (err: any) {
        // Safe to ignore if no prediction exists yet
        if (err?.status !== 404) {
          console.warn('Relapse prediction load failed:', err);
        }
      }
    } catch (err: any) {
      setError('Could not load dashboard data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [triggerRefresh]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  // Calculate health progress percentage based on streak
  const smokeFreeHours = (progress?.current_streak || 0) * 24;

  const getRiskColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'HIGH': return '#f43f5e';
      case 'MEDIUM': return '#d97706';
      case 'LOW': return '#10b981';
      default: return '#94a3b8';
    }
  };

  const riskLevel = prediction?.risk_level || 'UNKNOWN';
  const riskScore = prediction?.risk_score || 0;
  const topFactors = prediction?.top_factors || [];

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0d9488" />
      }
    >
      {/* Title */}
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Your Shield</ThemedText>
        <ThemedText style={styles.dateLabel}>Live stats & health status</ThemedText>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {/* Streak Ring */}
      <ThemedView type="backgroundElement" style={styles.streakCard}>
        <View style={styles.ringContainer}>
          <View style={[styles.outerRing, { borderColor: smokeFreeHours > 0 ? '#0d9488' : '#334155' }]}>
            <ThemedText style={styles.streakNumber}>{progress?.current_streak || 0}</ThemedText>
            <ThemedText style={styles.streakLabel}>Smoke-Free Days</ThemedText>
          </View>
        </View>
        <View style={styles.streakGrid}>
          <View style={styles.streakGridItem}>
            <ThemedText style={styles.streakGridVal}>{progress?.longest_streak || 0}</ThemedText>
            <ThemedText style={styles.streakGridLbl}>Longest Streak</ThemedText>
          </View>
          <View style={styles.verticalDivider} />
          <View style={styles.streakGridItem}>
            <ThemedText style={styles.streakGridVal}>#{progress?.smoke_free_days || 0}</ThemedText>
            <ThemedText style={styles.streakGridLbl}>Total Quit Days</ThemedText>
          </View>
        </View>
      </ThemedView>

      {/* Savings and Cigs avoided */}
      <View style={styles.row}>
        <ThemedView type="backgroundElement" style={[styles.halfCard, { marginRight: Spacing.two }]}>
          <ThemedText style={styles.cardIcon}>💰</ThemedText>
          <ThemedText style={styles.cardLabel}>Money Saved</ThemedText>
          <ThemedText style={styles.cardValue}>${progress?.money_saved?.toFixed(2) || '0.00'}</ThemedText>
        </ThemedView>
        <ThemedView type="backgroundElement" style={styles.halfCard}>
          <ThemedText style={styles.cardIcon}>🚭</ThemedText>
          <ThemedText style={styles.cardLabel}>Avoided Cigs</ThemedText>
          <ThemedText style={styles.cardValue}>{progress?.cigarettes_avoided || 0}</ThemedText>
        </ThemedView>
      </View>

      {/* AI ML Relapse Predictor Section */}
      <ThemedView type="backgroundElement" style={styles.riskCard}>
        <View style={styles.riskHeader}>
          <ThemedText style={styles.riskTitle}>🔮 Relapse Risk Estimator</ThemedText>
          <View style={[styles.riskBadge, { backgroundColor: getRiskColor(riskLevel) }]}>
            <ThemedText style={styles.riskBadgeText}>{riskLevel}</ThemedText>
          </View>
        </View>
        
        {prediction ? (
          <View style={styles.predictionDetails}>
            <View style={styles.scoreRow}>
              <ThemedText style={styles.scoreNumber}>{riskScore}%</ThemedText>
              <ThemedText style={styles.scoreLabel}>Relapse Likelihood</ThemedText>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${riskScore}%`, backgroundColor: getRiskColor(riskLevel) }]} />
            </View>
            
            {topFactors.length > 0 && (
              <View style={styles.factorsList}>
                <ThemedText type="smallBold" style={styles.factorsTitle}>Risk Factors Identified:</ThemedText>
                {topFactors.map((factor: string, idx: number) => (
                  <ThemedText key={idx} type="small" style={styles.factorItem}>
                    • {factor}
                  </ThemedText>
                ))}
              </View>
            )}

            {riskLevel === 'HIGH' && (
              <TouchableOpacity
                style={[styles.urgentButton, { borderColor: '#f43f5e' }]}
                onPress={() => onNavigateToTab('coping')}
              >
                <ThemedText style={styles.urgentButtonText}>🚨 HIGH RISK: Start Breathing Exercise Now</ThemedText>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.noPrediction}>
            <ThemedText style={styles.noPredictionText}>
              Log a craving entry or daily check-in to analyze your relapse risk.
            </ThemedText>
            <TouchableOpacity style={styles.logButton} onPress={() => onNavigateToTab('log')}>
              <ThemedText style={styles.logButtonText}>Perform First Check-In</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>

      {/* Health Milestones */}
      <View style={styles.sectionHeader}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>Physical Recovery Milestones</ThemedText>
      </View>

      {HEALTH_MILESTONES.map((milestone) => {
        const completed = smokeFreeHours >= milestone.durationHours;
        const progressPct = Math.min(100, Math.max(0, (smokeFreeHours / milestone.durationHours) * 100));

        return (
          <ThemedView key={milestone.id} type="backgroundElement" style={styles.milestoneCard}>
            <View style={styles.milestoneHeader}>
              <ThemedText style={[styles.milestoneTitle, completed && styles.completedText]}>
                {milestone.title}
              </ThemedText>
              <ThemedText style={styles.milestoneHours}>
                {completed ? '✓ Unlocked' : `${milestone.durationHours}h`}
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.milestoneDesc}>{milestone.desc}</ThemedText>
            <View style={styles.progressTrack}>
              <View style={[styles.progressIndicator, { width: `${progressPct}%`, backgroundColor: completed ? '#10b981' : '#0d9488' }]} />
            </View>
          </ThemedView>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    backgroundColor: '#0b0f19',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
  },
  header: {
    marginBottom: Spacing.four,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 24,
  },
  dateLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  errorBanner: {
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.25)',
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 13,
  },
  streakCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  ringContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: Spacing.three,
  },
  outerRing: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 38,
    fontWeight: '700',
    color: '#ffffff',
  },
  streakLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  streakGrid: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: Spacing.three,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    paddingTop: Spacing.three,
  },
  streakGridItem: {
    flex: 1,
    alignItems: 'center',
  },
  streakGridVal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  streakGridLbl: {
    fontSize: 12,
    color: '#94a3b8',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  halfCard: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  cardIcon: {
    fontSize: 22,
    marginBottom: Spacing.one,
  },
  cardLabel: {
    color: '#94a3b8',
    fontSize: 12,
  },
  cardValue: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  riskCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.three,
  },
  riskTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  riskBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    borderRadius: 12,
  },
  riskBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  predictionDetails: {
    marginTop: Spacing.one,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: Spacing.one,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginRight: Spacing.one,
  },
  scoreLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#1e293b',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: Spacing.three,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  factorsList: {
    marginTop: Spacing.two,
    padding: Spacing.three,
    backgroundColor: '#0f172a',
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  factorsTitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: Spacing.one,
  },
  factorItem: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
  },
  urgentButton: {
    marginTop: Spacing.three,
    paddingVertical: 12,
    borderRadius: Spacing.two,
    borderWidth: 1,
    alignItems: 'center',
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
  },
  urgentButtonText: {
    color: '#f43f5e',
    fontWeight: '700',
    fontSize: 13,
  },
  noPrediction: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  noPredictionText: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.three,
  },
  logButton: {
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
  },
  logButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    marginTop: Spacing.two,
    marginBottom: Spacing.three,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
  },
  milestoneCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  milestoneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
    flex: 1,
  },
  completedText: {
    color: '#10b981',
  },
  milestoneHours: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '600',
  },
  milestoneDesc: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: Spacing.two,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#1e293b',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressIndicator: {
    height: '100%',
  },
});
