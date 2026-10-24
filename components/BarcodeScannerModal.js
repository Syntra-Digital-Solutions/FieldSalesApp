import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function BarcodeScannerModal({ visible, onClose, onScanned, products }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [notFoundCode, setNotFoundCode] = useState(null);

  useEffect(() => {
    if (visible) { setScanned(false); setNotFoundCode(null); }
  }, [visible]);

  useEffect(() => {
    if (visible && permission && !permission.granted) requestPermission();
  }, [visible, permission]);

  const handleScan = ({ data }) => {
    if (scanned) return;
    setScanned(true);
    const match = products.find((p) => p.barcode && p.barcode === data);
    if (match) {
      onScanned(match);
      onClose();
    } else {
      setNotFoundCode(data);
    }
  };

  if (!permission) return null;

  return (
    <Modal visible={visible} animationType="slide">
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {permission.granted ? (
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'upc_a'] }}
            onBarcodeScanned={scanned ? undefined : handleScan}
          />
        ) : (
          <View style={styles.center}>
            <Text style={styles.permText}>Camera access is needed to scan a product barcode.</Text>
            <TouchableOpacity onPress={requestPermission} style={styles.grantBtn}>
              <Text style={styles.grantBtnText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.frameOverlay} pointerEvents="none">
          <View style={styles.frame} />
        </View>

        {notFoundCode && (
          <View style={styles.notFoundBox}>
            <Text style={styles.notFoundText}>No product matches this code ({notFoundCode}).</Text>
            <TouchableOpacity onPress={() => { setScanned(false); setNotFoundCode(null); }}>
              <Text style={styles.tryAgainText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕ Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  permText: { color: '#fff', textAlign: 'center', fontSize: 15, marginBottom: 16 },
  grantBtn: { backgroundColor: '#0b6b43', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 10 },
  grantBtnText: { color: '#fff', fontWeight: '700' },
  frameOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center' },
  frame: { width: 240, height: 240, borderWidth: 3, borderColor: '#0b6b43', borderRadius: 16 },
  notFoundBox: { position: 'absolute', bottom: 100, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', padding: 16, borderRadius: 12, alignItems: 'center' },
  notFoundText: { color: '#fff', textAlign: 'center', marginBottom: 8 },
  tryAgainText: { color: '#6ee7b7', fontWeight: '700' },
  closeBtn: { position: 'absolute', top: 50, right: 20, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  closeBtnText: { color: '#fff', fontWeight: '700' },
});