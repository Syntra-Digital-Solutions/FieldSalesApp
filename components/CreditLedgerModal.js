import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal, ScrollView, Alert } from 'react-native';
import { supabase } from '../src/config/supabaseClient';

export default function CreditLedgerModal({ visible, onClose }) {
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [payingRow, setPayingRow] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const { data: creditSales, error: salesError } = await supabase
        .from('sales')
        .select('id, worker_id, product_id, items_sold, expected_cash, store_name, created_at')
        .eq('payment_type', 'credit')
        .order('created_at', { ascending: false });
      if (salesError) throw salesError;

      const { data: profiles } = await supabase.from('profiles').select('id, full_name');
      const { data: products } = await supabase.from('products').select('id, name');
      const { data: repayments, error: repayError } = await supabase.from('credit_repayments').select('sale_id, amount');
      if (repayError) throw repayError;

      const nameMap = {};
      (profiles || []).forEach((p) => { nameMap[p.id] = p.full_name; });
      const productMap = {};
      (products || []).forEach((p) => { productMap[p.id] = p.name; });

      const paidMap = {};
      (repayments || []).forEach((r) => { paidMap[r.sale_id] = (paidMap[r.sale_id] || 0) + Number(r.amount); });

      const rows = (creditSales || []).map((s) => {
        const paid = paidMap[s.id] || 0;
        const owed = Number(s.expected_cash) - paid;
        return {
          id: s.id,
          agentName: nameMap[s.worker_id] || 'Unknown Agent',
          productName: productMap[s.product_id] || 'Unknown Product',
          storeName: s.store_name,
          items_sold: s.items_sold,
          expected_cash: Number(s.expected_cash),
          paid,
          owed,
          created_at: s.created_at,
        };
      }).filter((r) => r.owed > 0.01);

      setLedger(rows.sort((a, b) => b.owed - a.owed));
    } catch (e) {
      Alert.alert('Could not load credit ledger', e.message || 'Unknown error');
    }
    setLoading(false);
  };

  useEffect(() => { if (visible) fetchLedger(); }, [visible]);

  const totalOwed = ledger.reduce((sum, r) => sum + r.owed, 0);

  const openPay = (row) => { setPayingRow(row); setPayAmount(row.owed.toFixed(2)); };

  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }

    const { error: repayError } = await supabase.from('credit_repayments').insert([{ sale_id: payingRow.id, amount: amt }]);
    if (repayError) { Alert.alert('Error', repayError.message); return; }

    const newActualCash = payingRow.paid + amt;
    const { error: updateError } = await supabase.from('sales').update({ actual_cash: newActualCash }).eq('id', payingRow.id);
    if (updateError) { Alert.alert('Saved partially', `Repayment recorded, but the agent's total couldn't update: ${updateError.message}`); }

    setPayingRow(null);
    fetchLedger();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={{ backgroundColor: '#ffffff', maxWidth: 600, width: '95%', maxHeight: '90%', borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 }}>
          
          {/* STICKY HEADER */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
            <View>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>🧾 Credit Ledger</Text>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Goods given on credit, not yet fully paid for.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
            </TouchableOpacity>
          </View>

          {/* SCROLLABLE BODY */}
          <ScrollView style={{ padding: 20 }}>
            <View style={{ backgroundColor: '#fffbeb', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#fde68a' }}>
              <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '600', marginBottom: 4 }}>Total Outstanding</Text>
              <Text style={{ color: '#b45309', fontSize: 28, fontWeight: '800' }}>GHS {totalOwed.toFixed(2)}</Text>
            </View>

            {loading ? (
              <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : ledger.length === 0 ? (
              <Text style={{ color: '#64748b', textAlign: 'center', marginTop: 20 }}>No outstanding credit — all caught up.</Text>
            ) : (
              ledger.map((r) => (
                <View key={r.id} style={{ padding: 16, backgroundColor: '#f8fafc', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{ color: '#0f172a', fontWeight: '800', fontSize: 16 }}>{r.storeName}</Text>
                    <Text style={{ color: '#b45309', fontWeight: '800', fontSize: 16 }}>GHS {r.owed.toFixed(2)}</Text>
                  </View>
                  <Text style={{ color: '#475569', fontSize: 13, marginBottom: 2 }}>
                    {r.productName} × {r.items_sold} — Agent: <Text style={{ fontWeight: '600' }}>{r.agentName}</Text>
                  </Text>
                  <Text style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>{new Date(r.created_at).toLocaleDateString()}</Text>
                  
                  <TouchableOpacity style={{ backgroundColor: '#0f172a', paddingVertical: 10, borderRadius: 8, alignItems: 'center' }} onPress={() => openPay(r)}>
                    <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 13 }}>Record Repayment</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {payingRow && (
              <View style={{ backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, marginTop: 8, borderWidth: 1, borderColor: '#cbd5e1' }}>
                <Text style={{ color: '#0f172a', fontWeight: '700', fontSize: 15, marginBottom: 8 }}>Repayment for {payingRow.storeName}</Text>
                <TextInput
                  style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 15, color: '#0f172a', marginBottom: 12 }}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                  placeholder="Amount (GHS)"
                  placeholderTextColor="#64748b"
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: '#0b6b43', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }} onPress={submitPayment}>
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>Confirm</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={{ flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 12, borderRadius: 8, alignItems: 'center' }} onPress={() => setPayingRow(null)}>
                    <Text style={{ color: '#475569', fontWeight: '700' }}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
});