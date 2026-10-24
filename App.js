import React, { useState, useEffect, useRef } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, View, Text, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as Crypto from 'expo-crypto';
import LoginScreen from './components/LoginScreen';
import AgentDashboard from './components/AgentDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { supabase } from './src/config/supabaseClient';
import { initSyncEngine } from './src/services/syncEngine';
import { ThemeProvider } from './src/theme/ThemeContext';
import { LanguageProvider } from './src/i18n/LanguageContext';

if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.documentElement.style.height = '100%';
  document.body.style.height = '100%';
  const rootEl = document.getElementById('root') || document.getElementById('main');
  if (rootEl) rootEl.style.height = '100%';
}

const USER_CACHE_KEY = '@cached_user';
const PASS_HASH_KEY = '@cached_pass_hash'; // NEW

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const userRef = useRef(user);

  useEffect(() => { userRef.current = user; }, [user]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    initSyncEngine((syncedCount) => {
      console.log(`Synced ${syncedCount} sale(s) to the server.`);
    });

    const loadSession = async () => {
      try {
        const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);

        let session = null;
        try {
          const { data } = await supabase.auth.getSession();
          session = data.session;
        } catch (e) {
          console.log('No network, using cached session');
        }

        if (session) {
          await loadProfile(session.user.id);
        } else if (cachedUser) {
          setUser(JSON.parse(cachedUser));
        }
      } catch (err) {
        console.error('Session init error:', err);
      } finally {
        setLoading(false);
      }
    };
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!userRef.current) setUser(null);
      } else if (session && event === 'SIGNED_IN') {
        await loadProfile(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, phone_number')
        .eq('id', userId)
        .single();

      if (error) {
        const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cached) setUser(JSON.parse(cached));
      } else if (data) {
        const finalUser = { id: userId, name: data.full_name, role: data.role, phone: data.phone_number };
        setUser(finalUser);
        await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(finalUser));
      }
    } catch (err) {
      const cached = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cached) setUser(JSON.parse(cached));
    }
  };

  // ✅ NEW: Save password hash on login
  const handleLoginSuccess = async (loggedInUser, password) => {
    setUser(loggedInUser);
    try {
      await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(loggedInUser));
      if (password) {
        const hash = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          password
        );
        await AsyncStorage.setItem(PASS_HASH_KEY, hash);
        console.log('✅ User + password hash saved to cache');
      }
    } catch (e) {
      console.log('❌ Failed to save cache:', e);
    }
  };

  // ✅ NEW: Verify password offline
  const verifyOfflinePassword = async (password) => {
    try {
      const savedHash = await AsyncStorage.getItem(PASS_HASH_KEY);
      if (!savedHash) return false;
      const inputHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
      );
      return savedHash === inputHash;
    } catch (e) {
      console.log('Password verify error:', e);
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.log('Supabase logout error (ignored):', e.message);
    }
    setUser(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

   const AppContent = (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>🔌 Offline Mode — Changes will sync when online</Text>
        </View>
      )}
      {!user ? (
        <LoginScreen onLogin={handleLoginSuccess} verifyOfflinePassword={verifyOfflinePassword} />
      ) : user.role === 'manager' || user.role === 'Manager' ? (
        <ManagerDashboard user={user} onLogout={handleLogout} />
      ) : (
        <AgentDashboard user={user} onLogout={handleLogout} />
      )}
    </SafeAreaView>
  );

  return (
    <ThemeProvider>
      <LanguageProvider>
        <ErrorBoundary>
           {AppContent}
        </ErrorBoundary>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' },
  offlineBanner: { backgroundColor: '#dc2626', paddingVertical: 6, alignItems: 'center' },
  offlineText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  webOuter: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 20 },
  webFrame: { width: '100%', maxWidth: 1100, height: '100%', maxHeight: 900, backgroundColor: '#f8fafc', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 40 },
});