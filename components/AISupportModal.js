import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Modal, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { supabase } from '../src/config/supabaseClient';

export default function AISupportModal({ visible, onClose, role = 'manager', userId }) {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      text: `Hi ${role === 'agent' ? 'Agent' : 'Manager'}! I am your AI Assistant. Ask me anything about your ${role === 'agent' ? 'own sales and stock' : 'sales, agents, or stock'}.` 
    }
  ]);
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    if (!query.trim()) return;
    
    const userMsg = query.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setQuery('');
    setLoading(true);

    try {
      // Send the role and userId to the edge function
      const { data, error } = await supabase.functions.invoke('ai-manager-assistant', {
        body: { prompt: userMsg, role: role, userId: userId }
      });

      if (error) throw error;
      
      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'I could not understand that.' }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error: ' + e.message }]);
    }
    setLoading(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
<View style={{ backgroundColor: '#ffffff', width: '90%', maxWidth: 600, height: '85%', marginLeft: 'auto', marginRight: 'auto', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
          
          {/* HEADER */}
          <View style={{ backgroundColor: '#0f172a', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#ffffff' }}>
                ✨ AI {role === 'agent' ? 'Agent' : 'Manager'} Assistant
              </Text>
              <Text style={{ fontSize: 13, color: '#94a3b8' }}>
                {role === 'agent' ? 'Ask about your sales, stock, or how to use the app.' : 'Ask about your sales, agents, or stock.'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* CHAT HISTORY */}
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {messages.map((m, i) => (
              <View key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', marginBottom: 12 }}>
                <View style={{ backgroundColor: m.role === 'user' ? '#0b6b43' : '#f1f5f9', padding: 14, borderRadius: 16, borderBottomRightRadius: m.role === 'user' ? 4 : 16, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 16 }}>
                  <Text style={{ color: m.role === 'user' ? '#ffffff' : '#0f172a', fontSize: 15, lineHeight: 22 }}>{m.text}</Text>
                </View>
              </View>
            ))}
            {loading && (
              <View style={{ alignSelf: 'flex-start', backgroundColor: '#f1f5f9', padding: 14, borderRadius: 16, borderBottomLeftRadius: 4 }}>
                <ActivityIndicator color="#0b6b43" />
              </View>
            )}
          </ScrollView>

          {/* INPUT BAR */}
          <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', flexDirection: 'row', gap: 10, backgroundColor: '#ffffff' }}>
            <TextInput
              style={{ flex: 1, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#000000' }}
              placeholder={role === 'agent' ? "e.g. How many units did I sell today?" : "e.g. Who sold the most today?"}
              placeholderTextColor="#64748b"
              value={query}
              onChangeText={setQuery}
              onSubmitEditing={sendQuery}
            />
            <TouchableOpacity style={{ backgroundColor: '#0b6b43', width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }} onPress={sendQuery} disabled={loading}>
              <Text style={{ color: '#ffffff', fontSize: 20 }}>➤</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}