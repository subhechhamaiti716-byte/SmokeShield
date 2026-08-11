import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { AuthScreen }        from '@/components/AuthScreen';
import { OnboardingScreen }  from '@/components/OnboardingScreen';
import { SplashScreen }      from '@/components/SplashScreen';
import { DashboardTab }      from '@/components/DashboardTab';
import { LogTab }            from '@/components/LogTab';
import { SmokingLogTab }     from '@/components/SmokingLogTab';
import { ChatTab }           from '@/components/ChatTab';
import { CopingTab }         from '@/components/CopingTab';
import { AnalyticsTab }      from '@/components/AnalyticsTab';
import { AchievementsTab }   from '@/components/AchievementsTab';
import { NotificationsTab }  from '@/components/NotificationsTab';
import { SettingsTab }       from '@/components/SettingsTab';
import { initApiUrl, getToken, apiRequest } from '../utils/api';

type TabKey =
  | 'dashboard' | 'log' | 'smoking'
  | 'chat' | 'coping' | 'analytics'
  | 'achievements' | 'notifications' | 'settings';

interface TabDef {
  key: TabKey;
  icon: string;
  label: string;
}

const TABS: TabDef[] = [
  { key: 'dashboard',     icon: '🛡️',  label: 'Shield'    },
  { key: 'log',           icon: '📝',  label: 'Track'     },
  { key: 'smoking',       icon: '🚬',  label: 'Smoke'     },
  { key: 'chat',          icon: '💬',  label: 'Coach'     },
  { key: 'coping',        icon: '🧘',  label: 'Cope'      },
  { key: 'analytics',     icon: '📊',  label: 'Analytics' },
  { key: 'achievements',  icon: '🏆',  label: 'Awards'    },
  { key: 'notifications', icon: '🔔',  label: 'Alerts'    },
  { key: 'settings',      icon: '⚙️',  label: 'Settings'  },
];

// Show first 5 tabs, rest accessible via a "More" drawer or second row
const PRIMARY_TABS: TabKey[] = ['dashboard', 'log', 'chat', 'analytics', 'achievements'];
const SECONDARY_TABS: TabKey[] = ['smoking', 'coping', 'notifications', 'settings'];

