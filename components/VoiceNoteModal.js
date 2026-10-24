import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../src/config/supabaseClient';
import { useTheme } from '../src/theme/ThemeContext';

export default function VoiceNoteModal({ visible, onClose, userId, isManager, onUseInLogSale, productNames = [] }) {
  const { theme: C } = useTheme();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [notes, setNotes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [transcribingId, setTranscribingId] = useState(null);
  const [lastError, setLastError] = useState('');
  const [edits, setEdits] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const fetchNotes = async () => {
    const query = supabase.from('voice_notes').select('*').order('created_at', { ascending: false });
    const { data } = isManager ? await query : await query.eq('agent_id', userId);
    setNotes(data || []);
  };

  useEffect(() => { if (visible) { fetchNotes(); setLastError(''); } }, [visible]);

  const startRecording = async () => {
    setLastError('');
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') { setLastError('Microphone access is required to record a voice note.'); return; }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(rec);
      setIsRecording(true);
    } catch (e) {
      setLastError('Could not start recording: ' + (e.message || 'Unknown error'));
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      await uploadRecording(uri);
    } catch (e) {
      setLastError('Could not stop recording: ' + (e.message || 'Unknown error'));
    }
  };

  const uploadRecording = async (uri) => {
    setUploading(true);
    setLastError('');
    try {
      const fileName = `note_${Date.now()}.${Platform.OS === 'web' ? 'webm' : 'm4a'}`;
      let arrayBuffer;
      let contentType;

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        arrayBuffer = await blob.arrayBuffer();
        contentType = blob.type || 'audio/webm';
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        arrayBuffer = decode(base64);
        contentType = 'audio/m4a';
      }

      const { error: uploadError } = await supabase.storage.from('voice-notes').upload(fileName, arrayBuffer, { contentType });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('voice-notes').getPublicUrl(fileName);
      const { error: insertError } = await supabase.from('voice_notes').insert([{ agent_id: userId, audio_url: urlData.publicUrl }]);
      if (insertError) throw insertError;

      await fetchNotes();
    } catch (e) {
      setLastError('Could not save recording: ' + (e.message || 'Unknown error'));
    }
    setUploading(false);
  };

  const transcribe = async (note) => {
    setTranscribingId(note.id);
    setLastError('');
    try {
      const { data, error } = await supabase.functions.invoke('transcribe-voice-note', {
        body: {
          voice_note_id: note.id,
          audio_url: note.audio_url,
          word_boost: [...productNames, 'cedis', 'MoMo', 'credit', 'packs'],
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to start transcription');
      }

      // With webhooks, this returns instantly!
      if (data && data.success) {
        setLastError('✅ Sent to AssemblyAI! The text will appear automatically in a moment...');
      } else if (data && data.error) {
        throw new Error(data.error);
      }

      await fetchNotes();
    } catch (e) {
      setLastError('Could not transcribe: ' + (e.message || 'Unknown error'));
    }
    setTranscribingId(null);
  };

  const saveEdit = async (note) => {
    const text = edits[note.id];
    const { error } = await supabase.from('voice_notes').update({ transcript: text }).eq('id', note.id);
    if (error) { setLastError('Could not save correction: ' + error.message); return; }
    setEdits((prev) => { const next = { ...prev }; delete next[note.id]; return next; });
    fetchNotes();
  };

  const deleteNote = async (note) => {
    try {
      const fileName = note.audio_url.split('/').pop();
      await supabase.storage.from('voice-notes').remove([fileName]);
      const { error } = await supabase.from('voice_notes').delete().eq('id', note.id);
      if (error) throw error;
      setConfirmDeleteId(null);
      fetchNotes();
    } catch (e) {
      setLastError('Could not delete: ' + (e.message || 'Unknown error'));
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.box, { backgroundColor: C.card }]}>
          <Text style={[styles.title, { color: C.ink }]}>🎙️ Voice Notes</Text>
          <Text style={[styles.subtitle, { color: C.sub }]}>
            Speak in English for the clearest transcription. Check the text and fix any mistakes before you use it. Sale amounts are always entered by you in Log Sale.
          </Text>

          {lastError ? (
            <View style={{ backgroundColor: lastError.includes('✅') ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: 10, marginBottom: 10 }}>
              <Text style={{ color: lastError.includes('✅') ? '#166534' : '#991b1b', fontSize: 12 }}>{lastError}</Text>
            </View>
          ) : null}

          {!isManager && (
            <TouchableOpacity
              onPress={isRecording ? stopRecording : startRecording}
              style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
              disabled={uploading}
            >
              <Text style={styles.recordBtnText}>
                {uploading ? 'Saving...' : isRecording ? '⏹ Stop Recording' : '🎙️ Start Recording'}
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView style={{ maxHeight: 320, marginTop: 14 }}>
            {notes.length === 0 ? (
              <Text style={{ color: C.sub, textAlign: 'center' }}>No voice notes yet.</Text>
            ) : (
              notes.map((n) => {
                const currentText = edits[n.id] ?? n.transcript ?? '';
                const changed = edits[n.id] !== undefined && edits[n.id] !== n.transcript;
                return (
                  <View key={n.id} style={[styles.noteRow, { borderColor: C.border }]}>
                    <Text style={{ color: C.sub, fontSize: 12 }}>{new Date(n.created_at).toLocaleString()}</Text>

                    {n.transcript !== null && n.transcript !== undefined ? (
                      <>
                        {isManager ? (
                          <Text style={{ color: C.ink, marginTop: 4 }}>📝 {n.transcript}</Text>
                        ) : (
                          <TextInput
                            style={[styles.transcriptInput, { color: C.ink, borderColor: C.border, backgroundColor: C.bg }]}
                            multiline
                            value={currentText}
                            onChangeText={(v) => setEdits((prev) => ({ ...prev, [n.id]: v }))}
                          />
                        )}
                        {!isManager && changed && (
                          <TouchableOpacity onPress={() => saveEdit(n)}>
                            <Text style={{ color: '#0b6b43', fontWeight: '700', marginTop: 6 }}>💾 Save correction</Text>
                          </TouchableOpacity>
                        )}
                        {!isManager && onUseInLogSale && (
                          <TouchableOpacity onPress={() => { onUseInLogSale(currentText); onClose(); }}>
                            <Text style={{ color: '#0b6b43', fontWeight: '700', marginTop: 6 }}>➕ Use This to Log a Sale</Text>
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <TouchableOpacity
                        onPress={() => transcribe(n)}
                        disabled={transcribingId === n.id}
                        style={{ opacity: transcribingId === n.id ? 0.5 : 1 }}
                      >
                        <Text style={{ color: '#0b6b43', fontWeight: '600', marginTop: 4 }}>
                          {transcribingId === n.id
                            ? '⏳ Sending to AssemblyAI...'
                            : '🔤 Transcribe'}
                        </Text>
                      </TouchableOpacity>
                    )}

                    {confirmDeleteId === n.id ? (
                      <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
                        <Text style={{ color: '#dc2626', fontSize: 12 }}>Delete this note?</Text>
                        <TouchableOpacity onPress={() => deleteNote(n)}><Text style={{ color: '#dc2626', fontWeight: '700', fontSize: 12 }}>Yes</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setConfirmDeleteId(null)}><Text style={{ color: C.sub, fontSize: 12 }}>No</Text></TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setConfirmDeleteId(n.id)} style={{ marginTop: 8 }}>
                        <Text style={{ color: '#dc2626', fontSize: 12, fontWeight: '600' }}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })
            )}
          </ScrollView>

          <TouchableOpacity onPress={onClose} style={{ marginTop: 14 }}>
            <Text style={{ color: C.sub, textAlign: 'center' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  box: { borderRadius: 16, padding: 20 },
  title: { fontSize: 19, fontWeight: '800' },
  subtitle: { fontSize: 12, marginTop: 4, marginBottom: 10, lineHeight: 17 },
  recordBtn: { backgroundColor: '#0b6b43', borderRadius: 14, paddingVertical: 18, alignItems: 'center' },
  recordBtnActive: { backgroundColor: '#dc2626' },
  recordBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  noteRow: { paddingVertical: 10, borderBottomWidth: 1 },
  transcriptInput: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 6, fontSize: 14, minHeight: 50 },
});