import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';

const C = { blue: '#0b6b43', danger: '#dc2626', ink: '#1a1f26', sub: '#6b7280', white: '#ffffff', border: '#e5e5df' };

export default function ConfirmModal({ visible, title, message, confirmLabel = 'Confirm', destructive = false, onConfirm, onCancel }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <TouchableOpacity style={[styles.confirmBtn, destructive && styles.confirmBtnDanger]} onPress={onConfirm}>
            <Text style={styles.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 22 },
  title: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8 },
  message: { fontSize: 14, color: C.sub, marginBottom: 20, lineHeight: 20 },
  confirmBtn: { backgroundColor: C.blue, borderRadius: 12, padding: 15, alignItems: 'center' },
  confirmBtnDanger: { backgroundColor: C.danger },
  confirmText: { color: C.white, fontWeight: '800', fontSize: 16 },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelText: { color: C.sub, fontSize: 15, fontWeight: '600' },
});