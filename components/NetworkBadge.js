import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export default function NetworkBadge() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected && state.isInternetReachable !== false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.badge, isOnline ? styles.online : styles.offline]}>
      <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.text}>{isOnline ? 'Online' : 'Offline — saving locally'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, marginBottom: 10 },
  online: { backgroundColor: '#eafbf3' },
  offline: { backgroundColor: '#fef2f2' },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  dotOnline: { backgroundColor: '#0b6b43' },
  dotOffline: { backgroundColor: '#dc2626' },
  text: { fontSize: 12, fontWeight: '700', color: '#334155' },
});