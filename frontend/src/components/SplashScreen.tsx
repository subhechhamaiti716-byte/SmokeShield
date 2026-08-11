import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, StatusBar, Platform } from 'react-native';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade + scale in
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: Platform.OS !== 'web' }),
    ]).start(() => {
      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.08, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        ]),
        { iterations: 2 }
      ).start(() => {
        // Fade out and call onFinish
        Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: Platform.OS !== 'web' }).start(() => {
          onFinish();
        });
      });
    });
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <Animated.View
        style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}
      >
        <Animated.View style={[styles.shieldOuter, { transform: [{ scale: pulse }] }]}>
          <View style={styles.shieldInner}>
            <Text style={styles.shieldEmoji}>🛡️</Text>
          </View>
        </Animated.View>
        <Text style={styles.appName}>SmokeShield</Text>
        <Text style={styles.tagline}>Your AI-Powered Quit Companion</Text>
      </Animated.View>
      <Animated.View style={[styles.footer, { opacity: fadeAnim }]}>
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map(i => (
            <View key={i} style={styles.dot} />
          ))}
        </View>
        <Text style={styles.footerText}>Powered by Gemini AI</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  shieldOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(13,148,136,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: 'rgba(13,148,136,0.4)',
  },
  shieldInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(13,148,136,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldEmoji: {
    fontSize: 52,
  },
  appName: {
    fontSize: 36,
    fontWeight: '800',
    color: '#f0fdf4',
    letterSpacing: 1.5,
  },
  tagline: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  footer: {
    position: 'absolute',
    bottom: 48,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0d9488',
  },
  footerText: {
    color: '#334155',
    fontSize: 12,
  },
});
