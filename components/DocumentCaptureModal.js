import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from '../src/config/supabaseClient';
import { useTheme } from '../src/theme/ThemeContext';

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isSameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const isSameYear = (a, b) => a.getFullYear() === b.getFullYear();

const detectAmount = (text) => {
  if (!text) return '';
  const match = text.match(/(?:GHS|GH₵|GHC|₵)\s*([\d,]+(?:\.\d{1,2})?)/i);
  return match ? match[1].replace(/,/g, '') : '';
};

export default function DocumentCaptureModal({ visible, onClose, userId }) {
  const { theme: C } = useTheme();
  const [records, setRecords] = useState([]);
  const [agents, setAgents] = useState([]);
  const [historicalRecords, setHistoricalRecords] = useState([]);
  const [note, setNote] = useState('');
  const [taggedAgentId, setTaggedAgentId] = useState(null);
  const [pendingImage, setPendingImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [viewerImage, setViewerImage] = useState(null);
  const [extractingId, setExtractingId] = useState(null);

  const [docPeriod, setDocPeriod] = useState('all');
  const [customYear, setCustomYear] = useState('');
  const [customMonth, setCustomMonth] = useState('');
  const [customDay, setCustomDay] = useState('');

  const [addingId, setAddingId] = useState(null);
  const [amountInputs, setAmountInputs] = useState({});

  const fetchRecords = async () => {
    setLoadingRecords(true);
    const { data, error } = await supabase
      .from('document_captures')
      .select('*')
      .order('captured_at', { ascending: false });
    if (error) console.log('Fetch document_captures error:', error.message);
    setRecords(data || []);

    const { data: agentProfiles } = await supabase.from('profiles').select('id, full_name').eq('role', 'agent');
    setAgents(agentProfiles || []);

    const { data: histRows } = await supabase.from('historical_document_records').select('id, document_id, agent_id, amount, recorded_at, sale_id');
    setHistoricalRecords(histRows || []);

    setLoadingRecords(false);
  };

  useEffect(() => {
    if (visible) fetchRecords();
  }, [visible]);

  const agentName = (id) => agents.find((a) => a.id === id)?.full_name;
  const historicalFor = (docId) => historicalRecords.find((h) => h.document_id === docId);

  const filteredRecords = records.filter((r) => {
    const d = new Date(r.captured_at);
    const now = new Date();
    if (docPeriod === 'day') return isSameDay(d, now);
    if (docPeriod === 'month') return isSameMonth(d, now);
    if (docPeriod === 'year') return isSameYear(d, now);
    if (docPeriod === 'custom') {
      const y = customYear ? parseInt(customYear, 10) : null;
      const m = customMonth ? parseInt(customMonth, 10) : null;
      const dd = customDay ? parseInt(customDay, 10) : null;
      if (y && d.getFullYear() !== y) return false;
      if (m && d.getMonth() + 1 !== m) return false;
      if (dd && d.getDate() !== dd) return false;
      return y || m || dd;
    }
    return true;
  });

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera access is required to capture documents.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true });
    if (!result.canceled) setPendingImage(result.assets[0]);
  };

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Photo library access is required to choose an existing photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, base64: true });
    if (!result.canceled) setPendingImage(result.assets[0]);
  };

  const saveCapture = async () => {
    if (!pendingImage) return;
    if (!pendingImage.base64) {
      Alert.alert('Error', 'Could not read the image data. Please try again.');
      return;
    }
    setUploading(true);
    try {
      const fileName = `doc_${Date.now()}.jpg`;
      const arrayBuffer = decode(pendingImage.base64);

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, arrayBuffer, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

      const { error: insertError } = await supabase.from('document_captures').insert([
        { manager_id: userId, image_url: urlData.publicUrl, note: note.trim() || null, agent_id: taggedAgentId },
      ]);
      if (insertError) throw insertError;

      setPendingImage(null);
      setNote('');
      setTaggedAgentId(null);
      await fetchRecords();
      Alert.alert('Saved', "Document captured with today's date and time.");
    } catch (e) {
      Alert.alert('Could not save', e.message || 'Something went wrong. Check your internet connection and try again.');
    }
    setUploading(false);
  };

    const [lastError, setLastError] = useState('');

  const extractText = async (record) => {
    setExtractingId(record.id);
    setLastError('');
    try {
      const { data, error } = await supabase.functions.invoke('extract-document-text', {
        body: { document_id: record.id, image_url: record.image_url },
      });
      if (error) {
        let detail = error.message;
        try {
          if (error.context) {
            const body = await error.context.json();
            detail = body.error || detail;
          }
        } catch (parseErr) {}
        throw new Error(detail);
      }
      await fetchRecords();
      if (viewerImage?.id === record.id) {
        setViewerImage((prev) => ({ ...prev, extracted_text: data.text }));
      }

      if (!record.agent_id && data.text) {
        const matchedAgent = agents.find((a) => data.text.toLowerCase().includes(a.full_name.toLowerCase()));
        if (matchedAgent) {
                   Alert.alert(
            'Agent name found',
            `This document mentions "${matchedAgent.full_name}". Tag this document to them?`,
            [
              { text: 'No, leave it', style: 'cancel' },
              {
                text: 'Yes, tag it',
                onPress: async () => {
                  await supabase.from('document_captures').update({ agent_id: matchedAgent.id }).eq('id', record.id);
                  await fetchRecords();
                  if (viewerImage?.id === record.id) {
                    setViewerImage((prev) => ({ ...prev, agent_id: matchedAgent.id }));
                  }
                },
              },
            ]
          );
        }
      }
        } catch (e) {
      const msg = e.message || 'Something went wrong.';
      setLastError(msg);
      Alert.alert('Could not read text', msg);
    }
    setExtractingId(null);
  };

  const openAddTotals = (record) => {
    setAddingId(record.id);
    setAmountInputs((prev) => ({ ...prev, [record.id]: prev[record.id] || detectAmount(record.extracted_text) }));
  };

    const confirmAddTotals = async (record) => {
    const amt = parseFloat(amountInputs[record.id]);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Enter a valid amount.');
      return;
    }
    // Insert directly into the real sales table, so this shows up everywhere
    // a normal sale does — history, analytics, totals — with no special-case math.
    const { data: insertedSale, error: saleError } = await supabase.from('sales').insert([{
      worker_id: record.agent_id,
      product_id: null,
      items_sold: 0,
      expected_cash: amt,
      actual_cash: amt,
      payment_type: 'historical',
      store_name: record.note || 'Historical record',
    }]).select().single();
    if (saleError) {
      Alert.alert('Error', saleError.message);
      return;
    }

    const { error: linkError } = await supabase.from('historical_document_records').insert([
      { document_id: record.id, agent_id: record.agent_id, amount: amt, note: record.note, sale_id: insertedSale.id },
    ]);
    if (linkError) console.log('Link tracking error (non-fatal):', linkError.message);

    setAddingId(null);
    fetchRecords();
    Alert.alert('Added', `GHS ${amt.toFixed(2)} added to ${agentName(record.agent_id)}'s sales history.`);
  };

    const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  const doRemoveFromTotals = async (histRow) => {
    if (histRow.sale_id) {
      await supabase.from('sales').delete().eq('id', histRow.sale_id);
    } else {
      await supabase.from('historical_document_records').delete().eq('id', histRow.id);
    }
    setConfirmRemoveId(null);
    fetchRecords();
  };

  const deleteRecord = (record) => {
    Alert.alert(
      'Delete Document',
      `Permanently delete "${record.note || 'this document'}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const fileName = record.image_url.split('/').pop();
              await supabase.storage.from('documents').remove([fileName]);
              const { error } = await supabase.from('document_captures').delete().eq('id', record.id);
              if (error) throw error;
              setViewerImage(null);
              fetchRecords();
            } catch (e) {
              Alert.alert('Could not delete', e.message || 'Something went wrong.');
            }
          },
        },
      ]
    );
  };

  const renderTotalsControl = (record) => {
    const hist = historicalFor(record.id);
        if (hist) {
      return (
        <View style={{ marginTop: 6 }}>
          <Text style={{ color: '#0b6b43', fontSize: 12, fontWeight: '700' }}>
            ✓ GHS {Number(hist.amount).toFixed(2)} added to {agentName(hist.agent_id) || 'agent'}'s totals
          </Text>
          {confirmRemoveId === hist.id ? (
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
              <Text style={{ color: '#dc2626', fontSize: 11 }}>Remove this entry?</Text>
              <TouchableOpacity onPress={() => doRemoveFromTotals(hist)}>
                <Text style={{ color: '#dc2626', fontSize: 11, fontWeight: '700' }}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmRemoveId(null)}>
                <Text style={{ color: C.sub, fontSize: 11 }}>No</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setConfirmRemoveId(hist.id)}>
              <Text style={{ color: '#dc2626', fontSize: 11, marginTop: 2 }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (!record.agent_id) {
      return <Text style={{ color: C.sub, fontSize: 11, marginTop: 4 }}>Tag this document to an agent first to add it to their totals.</Text>;
    }
    if (addingId === record.id) {
      return (
        <View style={{ marginTop: 6, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <TextInput
            style={[styles.smallInput, { backgroundColor: C.bg, color: C.ink, borderColor: C.border }]}
            keyboardType="numeric"
            value={amountInputs[record.id] || ''}
            onChangeText={(v) => setAmountInputs((prev) => ({ ...prev, [record.id]: v }))}
            placeholder="Amount (GHS)"
            placeholderTextColor={C.sub}
          />
          <TouchableOpacity style={styles.confirmSmallBtn} onPress={() => confirmAddTotals(record)}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAddingId(null)}>
            <Text style={{ color: C.sub, fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <TouchableOpacity onPress={() => openAddTotals(record)}>
        <Text style={{ color: '#0b6b43', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
          ➕ Add to {agentName(record.agent_id)}'s Totals (optional)
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
           <View style={[styles.box, { backgroundColor: C.card, maxWidth: 600, width: '95%', maxHeight: '90%', padding: 0, overflow: 'hidden' }]}>
          
          {/* FIXED HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.title, { color: C.ink, marginBottom: 2 }]}>📷 Document Records</Text>
              <Text style={[styles.subtitle, { color: C.sub, marginBottom: 0 }]}>
                Capture paper records from before this system, or add an existing photo.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: C.bg, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: C.sub }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>

          {pendingImage ? (
            <View>
              <Image source={{ uri: pendingImage.uri }} style={styles.preview} />
              <TextInput
                style={[styles.input, { backgroundColor: C.bg, color: C.ink, borderColor: C.border }]}
                placeholder="Optional note (e.g. 'March sales ledger')"
                placeholderTextColor={C.sub}
                value={note}
                onChangeText={setNote}
              />
              <Text style={[styles.label, { color: C.sub }]}>Tag to an agent (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <TouchableOpacity
                  style={[styles.agentChip, taggedAgentId === null && styles.agentChipActive]}
                  onPress={() => setTaggedAgentId(null)}
                >
                  <Text style={taggedAgentId === null ? styles.agentChipTextActive : styles.agentChipText}>General</Text>
                </TouchableOpacity>
                {agents.map((a) => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.agentChip, taggedAgentId === a.id && styles.agentChipActive]}
                    onPress={() => setTaggedAgentId(a.id)}
                  >
                    <Text style={taggedAgentId === a.id ? styles.agentChipTextActive : styles.agentChipText}>{a.full_name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                <TouchableOpacity style={styles.saveBtn} onPress={saveCapture} disabled={uploading}>
                  <Text style={styles.saveBtnText}>{uploading ? 'Saving...' : 'Save Document'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.retakeBtn} onPress={() => setPendingImage(null)} disabled={uploading}>
                  <Text style={{ color: C.sub }}>Retake</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity style={[styles.captureBtn, { flex: 1 }]} onPress={takePhoto}>
                <Text style={styles.captureBtnText}>📷 Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.captureBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={pickFromGallery}>
                <Text style={styles.captureBtnText}>🖼 Choose Existing</Text>
              </TouchableOpacity>
            </View>
          )}

          {lastError ? (
            <View style={{ backgroundColor: '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 12 }}>Extract Text Error:</Text>
              <Text style={{ color: '#991b1b', fontSize: 12, marginTop: 2 }}>{lastError}</Text>
            </View>
          ) : null}
          <Text style={[styles.historyLabel, { color: C.ink }]}>Saved Documents (tap to open)</Text>
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
            {['day', 'month', 'year', 'custom', 'all'].map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setDocPeriod(p)}
                style={[styles.docPeriodChip, docPeriod === p && styles.docPeriodChipActive]}
              >
                <Text style={docPeriod === p ? styles.docPeriodTextActive : styles.docPeriodText}>
                  {p === 'day' ? 'Today' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : p === 'custom' ? 'Custom' : 'All'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {docPeriod === 'custom' && (
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
              <TextInput style={[styles.smallInput, { flex: 1, backgroundColor: C.bg, color: C.ink, borderColor: C.border }]} placeholder="Year" placeholderTextColor={C.sub} keyboardType="numeric" value={customYear} onChangeText={setCustomYear} />
              <TextInput style={[styles.smallInput, { flex: 1, backgroundColor: C.bg, color: C.ink, borderColor: C.border }]} placeholder="Month" placeholderTextColor={C.sub} keyboardType="numeric" value={customMonth} onChangeText={setCustomMonth} />
              <TextInput style={[styles.smallInput, { flex: 1, backgroundColor: C.bg, color: C.ink, borderColor: C.border }]} placeholder="Day" placeholderTextColor={C.sub} keyboardType="numeric" value={customDay} onChangeText={setCustomDay} />
            </View>
          )}

                {loadingRecords ? (
              <Text style={{ color: C.sub, textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : filteredRecords.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center', marginTop: 20 }}>No documents in this period.</Text>
            ) : (
              filteredRecords.map((r) => (
                <View key={r.id} style={[styles.recordRow, { borderColor: C.border }]}>
                  <TouchableOpacity style={{ flexDirection: 'row', flex: 1 }} onPress={() => setViewerImage(r)}>
                    <Image source={{ uri: r.image_url }} style={styles.thumb} />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: C.ink, fontWeight: '600' }}>{r.note || 'Untitled document'}</Text>
                      {r.agent_id && <Text style={{ color: '#0b6b43', fontSize: 12, fontWeight: '600' }}>For: {agentName(r.agent_id) || 'Agent'}</Text>}
                      <Text style={{ color: C.sub, fontSize: 12 }}>{new Date(r.captured_at).toLocaleString()}</Text>
                      {r.extracted_text ? (
                        <>
                          <Text style={{ color: C.ink, fontSize: 12, marginTop: 4 }} numberOfLines={2}>📝 {r.extracted_text}</Text>
                          {renderTotalsControl(r)}
                        </>
                      ) : (
                        <TouchableOpacity onPress={() => extractText(r)} disabled={extractingId === r.id}>
                          <Text style={{ color: '#0b6b43', fontSize: 12, fontWeight: '600', marginTop: 4 }}>
                            {extractingId === r.id ? 'Reading text...' : '🔤 Extract Text'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteRecord(r)} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12 }}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>

      <Modal visible={!!viewerImage} transparent animationType="fade" onRequestClose={() => setViewerImage(null)}>
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerImage(null)}>
            <Text style={styles.viewerCloseText}>✕ Close</Text>
          </TouchableOpacity>
          {viewerImage && (
            <>
              <Image source={{ uri: viewerImage.image_url }} style={styles.viewerImage} resizeMode="contain" />
              <View style={styles.viewerCaption}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{viewerImage.note || 'Untitled document'}</Text>
                {viewerImage.agent_id && <Text style={{ color: '#a7f3d0' }}>For: {agentName(viewerImage.agent_id) || 'Agent'}</Text>}
                <Text style={{ color: '#cbd5e1', marginTop: 2 }}>{new Date(viewerImage.captured_at).toLocaleString()}</Text>
                                {viewerImage.extracted_text ? (
                  <>
                    <Text style={{ color: '#fff', marginTop: 10, backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8 }}>{viewerImage.extracted_text}</Text>
                    <View style={{ backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 8, marginTop: 8 }}>
                      {renderTotalsControl(viewerImage)}
                    </View>
                  </>
                ) : (
                  <TouchableOpacity onPress={() => extractText(viewerImage)} disabled={extractingId === viewerImage.id} style={{ marginTop: 10 }}>
                    <Text style={{ color: '#a7f3d0', fontWeight: '700' }}>{extractingId === viewerImage.id ? 'Reading text...' : '🔤 Extract Text From This'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => deleteRecord(viewerImage)} style={{ marginTop: 14 }}>
                  <Text style={{ color: '#fca5a5', fontWeight: '700' }}>Delete This Document</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  box: { borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  title: { fontSize: 19, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 13, marginBottom: 14 },
  captureBtn: { backgroundColor: '#0b6b43', borderRadius: 12, padding: 16, alignItems: 'center' },
  captureBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  preview: { width: '100%', height: 180, borderRadius: 10, marginBottom: 10 },
  input: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, marginBottom: 10 },
  smallInput: { borderWidth: 1, borderRadius: 8, padding: 8, fontSize: 13 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  agentChip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12, marginRight: 8, backgroundColor: '#fff' },
  agentChipActive: { backgroundColor: '#0b6b43', borderColor: '#0b6b43' },
  agentChipText: { fontSize: 12, color: '#475569' },
  agentChipTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
  saveBtn: { flex: 1, backgroundColor: '#0b6b43', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700' },
  retakeBtn: { padding: 13, alignItems: 'center' },
  confirmSmallBtn: { backgroundColor: '#0b6b43', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 12 },
  historyLabel: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 6 },
  recordRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 12, borderBottomWidth: 1 },
  thumb: { width: 64, height: 64, borderRadius: 10 },
  docPeriodChip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 14, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#fff' },
  docPeriodChipActive: { backgroundColor: '#0b6b43', borderColor: '#0b6b43' },
  docPeriodText: { fontSize: 12, color: '#475569' },
  docPeriodTextActive: { fontSize: 12, color: '#fff', fontWeight: '700' },
  viewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 20, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20 },
  viewerCloseText: { color: '#fff', fontWeight: '700' },
  viewerImage: { width: '95%', height: '65%' },
  viewerCaption: { position: 'absolute', bottom: 20, left: 20, right: 20 },
});