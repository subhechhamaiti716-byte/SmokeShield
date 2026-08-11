import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { apiRequest } from '../utils/api';

interface Achievement {
  achievement_id: string;
  key: string;
  title: string;
  description?: string;
  icon?: string;
  points: number;
  category?: string;
  unlocked: boolean;
  unlocked_at?: string;
}

interface UserPoints {
  total_points: number;
  achievements_unlocked: number;
  total_achievements: number;
  level: string;
}

const LEVEL_COLORS: Record<string, string> = {
  Bronze: '#cd7f32',
  Silver: '#c0c0c0',
  Gold: '#ffd700',
  Platinum: '#e5e4e2',
  Diamond: '#b9f2ff',
};

const CATEGORY_LABELS: Record<string, string> = {
  streak: '🔥 Streak',
  craving: '🧠 Craving',
  intervention: '🧘 Coping',
  recovery: '💰 Recovery',
  general: '⭐ General',
};

export function AchievementsTab() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [points, setPoints] = useState<UserPoints | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');

  const fetchData = useCallback(async () => {
    try {
      const [achRes, ptsRes] = await Promise.all([
        apiRequest('/achievements'),
        apiRequest('/achievements/points'),
      ]);
      setAchievements(achRes || []);
      setPoints(ptsRes || null);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = achievements.filter(a => {
    if (filter === 'unlocked') return a.unlocked;
    if (filter === 'locked') return !a.unlocked;
    return true;
  });

  // Group by category
  const grouped: Record<string, Achievement[]> = {};
  filtered.forEach(a => {
    const cat = a.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(a);
  });

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#ffd700" /></View>;
  }

  const levelColor = LEVEL_COLORS[points?.level ?? 'Bronze'];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#ffd700" />}
    >
      {/* Level Card */}
      {points && (
        <View style={[styles.levelCard, { borderColor: levelColor }]}>
          <View style={styles.levelLeft}>
            <Text style={styles.levelTitle}>Your Level</Text>
            <Text style={[styles.levelName, { color: levelColor }]}>{points.level}</Text>
            <Text style={styles.levelPoints}>{points.total_points} points</Text>
          </View>
          <View style={styles.levelRight}>
            <Text style={styles.levelCircleText}>🏆</Text>
            <Text style={styles.achCount}>
              {points.achievements_unlocked}/{points.total_achievements}
            </Text>
            <Text style={styles.achCountLabel}>Unlocked</Text>
          </View>
        </View>
      )}

      {/* Progress bar */}
      {points && (
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, {
              width: `${Math.min(100, (points.achievements_unlocked / Math.max(points.total_achievements, 1)) * 100)}%`,
              backgroundColor: levelColor
            }]}
          />
        </View>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'unlocked', 'locked'] as const).map(f => (
          <TouchableOpacity key={f} style={[styles.filterBtn, filter === f && styles.filterBtnActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.filterBtnText, filter === f && styles.filterBtnTextActive]}>
              {f === 'all' ? 'All' : f === 'unlocked' ? '✅ Unlocked' : '🔒 Locked'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Grouped achievements */}
      {Object.entries(grouped).map(([cat, achs]) => (
        <View key={cat} style={styles.group}>
          <Text style={styles.groupTitle}>{CATEGORY_LABELS[cat] ?? cat}</Text>
          {achs.map(a => (
            <View key={a.achievement_id} style={[styles.achCard, !a.unlocked && styles.achCardLocked]}>
              <View style={[styles.achIcon, !a.unlocked && styles.achIconLocked]}>
                <Text style={styles.achEmoji}>{a.unlocked ? (a.icon ?? '🏅') : '🔒'}</Text>
              </View>
              <View style={styles.achInfo}>
                <Text style={[styles.achTitle, !a.unlocked && styles.achTitleLocked]}>{a.title}</Text>
                <Text style={styles.achDesc}>{a.description}</Text>
                {a.unlocked && a.unlocked_at && (
                  <Text style={styles.achDate}>
                    Unlocked {new Date(a.unlocked_at).toLocaleDateString()}
                  </Text>
                )}
              </View>
              <View style={styles.achPoints}>
                <Text style={[styles.achPointsValue, !a.unlocked && styles.achPointsLocked]}>
                  +{a.points}
                </Text>
                <Text style={styles.achPointsLabel}>pts</Text>
              </View>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 40 },
  levelCard: {
    backgroundColor: '#1e293b', borderRadius: 16, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 2, marginBottom: 10,
  },
  levelLeft: {},
  levelTitle: { color: '#64748b', fontSize: 12, marginBottom: 4 },
  levelName: { fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  levelPoints: { color: '#94a3b8', fontSize: 14, marginTop: 4 },
  levelRight: { alignItems: 'center' },
  levelCircleText: { fontSize: 36 },
  achCount: { color: '#f0fdf4', fontSize: 20, fontWeight: '800', marginTop: 4 },
  achCountLabel: { color: '#64748b', fontSize: 11 },
  progressBar: { height: 6, backgroundColor: '#1e293b', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  filterBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, backgroundColor: '#1e293b', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#ffd700' },
  filterBtnText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterBtnTextActive: { color: '#0f172a' },
  group: { marginBottom: 20 },
  groupTitle: { color: '#94a3b8', fontSize: 13, fontWeight: '700', marginBottom: 10 },
  achCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8,
    borderWidth: 1, borderColor: 'transparent',
  },
  achCardLocked: { opacity: 0.45 },
  achIcon: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(253,224,71,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  achIconLocked: { backgroundColor: '#0f172a' },
  achEmoji: { fontSize: 26 },
  achInfo: { flex: 1 },
  achTitle: { color: '#f0fdf4', fontSize: 15, fontWeight: '700' },
  achTitleLocked: { color: '#64748b' },
  achDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  achDate: { color: '#0d9488', fontSize: 11, marginTop: 4 },
  achPoints: { alignItems: 'center' },
  achPointsValue: { color: '#ffd700', fontSize: 18, fontWeight: '800' },
  achPointsLocked: { color: '#334155' },
  achPointsLabel: { color: '#64748b', fontSize: 10 },
});
