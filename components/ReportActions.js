import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { shareToWhatsApp, shareToEmail, shareToSMS } from '../src/utils/share';
import { generateAndSharePDF } from '../src/utils/pdf';

// onPrint: web-only window.print() fallback
// shareText: plain-text summary used by the WhatsApp/Email/SMS quick-share buttons
// emailSubject: subject line for the text-only email share
// buildPdfHtml: () => string — builds the report's full HTML on demand
// pdfFileName: base filename (no extension) for the generated PDF
export default function ReportActions({ onPrint, shareText, emailSubject, buildPdfHtml, pdfFileName }) {
  const sharePdfFile = async () => {
    if (!buildPdfHtml) return;
    await generateAndSharePDF(buildPdfHtml(), pdfFileName || 'report');
  };

  return (
    <>
      <TouchableOpacity style={styles.printBtn} onPress={onPrint}>
        <Text style={styles.submitText}>Print This Report</Text>
      </TouchableOpacity>

      {buildPdfHtml && (
        <TouchableOpacity style={styles.pdfShareBtn} onPress={sharePdfFile}>
          <Text style={styles.pdfShareText}>Share PDF File (WhatsApp, Email, etc.)</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.quickShareLabel}>Or send a quick text summary:</Text>
      <View style={styles.shareRow}>
        <TouchableOpacity style={styles.shareBtn} onPress={() => shareToWhatsApp(shareText)}>
          <Text style={styles.shareBtnText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={() => shareToEmail(emailSubject, shareText)}>
          <Text style={styles.shareBtnText}>Email</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.shareBtn} onPress={() => shareToSMS(shareText)}>
          <Text style={styles.shareBtnText}>SMS</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  printBtn: { backgroundColor: '#16a34a', padding: 14, borderRadius: 8, marginTop: 14, marginBottom: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  pdfShareBtn: { backgroundColor: '#7c3aed', padding: 14, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  pdfShareText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  quickShareLabel: { fontSize: 11, color: '#64748b', marginBottom: 6, textAlign: 'center' },
  shareRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  shareBtn: { flex: 1, backgroundColor: '#f1f5f9', padding: 10, borderRadius: 8, alignItems: 'center' },
  shareBtnText: { color: '#334155', fontWeight: '600', fontSize: 12 },
});