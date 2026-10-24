import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert, Platform } from 'react-native';
import { supabase } from '../src/config/supabaseClient';
import { shareToWhatsApp, shareToEmail, shareToSMS } from '../src/utils/share';
import { generateAndSharePDF } from '../src/utils/pdf';
import ConfirmModal from './ConfirmModal';

export default function TripManager({ onBack }) {
  const [trips, setTrips] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeTrip, setActiveTrip] = useState(null);
    const [confirmDeleteTrip, setConfirmDeleteTrip] = useState(null);
  const [loads, setLoads] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [loading, setLoading] = useState(true);

  const [loadModalOpen, setLoadModalOpen] = useState(false);
  const [loadProduct, setLoadProduct] = useState(null);
  const [loadQty, setLoadQty] = useState('');

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  const [reconcileModalOpen, setReconcileModalOpen] = useState(false);
  const [reconcileProduct, setReconcileProduct] = useState(null);
  const [reconcileQty, setReconcileQty] = useState('');
  const [reconcileCash, setReconcileCash] = useState('');

    const deleteTrip = (trip) => {
    setConfirmDeleteTrip(trip);
  };

  const confirmDeleteTripNow = async () => {
    const trip = confirmDeleteTrip;
    setConfirmDeleteTrip(null);
    await supabase.from('trip_loads').delete().eq('trip_id', trip.id);
    await supabase.from('trip_expenses').delete().eq('trip_id', trip.id);
    await supabase.from('trip_reconciliations').delete().eq('trip_id', trip.id);
    const { error } = await supabase.from('vehicle_trips').delete().eq('id', trip.id);
    if (error) Alert.alert('Error', error.message);
    else fetchTrips();
  };
  const fetchTrips = useCallback(async () => {
    const { data } = await supabase.from('vehicle_trips').select('*').order('created_at', { ascending: false });
    setTrips(data || []);
    setLoading(false);
  }, []);

  const fetchProducts = useCallback(async () => {
    const { data } = await supabase.from('products').select('id, name').eq('active', true);
    setProducts(data || []);
  }, []);

  const fetchTripDetails = useCallback(async (tripId) => {
    const [{ data: loadRows }, { data: expenseRows }, { data: reconRows }] = await Promise.all([
      supabase.from('trip_loads').select('id, product_id, quantity_loaded').eq('trip_id', tripId),
      supabase.from('trip_expenses').select('id, category, amount, note, created_at').eq('trip_id', tripId).order('created_at', { ascending: false }),
      supabase.from('trip_reconciliations').select('id, product_id, quantity_returned, cash_handed').eq('trip_id', tripId),
    ]);
    setLoads(loadRows || []);
    setExpenses(expenseRows || []);
    setReconciliations(reconRows || []);
  }, []);

  useEffect(() => {
    fetchTrips();
    fetchProducts();
  }, [fetchTrips, fetchProducts]);

  const openTrip = async (trip) => {
    setActiveTrip(trip);
    await fetchTripDetails(trip.id);
  };

  const startNewTrip = async () => {
    const { data, error } = await supabase.from('vehicle_trips').insert([{ trip_date: new Date().toISOString().slice(0, 10) }]).select().single();
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchTrips();
    openTrip(data);
  };

  const productName = (id) => products.find((p) => p.id === id)?.name || 'Product';

  const submitLoad = async () => {
    const qty = parseInt(loadQty, 10);
    if (!loadProduct || !qty || qty <= 0) { Alert.alert('Error', 'Select a product and enter a valid quantity.'); return; }
    const { error } = await supabase.from('trip_loads').insert([{ trip_id: activeTrip.id, product_id: loadProduct.id, quantity_loaded: qty }]);
    if (error) { Alert.alert('Error', error.message); return; }
    await supabase.from('vehicle_trips').update({ status: 'active' }).eq('id', activeTrip.id);
    setActiveTrip((t) => ({ ...t, status: 'active' }));
    setLoadModalOpen(false);
    setLoadQty('');
    fetchTripDetails(activeTrip.id);
  };

  const submitExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseCategory.trim() || isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a category and valid amount.'); return; }
    const { error } = await supabase.from('trip_expenses').insert([{ trip_id: activeTrip.id, category: expenseCategory.trim(), amount: amt, note: expenseNote.trim() || null }]);
    if (error) { Alert.alert('Error', error.message); return; }
    setExpenseModalOpen(false);
    setExpenseCategory(''); setExpenseAmount(''); setExpenseNote('');
    fetchTripDetails(activeTrip.id);
  };

  const openReconcile = (productId) => {
    setReconcileProduct(productId);
    setReconcileQty('');
    setReconcileCash('');
    setReconcileModalOpen(true);
  };

  const submitReconcile = async () => {
    const qty = parseInt(reconcileQty, 10);
    const cash = parseFloat(reconcileCash);
    if (isNaN(qty) || qty < 0 || isNaN(cash) || cash < 0) { Alert.alert('Error', 'Enter valid numbers.'); return; }
    const { error } = await supabase.from('trip_reconciliations').insert([{ trip_id: activeTrip.id, product_id: reconcileProduct, quantity_returned: qty, cash_handed: cash }]);
    if (error) { Alert.alert('Error', error.message); return; }
    setReconcileModalOpen(false);
    fetchTripDetails(activeTrip.id);
  };

  const finalizeTrip = async () => {
    await supabase.from('vehicle_trips').update({ status: 'reconciled' }).eq('id', activeTrip.id);
    setActiveTrip((t) => ({ ...t, status: 'reconciled' }));
    fetchTrips();
  };

  const totalLoaded = loads.reduce((sum, l) => sum + l.quantity_loaded, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCashHanded = reconciliations.reduce((sum, r) => sum + Number(r.cash_handed), 0);
  const netProfit = totalCashHanded - totalExpenses;

  const summaryText = () => {
    if (!activeTrip) return '';
    const loadLines = loads.map((l) => `${productName(l.product_id)}: loaded ${l.quantity_loaded}`).join('\n');
    const expenseLines = expenses.map((e) => `${e.category}: GHS ${Number(e.amount).toFixed(2)}`).join('\n');
    const reconLines = reconciliations.map((r) => `${productName(r.product_id)}: returned ${r.quantity_returned}, cash GHS ${Number(r.cash_handed).toFixed(2)}`).join('\n');
    return `Trip Report — ${activeTrip.trip_date}\n\nLoaded:\n${loadLines || 'None'}\n\nExpenses:\n${expenseLines || 'None'}\n\nReconciliation:\n${reconLines || 'None'}\n\nTotal cash handed: GHS ${totalCashHanded.toFixed(2)}\nTotal expenses: GHS ${totalExpenses.toFixed(2)}\nNet profit: GHS ${netProfit.toFixed(2)}`;
  };

  const buildTripHTML = () => {
    const loadRows = loads.map((l) => `<tr><td>${productName(l.product_id)}</td><td>${l.quantity_loaded}</td></tr>`).join('');
    const expenseRows = expenses.map((e) => `<tr><td>${e.category}</td><td>GHS ${Number(e.amount).toFixed(2)}</td><td>${e.note || '—'}</td></tr>`).join('');
    const reconRows = reconciliations.map((r) => `<tr><td>${productName(r.product_id)}</td><td>${r.quantity_returned}</td><td>GHS ${Number(r.cash_handed).toFixed(2)}</td></tr>`).join('');
    
    return `<html><head><title>Trip Report ${activeTrip.trip_date}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #0f172a; background-color: #f8fafc; max-width: 800px; margin: 0 auto; }
        .container { background: #ffffff; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
        h1 { font-size: 24px; font-weight: 800; margin: 0; }
        .back-btn { display: inline-block; padding: 10px 20px; background-color: #0f172a; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; }
        .back-btn:hover { background-color: #334155; }
        h2 { font-size: 16px; font-weight: 700; color: #334155; margin-top: 30px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-top: 8px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
        th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        th { background-color: #f8fafc; font-weight: 700; color: #475569; }
        tr:last-child td { border-bottom: none; }
        .totals { margin-top: 30px; padding: 20px; background-color: #f8fafc; border-radius: 8px; font-size: 16px; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; }
      </style>
      </head><body>
      
      <div class="container">
        <div class="header">
          <h1>Vehicle Trip Report — ${activeTrip.trip_date}</h1>
          <a href="javascript:window.close();" class="back-btn">← Back to App</a>
        </div>

        <h2>Loaded Stock</h2>
        <table><thead><tr><th>Product</th><th>Quantity</th></tr></thead><tbody>${loadRows || '<tr><td colspan="2">None</td></tr>'}</tbody></table>
        
        <h2>Expenses</h2>
        <table><thead><tr><th>Category</th><th>Amount</th><th>Note</th></tr></thead><tbody>${expenseRows || '<tr><td colspan="3">None</td></tr>'}</tbody></table>
        
        <h2>Reconciliation</h2>
        <table><thead><tr><th>Product</th><th>Returned</th><th>Cash Handed</th></tr></thead><tbody>${reconRows || '<tr><td colspan="3">None</td></tr>'}</tbody></table>
        
        <div class="totals">
          <span>Total Cash: GHS ${totalCashHanded.toFixed(2)}</span>
          <span>Expenses: GHS ${totalExpenses.toFixed(2)}</span>
          <span>Net Profit: GHS ${netProfit.toFixed(2)}</span>
        </div>
      </div>

      </body></html>`;
  };


  const handlePrintTrip = () => {
    if (Platform.OS !== 'web') { Alert.alert('Print', 'Use Save PDF instead on mobile.'); return; }
    const w = window.open('', '_blank');
    w.document.write(buildTripHTML()); w.document.close(); w.focus(); w.print();
  };

  const handleSaveTripPDF = async () => {
    await generateAndSharePDF(buildTripHTML(), `trip_report_${activeTrip.trip_date}`);
  };

   // ---- Dashboard calculations (list view) ----
  const dashRevenue = trips.reduce((s, t) => s + Number(t.revenue || 0), 0);
  const dashExpenses = trips.reduce((s, t) => s + Number(t.expenses || 0), 0);
  const dashStockValue = trips.reduce((s, t) => s + Number(t.stock_value || 0), 0);
  const dashNet = dashRevenue - dashExpenses;
  const dashMargin = dashRevenue > 0 ? (dashNet / dashRevenue) * 100 : 0;
  const tripTarget = 500;
  const completedTrips = trips.filter((t) => Number(t.revenue || 0) > 0).length;
  const avgRevPerTrip = completedTrips > 0 ? dashRevenue / completedTrips : 0;
  const targetPct = Math.min((dashRevenue / tripTarget) * 100, 100);

  if (!activeTrip) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack}><Text style={styles.backText}>← Back</Text></TouchableOpacity>
          <Text style={styles.headerTitle}>🚚 Vehicle Trips</Text>
          <TouchableOpacity onPress={startNewTrip}><Text style={styles.newBtn}>+ New Trip</Text></TouchableOpacity>
        </View>

        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* KPI GRID */}
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Revenue</Text>
              <Text style={styles.kpiValue}>GHS {dashRevenue.toFixed(2)}</Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Expenses</Text>
              <Text style={[styles.kpiValue, { color: '#dc2626' }]}>GHS {dashExpenses.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.kpiRow}>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Net Profit</Text>
              <Text style={[styles.kpiValue, { color: dashNet >= 0 ? '#0b6b43' : '#dc2626' }]}>
                GHS {dashNet.toFixed(2)}
              </Text>
            </View>
            <View style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Margin</Text>
              <Text style={[styles.kpiValue, { color: dashMargin > 30 ? '#0b6b43' : '#dc2626' }]}>
                {dashMargin.toFixed(0)}%
              </Text>
            </View>
          </View>

          {/* TARGET PROGRESS */}
          <View style={styles.targetCard}>
            <Text style={styles.sectionTitle}>📈 Revenue vs Target</Text>
            <Text style={styles.detail}>Target: GHS {tripTarget} · {completedTrips} completed trip(s)</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${targetPct}%`, backgroundColor: targetPct >= 100 ? '#0b6b43' : '#2563eb' }]} />
            </View>
            <Text style={styles.progressText}>
              {targetPct >= 100 ? '🎯 Target hit!' : `GHS ${(tripTarget - dashRevenue).toFixed(2)} to go`}
            </Text>
            <Text style={styles.detail}>Avg per trip: GHS {avgRevPerTrip.toFixed(2)}</Text>
          </View>

          {/* TRIP HISTORY */}
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>📋 Trip History</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading...</Text>
          ) : trips.length === 0 ? (
            <Text style={styles.emptyText}>No trips yet. Start one before departure.</Text>
          ) : (
            trips.map((t) => {
              const rev = Number(t.revenue || 0);
              const exp = Number(t.expenses || 0);
              const net = rev - exp;
              return (
                <View key={t.id} style={styles.row}>
                  <TouchableOpacity onPress={() => openTrip(t)}>
                    <Text style={styles.agentName}>{t.trip_date}</Text>
                    <Text style={styles.detail}>
                      {t.status} · Rev GHS {rev.toFixed(2)} · Exp GHS {exp.toFixed(2)}
                    </Text>
                    <Text style={[styles.detail, { fontWeight: '700', color: net >= 0 ? '#0b6b43' : '#dc2626' }]}>
                      Net: GHS {net.toFixed(2)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTrip(t)} style={{ marginTop: 8 }}>
                    <Text style={styles.deleteText}>Delete Trip</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        <ConfirmModal
          visible={!!confirmDeleteTrip}
          title="Delete Trip"
          message={`Permanently delete the ${confirmDeleteTrip?.trip_date} trip and all its loaded stock, expenses, and reconciliation records? This cannot be undone.`}
          confirmLabel="Delete Trip"
          destructive
          onConfirm={confirmDeleteTripNow}
          onCancel={() => setConfirmDeleteTrip(null)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setActiveTrip(null)}><Text style={styles.backText}>← Trips</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>{activeTrip.trip_date}</Text>
        <Text style={styles.detail}>{activeTrip.status}</Text>
      </View>

       <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Loaded</Text>
          <Text style={styles.kpiValue}>{totalLoaded} <Text style={{ fontSize: 13, color: '#64748b' }}>units</Text></Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Expenses</Text>
          <Text style={[styles.kpiValue, { color: '#dc2626' }]}>GHS {totalExpenses.toFixed(2)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Net Profit</Text>
          <Text style={[styles.kpiValue, { color: netProfit >= 0 ? '#0b6b43' : '#dc2626' }]}>GHS {netProfit.toFixed(2)}</Text>
        </View>
      </View>

      <ScrollView style={styles.list}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Loaded Stock</Text>
          <TouchableOpacity style={styles.smallBtn} onPress={() => { setLoadProduct(products[0] || null); setLoadModalOpen(true); }}>
            <Text style={styles.smallBtnText}>+ Load</Text>
          </TouchableOpacity>
        </View>
        {loads.length === 0 ? <Text style={styles.emptyText}>Nothing loaded yet.</Text> : loads.map((l) => (
          <View key={l.id} style={styles.row}>
            <Text style={styles.agentName}>{productName(l.product_id)}</Text>
            <Text style={styles.detail}>Loaded {l.quantity_loaded}</Text>
          </View>
        ))}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Expenses</Text>
          <TouchableOpacity style={styles.smallBtn} onPress={() => setExpenseModalOpen(true)}>
            <Text style={styles.smallBtnText}>+ Expense</Text>
          </TouchableOpacity>
        </View>
        {expenses.length === 0 ? <Text style={styles.emptyText}>No expenses logged.</Text> : expenses.map((e) => (
          <View key={e.id} style={styles.row}>
            <Text style={styles.agentName}>{e.category} — GHS {Number(e.amount).toFixed(2)}</Text>
            {e.note ? <Text style={styles.detail}>{e.note}</Text> : null}
          </View>
        ))}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { marginTop: 16 }]}>End-of-Day Reconciliation</Text>
        </View>
        {loads.length === 0 ? (
          <Text style={styles.emptyText}>Load stock first.</Text>
        ) : (
          [...new Set(loads.map((l) => l.product_id))].map((pid) => {
            const recon = reconciliations.find((r) => r.product_id === pid);
            return (
              <View key={pid} style={styles.row}>
                <Text style={styles.agentName}>{productName(pid)}</Text>
                <Text style={styles.detail}>
                  {recon ? `Returned ${recon.quantity_returned} · Cash GHS ${Number(recon.cash_handed).toFixed(2)}` : 'Not yet reconciled'}
                </Text>
                <TouchableOpacity style={styles.smallBtn} onPress={() => openReconcile(pid)}>
                  <Text style={styles.smallBtnText}>{recon ? 'Update' : 'Reconcile'}</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {activeTrip.status !== 'reconciled' && (
          <TouchableOpacity style={styles.finalizeBtn} onPress={finalizeTrip}>
            <Text style={styles.submitText}>Finalize Trip</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.printBtn} onPress={handlePrintTrip}>
          <Text style={[styles.submitText, { color: '#0f172a' }]}>🖨️ Print Trip Report</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.pdfBtn} onPress={handleSaveTripPDF}>
          <Text style={[styles.submitText, { color: '#0f172a' }]}>📄 Save PDF</Text>
        </TouchableOpacity>

        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => shareToWhatsApp(summaryText())}>
            <Text style={styles.shareBtnText}>WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => shareToEmail(`Trip Report ${activeTrip.trip_date}`, summaryText())}>
            <Text style={styles.shareBtnText}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareBtn} onPress={() => shareToSMS(summaryText())}>
            <Text style={styles.shareBtnText}>SMS</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal visible={loadModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Load Stock</Text>
            <Text style={styles.label}>Product</Text>
                 <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {products.map((p) => (
                <TouchableOpacity key={p.id} style={[styles.chip, loadProduct?.id === p.id && styles.chipActive]} onPress={() => setLoadProduct(p)}>
                  <Text style={loadProduct?.id === p.id ? styles.chipTextActive : styles.chipText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.label}>Quantity</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={loadQty} onChangeText={setLoadQty} placeholder="0" />
            <TouchableOpacity style={styles.submitBtn} onPress={submitLoad}><Text style={styles.submitText}>Load</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setLoadModalOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={expenseModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Log Expense</Text>
            <Text style={styles.label}>Category</Text>
            <TextInput style={styles.input} value={expenseCategory} onChangeText={setExpenseCategory} placeholder="Fuel, parking, tolls..." />
            <Text style={styles.label}>Amount (GHS)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={expenseAmount} onChangeText={setExpenseAmount} placeholder="0.00" />
            <Text style={styles.label}>Note (optional)</Text>
            <TextInput style={styles.input} value={expenseNote} onChangeText={setExpenseNote} />
            <TouchableOpacity style={styles.submitBtn} onPress={submitExpense}><Text style={styles.submitText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setExpenseModalOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={reconcileModalOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Reconcile — {productName(reconcileProduct)}</Text>
            <Text style={styles.label}>Quantity returned unsold</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={reconcileQty} onChangeText={setReconcileQty} placeholder="0" />
            <Text style={styles.label}>Cash handed to manager (GHS)</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={reconcileCash} onChangeText={setReconcileCash} placeholder="0.00" />
            <TouchableOpacity style={styles.submitBtn} onPress={submitReconcile}><Text style={styles.submitText}>Save</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setReconcileModalOpen(false)}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    deleteText: { fontSize: 13, color: '#dc2626', fontWeight: '700', paddingVertical: 8, paddingHorizontal: 4 },
  container: { flex: 1, padding: 24, backgroundColor: '#f8fafc', width: '100%', maxWidth: 900, alignSelf: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b' },
  backText: { color: '#2563eb', fontWeight: '600' },
  newBtn: { color: '#2563eb', fontWeight: '600' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, backgroundColor: '#fff', padding: 14, borderRadius: 10 },
  kpiLabel: { fontSize: 11, color: '#64748b' },
  kpiValue: { fontSize: 15, fontWeight: '700', marginTop: 4, color: '#0f172a' },
    targetCard: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginTop: 16, marginBottom: 4 },
  progressBarBg: { height: 14, backgroundColor: '#e2e8f0', borderRadius: 7, overflow: 'hidden', marginTop: 10 },
  progressBarFill: { height: '100%', borderRadius: 7 },
  progressText: { fontSize: 13, fontWeight: '700', color: '#0f172a', marginTop: 8 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 8 },
  smallBtn: { backgroundColor: '#2563eb', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  smallBtnText: { color: '#fff', fontWeight: '600', fontSize: 12 },
  list: { flex: 1 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 8, marginBottom: 8 },
  row: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.02, shadowRadius: 4 },
  agentName: { fontWeight: '600', color: '#0f172a' },
  detail: { fontSize: 12, color: '#64748b', marginTop: 2 },
  finalizeBtn: { backgroundColor: '#0f172a', padding: 14, borderRadius: 10, marginTop: 16, alignItems: 'center', width: '100%', maxWidth: 300, alignSelf: 'center' },
  printBtn: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center', width: '100%', maxWidth: 300, alignSelf: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  pdfBtn: { backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginTop: 10, alignItems: 'center', width: '100%', maxWidth: 300, alignSelf: 'center', borderWidth: 1, borderColor: '#cbd5e1' },
  shareRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 24, marginBottom: 20, flexWrap: 'wrap' },
  shareBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, alignItems: 'center' },
  shareBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: '#1e293b' },
  label: { fontSize: 13, color: '#475569', marginBottom: 4, marginTop: 8 },
  chipRow: { flexDirection: 'row', marginBottom: 4 },
  chip: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 8, backgroundColor: '#fff' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  chipText: { color: '#475569', fontSize: 13 },
  chipTextActive: { color: '#fff', fontSize: 13, fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10, fontSize: 15 },
  submitBtn: { backgroundColor: '#2563eb', padding: 14, borderRadius: 8, marginTop: 20, alignItems: 'center' },
  submitText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  cancelText: { textAlign: 'center', color: '#64748b', marginTop: 12 },
});