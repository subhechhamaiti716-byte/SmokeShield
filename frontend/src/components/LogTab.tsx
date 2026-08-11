import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '../utils/api';

interface LogTabProps {
  onLogSubmitted: () => void;
}

const LEVEL_OPTIONS = Array.from({ length: 11 }, (_, i) => i); // 0 to 10

const TRIGGERS = [
  { id: 'stress', label: 'Stress 😰' },
  { id: 'coffee', label: 'Coffee ☕' },
  { id: 'meals', label: 'After Meals 🍽️' },
  { id: 'alcohol', label: 'Alcohol 🍻' },
  { id: 'boredom', label: 'Boredom ⏰' },
  { id: 'social', label: 'Social 👥' },
  { id: 'work', label: 'Work 💼' },
  { id: 'morning', label: 'Morning 🌅' },
  { id: 'other', label: 'Other ❓' },
];

export function LogTab({ onLogSubmitted }: LogTabProps) {
  const [activeForm, setActiveForm] = useState<'checkin' | 'craving'>('checkin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check-in form fields
  const [smokedToday, setSmokedToday] = useState(false);
  const [checkinStress, setCheckinStress] = useState(3);
  const [checkinMood, setCheckinMood] = useState(7);
  const [checkinCraving, setCheckinCraving] = useState(2);
  const [sleepHours, setSleepHours] = useState('7');
  const [checkinNotes, setCheckinNotes] = useState('');

  // Craving form fields
  const [cravingLevel, setCravingLevel] = useState(5);
  const [cravingStress, setCravingStress] = useState(4);
  const [cravingTrigger, setCravingTrigger] = useState('stress');
  const [cravingNotes, setCravingNotes] = useState('');

  const submitCheckin = async () => {
    const sleep = parseFloat(sleepHours);
    if (isNaN(sleep)) {
      setError('Please enter a valid sleep duration.');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await apiRequest('/checkins', {
        method: 'POST',
        body: JSON.stringify({
          stress_level: checkinStress,
          mood_level: checkinMood,
          craving_level: checkinCraving,
          sleep_hours: sleep,
          smoked_today: smokedToday,
          notes: checkinNotes || undefined,
        }),
      });

      // Query relapse prediction based on this data
      try {
        const profile = await apiRequest('/users/smoking-profile');
        const cpd = profile.cigarettes_per_day;
        const rel = profile.previous_relapses;
        const streakData = await apiRequest('/recovery/progress');
        const sdays = streakData.smoke_free_days;

        await apiRequest('/predictions/relapse', {
          method: 'POST',
          body: JSON.stringify({
            craving_level: checkinCraving,
            stress_level: checkinStress,
            smoke_free_days: sdays,
            previous_relapses: rel,
            cigarettes_per_day: cpd,
            hour: new Date().getHours(),
            trigger: smokedToday ? 'relapse' : 'none',
          }),
        });
      } catch (e) {
        console.warn('Silent relapse prediction generation failed:', e);
      }

      setSuccess('Daily check-in saved! Your streak has been updated.');
      
      // Reset some fields
      setCheckinNotes('');
      onLogSubmitted();
    } catch (err: any) {
      setError(err?.detail || 'Failed to submit check-in.');
    } finally {
      setLoading(false);
    }
  };

  const submitCraving = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      await apiRequest('/cravings', {
        method: 'POST',
        body: JSON.stringify({
          craving_level: cravingLevel,
          stress_level: cravingStress,
          trigger: cravingTrigger,
          notes: cravingNotes || undefined,
        }),
      });

      // Query relapse prediction immediately based on this craving
      try {
        const profile = await apiRequest('/users/smoking-profile');
        const cpd = profile.cigarettes_per_day;
        const rel = profile.previous_relapses;
        const streakData = await apiRequest('/recovery/progress');
        const sdays = streakData.smoke_free_days;

        await apiRequest('/predictions/relapse', {
          method: 'POST',
          body: JSON.stringify({
            craving_level: cravingLevel,
            stress_level: cravingStress,
            smoke_free_days: sdays,
            previous_relapses: rel,
            cigarettes_per_day: cpd,
            hour: new Date().getHours(),
            trigger: cravingTrigger,
          }),
        });
      } catch (e) {
        console.warn('Silent prediction generation failed:', e);
      }

      setSuccess('Craving logged successfully. Risk factors recalculated!');
      setCravingNotes('');
      onLogSubmitted();
    } catch (err: any) {
      setError(err?.detail || 'Failed to log craving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Track Status</ThemedText>
        <ThemedText style={styles.dateLabel}>Provide updates to recalculate relapse risk</ThemedText>
      </View>

      {/* Selector Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, activeForm === 'checkin' && styles.toggleBtnActive]}
          onPress={() => { setActiveForm('checkin'); setError(null); setSuccess(null); }}
        >
          <ThemedText style={[styles.toggleText, activeForm === 'checkin' && styles.toggleTextActive]}>
            📝 Daily Check-In
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, activeForm === 'craving' && styles.toggleBtnActive]}
          onPress={() => { setActiveForm('craving'); setError(null); setSuccess(null); }}
        >
          <ThemedText style={[styles.toggleText, activeForm === 'craving' && styles.toggleTextActive]}>
            🔥 Log Craving
          </ThemedText>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        </View>
      )}

      {success && (
        <View style={styles.successBanner}>
          <ThemedText style={styles.successText}>{success}</ThemedText>
        </View>
      )}

      <ThemedView type="backgroundElement" style={styles.formCard}>
        {activeForm === 'checkin' ? (
          // Daily Check-In Form
          <View>
            <View style={styles.switchRow}>
              <View>
                <ThemedText style={styles.switchLabel}>Did you smoke today?</ThemedText>
                <ThemedText type="small" style={styles.switchSubtitle}>Be honest—we use this to help you recover</ThemedText>
              </View>
              <Switch
                value={smokedToday}
                onValueChange={setSmokedToday}
                trackColor={{ false: '#1e293b', true: '#f43f5e' }}
                thumbColor={smokedToday ? '#fff' : '#94a3b8'}
              />
            </View>

            {/* Slider/Option lists */}
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Stress Level (0 = relaxed, 10 = extreme)</ThemedText>
              <View style={styles.levelRow}>
                {LEVEL_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.levelBtn, checkinStress === val && styles.levelBtnActive]}
                    onPress={() => setCheckinStress(val)}
                  >
                    <ThemedText style={[styles.levelText, checkinStress === val && styles.levelTextActive]}>
                      {val}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Mood Level (0 = terrible, 10 = fantastic)</ThemedText>
              <View style={styles.levelRow}>
                {LEVEL_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.levelBtn, checkinMood === val && styles.levelBtnActive]}
                    onPress={() => setCheckinMood(val)}
                  >
                    <ThemedText style={[styles.levelText, checkinMood === val && styles.levelTextActive]}>
                      {val}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Craving Level (0 = none, 10 = irresistible)</ThemedText>
              <View style={styles.levelRow}>
                {LEVEL_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.levelBtn, checkinCraving === val && styles.levelBtnActive]}
                    onPress={() => setCheckinCraving(val)}
                  >
                    <ThemedText style={[styles.levelText, checkinCraving === val && styles.levelTextActive]}>
                      {val}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Sleep Duration (Hours)</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={sleepHours}
                onChangeText={setSleepHours}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Additional Notes / Thoughts</ThemedText>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={3}
                placeholder="How are you feeling today? Any specific challenges?"
                placeholderTextColor="#6c757d"
                value={checkinNotes}
                onChangeText={setCheckinNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={submitCheckin}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Submit Daily Check-In</ThemedText>}
            </TouchableOpacity>
          </View>
        ) : (
          // Log Craving Form
          <View>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Craving Intensity (0 to 10)</ThemedText>
              <View style={styles.levelRow}>
                {LEVEL_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.levelBtn, cravingLevel === val && styles.levelBtnActive]}
                    onPress={() => setCravingLevel(val)}
                  >
                    <ThemedText style={[styles.levelText, cravingLevel === val && styles.levelTextActive]}>
                      {val}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Stress Level (0 to 10)</ThemedText>
              <View style={styles.levelRow}>
                {LEVEL_OPTIONS.map((val) => (
                  <TouchableOpacity
                    key={val}
                    style={[styles.levelBtn, cravingStress === val && styles.levelBtnActive]}
                    onPress={() => setCravingStress(val)}
                  >
                    <ThemedText style={[styles.levelText, cravingStress === val && styles.levelTextActive]}>
                      {val}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>What triggered this craving?</ThemedText>
              <View style={styles.triggerGrid}>
                {TRIGGERS.map((t) => {
                  const selected = cravingTrigger === t.id;
                  return (
                    <TouchableOpacity
                      key={t.id}
                      style={[styles.triggerChip, selected && styles.triggerChipSelected]}
                      onPress={() => setCravingTrigger(t.id)}
                    >
                      <ThemedText style={[styles.triggerLabel, selected && styles.triggerLabelSelected]}>
                        {t.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Describe the situation (Optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                multiline
                numberOfLines={3}
                placeholder="What exactly is happening? Who are you with?"
                placeholderTextColor="#6c757d"
                value={cravingNotes}
                onChangeText={setCravingNotes}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: '#be123c' }, loading && styles.disabledButton]}
              onPress={submitCraving}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.buttonText}>Log Craving & Get Recommendations</ThemedText>}
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
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
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: Spacing.two,
    padding: Spacing.one,
    marginBottom: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: Spacing.one,
  },
  toggleBtnActive: {
    backgroundColor: '#0d9488',
  },
  toggleText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#ffffff',
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
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.four,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  switchLabel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  switchSubtitle: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: Spacing.four,
  },
  inputLabel: {
    color: '#cbd5e1',
    marginBottom: Spacing.two,
    fontSize: 13,
    fontWeight: '600',
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  levelBtn: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  levelBtnActive: {
    backgroundColor: '#0d9488',
    borderColor: '#14b8a6',
  },
  levelText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  levelTextActive: {
    color: '#ffffff',
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
  multilineInput: {
    textAlignVertical: 'top',
    height: 70,
  },
  triggerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  triggerChip: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: Spacing.three,
    paddingVertical: 6,
  },
  triggerChipSelected: {
    backgroundColor: 'rgba(190, 18, 60, 0.15)',
    borderColor: '#e11d48',
  },
  triggerLabel: {
    color: '#94a3b8',
    fontSize: 13,
  },
  triggerLabelSelected: {
    color: '#fb7185',
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#0d9488',
    borderRadius: Spacing.two,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  disabledButton: {
    backgroundColor: '#334155',
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
