import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '../utils/api';

interface OnboardingScreenProps {
  onSetupSuccess: (profile: any) => void;
}

const AVAILABLE_TRIGGERS = [
  { id: 'stress', label: 'Stress & Anxiety 😰' },
  { id: 'coffee', label: 'With Coffee / Tea ☕' },
  { id: 'meals', label: 'After Meals 🍽️' },
  { id: 'alcohol', label: 'With Alcohol 🍻' },
  { id: 'boredom', label: 'Boredom ⏰' },
  { id: 'social', label: 'Social Settings 👥' },
  { id: 'work', label: 'Work Pressure 💼' },
  { id: 'morning', label: 'Morning Routine 🌅' },
];

export function OnboardingScreen({ onSetupSuccess }: OnboardingScreenProps) {
  const [cigarettesPerDay, setCigarettesPerDay] = useState('');
  const [yearsSmoking, setYearsSmoking] = useState('');
  const [attempts, setAttempts] = useState('');
  const [relapses, setRelapses] = useState('');
  const [cost, setCost] = useState('');
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTrigger = (id: string) => {
    if (selectedTriggers.includes(id)) {
      setSelectedTriggers(selectedTriggers.filter((t) => t !== id));
    } else {
      setSelectedTriggers([...selectedTriggers, id]);
    }
  };

  const handleSave = async () => {
    const cpd = parseInt(cigarettesPerDay, 10);
    const yrs = parseInt(yearsSmoking, 10);
    const att = parseInt(attempts, 10);
    const rel = parseInt(relapses, 10);
    const avgCost = parseFloat(cost);

    if (isNaN(cpd) || isNaN(yrs) || isNaN(att) || isNaN(rel) || isNaN(avgCost)) {
      setError('Please fill in all numerical fields correctly.');
      return;
    }

    if (selectedTriggers.length === 0) {
      setError('Please select at least one common trigger.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest('/users/smoking-profile', {
        method: 'POST',
        body: JSON.stringify({
          cigarettes_per_day: cpd,
          years_smoking: yrs,
          previous_quit_attempts: att,
          previous_relapses: rel,
          average_cigarette_cost: avgCost,
          common_triggers: selectedTriggers,
        }),
      });
      onSetupSuccess(data);
    } catch (err: any) {
      setError(err?.detail || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <ThemedText style={styles.badgeText}>STEP 2 OF 2</ThemedText>
          <ThemedText type="subtitle" style={styles.title}>
            Personalize Your Shield
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            We analyze your smoking patterns to predict relapse risks and tailor coping strategies.
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.formCard}>
          {error && (
            <View style={styles.errorBanner}>
              <ThemedText style={styles.errorText}>{error}</ThemedText>
            </View>
          )}

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.two }]}>
              <ThemedText type="small" style={styles.inputLabel}>Cigarettes / Day</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={cigarettesPerDay}
                onChangeText={setCigarettesPerDay}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText type="small" style={styles.inputLabel}>Years Smoking</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={yearsSmoking}
                onChangeText={setYearsSmoking}
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.two }]}>
              <ThemedText type="small" style={styles.inputLabel}>Quit Attempts</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={attempts}
                onChangeText={setAttempts}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <ThemedText type="small" style={styles.inputLabel}>Past Relapses</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={relapses}
                onChangeText={setRelapses}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.inputLabel}>Average Cost per Cigarette (in $)</ThemedText>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={cost}
              onChangeText={setCost}
              placeholder="e.g. 0.75"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.inputLabel}>Select Your Common Triggers</ThemedText>
            <View style={styles.triggerGrid}>
              {AVAILABLE_TRIGGERS.map((trigger) => {
                const isSelected = selectedTriggers.includes(trigger.id);
                return (
                  <TouchableOpacity
                    key={trigger.id}
                    style={[styles.triggerChip, isSelected && styles.triggerChipSelected]}
                    onPress={() => toggleTrigger(trigger.id)}
                  >
                    <ThemedText style={[styles.triggerLabel, isSelected && styles.triggerLabelSelected]}>
                      {trigger.label}
                    </ThemedText>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.disabledButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Activate SmokeShield</ThemedText>
            )}
          </TouchableOpacity>
        </ThemedView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  scrollContent: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  badgeText: {
    color: '#0d9488',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: Spacing.one,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 22,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  row: {
    flexDirection: 'row',
    marginBottom: Spacing.three,
  },
  inputGroup: {
    marginBottom: Spacing.three,
  },
  inputLabel: {
    color: '#94a3b8',
    marginBottom: Spacing.one,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: Spacing.two,
    color: '#ffffff',
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
    fontSize: 15,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.one,
    gap: Spacing.two,
  },
  triggerChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  triggerChipSelected: {
    backgroundColor: 'rgba(13, 148, 136, 0.15)',
    borderColor: '#0d9488',
  },
  triggerLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  triggerLabelSelected: {
    color: '#14b8a6',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0d9488',
    borderRadius: Spacing.two,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.four,
  },
  disabledButton: {
    backgroundColor: '#115e59',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
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
});
