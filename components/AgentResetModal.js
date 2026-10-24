import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { supabase } from '../src/config/supabaseClient';
import PasswordInput from './PasswordInput';

export default function AgentResetModal({ visible, agent, onClose }) {
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // ✨ NEW FEATURE: Auto-generate a secure password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(pass);
  };

  const submit = async () => {
    if (!newPhone.trim() && !newPassword.trim()) {
      Alert.alert('Nothing to update', 'Enter a new phone number, a new password, or both.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('clever-service', {
      body: { agentId: agent.id, newPassword: newPassword || null, newPhone: newPhone || null },
    });
    setLoading(false);
    if (error || data?.error) {
      Alert.alert('Error', data?.error || error.message);
    } else {
      Alert.alert('Success', `${agent.full_name}'s login has been reset.`);
      setNewPhone('');
      setNewPassword('');
      onClose();
    }
  };

  if (!agent) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ backgroundColor: '#ffffff', maxWidth: 500, width: '95%', maxHeight: '90%', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
          
          {/* STICKY HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>🔐 Reset Login</Text>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Update login for {agent.full_name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>Use this if the agent forgot their password. Leave a field blank to keep it unchanged.</Text>

            <Text style={styles.label}>New phone number (optional)</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} placeholder="Leave blank to keep current" placeholderTextColor="#64748b" />

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 6 }}>
              <Text style={styles.label}>New password (optional)</Text>
              <TouchableOpacity onPress={generatePassword}>
                <Text style={{ fontSize: 13, color: '#0284c7', fontWeight: '700' }}>✨ Auto-generate</Text>
              </TouchableOpacity>
            </View>
            <PasswordInput value={newPassword} onChangeText={setNewPassword} placeholder="Leave blank to keep current" style={styles.input} />

            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
              <Text style={styles.submitText}>{loading ? 'Saving...' : 'Reset Login'}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onClose} style={{ alignItems: 'center', marginTop: 16 }}>
              <Text style={{ color: '#64748b', fontWeight: '600' }}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 15, color: '#000000' },
  submitBtn: { backgroundColor: '#0f172a', padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 24 },
  submitText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});