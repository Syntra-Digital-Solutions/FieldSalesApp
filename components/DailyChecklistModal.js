import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/config/supabaseClient';

const C = { blue: '#0b6b43', ink: '#1a1f26', sub: '#6b7280', white: '#ffffff' };
const CHECKLIST_ITEMS = [
  'Confirm your remaining stock count is accurate',
  'Make sure location access is turned on',
  'Check if you have any pending correction requests to review',
];

export default function DailyChecklistModal({ userId }) {
  const [visible, setVisible] = useState(false);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const lastShown = await AsyncStorage.getItem('@checklist_last_shown');
      if (lastShown !== today) {
        setVisible(true);
        await AsyncStorage.setItem('@checklist_last_shown', today);
      }
    })();
  }, []);

  const toggle = (index) => setChecked((prev) => ({ ...prev, [index]: !prev[index] }));

  const finish = async () => {
    await supabase.from('daily_checklist_log').insert([{ agent_id: userId, completed: true }]);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>👋 Before you start today</Text>
          {CHECKLIST_ITEMS.map((item, i) => (
            <TouchableOpacity key={i} style={styles.row} onPress={() => toggle(i)}>
              <Text style={styles.checkbox}>{checked[i] ? '✅' : '⬜'}</Text>
              <Text style={styles.itemText}>{item}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.doneBtn} onPress={finish}>
            <Text style={styles.doneText}>I'm Ready — Start Selling</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 22 },
  title: { fontSize: 19, fontWeight: '800', color: C.ink, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  checkbox: { fontSize: 20, marginRight: 10 },
  itemText: { fontSize: 15, color: C.ink, flex: 1 },
  doneBtn: { backgroundColor: C.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  doneText: { color: C.white, fontWeight: '800', fontSize: 16 },
});