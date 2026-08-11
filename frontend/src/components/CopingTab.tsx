import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest } from '../utils/api';

interface CopingTabProps {
  onActivityLogged: () => void;
}

export function CopingTab({ onActivityLogged }: CopingTabProps) {
  const [interventions, setInterventions] = useState<any[]>([]);
  const [recommended, setRecommended] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeActivity, setActiveActivity] = useState<any | null>(null);
  
  // Box Breathing state
  const [breathPhase, setBreathPhase] = useState<'Inhale' | 'Hold (Full)' | 'Exhale' | 'Hold (Empty)' | 'Ready'>('Ready');
  const [breathCountdown, setBreathCountdown] = useState(4);
  const [breathRounds, setBreathRounds] = useState(0);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingSession, setBreathingSession] = useState<any | null>(null);

  // Animated value for circle scaling
  const [scaleValue] = useState(new Animated.Value(1));

  const fetchInterventions = async () => {
    try {
      const all = await apiRequest('/interventions');
      setInterventions(all);
      
      const rec = await apiRequest('/interventions/recommended');
      setRecommended(rec);
    } catch (e) {
      console.warn('Failed to load coping activities:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterventions();
  }, []);

  // Breathing loop logic
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (breathingActive) {
      if (breathCountdown > 0) {
        timer = setTimeout(() => setBreathCountdown(c => c - 1), 1000);
      } else {
        // Transition phases
        if (breathPhase === 'Ready') {
          setBreathPhase('Inhale');
          setBreathCountdown(4);
          animateCircle(2.2, 4000);
        } else if (breathPhase === 'Inhale') {
          setBreathPhase('Hold (Full)');
          setBreathCountdown(4);
        } else if (breathPhase === 'Hold (Full)') {
          setBreathPhase('Exhale');
          setBreathCountdown(4);
          animateCircle(1.0, 4000);
        } else if (breathPhase === 'Exhale') {
          setBreathPhase('Hold (Empty)');
          setBreathCountdown(4);
        } else if (breathPhase === 'Hold (Empty)') {
          setBreathRounds(r => r + 1);
          setBreathPhase('Inhale');
          setBreathCountdown(4);
          animateCircle(2.2, 4000);
        }
      }
    }
    return () => clearTimeout(timer);
  }, [breathingActive, breathCountdown, breathPhase]);

  const animateCircle = (toValue: number, duration: number) => {
    Animated.timing(scaleValue, {
      toValue,
      duration,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  };

  const startBreathing = async (activity: any) => {
    setActiveActivity(activity);
    setBreathPhase('Ready');
    setBreathCountdown(3);
    setBreathRounds(0);
    setBreathingActive(true);
    animateCircle(1.0, 100);

    try {
      // Log start session
      const sess = await apiRequest(`/interventions/${activity.intervention_id}/start`, {
        method: 'POST',
      });
      setBreathingSession(sess);
    } catch (e) {
      console.warn('Failed to initialize session:', e);
    }
  };

  const stopBreathing = async (completed: boolean) => {
    setBreathingActive(false);
    setActiveActivity(null);
    animateCircle(1.0, 300);

    if (breathingSession) {
      try {
        await apiRequest(`/interventions/${breathingSession.session_id}/complete`, {
          method: 'POST',
          body: JSON.stringify({
            craving_before: 8, // Estimated start craving
            craving_after: completed ? 3 : 6, // Reduced if completed
            duration_seconds: breathRounds * 16,
          }),
        });
        onActivityLogged();
        fetchInterventions(); // reload recommendations
      } catch (e) {
        console.warn('Failed to complete breathing session:', e);
      }
    }
    setBreathingSession(null);
  };

  const getThemeIcon = (type: string) => {
    switch (type) {
      case 'breathing': return '💨';
      case 'walking': return '🚶';
      case 'mindfulness': return '🧘';
      case 'water': return '💧';
      case 'distraction': return '🎮';
      case 'journaling': return '📝';
      case 'support_contact': return '👥';
      default: return '🛡️';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
      </View>
    );
  }

  if (activeActivity && activeActivity.type === 'breathing') {
    return (
      <SafeAreaView style={styles.breathingScreen}>
        <View style={styles.breathingHeader}>
          <ThemedText type="subtitle" style={styles.breathingTitle}>Box Breathing</ThemedText>
          <ThemedText style={styles.breathingSubtitle}>Slow down your heart rate and ease anxiety</ThemedText>
        </View>

        <View style={styles.breathingBody}>
          {/* Animated Circle */}
          <View style={styles.animationWrapper}>
            <Animated.View style={[styles.breathingCircle, { transform: [{ scale: scaleValue }] }]} />
            <View style={styles.phaseLabelContainer}>
              <ThemedText style={styles.phaseCountdown}>{breathCountdown}</ThemedText>
              <ThemedText style={styles.phaseName}>{breathPhase}</ThemedText>
            </View>
          </View>

          <ThemedText style={styles.roundsText}>Completed Rounds: {breathRounds} / 4</ThemedText>
        </View>

        <View style={styles.breathingFooter}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => stopBreathing(false)}
          >
            <ThemedText style={styles.cancelBtnText}>Exit Session</ThemedText>
          </TouchableOpacity>
          {breathRounds >= 4 && (
            <TouchableOpacity
              style={styles.completeBtn}
              onPress={() => stopBreathing(true)}
            >
              <ThemedText style={styles.completeBtnText}>Mark Completed ✓</ThemedText>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <ThemedText type="subtitle" style={styles.title}>Coping Shield</ThemedText>
        <ThemedText style={styles.subtitle}>Scientific methods to pass cravings without smoking</ThemedText>
      </View>

      {/* Recommended activities */}
      {recommended.length > 0 && (
        <View style={styles.section}>
          <ThemedText type="smallBold" style={styles.sectionTitle}>🎯 Recommended For You</ThemedText>
          {recommended.map((act) => (
            <ThemedView key={act.intervention_id} type="backgroundElement" style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <ThemedText style={styles.activityIcon}>{getThemeIcon(act.type)}</ThemedText>
                <View style={styles.activityInfo}>
                  <ThemedText style={styles.activityTitle}>{act.title}</ThemedText>
                  <ThemedText type="small" style={styles.activityDuration}>{act.duration_minutes} Mins</ThemedText>
                </View>
              </View>
              <ThemedText type="small" style={styles.activityDesc}>{act.description}</ThemedText>
              
              <TouchableOpacity
                style={styles.startBtn}
                onPress={() => {
                  if (act.type === 'breathing') {
                    startBreathing(act);
                  } else {
                    // Start & complete generic activity straight away for prototype ease
                    startBreathing(act).then(() => stopBreathing(true));
                  }
                }}
              >
                <ThemedText style={styles.startBtnText}>Start Exercise</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))}
        </View>
      )}

      {/* All activities */}
      <View style={styles.section}>
        <ThemedText type="smallBold" style={styles.sectionTitle}>All Exercises</ThemedText>
        {interventions
          .filter(allAct => !recommended.find(r => r.intervention_id === allAct.intervention_id))
          .map((act) => (
            <ThemedView key={act.intervention_id} type="backgroundElement" style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <ThemedText style={styles.activityIcon}>{getThemeIcon(act.type)}</ThemedText>
                <View style={styles.activityInfo}>
                  <ThemedText style={styles.activityTitle}>{act.title}</ThemedText>
                  <ThemedText type="small" style={styles.activityDuration}>{act.duration_minutes} Mins</ThemedText>
                </View>
              </View>
              <ThemedText type="small" style={styles.activityDesc}>{act.description}</ThemedText>
              
              <TouchableOpacity
                style={[styles.startBtn, { backgroundColor: '#1e293b' }]}
                onPress={() => {
                  if (act.type === 'breathing') {
                    startBreathing(act);
                  } else {
                    startBreathing(act).then(() => stopBreathing(true));
                  }
                }}
              >
                <ThemedText style={[styles.startBtnText, { color: '#cbd5e1' }]}>Start Exercise</ThemedText>
              </TouchableOpacity>
            </ThemedView>
          ))}
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
  section: {
    marginBottom: Spacing.four,
  },
  sectionTitle: {
    color: '#0d9488',
    fontSize: 13,
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: Spacing.three,
  },
  activityCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: Spacing.three,
    padding: Spacing.four,
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.two,
  },
  activityIcon: {
    fontSize: 26,
    marginRight: Spacing.three,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  activityDuration: {
    color: '#94a3b8',
    fontSize: 12,
  },
  activityDesc: {
    color: '#cbd5e1',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: Spacing.three,
  },
  startBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 10,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  breathingScreen: {
    flex: 1,
    backgroundColor: '#0b0f19',
    justifyContent: 'space-between',
    padding: Spacing.four,
  },
  breathingHeader: {
    alignItems: 'center',
    marginTop: Spacing.five,
  },
  breathingTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  breathingSubtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
  },
  breathingBody: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  animationWrapper: {
    width: 250,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breathingCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(20, 184, 166, 0.15)',
    borderWidth: 2,
    borderColor: '#0d9488',
  },
  phaseLabelContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  phaseCountdown: {
    fontSize: 48,
    fontWeight: '700',
    color: '#ffffff',
  },
  phaseName: {
    fontSize: 14,
    color: '#14b8a6',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginTop: Spacing.one,
  },
  roundsText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: Spacing.five,
  },
  breathingFooter: {
    flexDirection: 'row',
    gap: Spacing.three,
    marginBottom: Spacing.five,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    paddingVertical: 14,
    borderRadius: Spacing.two,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cancelBtnText: {
    color: '#cbd5e1',
    fontWeight: '700',
  },
  completeBtn: {
    flex: 1.2,
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: Spacing.two,
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#ffffff',
    fontWeight: '700',
  },
});
