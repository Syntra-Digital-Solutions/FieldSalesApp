import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, Platform } from 'react-native';
import { supabase } from '../supabaseClient';

export default function RecordSaleModal({ agentId, onClose, onSuccess }) {
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' or 'momo'
  const [momoRef, setMomoRef] = useState('');
  const [saleAmount, setSaleAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleSaveSale = async () => {
    if (!saleAmount || parseFloat(saleAmount) <= 0) {
      showAlert('Error', 'Please enter a valid amount.');
      return;
    }

    if (paymentType === 'momo' && !momoRef.trim()) {
      showAlert('Error', 'Please enter the MoMo Transaction Reference / ID.');
      return;
    }

    setSubmitting(true);

    try {
      // 1. Check Kill-Switch status before processing sale
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('is_active')
        .eq('id', agentId)
        .single();

      if (profileErr || profile?.is_active === false) {
        showAlert('Account Blocked', 'Your account is disabled. Please contact your manager.');
        setSubmitting(false);
        return;
      }

      // 2. Save Sale Record
      const { error } = await supabase.from('sales').insert([
        {
          worker_id: agentId,
          amount: parseFloat(saleAmount),
          payment_type: paymentType,
          momo_ref: paymentType === 'momo' ? momoRef.trim() : null,
        },
      ]);

      if (error) throw error;

      showAlert('Success', 'Sale logged successfully!');
      if (typeof onSuccess === 'function') onSuccess();
      if (typeof onClose === 'function') onClose();
    } catch (err) {
      console.error('Sale insert error:', err);
      showAlert('Error', 'Failed to save sale.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ padding: 16, backgroundColor: '#fff', borderRadius: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Record Sale</Text>

      {/* Sale Amount Input */}
      <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>Amount (GH₵)</Text>
      <TextInput
        value={saleAmount}
        onChangeText={setSaleAmount}
        keyboardType="numeric"
        placeholder="0.00"
        style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 16 }}
      />

      {/* Payment Method Selector */}
      <Text style={{ fontSize: 14, color: '#333', marginBottom: 8 }}>Payment Method</Text>
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={() => { setPaymentType('cash'); setMomoRef(''); }}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 6,
            backgroundColor: paymentType === 'cash' ? '#16a34a' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: paymentType === 'cash' ? '#fff' : '#374151', fontWeight: 'bold' }}>
            💵 Physical Cash
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setPaymentType('momo')}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 6,
            backgroundColor: paymentType === 'momo' ? '#2563eb' : '#f3f4f6',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: paymentType === 'momo' ? '#fff' : '#374151', fontWeight: 'bold' }}>
            📱 Mobile Money
          </Text>
        </TouchableOpacity>
      </View>

      {/* MoMo Reference Input */}
      {paymentType === 'momo' && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 14, color: '#333', marginBottom: 4 }}>
            MoMo Transaction Ref / ID
          </Text>
          <TextInput
            value={momoRef}
            onChangeText={setMomoRef}
            placeholder="e.g. 24819203921"
            autoCapitalize="characters"
            style={{ borderWidth: 1, borderColor: '#2563eb', borderRadius: 6, padding: 10 }}
          />
        </View>
      )}

      {/* Complete Sale Button */}
      <TouchableOpacity
        onPress={handleSaveSale}
        disabled={submitting}
        style={{
          backgroundColor: '#0f172a',
          padding: 14,
          borderRadius: 6,
          alignItems: 'center',
          opacity: submitting ? 0.6 : 1,
        }}
      >
        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
          {submitting ? 'Saving...' : 'Complete Sale'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}