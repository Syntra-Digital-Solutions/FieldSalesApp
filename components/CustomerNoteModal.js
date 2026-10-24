import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView } from 'react-native';
import { supabase } from '../src/config/supabaseClient';

const C = { blue: '#0b6b43', ink: '#1a1f26', sub: '#6b7280', white: '#ffffff', border: '#e5e5df' };

export default function CustomerNoteModal({ visible, storeName, userId, onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    if (visible && storeName) {
      (async () => {
        const { data } = await supabase.from('customer_notes').select('id, note, created_at').eq('agent_id', userId).eq('store_name', storeName).order('created_at', { ascending: false });
        setNotes(data || []);
      })();
    }
  }, [visible, storeName]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { error } = await supabase.from('customer_notes').insert([{ agent_id: userId, store_name: storeName, note: newNote.trim() }]);
    if (!error) {
      setNewNote('');
      const { data } = await supabase.from('customer_notes').select('id, note, created_at').eq('agent_id', userId).eq('store_name', storeName).order('created_at', { ascending: false });
      setNotes(data || []);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.box}>
          <Text style={styles.title}>Notes — {storeName}</Text>
          <ScrollView style={{ maxHeight: 200 }}>
            {notes.length === 0 ? (
              <Text style={styles.empty}>No notes yet for this store.</Text>
            ) : (
              notes.map((n) => (
                <View key={n.id} style={styles.noteRow}>
                  <Text style={styles.noteText}>{n.note}</Text>
                  <Text style={styles.noteDate}>{new Date(n.created_at).toLocaleDateString()}</Text>
                </View>
              ))
            )}
          </ScrollView>
          <TextInput style={styles.input} value={newNote} onChangeText={setNewNote} placeholder="e.g. Prefers cash on Fridays, wants restock next week..." multiline />
          <TouchableOpacity style={styles.addBtn} onPress={addNote}><Text style={styles.addBtnText}>Add Note</Text></TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 10 }}><Text style={styles.close}>Close</Text></TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.4)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: C.white, borderRadius: 16, padding: 20 },
  title: { fontSize: 17, fontWeight: '800', color: C.ink, marginBottom: 12 },
  empty: { color: C.sub, textAlign: 'center', marginVertical: 10 },
  noteRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  noteText: { fontSize: 14, color: C.ink },
  noteDate: { fontSize: 11, color: C.sub, marginTop: 2 },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, fontSize: 14, marginTop: 12, minHeight: 60 },
  addBtn: { backgroundColor: C.blue, borderRadius: 10, padding: 13, alignItems: 'center', marginTop: 10 },
  addBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
  close: { textAlign: 'center', color: C.sub, fontSize: 15 },
});