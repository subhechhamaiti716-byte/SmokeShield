import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { apiRequest } from '../utils/api';

interface SmokingLog {
  smoking_log_id: string;
  cigarettes: number;
  timestamp: string;
  trigger?: string;
  stress_level?: number;
  mood_level?: number;
  location?: string;
  notes?: string;
}

interface SmokingStats {
  total_logs: number;
  total_cigarettes: number;
  avg_per_day: number;
  most_common_trigger: string;
}

const TRIGGERS = ['Stress', 'After meal', 'Social', 'Boredom', 'Coffee', 'Alcohol', 'Work break', 'Morning', 'Other'];

export function SmokingLogTab() {
  const [logs, setLogs] = useState<SmokingLog[]>([]);
  const [stats, setStats] = useState<SmokingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [cigarettes, setCigarettes] = useState('1');
  const [trigger, setTrigger] = useState('');
  const [stress, setStress] = useState(5);
  const [mood, setMood] = useState(5);
  const [notes, setNotes] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        apiRequest('/smoking/logs?limit=30'),
        apiRequest('/smoking/stats'),
      ]);
      setLogs(logsRes || []);
      setStats(statsRes || null);
    } catch (e) {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    const cigs = parseInt(cigarettes, 10);
    if (isNaN(cigs) || cigs < 1) {
      Alert.alert('Invalid', 'Enter at least 1 cigarette');
      return;
    }
    setSaving(true);
    try {
      await apiRequest('/smoking/logs', {
        method: 'POST',
        body: JSON.stringify({
          cigarettes: cigs,
          trigger: trigger || null,
          stress_level: stress,
          mood_level: mood,
          notes: notes || null,
          timestamp: new Date().toISOString(),
        }),
      });
      setShowAdd(false);
      setCigarettes('1'); setTrigger(''); setStress(5); setMood(5); setNotes('');
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save log');
    } finally {
      setSaving(false);
    }
  };

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#f97316" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🚬 Smoking Log</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
            <Text style={styles.addBtnText}>+ Record</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        {stats && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_cigarettes}</Text>
              <Text style={styles.statLabel}>Total Cigarettes</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.avg_per_day?.toFixed(1) ?? '0'}</Text>
              <Text style={styles.statLabel}>Avg / Day</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_logs}</Text>
              <Text style={styles.statLabel}>Records</Text>
            </View>
          </View>
        )}

        {stats?.most_common_trigger ? (
          <View style={styles.triggerBanner}>
            <Text style={styles.triggerBannerText}>
              🎯 Most common trigger: <Text style={styles.triggerBold}>{stats.most_common_trigger}</Text>
            </Text>
          </View>
        ) : null}

        {/* Logs List */}
        {logs.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyText}>No smoking records yet</Text>
            <Text style={styles.emptySubtext}>Tap "+ Record" to add one</Text>
          </View>
        ) : (
          logs.map(log => (
            <View key={log.smoking_log_id} style={styles.logCard}>
              <View style={styles.logLeft}>
                <Text style={styles.logCigs}>🚬 {log.cigarettes} cigarette{log.cigarettes > 1 ? 's' : ''}</Text>
                <Text style={styles.logTime}>{formatTime(log.timestamp)}</Text>
                {log.trigger && <Text style={styles.logTag}>📍 {log.trigger}</Text>}
                {log.notes ? <Text style={styles.logNotes}>{log.notes}</Text> : null}
              </View>
              <View style={styles.logRight}>
                {log.stress_level != null && (
                  <View style={[styles.levelBadge, { backgroundColor: log.stress_level > 6 ? '#7f1d1d' : '#1e293b' }]}>
                    <Text style={styles.levelBadgeText}>😰 {log.stress_level}</Text>
                  </View>
                )}
                {log.mood_level != null && (
                  <View style={[styles.levelBadge, { backgroundColor: '#1e293b' }]}>
                    <Text style={styles.levelBadgeText}>😊 {log.mood_level}</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <Modal visible={showAdd} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Record Smoking</Text>

            <Text style={styles.fieldLabel}>Cigarettes smoked</Text>
            <View style={styles.cigRow}>
              <TouchableOpacity style={styles.cigBtn} onPress={() => setCigarettes(v => String(Math.max(1, parseInt(v || '1', 10) - 1)))}>
                <Text style={styles.cigBtnText}>−</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.cigInput}
                value={cigarettes}
                onChangeText={setCigarettes}
                keyboardType="numeric"
              />
              <TouchableOpacity style={styles.cigBtn} onPress={() => setCigarettes(v => String((parseInt(v || '1', 10) + 1)))}>
                <Text style={styles.cigBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Trigger</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.triggerScroll}>
              {TRIGGERS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.triggerChip, trigger === t && styles.triggerChipActive]}
                  onPress={() => setTrigger(trigger === t ? '' : t)}
                >
                  <Text style={[styles.triggerChipText, trigger === t && styles.triggerChipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Stress Level: {stress}/10</Text>
            <View style={styles.sliderRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} style={[styles.sliderDot, n <= stress && styles.sliderDotActive]} onPress={() => setStress(n)}>
                  <Text style={styles.sliderDotText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Mood Level: {mood}/10</Text>
            <View style={styles.sliderRow}>
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <TouchableOpacity key={n} style={[styles.sliderDot, n <= mood && { backgroundColor: '#0d9488' }]} onPress={() => setMood(n)}>
                  <Text style={styles.sliderDotText}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="What happened before you smoked?"
              placeholderTextColor="#475569"
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Record</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  scroll: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: '#f0fdf4' },
  addBtn: { backgroundColor: '#f97316', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statCard: { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: '800', color: '#f97316' },
  statLabel: { fontSize: 11, color: '#64748b', marginTop: 4, textAlign: 'center' },
  triggerBanner: { backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#f97316' },
  triggerBannerText: { color: '#94a3b8', fontSize: 13 },
  triggerBold: { color: '#f97316', fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  emptySubtext: { color: '#475569', fontSize: 14, marginTop: 6 },
  logCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  logLeft: { flex: 1 },
  logRight: { gap: 4 },
  logCigs: { color: '#f0fdf4', fontSize: 16, fontWeight: '600' },
  logTime: { color: '#64748b', fontSize: 12, marginTop: 2 },
  logTag: { color: '#f97316', fontSize: 12, marginTop: 4 },
  logNotes: { color: '#94a3b8', fontSize: 12, marginTop: 4, fontStyle: 'italic' },
  levelBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  levelBadgeText: { color: '#cbd5e1', fontSize: 11 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#f0fdf4', marginBottom: 20 },
  fieldLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 8, marginTop: 12 },
  cigRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cigBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  cigBtnText: { color: '#f0fdf4', fontSize: 22, fontWeight: '700' },
  cigInput: { width: 64, height: 44, backgroundColor: '#0f172a', borderRadius: 10, color: '#f0fdf4', fontSize: 20, textAlign: 'center', fontWeight: '700' },
  triggerScroll: { marginBottom: 4 },
  triggerChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#0f172a', marginRight: 8, borderWidth: 1, borderColor: '#334155' },
  triggerChipActive: { backgroundColor: '#f97316', borderColor: '#f97316' },
  triggerChipText: { color: '#64748b', fontSize: 13 },
  triggerChipTextActive: { color: '#fff', fontWeight: '600' },
  sliderRow: { flexDirection: 'row', gap: 4 },
  sliderDot: { flex: 1, height: 32, borderRadius: 6, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  sliderDotActive: { backgroundColor: '#dc2626' },
  sliderDotText: { color: '#94a3b8', fontSize: 11 },
  notesInput: { backgroundColor: '#0f172a', borderRadius: 10, padding: 12, color: '#f0fdf4', minHeight: 70, textAlignVertical: 'top', fontSize: 14 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 12, backgroundColor: '#334155', alignItems: 'center' },
  cancelBtnText: { color: '#94a3b8', fontWeight: '600' },
  saveBtn: { flex: 2, padding: 14, borderRadius: 12, backgroundColor: '#f97316', alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
