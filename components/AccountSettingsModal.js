import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, Alert, ScrollView, Platform } from 'react-native';
import { supabase } from '../src/config/supabaseClient';
import PasswordInput from './PasswordInput';
import { useLanguage } from '../src/i18n/LanguageContext';

export default function AccountSettingsModal({ visible, onClose, currentPhone, onUpdated }) {
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, lang, toggleLang } = useLanguage();

  const normalizePhone = (raw) => {
    let cleaned = raw.replace(/[^\d]/g, '');
    if (cleaned.startsWith('0')) cleaned = '233' + cleaned.slice(1);
    if (!cleaned.startsWith('233')) cleaned = '233' + cleaned;
    return cleaned;
  };
  const phoneToEmail = (normalizedPhone) => `${normalizedPhone}@fieldsalesapp.local`;

  const submit = async () => {
    const wantsPhoneChange = newPhone.trim().length > 0;
    const wantsPasswordChange = newPassword.trim().length > 0;

    if (!wantsPhoneChange && !wantsPasswordChange) {
      Alert.alert('Nothing to update', 'Enter a new phone number, a new password, or both.');
      return;
    }
    if (wantsPasswordChange) {
      if (newPassword.length < 6) { Alert.alert('Error', 'Password must be at least 6 characters.'); return; }
      if (newPassword !== confirmPassword) { Alert.alert('Error', 'Passwords do not match.'); return; }
    }

    setLoading(true);

    const updatePayload = {};
    let normalizedNewPhone = null;
    if (wantsPasswordChange) updatePayload.password = newPassword;
    if (wantsPhoneChange) {
      normalizedNewPhone = normalizePhone(newPhone);
      updatePayload.email = phoneToEmail(normalizedNewPhone);
    }

    const { error: authError } = await supabase.auth.updateUser(updatePayload);
    if (authError) {
      setLoading(false);
      Alert.alert('Error', authError.message);
      return;
    }

    if (wantsPhoneChange) {
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from('profiles').update({ phone_number: normalizedNewPhone }).eq('id', user.id);
    }

    setLoading(false);
    Alert.alert('Success', 'Your account has been updated.');
    setNewPhone('');
    setNewPassword('');
    setConfirmPassword('');
    onClose();
    if (onUpdated) onUpdated();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modalBox}>
          
          {/* STICKY HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>⚙️ {t('account_settings') || 'Account Settings'}</Text>
              <Text style={{ fontSize: 13, color: '#64748b' }}>{t('fill_only_change') || 'Update your password or phone number.'}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }}>
            <Text style={styles.label}>{t('current_phone') || 'Current phone number'}</Text>
            <Text style={styles.currentValue}>{currentPhone || '—'}</Text>

            <Text style={styles.label}>{t('new_phone') || 'New phone number (optional)'}</Text>
            <TextInput style={styles.input} keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} placeholder={t('leave_blank') || 'Leave blank to keep current'} placeholderTextColor="#64748b" />

            <Text style={styles.label}>{t('new_password') || 'New password (optional)'}</Text>
            <PasswordInput value={newPassword} onChangeText={setNewPassword} placeholder={t('leave_blank') || 'Leave blank to keep current'} style={styles.input} />

            {newPassword.length > 0 && (
              <>
                <Text style={styles.label}>{t('confirm_password') || 'Confirm new password'}</Text>
                <PasswordInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t('confirm_password_placeholder') || 'Confirm password'} style={styles.input} />
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={submit} disabled={loading}>
              <Text style={styles.submitText}>{loading ? (t('saving') || 'Saving...') : (t('save_changes') || 'Save Changes')}</Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={toggleLang} style={{ marginTop: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' }}>
              <Text style={{ color: '#0284c7', fontWeight: '700', fontSize: 14, textAlign: 'center' }}>
                🌐 {t('switch_language') || 'Switch to'} {lang === 'en' ? 'Twi' : lang === 'tw' ? 'Ewe' : lang === 'ee' ? 'Dagbani' : lang === 'dag' ? 'Frafra' : lang === 'gur' ? 'Hausa' : 'English'}
              </Text>
            </TouchableOpacity>
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(15,23,42,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: 20, 
  },
  modalBox: { 
    backgroundColor: '#ffffff', 
    width: '100%', 
    maxWidth: 500, 
    maxHeight: '85%', 
    borderRadius: 20, 
    overflow: 'hidden',
    alignSelf: 'center',
  },
  label: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 6, marginTop: 12 },
  currentValue: { fontSize: 15, color: '#475569', fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 10, padding: 14, fontSize: 15, color: '#000000', marginBottom: 8 },
  submitBtn: { backgroundColor: '#0b6b43', padding: 16, borderRadius: 10, marginTop: 24, alignItems: 'center' },
  submitText: { color: '#ffffff', fontWeight: '800', fontSize: 16 },
});