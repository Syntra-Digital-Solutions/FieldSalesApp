import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { buildMapHtml } from '../src/utils/buildMapHtml';

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isSameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const isSameYear = (a, b) => a.getFullYear() === b.getFullYear();

export default function SalesMapScreen({ sales, onBack }) {
  const { theme: C } = useTheme();
  const [period, setPeriod] = useState('all');

  const filtered = sales.filter((s) => {
    if (!s.latitude || !s.longitude) return false;
    const d = new Date(s.created_at);
    const now = new Date();
    if (period === 'day') return isSameDay(d, now);
    if (period === 'month') return isSameMonth(d, now);
    if (period === 'year') return isSameYear(d, now);
    return true;
  });

  const html = buildMapHtml(filtered);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Text style={[styles.backText, { color: C.blue }]}>‹ Back to Reports</Text></TouchableOpacity>
        <Text style={[styles.title, { color: C.ink }]}>Sales Map</Text>
        <Text style={[styles.subtitle, { color: C.sub }]}>{filtered.length} sale(s) with location data</Text>
        <View style={styles.periodRow}>
          {['day', 'month', 'year', 'all'].map((p) => (
            <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.chip, period === p && styles.chipActive]}>
              <Text style={period === p ? styles.chipTextActive : styles.chipText}>{p === 'day' ? 'Today' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <iframe srcDoc={html} style={{ flex: 1, border: 0, width: '100%' }} title="Sales Map" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16, paddingTop: 50 },
  backText: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  periodRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0b6b43', borderColor: '#0b6b43' },
  chipText: { fontSize: 12, color: '#475569' },
  chipTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
});