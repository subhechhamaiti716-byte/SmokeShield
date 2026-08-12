import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';
import { Spacing } from '@/constants/theme';
import { apiRequest, saveToken } from '../utils/api';

interface AuthScreenProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    if (!isLogin && !fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        // Login flow
        const data = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        
        const token = data.access_token;
        await saveToken(token);
        
        // Fetch current user details
        const user = await apiRequest('/users/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        onAuthSuccess(token, user);
      } else {
        // Register flow
        const registerData = await apiRequest('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
          }),
        });

        // Auto login after registration
        const loginData = await apiRequest('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        
        const token = loginData.access_token;
        await saveToken(token);
        onAuthSuccess(token, registerData);
      }
    } catch (err: any) {
      setError(err?.detail || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <ThemedText style={styles.logoText}>🛡️</ThemedText>
            </View>
            <ThemedText type="subtitle" style={styles.title}>
              SmokeShield
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {isLogin ? 'Welcome back! Let\'s protect your progress.' : 'Start your smoke-free journey today.'}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.formCard}>
            <ThemedText type="smallBold" style={styles.formTitle}>
              {isLogin ? 'LOGIN TO YOUR SHIELD' : 'CREATE YOUR SHIELD ACCOUNT'}
            </ThemedText>

            {error && (
              <View style={styles.errorBanner}>
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              </View>
            )}

            {!isLogin && (
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Full Name</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Subhechha Maiti"
                  placeholderTextColor="#6c757d"
                  value={fullName}
                  onChangeText={setFullName}
                  autoCapitalize="words"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Email Address</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#6c757d"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.inputLabel}>Password</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="••••••••••••"
                placeholderTextColor="#6c757d"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>
                  {isLogin ? 'Access Dashboard' : 'Create My Shield'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </ThemedView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)} disabled={loading}>
              <ThemedText type="linkPrimary" style={styles.switchText}>
                {isLogin ? 'Don\'t have an account? Sign Up' : 'Already have an account? Log In'}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.five,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.three,
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.25)',
  },
  logoText: {
    fontSize: 32,
  },
  title: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: Spacing.five,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: 14,
    textAlign: 'center',
    marginTop: Spacing.one,
    paddingHorizontal: Spacing.three,
    lineHeight: 20,
  },
  formCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderRadius: Spacing.four,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  formTitle: {
    color: '#0d9488',
    letterSpacing: 1.5,
    marginBottom: Spacing.three,
    textAlign: 'center',
    fontSize: 12,
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
    lineHeight: 18,
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
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    fontSize: 15,
  },
  primaryButton: {
    backgroundColor: '#0d9488',
    borderRadius: Spacing.two,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.three,
    shadowColor: '#0d9488',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
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
  footer: {
    alignItems: 'center',
    marginTop: Spacing.four,
  },
  switchText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#14b8a6',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ipBadge: {
    color: '#14b8a6',
    backgroundColor: 'rgba(20, 184, 166, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 'bold',
  },
  apiInput: {
    fontSize: 13,
    color: '#94a3b8',
    borderColor: 'rgba(20, 184, 166, 0.15)',
  },
});
