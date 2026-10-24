import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabaseAdmin } from '../src/config/supabaseAdminClient';

const normalizePhone = (raw) => {
  let cleaned = raw.replace(/[^\d]/g, '');
  if (cleaned.startsWith('0')) cleaned = '233' + cleaned.slice(1);
  if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
  return cleaned;
};
const phoneToEmail = (normalizedPhone) => `${normalizedPhone}@fieldsalesapp.local`;

export default function RegisterAgentModal({ visible, onClose, onRegistered }) {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [role, setRole] = useState('agent');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // <--- ADD THIS LINE HERE

  const submit = async () => {
        const digitsOnly = phone.replace(/[^\d]/g, '');
    if (!fullName.trim() || digitsOnly.length < 9 || tempPassword.length < 6) {
            Alert.alert('Missing details', 'Enter a name, a valid phone number (at least 9 digits), and a starting password of at least 6 characters.');
      return;
    }
    setLoading(true);
    const normalized = normalizePhone(phone);
    try {
      const { data, error } = await supabaseAdmin.auth.signUp({
        email: phoneToEmail(normalized),
        password: tempPassword,
        options: { data: { full_name: fullName.trim(), role, phone_number: normalized } },
      });

      console.log('SignUp result:', JSON.stringify({ data, error }, null, 2));

      setLoading(false);

      if (error) {
        Alert.alert('Registration Failed', error.message);
        return;
      }
      if (!data?.user) {
        Alert.alert('Registration Failed', 'No user was returned — check the console log for details.');
        return;
      }

      Alert.alert(
        `${role === 'manager' ? 'Manager' : 'Agent'} Registered`,
        `${fullName.trim()} can now log in with ${normalized} and the password you set. They should change it from Account Settings once they're in.`
      );
      setFullName(''); setPhone(''); setTempPassword(''); setRole('agent');
      onClose();
      if (onRegistered) onRegistered();
    } catch (e) {
      setLoading(false);
      console.log('SignUp exception:', e);
      Alert.alert('Error', e.message || 'Something went wrong — check the console log.');
    }
  };

   return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ backgroundColor: '#ffffff', maxWidth: 500, width: '95%', maxHeight: '90%', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
          
          {/* STICKY HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>Register New User</Text>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Set a starting password.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }}>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>Tell them to change it after their first login.</Text>

            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Account type</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: role === 'agent' ? '#0b6b43' : '#cbd5e1', backgroundColor: role === 'agent' ? '#0b6b43' : '#ffffff', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={() => setRole('agent')}>
                <Text style={{ color: role === 'agent' ? '#ffffff' : '#475569', fontWeight: '700' }}>Agent</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flex: 1, borderWidth: 1, borderColor: role === 'manager' ? '#0b6b43' : '#cbd5e1', backgroundColor: role === 'manager' ? '#0b6b43' : '#ffffff', borderRadius: 10, paddingVertical: 12, alignItems: 'center' }} onPress={() => setRole('manager')}>
                <Text style={{ color: role === 'manager' ? '#ffffff' : '#475569', fontWeight: '700' }}>Manager</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Full name</Text>
            <TextInput style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 15, color: '#000000', marginBottom: 16 }} value={fullName} onChangeText={setFullName} placeholder="e.g. Ama Serwaa" placeholderTextColor="#64748b" />

            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Phone number</Text>
            <TextInput style={{ backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 15, color: '#000000', marginBottom: 16 }} keyboardType="phone-pad" value={phone} onChangeText={setPhone} placeholder="024 000 0000" placeholderTextColor="#64748b" />

            <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 8 }}>Starting password</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 24, overflow: 'hidden' }}>
              <TextInput 
                style={{ flex: 1, padding: 14, fontSize: 15, color: '#000000' }} 
                secureTextEntry={!showPassword} 
                value={tempPassword} 
                onChangeText={setTempPassword} 
                placeholder="At least 6 characters" 
                placeholderTextColor="#64748b"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#e2e8f0' }}>
                <Text style={{ color: '#0284c7', fontWeight: '700', fontSize: 13 }}>{showPassword ? 'Hide' : 'Show'}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={{ backgroundColor: '#0b6b43', padding: 16, borderRadius: 10, alignItems: 'center' }} onPress={submit} disabled={loading}>
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 16 }}>{loading ? 'Registering...' : `Register ${role === 'manager' ? 'Manager' : 'Agent'}`}</Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});