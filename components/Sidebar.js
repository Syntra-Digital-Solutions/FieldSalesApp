import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, useWindowDimensions } from 'react-native';
import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/i18n/LanguageContext';

const navLabelMap = {
  overview: { icon: '🏠', key: 'overview' },
  lessons: { icon: '📖', key: 'sales_playbook' },
  log: { icon: '🛍️', key: 'log_a_sale' },
  route: { icon: '📍', key: 'my_route' },
  stock: { icon: '📦', key: 'my_stock' },
  history: { icon: '📖', key: 'my_history' },
  corrections: { icon: '✏️', key: 'my_corrections' },
  settings: { icon: '⚙️', key: 'settings' },
  help: { icon: '❓', key: 'how_to_use' },
  agents: { icon: '👥', key: 'my_agents' },
  reports: { icon: '📊', key: 'reports' },
};

const C = {
  blue: '#0b6b43',
  blueTint: '#eafbf3',
  green: '#b8860b',
  ink: '#1a1f26',
  sub: '#6b7280',
  border: '#e5e5df',
  white: '#ffffff',
  danger: '#dc2626',
};

export default function Sidebar(props) {
  const { theme, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();

  const {
    appName = 'FieldSales',
    greeting,
    user,
    activeKey,
    currentScreen,
    items,
    navItems,
    setScreen,
    onLogout,
  } = props;

  // Accept either naming convention so this never hard-crashes again
  // regardless of which prop shape a caller uses.
  const navList = items || navItems || [];
  const active = activeKey ?? currentScreen;
  const displayGreeting = greeting || `Hi, ${user?.name || user?.full_name || 'there'}`;

  const { width } = useWindowDimensions();
  const isWide = width >= 760;
  const [open, setOpen] = useState(false);

  const handlePress = (item, close) => {
    if (close) close();
    if (item.onPress) {
      item.onPress();
    } else if (setScreen) {
      setScreen(item.key);
    }
  };

  const Body = ({ close }) => (
    <View style={[styles.sidebar, { backgroundColor: theme.card, borderRightColor: theme.border }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.appName, { color: theme.blue }]}>{appName}</Text>
        <Text style={[styles.greeting, { color: theme.sub }]}>{displayGreeting}</Text>
      </View>
      <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
        {navList.map((item) => {
          const isActive = active === item.key;
          return (
            <TouchableOpacity
              key={item.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handlePress(item, close)}
            >
              <View style={[styles.accent, isActive && styles.accentActive]} />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {navLabelMap[item.key] ? `${navLabelMap[item.key].icon} ${t(navLabelMap[item.key].key)}` : item.label}
              </Text>
         
              {item.badge ? (
                <View style={styles.badge}><Text style={styles.badgeText}>{item.badge}</Text></View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <TouchableOpacity style={[styles.logoutRow, { borderTopColor: theme.border }]} onPress={toggleTheme}>
        <Text style={{ color: theme.sub, fontWeight: '600', fontSize: 14 }}>{theme.mode === 'dark' ? '☀ Light Mode' : '🌙 Dark Mode'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.logoutRow, { borderTopColor: theme.border }]} onPress={onLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );

  if (isWide) return <Body />;

  return (
    <>
      <TouchableOpacity style={styles.hamburger} onPress={() => setOpen(true)}>
        <View style={styles.bar} /><View style={styles.bar} /><View style={styles.bar} />
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.drawer} onStartShouldSetResponder={() => true}>
            <Body close={() => setOpen(false)} />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 240, height: '100%', backgroundColor: C.white, borderRightWidth: 1, borderRightColor: C.border },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  appName: { fontSize: 18, fontWeight: '800', color: C.blue, letterSpacing: 0.2 },
  greeting: { fontSize: 14, color: C.sub, marginTop: 4 },
  navList: { flex: 1, paddingTop: 6 },
    navItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 18, minHeight: 52 },
  navItemActive: { backgroundColor: C.blueTint },
  accent: { width: 3, height: 16, borderRadius: 2, backgroundColor: 'transparent', marginRight: 12 },
  accentActive: { backgroundColor: C.blue },
    navLabel: { fontSize: 17, color: C.sub, fontWeight: '500', flex: 1, flexShrink: 1 },
  navLabelActive: { color: C.ink, fontWeight: '700' },
    badge: { backgroundColor: C.green, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2, marginLeft: 8, flexShrink: 0 },
  badgeText: { color: C.white, fontSize: 10, fontWeight: '700' },
  logoutRow: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },
  logoutText: { color: C.danger, fontWeight: '600', fontSize: 16 },
 hamburger: { position: 'absolute', top: 56, left: 14, zIndex: 20, width: 32, height: 32, borderRadius: 8, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', gap: 3, borderWidth: 1, borderColor: C.border },
  bar: { width: 18, height: 2, backgroundColor: C.ink, borderRadius: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', flexDirection: 'row' },
  drawer: { height: '100%' },
});