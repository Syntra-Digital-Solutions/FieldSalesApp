import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
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
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center' }}>
      <View style={{ width: '100%', maxWidth: 900, flex: 1, padding: 24 }}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}>
            <Text style={[styles.backText, { color: C.blue }]}>‹ Back to Reports</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.ink }]}>Sales Map</Text>
          <Text style={[styles.subtitle, { color: C.sub }]}>{filtered.length} sale(s) with location data</Text>
          
          <View style={styles.periodRow}>
            {['day', 'month', 'year', 'all'].map((p) => (
              <TouchableOpacity key={p} onPress={() => setPeriod(p)} style={[styles.chip, period === p && styles.chipActive]}>
                <Text style={period === p ? styles.chipTextActive : styles.chipText}>
                  {p === 'day' ? 'Today' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* PREMIUM MAP CONTAINER */}
        <View style={{ flex: 1, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 }}>
          <WebView originWhitelist={['*']} source={{ html }} style={{ flex: 1, backgroundColor: 'transparent' }} />
        </View>

      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '700', marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 14, marginTop: 4, marginBottom: 16 },
  periodRow: { flexDirection: 'row', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#0b6b43', borderColor: '#0b6b43' },
  chipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  chipTextActive: { fontSize: 13, color: '#fff', fontWeight: '700' },
});