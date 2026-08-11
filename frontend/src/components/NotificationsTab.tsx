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

interface Notification {
  notification_id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  data?: Record<string, unknown>;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  achievement:  { emoji: '🏆', color: '#ffd700' },
  milestone:    { emoji: '⭐', color: '#0d9488' },
  reminder:     { emoji: '🔔', color: '#3b82f6' },
  high_risk:    { emoji: '⚠️', color: '#e11d48' },
  default:      { emoji: '📢', color: '#8b5cf6' },
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationsTab() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await apiRequest('/notifications');
      setNotifications(res || []);
    } catch (_) {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const markRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.notification_id === id ? { ...n, read: true } : n));
    try { await apiRequest(`/notifications/${id}/read`, { method: 'POST' }); } catch (_) {}
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await apiRequest('/notifications/mark-all-read', { method: 'POST' }); } catch (_) {}
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>🔔 Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#3b82f6" />}
      >
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🔕</Text>
            <Text style={styles.emptyText}>No notifications yet</Text>
            <Text style={styles.emptySub}>Achievements and milestones will appear here</Text>
          </View>
        ) : (
          notifications.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.default;
            return (
              <TouchableOpacity
                key={n.notification_id}
                style={[styles.notifCard, !n.read && styles.notifCardUnread, { borderLeftColor: cfg.color }]}
                onPress={() => markRead(n.notification_id)}
                activeOpacity={0.8}
              >
                <View style={[styles.notifIcon, { backgroundColor: `${cfg.color}22` }]}>
                  <Text style={styles.notifEmoji}>{cfg.emoji}</Text>
                </View>
                <View style={styles.notifBody}>
                  <Text style={[styles.notifTitle, !n.read && styles.notifTitleUnread]}>{n.title}</Text>
                  <Text style={styles.notifText}>{n.body}</Text>
                  <Text style={styles.notifTime}>{timeAgo(n.created_at)}</Text>
                </View>
                {!n.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, paddingBottom: 8,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 22, fontWeight: '700', color: '#f0fdf4' },
  badge: {
    backgroundColor: '#e11d48', borderRadius: 10, minWidth: 20,
    height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  markAllText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  scroll: { padding: 16, paddingBottom: 40 },
  emptyState: { alignItems: 'center', paddingVertical: 80 },
  emptyEmoji: { fontSize: 52, marginBottom: 12 },
  emptyText: { color: '#94a3b8', fontSize: 18, fontWeight: '600' },
  emptySub: { color: '#475569', fontSize: 13, marginTop: 6, textAlign: 'center' },
  notifCard: {
    backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderLeftWidth: 3, borderLeftColor: 'transparent',
  },
  notifCardUnread: { backgroundColor: '#1e293b', borderColor: undefined },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifEmoji: { fontSize: 22 },
  notifBody: { flex: 1 },
  notifTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  notifTitleUnread: { color: '#f0fdf4' },
  notifText: { color: '#64748b', fontSize: 13, marginTop: 2, lineHeight: 18 },
  notifTime: { color: '#334155', fontSize: 11, marginTop: 4 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#3b82f6' },
});
