import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest, removeToken } from '../utils/api';

interface SettingsTabProps {
  onLogout: () => void;
}

export function SettingsTab({ onLogout }: SettingsTabProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      const data = await apiRequest('/users/smoking-profile');
      setProfile(data);
    } catch (e) {
      console.warn('Failed to load profile for settings:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    await removeToken();
    onLogout();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Settings</ThemedText>
        <ThemedText style={styles.subtitle}>Configure app preferences</ThemedText>
      </View>

      {success && (
        <View style={styles.successBanner}>
          <ThemedText style={styles.successText}>{success}</ThemedText>
        </View>
      )}

      {/* Smoking Profile Summary */}
      {profile && (
        <ThemedView type="backgroundElement" style={styles.card}>
          <ThemedText type="smallBold" style={styles.cardTitle}>🚬 SMOKING PLAN METRICS</ThemedText>
          
          <View style={styles.metricRow}>
            <ThemedText style={styles.metricLabel}>Daily Cigarettes Intake</ThemedText>
            <ThemedText style={styles.metricValue}>{profile.cigarettes_per_day}</ThemedText>
          </View>
          
          <View style={styles.metricRow}>
            <ThemedText style={styles.metricLabel}>Cigarette Unit Cost</ThemedText>
            <ThemedText style={styles.metricValue}>${profile.average_cigarette_cost?.toFixed(2)}</ThemedText>
          </View>

          <View style={styles.metricRow}>
            <ThemedText style={styles.metricLabel}>Smoking Duration</ThemedText>
            <ThemedText style={styles.metricValue}>{profile.years_smoking} Years</ThemedText>
          </View>

          <View style={styles.metricRow}>
            <ThemedText style={styles.metricLabel}>Quit Attempts</ThemedText>
            <ThemedText style={styles.metricValue}>{profile.previous_quit_attempts}</ThemedText>
          </View>

          <View style={styles.triggersSection}>
            <ThemedText type="smallBold" style={styles.triggersTitle}>Your Trigger Profile:</ThemedText>
            <View style={styles.triggerContainer}>
              {profile.common_triggers?.map((t: string, idx: number) => (
                <View key={idx} style={styles.triggerChip}>
                  <ThemedText style={styles.triggerText}>{t}</ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      )}

      {/* Logout Action */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={handleLogout}
      >
        <ThemedText style={styles.logoutBtnText}>Logout & Clear Cache</ThemedText>
      </TouchableOpacity>

      <View style={styles.footer}>
        <ThemedText type="small" style={styles.versionText}>SmokeShield v1.0.0 (Expo SDK 57)</ThemedText>
      </View>
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
  subtitle: {
    color: '#94a3b8',
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: Spacing.two,
    padding: Spacing.three,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  successText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardTitle: {
    color: '#0d9488',
    fontSize: 12,
    letterSpacing: 1.0,
    marginBottom: Spacing.two,
  },
  cardDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: Spacing.two,
    color: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: Spacing.three,
  },
  saveBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  metricLabel: {
    color: '#cbd5e1',
    fontSize: 14,
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  triggersSection: {
    marginTop: Spacing.three,
  },
  triggersTitle: {
    color: '#cbd5e1',
    fontSize: 13,
    marginBottom: Spacing.two,
  },
  triggerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  triggerChip: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: 4,
  },
  triggerText: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  logoutBtn: {
    backgroundColor: 'rgba(244, 63, 94, 0.08)',
    borderWidth: 1,
    borderColor: '#f43f5e',
    paddingVertical: 14,
    borderRadius: Spacing.two,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  logoutBtnText: {
    color: '#f43f5e',
    fontWeight: '700',
    fontSize: 15,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  versionText: {
    color: '#64748b',
    fontSize: 11,
  },
});
