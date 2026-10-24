import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

const C = { blue: '#0b6b43', green: '#b8860b', ink: '#1a1f26', sub: '#6b7280', border: '#e5e5df', white: '#ffffff' };

export default function ActivityCalendarModal({ visible, agentName, sales, onClose }) {
  if (!visible) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const activeDays = new Set(
    sales
      .filter((s) => {
        const d = new Date(s.created_at);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .map((s) => new Date(s.created_at).getDate())
  );

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>{agentName}'s Activity — {now.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</Text>
          <ScrollView>
            <View style={styles.grid}>
              {days.map((day) => (
                <View key={day} style={[styles.dayCell, activeDays.has(day) ? styles.dayActive : styles.dayInactive]}>
                  <Text style={activeDays.has(day) ? styles.dayTextActive : styles.dayText}>{day}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.legend}>🟢 Sold something · ⚪ No activity</Text>
            <Text style={styles.summary}>{activeDays.size} active day(s) this month</Text>
          </ScrollView>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}><Text style={styles.close}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 20, maxHeight: '80%' },
  title: { fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayCell: { width: 36, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayActive: { backgroundColor: C.blue },
  dayInactive: { backgroundColor: '#f1f5f9' },
  dayText: { color: C.sub, fontWeight: '600', fontSize: 13 },
  dayTextActive: { color: C.white, fontWeight: '700', fontSize: 13 },
  legend: { fontSize: 12, color: C.sub, marginTop: 14 },
  summary: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 6 },
  close: { textAlign: 'center', color: C.sub, fontSize: 15 },
});