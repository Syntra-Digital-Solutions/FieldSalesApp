import React, { useState } from 'react';
import { 
  Modal, View, Text, StyleSheet, TextInput, 
  TouchableOpacity, ScrollView, Alert 
} from 'react-native';
import { supabase } from '../src/config/supabaseClient';

export default function HistoricalCaptureModal({ visible, onClose, agents, products, onRefresh }) {
  const [selectedAgent, setSelectedAgent] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [paperRef, setPaperRef] = useState('');
  const [storeName, setStoreName] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(products[0]?.id || '');
  const [itemsSold, setItemsSold] = useState('');
  const [actualCash, setActualCash] = useState('');
  const [paymentType, setPaymentType] = useState('cash'); // 'cash' or 'momo'
  const [momoRef, setMomoRef] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSaveHistoricalSale = async () => {
    if (!selectedAgent || !storeName || !itemsSold || !actualCash || !saleDate) {
      Alert.alert('Missing Fields', 'Please fill in the agent, date, store, quantity, and cash amount.');
      return;
    }

    setSaving(true);
    try {
      const prod = products.find(p => p.id === selectedProduct) || products[0];
      const timestamp = new Date(saleDate).toISOString();

      const { error } = await supabase.from('sales').insert([{
        user_id: selectedAgent,
        store_name: storeName,
        product_id: prod?.id,
        items_sold: parseInt(itemsSold, 10),
        actual_cash: parseFloat(actualCash),
        payment_type: paymentType,
        momo_ref: paymentType === 'momo' ? momoRef : null,
        paper_ref: paperRef || null,
        is_historical: true,
        created_at: timestamp
      }]);

      if (error) throw error;

      Alert.alert('Success', 'Historical paper record captured successfully!');
      
      // Reset form for next entry
      setStoreName('');
      setItemsSold('');
      setActualCash('');
      setPaperRef('');
      setMomoRef('');
      if (onRefresh) onRefresh();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to save historical record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Capture Historical Paper Record</Text>
          <Text style={styles.subtitle}>Digitize backdated paper receipts into the system database.</Text>

          <ScrollView style={styles.form}>
            <Text style={styles.label}>Date of Sale (YYYY-MM-DD):</Text>
            <TextInput 
              style={styles.input} 
              value={saleDate} 
              onChangeText={setSaleDate} 
              placeholder="2026-08-15" 
            />

            <Text style={styles.label}>Paper Receipt / Serial Ref #:</Text>
            <TextInput 
              style={styles.input} 
              value={paperRef} 
              onChangeText={setPaperRef} 
              placeholder="e.g. REC-2026-001" 
            />

            <Text style={styles.label}>Assign to Field Agent ID/Email:</Text>
            <TextInput 
              style={styles.input} 
              value={selectedAgent} 
              onChangeText={setSelectedAgent} 
              placeholder="Agent ID or Email" 
            />

            <Text style={styles.label}>Store / Customer Name:</Text>
            <TextInput 
              style={styles.input} 
              value={storeName} 
              onChangeText={setStoreName} 
              placeholder="Store Name" 
            />

            <Text style={styles.label}>Quantity Sold:</Text>
            <TextInput 
              style={styles.input} 
              value={itemsSold} 
              onChangeText={setItemsSold} 
              keyboardType="numeric" 
              placeholder="0" 
            />

            <Text style={styles.label}>Total Amount Collected (GHS):</Text>
            <TextInput 
              style={styles.input} 
              value={actualCash} 
              onChangeText={setActualCash} 
              keyboardType="numeric" 
              placeholder="0.00" 
            />

            <Text style={styles.label}>Payment Method:</Text>
            <View style={styles.row}>
              <TouchableOpacity 
                style={[styles.typeBtn, paymentType === 'cash' && styles.selectedBtn]} 
                onPress={() => setPaymentType('cash')}
              >
                <Text style={paymentType === 'cash' ? styles.whiteText : styles.btnText}>Cash</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, paymentType === 'momo' && styles.selectedBtn]} 
                onPress={() => setPaymentType('momo')}
              >
                <Text style={paymentType === 'momo' ? styles.whiteText : styles.btnText}>MoMo</Text>
              </TouchableOpacity>
            </View>

            {paymentType === 'momo' && (
              <>
                <Text style={styles.label}>MoMo Transaction ID:</Text>
                <TextInput 
                  style={styles.input} 
                  value={momoRef} 
                  onChangeText={setMomoRef} 
                  placeholder="Reference Number" 
                />
              </>
            )}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Done / Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveHistoricalSale} disabled={saving}>
              <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save & Next Entry'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  container: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '85%' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 15 },
  form: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginTop: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 15 },
  row: { flexDirection: 'row', gap: 10, marginTop: 5 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#0284c7', alignItems: 'center' },
  selectedBtn: { backgroundColor: '#0284c7' },
  btnText: { color: '#0284c7', fontWeight: 'bold' },
  whiteText: { color: '#fff', fontWeight: 'bold' },
  actions: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 15 },
  cancelBtn: { padding: 12, borderRadius: 8, backgroundColor: '#f1f5f9' },
  cancelText: { color: '#475569', fontWeight: 'bold' },
  saveBtn: { padding: 12, borderRadius: 8, backgroundColor: '#16a34a' },
  saveText: { color: '#fff', fontWeight: 'bold' }
});