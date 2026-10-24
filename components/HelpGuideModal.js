import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Manrope_800ExtraBold, Manrope_700Bold, Manrope_600SemiBold } from '@expo-google-fonts/manrope';

const GREEN = '#0b6b43';
const GREEN_DARK = '#074a2e';
const GOLD = '#c9a227';

const agentSteps = [
  { icon: '🏠', section: 'Getting Started', title: 'Overview', body: 'Your home screen. Shows today\'s cash collected, sync status, and quick access to your route.' },
  { icon: '🛍️', section: 'Daily Tasks', title: 'Log a Sale', body: 'Tap "+ Log Sale" on Overview or the sidebar. Fill in the store, pick Cash / MoMo / Credit, add items sold, and submit.' },
  { icon: '📦', section: 'Daily Tasks', title: 'My Stock', body: 'See what\'s been issued to you, what you\'ve sold, and what\'s left. Use "Log Items Collected" if you picked up stock yourself.' },
  { icon: '📍', section: 'Daily Tasks', title: 'My Route', body: 'Your assigned stops for the day. Tap "Log Sale" next to any stop to record a sale there directly.' },
  { icon: '📖', section: 'Reports', title: 'My History', body: 'Every sale you\'ve logged, filterable by Today / Month / Year / Custom date. Print or share reports from here.' },
  { icon: '✏️', section: 'Reports', title: 'My Corrections', body: 'If a past sale needs fixing, request an edit here — your manager approves or rejects it.' },
  { icon: '☰', section: 'Tips', title: 'Menu Button', body: 'On a phone screen, tap the ☰ icon top-left to open the full navigation menu at any time.' },
];

const managerSteps = [
  { icon: '🏠', section: 'Getting Started', title: 'Overview', body: 'Pending approvals, top performers, today\'s totals, and quick team-summary sharing all in one place.' },
  { icon: '🔔', section: 'Getting Started', title: 'Activity', body: 'Live feed of every sale your agents log, with a badge showing how many you haven\'t reviewed yet.' },
  { icon: '👥', section: 'Team', title: 'Agents', body: 'Register new agents, view each one\'s history, adjust commission, or use "Manage ▾" for status changes and resets.' },
  { icon: '📦', section: 'Team', title: 'Stock & Issue', body: 'Issue stock to any agent, and see current stock balances across your whole team.' },
  { icon: '✏️', section: 'Team', title: 'Corrections', body: 'Approve or reject agent edit requests, or make your own direct corrections to a sale.' },
  { icon: '📈', section: 'Insights', title: 'Analytics', body: 'Charts for daily cash trends, top agents, best-selling products, and cash discrepancies worth reviewing.' },
  { icon: '📷', section: 'Records', title: 'Documents', body: 'Capture old paper records with your camera, extract the text, and optionally add the amount to an agent\'s sales history.' },
  { icon: '🧾', section: 'Records', title: 'Credit Ledger', body: 'Track goods given on credit and record repayments as customers pay them off.' },
  { icon: '🚚', section: 'Records', title: 'Vehicle Trips', body: 'Log stock loaded into the delivery vehicle each morning and reconcile it at day\'s end.' },
];

export default function HelpGuideModal({ visible, onClose, role }) {
  const steps = role === 'manager' ? managerSteps : agentSteps;
  const [index, setIndex] = useState(0);
  const step = steps[index];
  const [fontsLoaded] = useFonts({ Manrope_800ExtraBold, Manrope_700Bold, Manrope_600SemiBold });

  if (!fontsLoaded) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <LinearGradient colors={[GREEN_DARK, GREEN]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
            <Text style={styles.headerTitle}>How to Use FieldSales</Text>
            <Text style={styles.headerSub}>{role === 'manager' ? 'Manager Guide' : 'Agent Guide'}</Text>
            <View style={styles.dotsRow}>
              {steps.map((_, i) => (
                <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
              ))}
            </View>
          </LinearGradient>

          <ScrollView style={{ maxHeight: 260 }} contentContainerStyle={{ alignItems: 'center', paddingVertical: 20 }}>
            <Text style={styles.sectionTag}>{step.section}</Text>
            <View style={styles.iconBadge}>
              <Text style={styles.iconBadgeText}>{step.icon}</Text>
            </View>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepBody}>{step.body}</Text>
          </ScrollView>

          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TouchableOpacity
                onPress={() => setIndex((i) => Math.max(0, i - 1))}
                disabled={index === 0}
                style={[styles.navBtn, index === 0 && { opacity: 0.3 }]}
              >
                <Text style={styles.navBtnText}>← Back</Text>
              </TouchableOpacity>

              {index < steps.length - 1 ? (
                <TouchableOpacity onPress={() => setIndex((i) => i + 1)} style={styles.navBtnPrimary}>
                  <Text style={styles.navBtnPrimaryText}>Next →</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={onClose} style={styles.navBtnPrimary}>
                  <Text style={styles.navBtnPrimaryText}>Done ✓</Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={styles.skipText}>Skip Guide</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  box: { borderRadius: 22, overflow: 'hidden', backgroundColor: '#fff', width: '95%', maxWidth: 550, maxHeight: '90%', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  header: { paddingTop: 26, paddingBottom: 20, alignItems: 'center' },
  headerTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 20, color: '#fff' },
  headerSub: { fontFamily: 'Manrope_600SemiBold', fontSize: 13, color: '#e6c65c', marginTop: 4 },
  dotsRow: { flexDirection: 'row', gap: 6, marginTop: 16 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: '#fff', width: 18 },
  sectionTag: { fontFamily: 'Manrope_700Bold', fontSize: 11, color: GOLD, letterSpacing: 1, textTransform: 'uppercase' },
  iconBadge: { width: 76, height: 76, borderRadius: 38, backgroundColor: '#eafbf3', alignItems: 'center', justifyContent: 'center', marginTop: 14, marginBottom: 14 },
  iconBadgeText: { fontSize: 36 },
  stepTitle: { fontFamily: 'Manrope_800ExtraBold', fontSize: 21, color: '#1a1f26' },
  stepBody: { fontFamily: 'Manrope_600SemiBold', fontSize: 14, color: '#6b7280', textAlign: 'center', marginTop: 10, lineHeight: 21, paddingHorizontal: 26 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#eef0ee' },
  navBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  navBtnText: { fontFamily: 'Manrope_700Bold', color: '#6b7280', fontSize: 14 },
  navBtnPrimary: { backgroundColor: GREEN, paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12 },
  navBtnPrimaryText: { fontFamily: 'Manrope_700Bold', color: '#fff', fontSize: 14 },
  skipText: { fontFamily: 'Manrope_600SemiBold', color: '#9ca3af', fontSize: 13, textAlign: 'center' },
});