export default function AppIndex() {
  const [splash, setSplash]           = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [token, setToken]             = useState<string | null>(null);
  const [user, setUser]               = useState<any>(null);
  const [profile, setProfile]         = useState<any>(null);
  const [activeTab, setActiveTab]     = useState<TabKey>('dashboard');
  const [showMore, setShowMore]       = useState(false);
  const [triggerRefresh, setTriggerRefresh] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const initApp = async () => {
    try {
      await initApiUrl();
      const savedToken = await getToken();
      if (savedToken) {
        setToken(savedToken);
        const userData = await apiRequest('/users/me');
        setUser(userData);
        try {
          const profileData = await apiRequest('/users/smoking-profile');
          setProfile(profileData);
        } catch (e: any) {
          if (e?.status !== 404) console.warn('Profile fetch warning:', e);
        }
      }
    } catch (err) {
      setToken(null);
    } finally {
      setCheckingAuth(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await apiRequest('/notifications/unread-count');
      setUnreadCount(res?.unread_count ?? 0);
    } catch (_) {}
  };

  useEffect(() => { initApp(); }, []);
  useEffect(() => {
    if (token) {
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleAuthSuccess = (jwt: string, authenticatedUser: any) => {
    setToken(jwt);
    setUser(authenticatedUser);
    apiRequest('/users/smoking-profile')
      .then(setProfile)
      .catch((err) => { if (err?.status === 404) setProfile(null); });
  };

  const handleSetupSuccess = (newProfile: any) => {
    setProfile(newProfile);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setToken(null); setUser(null); setProfile(null); setActiveTab('dashboard');
  };

  const refreshDashboard = () => {
    setTriggerRefresh(prev => !prev);
    fetchUnread();
  };

  const navigateTab = (tab: TabKey) => {
    setActiveTab(tab);
    setShowMore(false);
    if (tab === 'notifications') setUnreadCount(0);
  };

  // ─── Splash ───────────────────────────────────────────────────────
  if (splash) {
    return <SplashScreen onFinish={() => setSplash(false)} />;
  }

  // ─── Auth check loading ───────────────────────────────────────────
  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={styles.loadingText}>Securing Shield...</Text>
      </View>
    );
  }

  // ─── Not authenticated ────────────────────────────────────────────
  if (!token) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  // ─── Needs onboarding ─────────────────────────────────────────────
  if (!profile) {
    return <OnboardingScreen onSetupSuccess={handleSetupSuccess} />;
  }

  // ─── Main App ─────────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab onNavigateToTab={(tab: string) => navigateTab(tab as TabKey)} triggerRefresh={triggerRefresh} />;
      case 'log':
        return <LogTab onLogSubmitted={() => { refreshDashboard(); setActiveTab('dashboard'); }} />;
      case 'smoking':
        return <SmokingLogTab />;
      case 'chat':
        return <ChatTab onNavigateToTab={(tab: string) => navigateTab(tab as TabKey)} />;
      case 'coping':
        return <CopingTab onActivityLogged={refreshDashboard} />;
      case 'analytics':
        return <AnalyticsTab />;
      case 'achievements':
        return <AchievementsTab />;
      case 'notifications':
        return <NotificationsTab />;
      case 'settings':
        return <SettingsTab onLogout={handleLogout} />;
      default:
        return <DashboardTab onNavigateToTab={(tab: string) => navigateTab(tab as TabKey)} triggerRefresh={triggerRefresh} />;
    }
  };

  return (
    <SafeAreaView style={styles.appContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Content */}
      <View style={styles.content}>{renderContent()}</View>

      {/* "More" secondary tabs drawer */}
      {showMore && (
        <View style={styles.moreDrawer}>
          {SECONDARY_TABS.map(key => {
            const tab = TABS.find(t => t.key === key)!;
            return (
              <TouchableOpacity key={key} style={styles.moreItem} onPress={() => navigateTab(key)}>
                <Text style={styles.moreIcon}>{tab.icon}</Text>
                <Text style={styles.moreLabel}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Primary Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {PRIMARY_TABS.map(key => {
          const tab = TABS.find(t => t.key === key)!;
          const isActive = activeTab === key;
          return (
            <TouchableOpacity key={key} style={styles.tabItem} onPress={() => navigateTab(key)}>
              <View style={styles.tabIconWrapper}>
                <Text style={styles.tabIcon}>{tab.icon}</Text>
                {key === 'achievements' && unreadCount > 0 && (
                  <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
                )}
              </View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{tab.label}</Text>
              {isActive && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          );
        })}

        {/* More button */}
        <TouchableOpacity style={styles.tabItem} onPress={() => setShowMore(v => !v)}>
          <View style={styles.tabIconWrapper}>
            <Text style={styles.tabIcon}>{showMore ? '✕' : '≡'}</Text>
            {unreadCount > 0 && !showMore && (
              <View style={styles.badge}><Text style={styles.badgeText}>{unreadCount}</Text></View>
            )}
          </View>
          <Text style={styles.tabLabel}>More</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a',
  },
  loadingText: { marginTop: 12, color: '#94a3b8', fontSize: 14 },
  appContainer: { flex: 1, backgroundColor: '#0f172a' },
  content: { flex: 1 },

  // More drawer
  moreDrawer: {
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  moreItem: { alignItems: 'center', flex: 1 },
  moreIcon: { fontSize: 22 },
  moreLabel: { color: '#94a3b8', fontSize: 10, marginTop: 2 },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    height: Platform.OS === 'ios' ? 78 : 64,
    backgroundColor: 'rgba(15,23,42,0.98)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingBottom: Platform.OS === 'ios' ? 16 : 4,
    paddingTop: 4,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabIconWrapper: { position: 'relative' },
  tabIcon: { fontSize: 22, marginBottom: 2 },
  tabLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
  tabLabelActive: { color: '#14b8a6', fontWeight: '700' },
  tabIndicator: {
    position: 'absolute',
    bottom: -4,
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#14b8a6',
  },
  badge: {
    position: 'absolute', top: -4, right: -8,
    backgroundColor: '#e11d48', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
