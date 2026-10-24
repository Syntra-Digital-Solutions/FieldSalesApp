import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';

const C = { blue: '#0b6b43', gold: '#b8860b', ink: '#1a1f26', sub: '#6b7280', white: '#ffffff' };

export default function LeaderboardModal({ visible, sales, agents, onClose }) {
  if (!visible) return null;

  const now = new Date();
  const isSameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();

  const ranked = (agents || [])
    .filter((a) => a.status !== 'former')
    .map((a) => {
      const cash = sales.filter((s) => s.worker_id === a.id && isSameMonth(new Date(s.created_at), now)).reduce((sum, s) => sum + Number(s.actual_cash), 0);
      return { name: a.full_name, cash };
    })
    .sort((a, b) => b.cash - a.cash);

  const medal = (i) => (i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`);

    return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={{ backgroundColor: '#ffffff', maxWidth: 500, width: '95%', maxHeight: '85%', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
          
          {/* STICKY HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fdf7e6' }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>🏆 Leaderboard</Text>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }}>
            <Text style={{ fontSize: 14, color: '#64748b', marginBottom: 16 }}>This Month's Top Performers</Text>
            
            {ranked.length === 0 ? (
              <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>No sales yet this month.</Text>
            ) : (
              ranked.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: i === 0 ? '#fffbeb' : '#f8fafc', borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: i === 0 ? '#fde68a' : '#e2e8f0' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: i === 0 ? '#fef3c7' : '#e2e8f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: i === 0 ? '#b45309' : '#64748b' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: '#0f172a' }}>{a.name}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: i === 0 ? '#b45309' : '#0b6b43' }}>GHS {a.cash.toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});