import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, useWindowDimensions, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Manrope_800ExtraBold, Manrope_700Bold, Manrope_600SemiBold } from '@expo-google-fonts/manrope';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/config/supabaseClient';
import PasswordInput from './PasswordInput';

export const C = {
  ink: '#0f172a', sub: '#64748b', green: '#0b6b43', greenDark: '#074a2e',
  gold: '#c9a227', goldLight: '#e6c65c', greenTint: '#eafbf3', goldTint: '#fdf7e6',
  white: '#ffffff', border: '#e2e8f0', danger: '#dc2626',
};

const normalizePhone = (raw) => {
  let cleaned = raw.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) cleaned = '233' + cleaned.slice(1);
  if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
  return cleaned;
};
const phoneToEmail = (normalizedPhone) => `${normalizedPhone}@fieldsalesapp.local`;
const USER_CACHE_KEY = '@cached_user';

export default function LoginScreen({ onLogin, verifyOfflinePassword }) {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const [fontsLoaded] = useFonts({ Manrope_800ExtraBold, Manrope_700Bold, Manrope_600SemiBold });
  if (!fontsLoaded) return <View style={{ flex: 1, backgroundColor: C.white }} />;

  const submit = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert('Missing details', 'Enter both your phone number and password.');
      return;
    }
    setLoading(true);
    const normalizedPhone = normalizePhone(phone);
    const email = phoneToEmail(normalizedPhone);

    // 🛡️ OFFLINE CHECK
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && !navigator.onLine) {
       const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
       if (cachedUser) {
         const userObj = JSON.parse(cachedUser);
         if (userObj.phone === normalizedPhone) {
           const passwordOk = await verifyOfflinePassword(password);
           if (passwordOk) {
             Alert.alert('Offline Login', 'Password verified. Logging in...');
             onLogin(userObj, password);
             setLoading(false);
             return;
           } else {
             setLoading(false);
             Alert.alert('Wrong Password', 'The password does not match the saved offline password.');
             return;
           }
         }
       }
       setLoading(false);
       Alert.alert('No Internet', 'You need to be online for your very first login on this device.');
       return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cachedUser && (error.message.includes('Network') || error.message.includes('fetch'))) {
          const userObj = JSON.parse(cachedUser);
          if (userObj.phone === normalizedPhone) {
            const passwordOk = await verifyOfflinePassword(password);
            if (passwordOk) {
              Alert.alert('Offline Login', 'Password verified. Logging in...');
              onLogin(userObj, password);
              return;
            }
          }
        }
        setLoading(false);
        Alert.alert('Could not sign in', 'That phone number and password don\'t match.');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, role, status, phone_number')
        .eq('id', data.user.id)
        .single();

      setLoading(false);

      if (profileError || !profile) {
        const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
        if (cachedUser) { onLogin(JSON.parse(cachedUser), password); return; }
        Alert.alert('Error', 'Signed in, but your profile could not be loaded.');
        return;
      }

      if (profile.status === 'former' || profile.status === 'inactive') {
        Alert.alert(
          profile.status === 'inactive' ? 'Account set to inactive' : 'Account marked as former',
          'Contact your manager to activate your account.'
        );
        await supabase.auth.signOut();
        return;
      }

      const finalUser = { id: profile.id, name: profile.full_name, phone: profile.phone_number, role: profile.role };
      onLogin(finalUser, password);
    } catch (err) {
      setLoading(false);
      const cachedUser = await AsyncStorage.getItem(USER_CACHE_KEY);
      if (cachedUser) {
        const userObj = JSON.parse(cachedUser);
        if (userObj.phone === normalizedPhone) {
          const passwordOk = await verifyOfflinePassword(password);
          if (passwordOk) {
            Alert.alert('Offline Login', 'Password verified. Logging in...');
            onLogin(userObj, password);
            return;
          }
        }
      }
      Alert.alert('Network Error', 'Check your internet connection.');
    }
  };

  const forgotPassword = () => {
    Alert.alert('Forgot your login?', 'Only a manager can reset a phone number or password.');
  };

  const Hero = (
    <LinearGradient colors={[C.greenDark, C.green, '#0a5c39']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, isWide ? styles.heroWide : styles.heroNarrow]}>
      
      {/* Subtle Dot Grid Pattern */}
      <View style={styles.gridOverlay}>
        {Array.from({ length: 120 }).map((_, i) => (
          <View key={i} style={styles.gridDot} />
        ))}
      </View>

      {/* Dark gradient at bottom to anchor the text */}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={StyleSheet.absoluteFillObject} />

      <View style={styles.heroContent}>
        <View style={styles.brandRow}>
          <View style={styles.emblemOuter}>
            <View style={styles.emblemArcGreen} />
            <View style={styles.emblemArcGold} />
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={styles.wordmark}>FieldSales</Text>
            <Text style={styles.byline}>by SYNTRA DIGITAL SOLUTIONS</Text>
          </View>
        </View>
        
        <View style={{ marginTop: 60 }}>
          <Text style={styles.tagline}>Log your sales.</Text>
          <Text style={styles.tagline}>Track every route.</Text>
          <Text style={styles.subTagline}>The all-in-one field sales management platform for modern teams.</Text>
          
          {/* TRUST BADGES (Client Pleaser) */}
          <View style={styles.trustRow}>
            <View style={styles.trustBadge}><Text style={styles.trustText}>🔒 Bank-grade security</Text></View>
            <View style={styles.trustBadge}><Text style={styles.trustText}>📶 Works 100% offline</Text></View>
            <View style={styles.trustBadge}><Text style={styles.trustText}>☁️ Real-time cloud sync</Text></View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );

  const Form = (
    <View style={[styles.formPanel, isWide ? styles.formPanelWide : styles.formPanelNarrow]}>
      <ScrollView contentContainerStyle={styles.formInner} keyboardShouldPersistTaps="handled">
        
        <View style={styles.card}>
          <Text style={styles.headline}>Welcome back</Text>
          <Text style={styles.subhead}>Enter your details to access your dashboard.</Text>

          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            placeholder="024 000 0000"
            placeholderTextColor={C.sub}
            autoCapitalize="none"
          />

          <Text style={styles.label}>Password</Text>
          <PasswordInput style={styles.input} value={password} onChangeText={setPassword} placeholder="••••••••" />

          <TouchableOpacity onPress={forgotPassword}>
            <Text style={styles.forgotText}>Forgot your login?</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && { opacity: 0.8 }]} 
            onPress={submit} 
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={C.white} />
            ) : (
              <Text style={styles.submitText}>Sign In to Dashboard</Text>
            )}
          </TouchableOpacity>

          {/* Demo Hint for Presentations */}
          <View style={styles.demoHint}>
            <Text style={styles.demoHintText}>Demo Access: Manager (Admin) · Agent (Field Team)</Text>
          </View>
        </View>

            <View style={styles.footerContainer}>
          {/* Trust & Security Badges */}
          <View style={styles.securityRow}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={styles.securityText}>256-bit SSL Encrypted</Text>
            <Text style={styles.securityDivider}>•</Text>
            <Text style={styles.securityText}>Powered by Supabase</Text>
          </View>

          {/* Legal Links */}
          <View style={styles.linksRow}>
            <TouchableOpacity onPress={() => Alert.alert('Privacy Policy', 'Your data is encrypted and stored securely. We never share your sales data with third parties.')}>
              <Text style={styles.linkText}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>|</Text>
            <TouchableOpacity onPress={() => Alert.alert('Terms of Service', 'By logging in, you agree to the SYNTRA FieldSales terms of use.')}>
              <Text style={styles.linkText}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.linkDivider}>|</Text>
            <TouchableOpacity onPress={() => Alert.alert('Support', 'Contact your manager or email support@syntra.com for help.')}>
              <Text style={styles.linkText}>Help Center</Text>
            </TouchableOpacity>
          </View>

          {/* Copyright */}
          <Text style={styles.copyrightText}>© {new Date().getFullYear()} SYNTRA DIGITAL SOLUTIONS. All rights reserved.</Text>
        </View>
      </ScrollView>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {isWide ? <View style={styles.row}>{Hero}{Form}</View> : <View style={styles.column}>{Hero}{Form}</View>}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.white },
  row: { flex: 1, flexDirection: 'row' },
  column: { flex: 1, flexDirection: 'column' },
  
  // HERO (Left Side)
  hero: { justifyContent: 'space-between', padding: 60, overflow: 'hidden', position: 'relative' },
  heroWide: { flex: 1.2 },
  heroNarrow: { height: '35%', paddingTop: 60, paddingBottom: 40 },
  
  gridOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.08 },
  gridDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff', margin: 20 },

  heroContent: { zIndex: 10 },

  brandRow: { flexDirection: 'row', alignItems: 'center' },
  emblemOuter: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  emblemArcGreen: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, opacity: 0.95, left: 6, top: 6 },
  emblemArcGold: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: C.gold, opacity: 0.95, right: 6, bottom: 6 },
  wordmark: { fontFamily: 'Manrope_800ExtraBold', fontSize: 36, color: C.white, letterSpacing: -1 },
  byline: { fontFamily: 'Manrope_700Bold', fontSize: 13, color: C.goldLight, marginTop: 4, letterSpacing: 1 },
  
  tagline: { fontFamily: 'Manrope_800ExtraBold', fontSize: 42, color: C.white, lineHeight: 52, letterSpacing: -1 },
  subTagline: { fontFamily: 'Manrope_600SemiBold', fontSize: 18, color: 'rgba(255,255,255,0.75)', marginTop: 24, maxWidth: 400, lineHeight: 28 },

  trustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 40 },
  trustBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  trustText: { color: C.white, fontSize: 13, fontWeight: '700' },

  // FORM (Right Side)
  formPanel: { backgroundColor: '#f8fafc' },
  formPanelWide: { flex: 1, justifyContent: 'center', padding: 40 },
  formPanelNarrow: { flex: 1, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: '#f8fafc', paddingTop: 40 },
  formInner: { paddingHorizontal: 24, paddingBottom: 40, maxWidth: 480, width: '100%', alignSelf: 'center' },
  
  card: {
    backgroundColor: C.white,
    padding: 40,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 30,
    elevation: 5,
  },

  headline: { fontFamily: 'Manrope_800ExtraBold', fontSize: 32, color: C.ink, letterSpacing: -1 },
  subhead: { fontSize: 15, color: C.sub, marginTop: 8, marginBottom: 32 },
  
  label: { fontSize: 13, color: C.ink, fontWeight: '700', marginBottom: 8, marginTop: 20, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 16, fontSize: 16, color: C.ink, backgroundColor: C.white },
  
  forgotText: { color: C.green, fontSize: 14, fontWeight: '700', marginTop: 16, alignSelf: 'flex-start' },
  
  submitBtn: { backgroundColor: C.green, borderRadius: 12, paddingVertical: 18, alignItems: 'center', justifyContent: 'center', marginTop: 32, shadowColor: C.green, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12, minHeight: 58 },
  submitText: { color: C.white, fontFamily: 'Manrope_800ExtraBold', fontSize: 17, letterSpacing: 0.5 },
  
  demoHint: { marginTop: 24, alignItems: 'center' },
  demoHintText: { fontSize: 12, color: C.sub, fontWeight: '600', fontStyle: 'italic' },

  footerContainer: { marginTop: 40, alignItems: 'center', paddingBottom: 20 },
  
  securityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  securityIcon: { fontSize: 12, marginRight: 6 },
  securityText: { fontSize: 12, color: C.sub, fontWeight: '600' },
  securityDivider: { marginHorizontal: 8, color: C.border, fontSize: 10 },

  linksRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  linkText: { fontSize: 12, color: C.ink, fontWeight: '600', textDecorationLine: 'underline' },
  linkDivider: { marginHorizontal: 10, color: C.border, fontSize: 12 },
  
  copyrightText: { fontSize: 11, color: C.sub, textAlign: 'center' },
});