import ActivityCalendarModal from './ActivityCalendarModal';
import LeaderboardModal from './LeaderboardModal';
import ConfirmModal from './ConfirmModal';
import HistoricalCaptureModal from './HistoricalCaptureModal';
import SalesMapScreen from './SalesMapScreen';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl,
  TextInput, Modal, Platform, KeyboardAvoidingView, Alert, Animated
} from 'react-native';
import { supabase } from '../src/config/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TripManager from './TripManager';
import ReportActions from './ReportActions';
import AccountSettingsModal from './AccountSettingsModal';
import HelpGuideModal from './HelpGuideModal';
import DocumentCaptureModal from './DocumentCaptureModal';
import VoiceNoteModal from './VoiceNoteModal';
import CreditLedgerModal from './CreditLedgerModal';
import AgentResetModal from './AgentResetModal';
import RegisterAgentModal from './RegisterAgentModal';
import Sidebar from './Sidebar';
import { shareToWhatsApp, shareToEmail } from '../src/utils/share';
import { generateAndShareCSV } from '../src/utils/csv';
import { generateAndSharePDF } from '../src/utils/pdf';
import AISupportModal from './AISupportModal';

import { useTheme } from '../src/theme/ThemeContext';
import { useLanguage } from '../src/i18n/LanguageContext';

const isSameDay = (a, b) => a.toDateString() === b.toDateString();
const isSameMonth = (a, b) => a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
const isSameYear = (a, b) => a.getFullYear() === b.getFullYear();

export default function ManagerDashboard({ user, onLogout }) {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const C = { ...theme, white: theme.card };
  const styles = getStyles(C);
  const [screen, setScreen] = useState('overview'); 

  const [sales, setSales] = useState([]);
  const [issues, setIssues] = useState([]);
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [pendingEdits, setPendingEdits] = useState([]);
  const [managerTips, setManagerTips] = useState([]);
  const [saleAlerts, setSaleAlerts] = useState([]);
  const [managerPayments, setManagerPayments] = useState([]);
  const [loading, setLoading] = useState(true);
    // 📡 LIVE RADAR (Toast notification)
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const [refreshing, setRefreshing] = useState(false);


  const [historicalModalOpen, setHistoricalModalOpen] = useState(false);
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [issueItems, setIssueItems] = useState([{ product: null, qty: '' }]);

  const [historyAgent, setHistoryAgent] = useState(null);
  const [historyPeriod, setHistoryPeriod] = useState('day');
  const [customYear, setCustomYear] = useState('');
  const [customMonth, setCustomMonth] = useState('');
  const [customDay, setCustomDay] = useState('');
  const [showArchived, setShowArchived] = useState(false);
    const [expenses, setExpenses] = useState([]);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

  const [issueHistoryAgent, setIssueHistoryAgent] = useState(null);
  const [issueHistoryPeriod, setIssueHistoryPeriod] = useState('day');
  const [issueCustomYear, setIssueCustomYear] = useState('');
  const [issueCustomMonth, setIssueCustomMonth] = useState('');
  const [issueCustomDay, setIssueCustomDay] = useState('');

  const [resolvedEdits, setResolvedEdits] = useState([]);
  const [managerCorrections, setManagerCorrections] = useState([]);
  const [correctModalSale, setCorrectModalSale] = useState(null);
  const [correctItemsSold, setCorrectItemsSold] = useState('');
  const [correctActualCash, setCorrectActualCash] = useState('');
  const [correctNote, setCorrectNote] = useState('');

  const [correctionAgentFilter, setCorrectionAgentFilter] = useState('all');
  const [correctionPeriod, setCorrectionPeriod] = useState('all');
  const [correctionCustomYear, setCorrectionCustomYear] = useState('');
  const [correctionCustomMonth, setCorrectionCustomMonth] = useState('');
  const [correctionCustomDay, setCorrectionCustomDay] = useState('');

  const [commissionAgent, setCommissionAgent] = useState(null);
  const [tipAmount, setTipAmount] = useState('');
  const [tipNote, setTipNote] = useState('');
  const [payAmount, setPayAmount] = useState('');

  const [opsPeriod, setOpsPeriod] = useState('all');
  const [opsCustomYear, setOpsCustomYear] = useState('');
  const [opsCustomMonth, setOpsCustomMonth] = useState('');
  const [opsCustomDay, setOpsCustomDay] = useState('');

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [helpGuideOpen, setHelpGuideOpen] = useState(false);
  const [documentsModalOpen, setDocumentsModalOpen] = useState(false);
  const [voiceNotesOpen, setVoiceNotesOpen] = useState(false);
  const [creditModalOpen, setCreditModalOpen] = useState(false);
  const [resetAgent, setResetAgent] = useState(null);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [manageAgent, setManageAgent] = useState(null);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [profileAgent, setProfileAgent] = useState(null);
  
  const [targetAgent, setTargetAgent] = useState(null);
  const [dailyTargetInput, setDailyTargetInput] = useState('');
  
  const [calendarAgent, setCalendarAgent] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [routeAgent, setRouteAgent] = useState(null);
  const [routeStoreName, setRouteStoreName] = useState('');
  const [routeHistoryAgent, setRouteHistoryAgent] = useState(null);
  const [routeHistoryList, setRouteHistoryList] = useState([]);
  const [editRouteItem, setEditRouteItem] = useState(null);
  const [editRouteStoreName, setEditRouteStoreName] = useState('');

  const [correctIssueModal, setCorrectIssueModal] = useState(null);
  const [correctIssueQty, setCorrectIssueQty] = useState('');

  const [agentSearch, setAgentSearch] = useState('');
  const [agentSort, setAgentSort] = useState('name'); 

  const [monthlyTarget, setMonthlyTarget] = useState(null);
  const [targetModalOpen, setTargetModalOpen] = useState(false);
  const [targetAmount, setTargetAmount] = useState('');
  

  // ============================================================
  // 📡 LIVE RADAR (Toast notification)
  // ============================================================
  const showToast = (message) => {
    setToastMessage(message);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(3000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start();
  };

  // ============================================================
  // 🛡️ OFFLINE MODE (Cache + Fallback)
  // ============================================================
  const CACHE_KEY = '@manager_cache_v1';

  const saveToCache = async (data) => {
    try { await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch (e) { console.log('Cache save error', e); }
  };
  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch (e) { return null; }
  };

  const submitDailyTarget = async (overrideValue) => {
    const valueToParse = overrideValue || dailyTargetInput;
    const targetNum = parseInt(valueToParse, 10);
    
    if (isNaN(targetNum) || targetNum < 1) {
      Alert.alert('Error', 'Please enter a valid number greater than 0.');
      return;
    }
    const { error } = await supabase.from('profiles').update({ daily_target: targetNum }).eq('id', targetAgent.id);
    
    if (error) {
      Alert.alert('Database Error', error.message);
    } else {
      Alert.alert('Success', `${targetAgent.full_name}'s daily goal is now ${targetNum} units.`);
      setTargetAgent(null);
      fetchAll();
    }
  };

  const fetchAll = useCallback(async () => {
    try {
      // Fetch all data in parallel
        const [
        { data: salesData },
        { data: agentProfiles, error: agentErr },
        { data: productList },
        { data: inventoryRows },
        { data: editRequests },
        { data: managerCorrectionRows },
        { data: tipRows },
        { data: alertRows },
        { data: paymentRows },
        { data: expenseRows }
      ] = await Promise.all([
        supabase.from('sales').select('id, worker_id, items_sold, actual_cash, expected_cash, commission_earned, store_name, product_id, location_label, latitude, longitude, archived, pack_count, units_per_pack, payment_type, momo_ref, created_at').order('created_at', { ascending: false }),
supabase.from('profiles').select('id, full_name, status, compliance_info').eq('role', 'agent'),
        supabase.from('products').select('id, name').eq('active', true),
        supabase.from('agent_inventory').select('id, agent_id, product_id, quantity_issued, issued_at, source, archived, pack_count, units_per_pack').order('issued_at', { ascending: false }),
        supabase.from('edit_requests').select('id, sale_id, agent_id, new_items_sold, new_actual_cash, reason, status, created_at, resolved_at').order('created_at', { ascending: false }),
        supabase.from('manager_corrections').select('id, sale_id, old_items_sold, old_actual_cash, new_items_sold, new_actual_cash, note, created_at').order('created_at', { ascending: false }),
        supabase.from('manager_tips').select('id, agent_id, amount, note, archived, created_at').order('created_at', { ascending: false }),
        supabase.from('sale_alerts').select('id, sale_id, agent_id, seen, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('commission_payments').select('id, agent_id, amount, paid_at').order('paid_at', { ascending: false }),
        supabase.from('business_expenses').select('*').order('created_at', { ascending: false })
      ]);

      if (agentErr) throw agentErr;

      const monthKey = new Date().toISOString().slice(0, 7);
      const { data: targetRows } = await supabase.from('sales_targets').select('amount').eq('month_key', monthKey).order('created_at', { ascending: false }).limit(1);
      setMonthlyTarget(targetRows && targetRows.length > 0 ? Number(targetRows[0].amount) : null);

      const nameMap = {};
      (agentProfiles || []).forEach((p) => (nameMap[p.id] = p.full_name));
      const productMap = {};
      (productList || []).forEach((p) => (productMap[p.id] = p.name));

      const enrichedSales = (salesData || []).map((s) => ({ ...s, agentName: nameMap[s.worker_id] || 'Unknown Agent', productName: productMap[s.product_id] || 'Unknown Product' }));
      const enrichedIssues = (inventoryRows || []).map((row) => ({ ...row, agentName: nameMap[row.agent_id] || 'Unknown Agent', productName: productMap[row.product_id] || 'Unknown Product' }));
      
      setSales(enrichedSales);
      setIssues(enrichedIssues);
      setAgents(agentProfiles || []);
      setProducts(productList || []);
      setManagerTips(tipRows || []);
      setSaleAlerts((alertRows || []).map((a) => {
        const sale = (salesData || []).find((s) => s.id === a.sale_id);
        return {
          ...a,
          agentName: nameMap[a.agent_id] || 'Unknown Agent',
          productName: sale ? productMap[sale.product_id] || 'Unknown Product' : 'Unknown Product',
          items_sold: sale?.items_sold,
          actual_cash: sale?.actual_cash,
          store_name: sale?.store_name,
        };
      }));
         setManagerPayments(paymentRows || []);
      setExpenses(expenseRows || []);

      const issuedTotals = {};
      (inventoryRows || []).forEach((row) => { const key = `${row.agent_id}_${row.product_id}`; issuedTotals[key] = (issuedTotals[key] || 0) + row.quantity_issued; });
      const soldTotals = {};
      (salesData || []).forEach((s) => { const key = `${s.worker_id}_${s.product_id}`; soldTotals[key] = (soldTotals[key] || 0) + s.items_sold; });
      const summary = Object.keys(issuedTotals).map((key) => {
        const [agentId, productId] = key.split('_');
        const issued = issuedTotals[key] || 0; const sold = soldTotals[key] || 0;
        return { key, agentId, agentName: nameMap[agentId] || 'Unknown Agent', productName: productMap[productId] || 'Unknown Product', issued, sold, remaining: issued - sold };
      });
      setStockSummary(summary);

      const enrichedEditRequests = (editRequests || []).map((e) => {
        const sale = enrichedSales.find((s) => s.id === e.sale_id);
        return { ...e, agentName: nameMap[e.agent_id] || 'Unknown Agent', storeName: sale?.store_name || '—', oldItemsSold: sale?.items_sold, oldActualCash: sale?.actual_cash };
      });
      setPendingEdits(enrichedEditRequests.filter((e) => e.status?.toLowerCase() === 'pending'));
      setResolvedEdits(enrichedEditRequests.filter((e) => e.status?.toLowerCase() !== 'pending'));

      setManagerCorrections((managerCorrectionRows || []).map((c) => {
        const sale = enrichedSales.find((s) => s.id === c.sale_id);
        return { ...c, storeName: sale?.store_name || '—', agentId: sale?.worker_id, agentName: sale ? nameMap[sale.worker_id] || 'Unknown Agent' : 'Unknown Agent' };
      }));

          // ✅ Save a snapshot to cache for offline mode
      // 🛡️ GUARD: only overwrite cache if we actually got real data back
      // (offline Supabase returns empty arrays, not errors — don't wipe good cache)
      if (enrichedSales.length > 0 || (agentProfiles && agentProfiles.length > 0)) {
        await saveToCache({
          sales: enrichedSales,
          issues: enrichedIssues,
          agents: agentProfiles || [],
          products: productList || [],
          stockSummary: summary,
          pendingEdits: enrichedEditRequests.filter((e) => e.status?.toLowerCase() === 'pending'),
          resolvedEdits: enrichedEditRequests.filter((e) => e.status?.toLowerCase() !== 'pending'),
          managerTips: tipRows || [],
          saleAlerts: alertRows || [],
          managerPayments: paymentRows || [],
          monthlyTarget: targetRows && targetRows.length > 0 ? Number(targetRows[0].amount) : null,
        });
      } else {
        console.log('Manager: fetch returned empty, keeping existing cache');
      }

      setLoading(false);
    } catch (err) {
      console.error('Fetch failed, loading from cache:', err);
      // ✅ Load from cache if offline or error
      const cached = await loadFromCache();
      if (cached) {
        setSales(cached.sales || []);
        setIssues(cached.issues || []);
        setAgents(cached.agents || []);
        setProducts(cached.products || []);
        setStockSummary(cached.stockSummary || []);
        setPendingEdits(cached.pendingEdits || []);
        setResolvedEdits(cached.resolvedEdits || []);
        setManagerTips(cached.managerTips || []);
        setSaleAlerts(cached.saleAlerts || []);
        setManagerPayments(cached.managerPayments || []);
        setMonthlyTarget(cached.monthlyTarget || null);
      }
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
    // 📡 LIVE RADAR: Listen for new sale alerts
  useEffect(() => {
    const channel = supabase
      .channel('sale_alerts_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sale_alerts' }, (payload) => {
        // Show the toast
        setToastMessage('🔔 New sale just logged!');
        Animated.sequence([
          Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true })
        ]).start();

        // Refresh the dashboard data in the background
        fetchAll(); 
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAll]);

   useEffect(() => {
    // Web doesn't support expo-push-notifications without a VAPID key, 
    // and we don't need push notifications on the browser dashboard.
    if (Platform.OS === 'web') return;

    (async () => {
      try {
        const Notifications = await import('expo-notifications');
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') return;
        const tokenData = await Notifications.getExpoPushTokenAsync();
        await supabase.from('profiles').update({ push_token: tokenData.data }).eq('id', user.id);
      } catch (e) { console.log('Push notif error', e); }
    })();
  }, [user.id]);




  const onRefresh = async () => { setRefreshing(true); await fetchAll(); setRefreshing(false); };

  const openRouteHistory = async (agent) => {
    setRouteHistoryAgent(agent);
    const { data } = await supabase.from('routes').select('id, store_name, status, removed, created_at').eq('agent_id', agent.id).order('created_at', { ascending: false });
    setRouteHistoryList(data || []);
  };

  const refreshRouteHistory = async () => {
    if (routeHistoryAgent) {
      const { data } = await supabase.from('routes').select('id, store_name, status, removed, created_at').eq('agent_id', routeHistoryAgent.id).order('created_at', { ascending: false });
      setRouteHistoryList(data || []);
    }
  };

  const openEditRoute = (route) => { setEditRouteItem(route); setEditRouteStoreName(route.store_name); };

    const submitExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (!expenseCategory.trim() || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Enter a valid category and amount.');
      return;
    }
    const { error } = await supabase.from('business_expenses').insert([{
      manager_id: user.id,
      category: expenseCategory.trim(),
      amount: amt,
      note: expenseNote.trim() || null
    }]);
    if (error) Alert.alert('Error', error.message);
    else {
      setExpenseModalOpen(false);
      setExpenseCategory(''); setExpenseAmount(''); setExpenseNote('');
      fetchAll();
    }
  };

  const deleteExpense = (expense) => {
    setConfirmAction({
      title: 'Delete Expense',
      message: `Delete this expense (${expense.category} - GHS ${Number(expense.amount).toFixed(2)})?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        await supabase.from('business_expenses').delete().eq('id', expense.id);
        fetchAll();
      }
    });
  };
  const submitEditRoute = async () => {
    if (!editRouteStoreName.trim()) { Alert.alert('Error', 'Enter a store name.'); return; }
    const { error } = await supabase.from('routes').update({ store_name: editRouteStoreName.trim() }).eq('id', editRouteItem.id);
    if (error) Alert.alert('Error', error.message);
    else { setEditRouteItem(null); refreshRouteHistory(); }
  };

  const toggleRemoveRoute = async (route) => {
    const { error } = await supabase.from('routes').update({ removed: !route.removed }).eq('id', route.id);
    if (error) Alert.alert('Error', error.message);
    else refreshRouteHistory();
  };

  const deleteRoutePermanently = (route) => {
    setConfirmAction({
      title: 'Delete Route Permanently',
      message: `Permanently delete "${route.store_name}" from history? This cannot be undone.`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('routes').delete().eq('id', route.id);
        if (error) Alert.alert('Error', error.message);
        else refreshRouteHistory();
      },
    });
  };

  const openRouteModal = (agent) => {
    setRouteAgent(agent);
    setRouteStoreName('');
    setRouteModalOpen(true);
  };

  const submitRoute = async () => {
    if (!routeStoreName.trim()) { Alert.alert('Error', 'Enter a store or customer name.'); return; }
    const { error } = await supabase.from('routes').insert([{ agent_id: routeAgent.id, store_name: routeStoreName.trim(), status: 'Pending' }]);
    if (error) Alert.alert('Error', error.message);
    else { setRouteModalOpen(false); Alert.alert('Assigned', `${routeStoreName.trim()} added to ${routeAgent.full_name}'s route.`); }
  };

  const openIssueModal = () => {
    if (agents.filter((a) => a.status !== 'former').length === 0) { Alert.alert('No agents found', 'No active agent accounts exist yet.'); return; }
    setSelectedAgent(agents.find((a) => a.status !== 'former'));
    setIssueItems([{ product: products[0] || null, qty: '', expiry: '' }]);
    setIssueModalOpen(true);
  };

  const updateIssueItem = (index, field, value) => setIssueItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  const addIssueItemLine = () => setIssueItems((prev) => [...prev, { product: products[0] || null, qty: '', expiry: '' }]);
  const updateIssueExpiry = (index, value) => setIssueItems((prev) => prev.map((item, i) => (i === index ? { ...item, expiry: value } : item)));
  const updateIssuePack = (index, field, value) => setIssueItems((prev) => prev.map((item, i) => {
    if (i !== index) return item;
    const updated = { ...item, [field]: value };
    const packs = parseInt(updated.packCount, 10) || 0;
    const perPack = parseInt(updated.unitsPerPack, 10) || 0;
    const leftover = parseInt(updated.leftoverUnits, 10) || 0;
    updated.qty = perPack > 0 ? String(packs * perPack + leftover) : '';
    return updated;
  }));
  const removeIssueItemLine = (index) => setIssueItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));

  const submitIssue = async () => {
    if (!selectedAgent) { Alert.alert('Error', 'Select an agent.'); return; }
    const validItems = issueItems.filter((item) => item.product && item.qty && parseInt(item.qty, 10) > 0);
    if (validItems.length === 0) { Alert.alert('Error', 'Enter at least one product with a valid quantity.'); return; }
    const rows = validItems.map((item) => ({ agent_id: selectedAgent.id, product_id: item.product.id, quantity_issued: parseInt(item.qty, 10), expiry_date: item.expiry || null, pack_count: item.isPack ? parseInt(item.packCount, 10) || null : null, units_per_pack: item.isPack ? parseInt(item.unitsPerPack, 10) || null : null }));
    const { error } = await supabase.from('agent_inventory').insert(rows);
    if (error) Alert.alert('Error', error.message);
    else { setIssueModalOpen(false); fetchAll(); }
  };

  const resolveEdit = async (req, approve) => {
    if (approve) await supabase.from('sales').update({ items_sold: req.new_items_sold, actual_cash: req.new_actual_cash }).eq('id', req.sale_id);
    await supabase.from('edit_requests').update({ status: approve ? 'approved' : 'rejected', resolved_at: new Date().toISOString() }).eq('id', req.id);
    fetchAll();
  };

  const openCorrectSale = (sale) => { setCorrectModalSale(sale); setCorrectItemsSold(String(sale.items_sold)); setCorrectActualCash(String(sale.actual_cash)); setCorrectNote(''); };

  const submitCorrection = async () => {
    const newSold = parseInt(correctItemsSold, 10);
    const newCash = parseFloat(correctActualCash);
    if (isNaN(newSold) || newSold < 0 || isNaN(newCash) || newCash < 0) { Alert.alert('Error', 'Enter valid numbers.'); return; }
    const { error: updateError } = await supabase.from('sales').update({ items_sold: newSold, actual_cash: newCash }).eq('id', correctModalSale.id);
    if (updateError) { Alert.alert('Error', updateError.message); return; }
    await supabase.from('manager_corrections').insert([{ sale_id: correctModalSale.id, old_items_sold: correctModalSale.items_sold, old_actual_cash: correctModalSale.actual_cash, new_items_sold: newSold, new_actual_cash: newCash, note: correctNote.trim() || null }]);
    setCorrectModalSale(null);
    fetchAll();
  };

  const toggleArchiveSale = async (sale) => { const { error } = await supabase.from('sales').update({ archived: !sale.archived }).eq('id', sale.id); if (error) Alert.alert('Error', error.message); else fetchAll(); };

  const deleteSale = (sale) => {
    setConfirmAction({
      title: 'Delete Record',
      message: `Permanently delete this sale (${sale.productName} × ${sale.items_sold} at ${sale.store_name})?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('sales').delete().eq('id', sale.id);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };

  const deleteCorrectionRecord = (item) => {
    setConfirmAction({
      title: 'Delete Correction Record',
      message: `Delete this correction entry for ${item.agentName} (${item.storeName})?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const isManagerCorrection = item.id.startsWith('mgr-');
        const realId = item.id.replace('mgr-', '').replace('edit-', '');
        const table = isManagerCorrection ? 'manager_corrections' : 'edit_requests';
        const { error } = await supabase.from(table).delete().eq('id', realId);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };
  const openCorrectIssue = (issue) => { setCorrectIssueModal(issue); setCorrectIssueQty(String(issue.quantity_issued)); };
  const submitCorrectIssue = async () => {
    const qty = parseInt(correctIssueQty, 10);
    if (isNaN(qty) || qty <= 0) { Alert.alert('Error', 'Enter a valid quantity.'); return; }
    const { error } = await supabase.from('agent_inventory').update({ quantity_issued: qty }).eq('id', correctIssueModal.id);
    if (error) Alert.alert('Error', error.message); else { setCorrectIssueModal(null); fetchAll(); }
  };
  const toggleArchiveIssue = async (issue) => { const { error } = await supabase.from('agent_inventory').update({ archived: !issue.archived }).eq('id', issue.id); if (error) Alert.alert('Error', error.message); else fetchAll(); };
  const deleteIssue = (issue) => {
    setConfirmAction({
      title: 'Delete Record',
      message: `Permanently delete this issuance (${issue.productName} — ${issue.quantity_issued} units)?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('agent_inventory').delete().eq('id', issue.id);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };

  const toggleAgentStatus = async (agent) => {
    const newStatus = agent.status === 'inactive' ? 'active' : 'inactive';
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', agent.id);
    if (error) Alert.alert('Error', error.message); else { setManageAgent(null); fetchAll(); }
  };

  const setAgentFormer = (agent) => {
    setConfirmAction({
      title: 'Mark as Former Agent',
      message: `${agent.full_name} will be moved out of your active team list. Their history stays intact. Continue?`,
      confirmLabel: 'Confirm',
      destructive: false,
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('profiles').update({ status: 'former' }).eq('id', agent.id);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };
  const reactivateAgent = async (agent) => {
    const { error } = await supabase.from('profiles').update({ status: 'active' }).eq('id', agent.id);
    if (error) Alert.alert('Error', error.message); else { setManageAgent(null); fetchAll(); }
  };

  const deleteAllAgents = () => {
    setConfirmAction({
      title: 'Delete ALL Agents',
      message: 'This permanently deletes every agent and all their sales, stock, and history records. This cannot be undone. Are you absolutely sure?',
      confirmLabel: 'Delete Everyone',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const activeAgentIds = agents.map((a) => a.id);
        for (const id of activeAgentIds) {
          await supabase.from('sales').delete().eq('worker_id', id);
          await supabase.from('agent_inventory').delete().eq('agent_id', id);
          await supabase.from('stock_counts').delete().eq('agent_id', id);
          await supabase.from('edit_requests').delete().eq('agent_id', id);
          await supabase.from('manager_tips').delete().eq('agent_id', id);
          await supabase.from('routes').delete().eq('agent_id', id);
          await supabase.from('customer_notes').delete().eq('agent_id', id);
        }
        await supabase.from('profiles').delete().eq('role', 'agent');
        Alert.alert('Done', 'All agent data removed.');
        fetchAll();
      },
    });
  };
  const deleteAgent = (agent) => {
    setConfirmAction({
      title: 'Delete Agent',
      message: `This permanently deletes ${agent.full_name}'s profile and all records. Cannot be undone. Continue?`,
      confirmLabel: 'Delete Permanently',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        await supabase.from('sales').delete().eq('worker_id', agent.id);
        await supabase.from('agent_inventory').delete().eq('agent_id', agent.id);
        await supabase.from('stock_counts').delete().eq('agent_id', agent.id);
        await supabase.from('edit_requests').delete().eq('agent_id', agent.id);
        await supabase.from('manager_tips').delete().eq('agent_id', agent.id);
        await supabase.from('routes').delete().eq('agent_id', agent.id);
        const { error } = await supabase.from('profiles').delete().eq('id', agent.id);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };

  const openCommission = (agent) => { setCommissionAgent(agent); setTipAmount(''); setTipNote(''); setPayAmount(agentOwed(agent.id) > 0 ? agentOwed(agent.id).toFixed(2) : ''); };
  const agentAutoCommission = (agentId) => sales.filter((s) => s.worker_id === agentId).reduce((sum, s) => sum + Number(s.commission_earned || 0), 0);
  const agentTips = (agentId) => managerTips.filter((t) => t.agent_id === agentId && !t.archived);
  const agentTipsTotal = (agentId) => agentTips(agentId).reduce((sum, t) => sum + Number(t.amount), 0);
  const agentPayments = (agentId) => managerPayments.filter((p) => p.agent_id === agentId);
  const agentPaidTotal = (agentId) => agentPayments(agentId).reduce((sum, p) => sum + Number(p.amount), 0);
  const agentOwed = (agentId) => agentAutoCommission(agentId) + agentTipsTotal(agentId) - agentPaidTotal(agentId);

  const submitPayment = async () => {
    const amt = parseFloat(payAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a valid payment amount.'); return; }
    const { error } = await supabase.from('commission_payments').insert([{ agent_id: commissionAgent.id, amount: amt }]);
    if (error) { Alert.alert('Error', error.message); return; }
    setPayAmount('');
    fetchAll();
  };

  const submitTip = async () => {
    const amt = parseFloat(tipAmount);
    if (isNaN(amt) || amt === 0) { Alert.alert('Error', 'Enter a valid amount.'); return; }
    const { error } = await supabase.from('manager_tips').insert([{ agent_id: commissionAgent.id, amount: amt, note: tipNote.trim() || null }]);
    if (error) { Alert.alert('Error', error.message); return; }
    setTipAmount(''); setTipNote(''); fetchAll();
  };

  const unseenAlertCount = saleAlerts.filter((a) => !a.seen).length;

  const markAlertSeen = async (alert) => {
    const { error } = await supabase.from('sale_alerts').update({ seen: true }).eq('id', alert.id);
    if (error) Alert.alert('Error', error.message); else fetchAll();
  };

  const markAllAlertsSeen = async () => {
    const { error } = await supabase.from('sale_alerts').update({ seen: true }).eq('seen', false);
    if (error) Alert.alert('Error', error.message); else fetchAll();
  };
  const deleteTip = (tip) => {
    setConfirmAction({
      title: 'Delete Adjustment',
      message: `Delete this adjustment (GHS ${Number(tip.amount).toFixed(2)})?`,
      confirmLabel: 'Delete',
      destructive: true,
      onConfirm: async () => {
        setConfirmAction(null);
        const { error } = await supabase.from('manager_tips').delete().eq('id', tip.id);
        if (error) Alert.alert('Error', error.message);
        else fetchAll();
      },
    });
  };

  const submitTarget = async () => {
    const amt = parseFloat(targetAmount);
    if (isNaN(amt) || amt <= 0) { Alert.alert('Error', 'Enter a valid target amount.'); return; }
    const monthKey = new Date().toISOString().slice(0, 7);
    const { error } = await supabase.from('sales_targets').insert([{ month_key: monthKey, amount: amt }]);
    if (error) { Alert.alert('Error', error.message); return; }
    setTargetModalOpen(false);
    setTargetAmount('');
    fetchAll();
  };

  const sendAgentDigest = (agent, channel) => {
    const now = new Date();
    const todaySales = sales.filter((s) => s.worker_id === agent.id && isSameDay(new Date(s.created_at), now));
    const sold = todaySales.reduce((sum, s) => sum + s.items_sold, 0);
    const cash = todaySales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const commission = todaySales.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0);
    const text = `${agent.full_name} — Today's Summary\n\n${todaySales.length} sale(s) · ${sold} units · GHS ${cash.toFixed(2)} collected · GHS ${commission.toFixed(2)} commission`;
    if (channel === 'whatsapp') shareToWhatsApp(text);
    else shareToEmail(`${agent.full_name} — Today's Summary`, text);
  };

  const exportAllSalesCSV = async () => {
    const header = 'Date,Agent,Product,Store,Quantity,Cash,Commission,Location\n';
    const rows = sales.map((s) => {
      const date = new Date(s.created_at).toLocaleString();
      const loc = (s.location_label || '').replace(/,/g, ' ');
      return `"${date}","${s.agentName}","${s.productName}","${(s.store_name || '').replace(/,/g, ' ')}",${s.items_sold},${Number(s.actual_cash).toFixed(2)},${Number(s.commission_earned || 0).toFixed(2)},"${loc}"`;
    }).join('\n');
    await generateAndShareCSV(header + rows, 'all_sales_export');
  };

  const exportAllAgentsPDF = async () => {
    const activeAgents = agents.filter((a) => a.status !== 'former');
    const rows = activeAgents.map((a) => {
      const agentSales = sales.filter((s) => s.worker_id === a.id);
      const cash = agentSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
      const units = agentSales.reduce((sum, s) => sum + s.items_sold, 0);
      const commission = agentSales.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0);
      return `<tr><td>${a.full_name}</td><td>${a.status === 'inactive' ? 'Inactive' : 'Active'}</td><td>${agentSales.length}</td><td>${units}</td><td>GHS ${cash.toFixed(2)}</td><td>GHS ${commission.toFixed(2)}</td></tr>`;
    }).join('');
    const html = `<html><head><title>All Agents Summary</title><style>body{font-family:Arial,sans-serif;padding:24px;}h1{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:left;}th{background:#f1f5f9;}</style></head><body><h1>All Agents Summary — ${new Date().toLocaleDateString()}</h1><table><thead><tr><th>Agent</th><th>Status</th><th>Sales</th><th>Units</th><th>Cash Collected</th><th>Commission</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No agents yet.</td></tr>'}</tbody></table></body></html>`;
    if (Platform.OS !== 'web') {
      await generateAndSharePDF(html, 'all_agents_summary');
      return;
    }
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close(); w.focus(); w.print();
  };

  const openHistory = (agent) => { setHistoryAgent(agent); setHistoryPeriod('day'); setCustomYear(''); setCustomMonth(''); setCustomDay(''); setShowArchived(false); };

  const periodLabel = (period, y, m, d) => {
    if (period === 'day') return 'Today'; if (period === 'month') return 'This Month'; if (period === 'year') return 'This Year'; if (period === 'all') return 'All Time';
    const parts = []; if (d) parts.push(d); if (m) parts.push(m); if (y) parts.push(y);
    return parts.length ? parts.join('/') : 'Custom (pick year/month/day)';
  };

  const matchesPeriod = (dateObj, period, y, m, d, now) => {
    if (period === 'day') return isSameDay(dateObj, now); if (period === 'month') return isSameMonth(dateObj, now); if (period === 'year') return isSameYear(dateObj, now); if (period === 'all') return true;
    const yy = y ? parseInt(y, 10) : null; const mm = m ? parseInt(m, 10) : null; const dd = d ? parseInt(d, 10) : null;
    if (yy && dateObj.getFullYear() !== yy) return false; if (mm && dateObj.getMonth() + 1 !== mm) return false; if (dd && dateObj.getDate() !== dd) return false;
    return yy || mm || dd;
  };

  const filteredHistory = (() => {
    if (!historyAgent) return [];
    const now = new Date();
    return sales.filter((s) => s.worker_id === historyAgent.id).filter((s) => showArchived || !s.archived).filter((s) => matchesPeriod(new Date(s.created_at), historyPeriod, customYear, customMonth, customDay, now));
  })();

  const historyTotals = filteredHistory.reduce((acc, s) => ({ sold: acc.sold + s.items_sold, cash: acc.cash + Number(s.actual_cash), commission: acc.commission + Number(s.commission_earned || 0) }), { sold: 0, cash: 0, commission: 0 });

  const buildSalesReportHTML = () => {
    const label = periodLabel(historyPeriod, customYear, customMonth, customDay);
    const rows = filteredHistory.map((s) => `<tr><td>${new Date(s.created_at).toLocaleString()}</td><td>${s.productName}</td><td>${s.store_name}</td><td>${s.items_sold}</td><td>GHS ${Number(s.actual_cash).toFixed(2)}</td><td>GHS ${Number(s.commission_earned || 0).toFixed(2)}</td></tr>`).join('');
    return `<html><head><title>${historyAgent?.full_name} — ${label} Sales Report</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a;}h1{font-size:18px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{text-align:left;padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;}th{background:#f1f5f9;}.totals{margin-top:16px;font-weight:bold;}</style></head><body><h1>${historyAgent?.full_name} — Sales Report (${label})</h1><table><thead><tr><th>Date</th><th>Product</th><th>Store</th><th>Qty</th><th>Cash</th><th>Commission</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No sales.</td></tr>'}</tbody></table><div class="totals">Total: ${historyTotals.sold} units · GHS ${historyTotals.cash.toFixed(2)} · Commission GHS ${historyTotals.commission.toFixed(2)}</div></body></html>`;
  };
  const handlePrintSalesReport = async () => {
    if (Platform.OS !== 'web') { await generateAndSharePDF(buildSalesReportHTML(), 'sales_report'); return; }
    const w = window.open('', '_blank'); w.document.write(buildSalesReportHTML()); w.document.close(); w.focus(); w.print();
  };
  const salesShareText = () => {
    if (!historyAgent) return '';
    const label = periodLabel(historyPeriod, customYear, customMonth, customDay);
    const lines = filteredHistory.map((s) => `${s.productName} × ${s.items_sold}${s.pack_count ? ` (${s.pack_count} packs × ${s.units_per_pack})` : ''} at ${s.store_name} — GHS ${Number(s.actual_cash).toFixed(2)}`).join('\n');
    return `${historyAgent.full_name} — ${label} Sales Report\n\n${lines || 'None'}\n\nTotal: ${historyTotals.sold} units · GHS ${historyTotals.cash.toFixed(2)} · Commission GHS ${historyTotals.commission.toFixed(2)}`;
  };

  const openIssueHistory = (agent) => { setIssueHistoryAgent(agent); setIssueHistoryPeriod('day'); setIssueCustomYear(''); setIssueCustomMonth(''); setIssueCustomDay(''); };
  const filteredIssues = (() => {
    if (!issueHistoryAgent) return [];
    const now = new Date();
    return issues.filter((i) => i.agent_id === issueHistoryAgent.id).filter((i) => matchesPeriod(new Date(i.issued_at), issueHistoryPeriod, issueCustomYear, issueCustomMonth, issueCustomDay, now));
  })();
  const issueTotals = filteredIssues.reduce((sum, i) => sum + i.quantity_issued, 0);

  const buildIssueReportHTML = () => {
    const label = periodLabel(issueHistoryPeriod, issueCustomYear, issueCustomMonth, issueCustomDay);
    const rows = filteredIssues.map((i) => `<tr><td>${new Date(i.issued_at).toLocaleString()}</td><td>${i.productName}</td><td>${i.quantity_issued}</td></tr>`).join('');
    return `<html><head><title>${issueHistoryAgent?.full_name} — ${label} Stock Report</title><style>body{font-family:Arial,sans-serif;padding:24px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{padding:8px;border-bottom:1px solid #e2e8f0;font-size:12px;text-align:left;}th{background:#f1f5f9;}.totals{margin-top:16px;font-weight:bold;}</style></head><body><h1>${issueHistoryAgent?.full_name} — Stock Issued (${label})</h1><table><thead><tr><th>Date</th><th>Product</th><th>Qty</th></tr></thead><tbody>${rows || '<tr><td colspan="3">None</td></tr>'}</tbody></table><div class="totals">Total issued: ${issueTotals} units</div></body></html>`;
  };
  const handlePrintIssueReport = async () => {
    if (Platform.OS !== 'web') { await generateAndSharePDF(buildIssueReportHTML(), 'issue_report'); return; }
    const w = window.open('', '_blank'); w.document.write(buildIssueReportHTML()); w.document.close(); w.focus(); w.print();
  };
  const issueShareText = () => {
    if (!issueHistoryAgent) return '';
    const label = periodLabel(issueHistoryPeriod, issueCustomYear, issueCustomMonth, issueCustomDay);
    const lines = filteredIssues.map((i) => `${i.productName} — ${i.quantity_issued} units`).join('\n');
    return `${issueHistoryAgent.full_name} — ${label} Stock Report\n\n${lines || 'None'}\n\nTotal issued: ${issueTotals} units`;
  };

  const totalSold = sales.reduce((sum, s) => sum + s.items_sold, 0);
  const totalPacksSold = sales.reduce((sum, s) => sum + (s.pack_count || 0), 0);
  const totalCash = sales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
  const totalCommission = sales.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0);

  const opsFilteredSales = sales.filter((s) => matchesPeriod(new Date(s.created_at), opsPeriod, opsCustomYear, opsCustomMonth, opsCustomDay, new Date()));
  const opsFilteredIssues = issues.filter((i) => matchesPeriod(new Date(i.issued_at), opsPeriod, opsCustomYear, opsCustomMonth, opsCustomDay, new Date()));
  const opsTotalIssued = opsFilteredIssues.reduce((sum, i) => sum + i.quantity_issued, 0);
  const opsTotalCash = opsFilteredSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
  const opsTotalSold = opsFilteredSales.reduce((sum, s) => sum + s.items_sold, 0);
  const currentTotalRemainingAll = stockSummary.reduce((sum, item) => sum + item.remaining, 0);
   // A "low stock" item is either under 5 units OR will run out within 3 days based on recent sales velocity
  const lowStockItems = stockSummary.filter((item) => {
    if (item.remaining < 5) return true;
    
    // Check how fast they are selling it (last 7 days)
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentSales = sales.filter(s => s.worker_id === item.agentId && s.productName === item.productName && new Date(s.created_at) >= sevenDaysAgo);
    const unitsSold7Days = recentSales.reduce((sum, s) => sum + s.items_sold, 0);
    const dailyRate = unitsSold7Days / 7;
    
    // If they have less than 3 days of stock left, flag it!
    if (dailyRate > 0 && (item.remaining / dailyRate) <= 3) return true;
    
    return false;
  });

  const correctionHistory = [
    ...resolvedEdits.map((e) => ({ id: `edit-${e.id}`, type: e.status === 'approved' ? 'Agent Request — Approved' : 'Agent Request — Rejected', agentId: e.agent_id, agentName: e.agentName, storeName: e.storeName, detail: `Requested: ${e.new_items_sold} sold, GHS ${Number(e.new_actual_cash).toFixed(2)}`, note: e.reason, created_at: e.resolved_at || e.created_at })),
    ...managerCorrections.map((c) => ({ id: `mgr-${c.id}`, type: 'Manager Correction', agentId: c.agentId, agentName: c.agentName, storeName: c.storeName, detail: `Changed: ${c.old_items_sold} → ${c.new_items_sold} sold`, note: c.note, created_at: c.created_at })),
  ].filter((c) => correctionAgentFilter === 'all' || c.agentId === correctionAgentFilter)
   .filter((c) => matchesPeriod(new Date(c.created_at), correctionPeriod, correctionCustomYear, correctionCustomMonth, correctionCustomDay, new Date()))
   .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const last7Days = (() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const daySales = sales.filter((s) => isSameDay(new Date(s.created_at), d));
      days.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), cash: daySales.reduce((sum, s) => sum + Number(s.actual_cash), 0) });
    }
    return days;
  })();
  const maxDayCash = Math.max(...last7Days.map((d) => d.cash), 1);

  const topAgentsByCash = agents
    .filter((a) => a.status !== 'former')
    .map((a) => ({ name: a.full_name, cash: sales.filter((s) => s.worker_id === a.id).reduce((sum, s) => sum + Number(s.actual_cash), 0) }))
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 5);
  const maxAgentCash = Math.max(...topAgentsByCash.map((a) => a.cash), 1);

  const topProductsBySold = products
    .map((p) => ({ name: p.name, sold: sales.filter((s) => s.product_id === p.id).reduce((sum, s) => sum + s.items_sold, 0) }))
    .sort((a, b) => b.sold - a.sold);
  const maxProductSold = Math.max(...topProductsBySold.map((p) => p.sold), 1);

  const efficiencyByAgent = agents
    .filter((a) => a.status !== 'former')
    .map((a) => {
      const issued = stockSummary.filter((s) => s.agentId === a.id).reduce((sum, s) => sum + s.issued, 0);
      const sold = sales.filter((s) => s.worker_id === a.id).reduce((sum, s) => sum + s.items_sold, 0);
      
      // If we don't know how many were issued, we can't calculate a true percentage
      // We'll show their total sales instead to prove the data is flowing
      return { 
        name: a.full_name, 
        issued, 
        sold, 
        pct: issued > 0 ? Math.round((sold / issued) * 100) : 0,
        hasIssueData: issued > 0
      };
    })
    // REMOVED the filter that hid agents with 0 issued stock
    .sort((a, b) => b.sold - a.sold);

  const anomalousSales = (() => {
    const groups = {};
    sales.forEach((s) => {
      const key = `${s.worker_id}_${s.product_id}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    const flagged = [];
    Object.values(groups).forEach((group) => {
      if (group.length < 4) return; 
      const avg = group.reduce((sum, s) => sum + Number(s.actual_cash), 0) / group.length;
      if (avg <= 0) return;
      group.forEach((s) => {
        const deviation = Math.abs(Number(s.actual_cash) - avg) / avg;
        if (deviation > 0.5) {
          flagged.push({ ...s, avg, deviation: Math.round(deviation * 100) });
        }
      });
    });
    const sorted = flagged.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const grouped = {};
    sorted.forEach((s) => {
      const key = `${s.agentName}_${s.productName}`;
      if (!grouped[key]) grouped[key] = { agentName: s.agentName, productName: s.productName, count: 0, avg: s.avg, latest: s };
      grouped[key].count += 1;
    });
    return Object.values(grouped).slice(0, 10);
  })();
  const cashDiscrepancyByAgent = agents
    .filter((a) => a.status !== 'former')
    .map((a) => {
      const agentSales = sales.filter((s) => s.worker_id === a.id);
      const expected = agentSales.reduce((sum, s) => sum + Number(s.expected_cash || 0), 0);
      const actual = agentSales.reduce((sum, s) => sum + Number(s.actual_cash || 0), 0);
      return { name: a.full_name, expected, actual, shortfall: expected - actual };
    })
    .filter((a) => a.expected > 0)
    .sort((a, b) => b.shortfall - a.shortfall);

  const topAgentsThisMonth = agents
    .filter((a) => a.status !== 'former')
    .map((a) => ({ name: a.full_name, cash: sales.filter((s) => s.worker_id === a.id && isSameMonth(new Date(s.created_at), new Date())).reduce((sum, s) => sum + Number(s.actual_cash), 0) }))
    .filter((a) => a.cash > 0)
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 3);

  const inactiveAgents = agents
    .filter((a) => a.status !== 'former')
    .map((a) => {
      const agentSales = sales.filter((s) => s.worker_id === a.id);
      const lastSale = agentSales.length > 0 ? new Date(Math.max(...agentSales.map((s) => new Date(s.created_at).getTime()))) : null;
      const daysSince = lastSale ? Math.floor((new Date() - lastSale) / (1000 * 60 * 60 * 24)) : null;
      return { name: a.full_name, daysSince };
    })
    .filter((a) => a.daysSince === null || a.daysSince >= 3);

  // SMART COACHING CALCULATIONS
  const coachingSummary = (() => {
    const today = new Date();
    const todaySales = sales.filter((s) => isSameDay(new Date(s.created_at), today));
    const agentStats = agents.filter((a) => a.status !== 'former').map((a) => {
      const agentTodaySales = todaySales.filter((s) => s.worker_id === a.id);
      const todayUnits = agentTodaySales.reduce((sum, s) => sum + s.items_sold, 0);
      return { name: a.full_name, todayUnits };
    });
    const topPerformer = [...agentStats].sort((a, b) => b.todayUnits - a.todayUnits)[0];
    const needsHelp = agentStats.filter((a) => a.todayUnits === 0).slice(0, 3);
    return { topPerformer, needsHelp, allStats: agentStats };
  })();

  const sendWeeklyDigest = (channel) => {
    const now = new Date();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    const weekSales = sales.filter((s) => new Date(s.created_at) >= weekAgo);
    const sold = weekSales.reduce((sum, s) => sum + s.items_sold, 0);
    const cash = weekSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const byAgent = {};
    weekSales.forEach((s) => { byAgent[s.agentName] = (byAgent[s.agentName] || 0) + Number(s.actual_cash); });
    const topAgentEntry = Object.entries(byAgent).sort((a, b) => b[1] - a[1])[0];
    const lowStockLines = stockSummary.filter((i) => i.remaining < 5).map((i) => `${i.agentName}: ${i.remaining} left of ${i.productName}`);
    const text = `Weekly Digest (last 7 days)\n\n${weekSales.length} sale(s) · ${sold} units · GHS ${cash.toFixed(2)} collected` +
      (topAgentEntry ? `\nTop agent: ${topAgentEntry[0]} (GHS ${topAgentEntry[1].toFixed(2)})` : '') +
      (lowStockLines.length ? `\n\nLow stock:\n${lowStockLines.join('\n')}` : '');
    if (channel === 'whatsapp') shareToWhatsApp(text);
    else shareToEmail('Weekly Digest', text);
  };
  const sendTeamSummaryToday = (channel) => {
    const now = new Date();
    const todaySales = sales.filter((s) => isSameDay(new Date(s.created_at), now));
    const sold = todaySales.reduce((sum, s) => sum + s.items_sold, 0);
    const cash = todaySales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const byAgent = {};
    todaySales.forEach((s) => { byAgent[s.agentName] = (byAgent[s.agentName] || 0) + Number(s.actual_cash); });
    const lines = Object.entries(byAgent).map(([name, c]) => `${name}: GHS ${c.toFixed(2)}`).join('\n');
    const text = `Team Summary — Today\n\n${todaySales.length} sale(s) · ${sold} units · GHS ${cash.toFixed(2)} collected\n\n${lines || 'No sales yet today.'}`;
    if (channel === 'whatsapp') shareToWhatsApp(text);
    else shareToEmail('Team Summary — Today', text);
  };

  const thisMonthCash = sales.filter((s) => isSameMonth(new Date(s.created_at), new Date())).reduce((sum, s) => sum + Number(s.actual_cash), 0);
  const lastMonthDate = new Date(); lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
  const lastMonthCash = sales.filter((s) => isSameMonth(new Date(s.created_at), lastMonthDate)).reduce((sum, s) => sum + Number(s.actual_cash), 0);
  const monthChangePct = lastMonthCash > 0 ? Math.round(((thisMonthCash - lastMonthCash) / lastMonthCash) * 100) : null;

  const locationMap = {};
  sales.forEach((s) => {
    const loc = (s.location_label || '').trim();
    if (!loc) return;
    if (!locationMap[loc]) locationMap[loc] = { cash: 0, count: 0, units: 0 };
    locationMap[loc].cash += Number(s.actual_cash);
    locationMap[loc].count += 1;
    locationMap[loc].units += s.items_sold;
  });
  const topLocationsByCash = Object.entries(locationMap)
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.cash - a.cash)
    .slice(0, 8);
  const maxLocationCash = Math.max(...topLocationsByCash.map((l) => l.cash), 1);
  const untaggedSalesCount = sales.filter((s) => !s.location_label || !s.location_label.trim()).length;

  const PeriodTabRow = ({ period, setPeriod }) => (
    <View style={styles.periodRow}>
      {['day', 'month', 'year', 'all', 'custom'].map((p) => (
        <TouchableOpacity key={p} style={[styles.periodChip, period === p && styles.periodChipActive]} onPress={() => setPeriod(p)}>
          <Text style={period === p ? styles.periodTextActive : styles.periodText}>{p === 'day' ? 'Today' : p === 'month' ? 'Month' : p === 'year' ? 'Year' : p === 'all' ? 'All' : 'Custom'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );

    const navItems = [
    { key: 'ai', label: '✨ AI Assistant', color: C.gold || '#b8860b', onPress: () => setAiAssistantOpen(true) },
    { key: 'overview', label: '🏠 Overview', color: C.blue, badge: pendingEdits.length ? String(pendingEdits.length) : null, onPress: () => setScreen('overview') },
    { key: 'agents', label: '👥 My Agents', color: C.blue, badge: unseenAlertCount ? String(unseenAlertCount) : null, onPress: () => setScreen('agents') },
    { key: 'reports', label: '📊 Reports', color: C.green, onPress: () => setScreen('reports') },
    { key: 'settings', label: '⚙️ Settings', color: C.sub, onPress: () => setPasswordModalOpen(true) },
    { key: 'help', label: '❓ How to Use', color: C.sub, onPress: () => setHelpGuideOpen(true) },
  ];
  const renderReports = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.pageTitle}>Reports</Text>
            <TouchableOpacity style={styles.reportCard} onPress={() => setExpenseModalOpen(true)}>
        <Text style={styles.reportCardIcon}>💸</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Business Expenses</Text>
          <Text style={styles.reportCardSub}>Log rent, fuel, salaries, and other costs</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setScreen('stock')}>
        <Text style={styles.reportCardIcon}>📦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Stock & Issue</Text>
          <Text style={styles.reportCardSub}>See what's issued, sold, and remaining</Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.reportCard} onPress={() => setVoiceNotesOpen(true)}>
        <Text style={styles.reportCardIcon}>🎙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Voice Notes</Text>
          <Text style={styles.reportCardSub}>Listen to quick reminders agents have recorded</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setScreen('corrections')}>
        <Text style={styles.reportCardIcon}>✏️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Corrections</Text>
          <Text style={styles.reportCardSub}>Review and approve fixed records</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setScreen('analytics')}>
        <Text style={styles.reportCardIcon}>📈</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Analytics</Text>
          <Text style={styles.reportCardSub}>How the business is doing overall</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setScreen('map')}>
        <Text style={styles.reportCardIcon}>🗺️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Sales Map</Text>
          <Text style={styles.reportCardSub}>See where every sale happened, on a real map</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setDocumentsModalOpen(true)}>
        <Text style={styles.reportCardIcon}>📷</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Documents</Text>
          <Text style={styles.reportCardSub}>Capture old paper records with the camera</Text>
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.reportCard} onPress={() => setCreditModalOpen(true)}>
        <Text style={styles.reportCardIcon}>🧾</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Credit Ledger</Text>
          <Text style={styles.reportCardSub}>Track who owes what and record repayments</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.reportCard} onPress={() => setScreen('trips')}>
        <Text style={styles.reportCardIcon}>🚚</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.reportCardTitle}>Vehicle Trips</Text>
          <Text style={styles.reportCardSub}>Loading, expenses, and reconciliation</Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );

    const renderOverview = () => {
    const today = new Date();
    const todaySales = sales.filter((s) => isSameDay(new Date(s.created_at), today));
    const todayCash = todaySales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const todayUnits = todaySales.reduce((sum, s) => sum + s.items_sold, 0);
    const monthCashForTarget = sales.filter((s) => isSameMonth(new Date(s.created_at), today)).reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const thisMonthExpenses = expenses.filter(e => isSameMonth(new Date(e.created_at), today)).reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = monthCashForTarget - thisMonthExpenses;
      // 👇 Calculate today's product breakdown (filtered)
    const todayProductsMap = {};
    todaySales.forEach((s) => {
      if (!s.product_id || s.productName === 'Unknown Product') return; // Skip unknown products
      const pName = s.productName;
      if (!todayProductsMap[pName]) todayProductsMap[pName] = { qty: 0, cash: 0 };
      todayProductsMap[pName].qty += s.items_sold;
      todayProductsMap[pName].cash += Number(s.actual_cash);
    });
    const todayProductList = Object.entries(todayProductsMap).sort((a, b) => b[1].qty - a[1].qty);
    const maxTodayQty = Math.max(...todayProductList.map(p => p[1].qty), 1);

    // 👇 Calculate This Month's product breakdown (filtered + includes all products)
    const monthProductsMap = {};
    sales.filter(s => isSameMonth(new Date(s.created_at), today) && s.product_id).forEach(s => {
      const pName = s.productName;
      if (!monthProductsMap[pName]) monthProductsMap[pName] = { qty: 0, cash: 0 };
      monthProductsMap[pName].qty += s.items_sold;
      monthProductsMap[pName].cash += Number(s.actual_cash);
    });

    // Ensure all active products are listed even if 0 sold
    products.forEach(p => {
       if (!monthProductsMap[p.name]) monthProductsMap[p.name] = { qty: 0, cash: 0 };
    });

    const monthProductList = Object.entries(monthProductsMap).sort((a, b) => b[1].qty - a[1].qty);
    const maxMonthQty = Math.max(...monthProductList.map(p => p[1].qty), 1);

    return (
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
    
        
        {/* HEADER */}
        <View style={{ marginBottom: 24 }}>
          <Text style={{ fontSize: 28, fontWeight: '800', color: C.ink, marginBottom: 6 }}>Dashboard</Text>
          <Text style={{ fontSize: 15, color: C.sub, lineHeight: 22 }}>
            Today, your team made <Text style={{ fontWeight: '700', color: C.ink }}>{todaySales.length} sales</Text> and collected <Text style={{ fontWeight: '700', color: C.green }}>GHS {todayCash.toFixed(2)}</Text>.
          </Text>
        </View>

         {/* 4 PRIMARY KPI CARDS */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Cash</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginTop: 8 }}>GHS {todayCash.toFixed(2)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Today's Units</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginTop: 8 }}>{todayUnits}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>This Month</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 8 }}>GHS {thisMonthCash.toFixed(0)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '45%', backgroundColor: C.white, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 }}>
            <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>Net Profit</Text>
            <Text style={{ fontSize: 20, fontWeight: '800', color: netProfit >= 0 ? C.green : C.red, marginTop: 8 }}>
              GHS {netProfit.toFixed(0)}
            </Text>
            <Text style={{ fontSize: 11, color: C.sub, marginTop: 4 }}>Exp: GHS {thisMonthExpenses.toFixed(0)}</Text>
          </View>
        </View>

        {/* 📦 TODAY'S SALES BREAKDOWN */}
        <Text style={styles.sectionTitle}>Today's Sales</Text>
        <View style={styles.targetBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 16 }}>
            <View>
              <Text style={{ fontSize: 12, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Cash Collected</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: C.green, marginTop: 4 }}>GHS {todayCash.toFixed(2)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontSize: 12, color: C.sub, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Units</Text>
              <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, marginTop: 4 }}>{todayUnits}</Text>
            </View>
          </View>

          <Text style={{ fontSize: 13, color: C.sub, fontWeight: '700', marginBottom: 12 }}>Products Sold Today</Text>
          
          {todayProductList.length === 0 ? (
            <Text style={styles.emptyText}>No sales recorded today yet.</Text>
          ) : (
            todayProductList.map(([name, data], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{name}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.green }}>GHS {data.cash.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: 8, width: `${(data.qty / maxTodayQty) * 100}%`, backgroundColor: C.blue, borderRadius: 4 }} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: C.blue, width: 50, textAlign: 'right' }}>{data.qty} units</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

             {/* 📦 PRODUCT PERFORMANCE (THIS MONTH) */}
        <Text style={styles.sectionTitle}>Product Performance (This Month)</Text>
        <View style={styles.targetBox}>
          {monthProductList.length === 0 ? (
            <Text style={styles.emptyText}>No products sold this month yet.</Text>
          ) : (
            monthProductList.map(([name, data], i) => (
              <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: i !== monthProductList.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: C.ink }}>{name}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: C.green }}>GHS {data.cash.toFixed(2)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                      <View style={{ height: 10, width: `${(data.qty / maxMonthQty) * 100}%`, backgroundColor: '#0b6b43', borderRadius: 5 }} />
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: C.ink, width: 60, textAlign: 'right' }}>{data.qty} units</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        {/* TEAM PERFORMANCE (Coaching) */}
        <Text style={styles.sectionTitle}>Team Performance</Text>
        <View style={styles.targetBox}>
          
          {/* TOP PERFORMER CARD */}
          {coachingSummary.topPerformer && coachingSummary.topPerformer.todayUnits > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#f0fdf4', borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0', marginBottom: 12 }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 22 }}>🔥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 }}>Top Performer Today</Text>
                <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 2 }}>{coachingSummary.topPerformer.name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 20, fontWeight: '800', color: '#166534' }}>{coachingSummary.topPerformer.todayUnits}</Text>
                <Text style={{ fontSize: 12, color: '#166534', fontWeight: '600' }}>units sold</Text>
              </View>
            </View>
          ) : null}

          {/* NEEDS HELP CARD */}
          {coachingSummary.needsHelp.length > 0 && (
            <View style={{ backgroundColor: '#fffbeb', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 18, marginRight: 8 }}>⚠️</Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#b45309' }}>Needs Attention (0 sales today)</Text>
              </View>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {coachingSummary.needsHelp.map((a, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#fde68a' }}>
                    <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309' }}>{a.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: '#92400e' }}>{a.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
        </View>

        {/* 📡 LIVE RADAR MAP */}
        {sales.filter(s => s.latitude && s.longitude).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>📡 Live Radar</Text>
            <View style={styles.targetBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>Active Field Agents</Text>
                  <Text style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>
                    {sales.filter(s => s.latitude && s.longitude).length} sale(s) with location data
                  </Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setScreen('map')}
                  style={{ backgroundColor: C.blue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>View Full Map →</Text>
                </TouchableOpacity>
              </View>
              
              {/* Recent Activity Pins (Last 5) */}
              {sales.filter(s => s.latitude && s.longitude).slice(0, 5).map((sale, i) => (
                <View key={sale.id} style={{ 
                  flexDirection: 'row', 
                  alignItems: 'center', 
                  paddingVertical: 10, 
                  borderBottomWidth: i !== 4 ? 1 : 0, 
                  borderBottomColor: '#f1f5f9' 
                }}>
                  <View style={{ 
                    width: 12, height: 12, borderRadius: 6, 
                    backgroundColor: C.green, 
                    marginRight: 12,
                    shadowColor: C.green,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.8,
                    shadowRadius: 6
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>{sale.agentName}</Text>
                    <Text style={{ fontSize: 12, color: C.sub }}>
                      {sale.productName} · {sale.items_sold} units · 📍 {sale.store_name}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: C.green }}>
                    GHS {Number(sale.actual_cash).toFixed(0)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
        {/* ACTION ALERTS (Restock / Follow-up) */}
        {(lowStockItems.length > 0 || inactiveAgents.length > 0) && (
          <>
            <Text style={styles.sectionTitle}>Action Required</Text>
            <View style={styles.targetBox}>
              {lowStockItems.length > 0 && (
                <View style={{ marginBottom: inactiveAgents.length > 0 ? 16 : 0 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink }}>📦 Restock Needed</Text>
                    <TouchableOpacity onPress={openIssueModal} style={{ backgroundColor: C.ink, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>Issue Stock</Text>
                    </TouchableOpacity>
                  </View>
                  {lowStockItems.slice(0, 3).map((item, i) => (
                    <Text key={i} style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>• {item.agentName} — {item.remaining} left of {item.productName}</Text>
                  ))}
                </View>
              )}
              
              {inactiveAgents.length > 0 && (
                <View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 6 }}>⏱️ Needs Follow-Up</Text>
                  {inactiveAgents.slice(0, 3).map((a, i) => (
                    <Text key={i} style={{ fontSize: 13, color: C.sub, marginBottom: 2 }}>• {a.name} — {a.daysSince === null ? 'No sales yet' : `${a.daysSince} days inactive`}</Text>
                  ))}
                </View>
              )}
            </View>
          </>
        )}

        {/* MONTHLY TARGET */}
        <Text style={styles.sectionTitle}>Monthly Target</Text>
        <View style={styles.targetBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
            <View>
              <Text style={{ fontSize: 24, fontWeight: '800', color: C.ink }}>GHS {monthCashForTarget.toFixed(2)}</Text>
              <Text style={{ fontSize: 13, color: C.sub }}>of GHS {monthlyTarget ? monthlyTarget.toFixed(2) : '0.00'}</Text>
            </View>
            <TouchableOpacity onPress={() => { setTargetAmount(monthlyTarget ? String(monthlyTarget) : ''); setTargetModalOpen(true); }}>
              <Text style={{ fontSize: 13, color: C.blue, fontWeight: '700' }}>{monthlyTarget ? 'Edit Target' : 'Set Target'}</Text>
            </TouchableOpacity>
          </View>
          {monthlyTarget ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, (monthCashForTarget / monthlyTarget) * 100)}%` }]} />
            </View>
          ) : (
            <Text style={{ fontSize: 13, color: C.sub }}>No target set for this month. Tap "Set Target" to track your goal.</Text>
          )}
        </View>

        {/* TOP PERFORMERS THIS MONTH */}
        {topAgentsThisMonth.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Top Performers</Text>
              <TouchableOpacity onPress={() => setLeaderboardOpen(true)}>
                <Text style={{ fontSize: 13, color: C.blue, fontWeight: '700' }}>See Leaderboard</Text>
              </TouchableOpacity>
            </View>
              <View style={styles.targetBox}>
              {topAgentsThisMonth.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: i !== topAgentsThisMonth.length - 1 ? 1 : 0, borderBottomColor: '#f1f5f9' }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: i === 0 ? '#fef3c7' : '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: i === 0 ? '#b45309' : '#64748b' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: C.ink }}>{a.name}</Text>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>GHS {a.cash.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* SHARE WITH TEAM */}
        <Text style={styles.sectionTitle}>Share With Team</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => sendTeamSummaryToday('whatsapp')}>
            <Text style={styles.secondaryBtnText}>📱 Send Today to WhatsApp</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => sendWeeklyDigest('whatsapp')}>
            <Text style={styles.secondaryBtnText}>📊 Send Weekly to WhatsApp</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

   const renderActivity = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <View>
          <Text style={styles.pageTitle}>Activity Feed</Text>
          <Text style={{ fontSize: 14, color: C.sub }}>Live sales coming in from the field.</Text>
        </View>
        {unseenAlertCount > 0 && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={markAllAlertsSeen}>
            <Text style={styles.secondaryBtnText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ⚠️ FLAGGED FOR REVIEW (Cleaned up) */}
      {anomalousSales.length > 0 && (
        <View style={{ backgroundColor: '#fffbeb', borderWidth: 1, borderColor: '#fde68a', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#b45309', marginBottom: 4 }}>⚠️ Unusual Sales Detected</Text>
          <Text style={{ fontSize: 13, color: '#92400e', marginBottom: 10 }}>These sales are unusually different from the agent's normal amount for this product.</Text>
          
          {anomalousSales.map((g, i) => (
            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 10, borderRadius: 8, marginBottom: 6, borderWidth: 1, borderColor: '#fde68a' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#0f172a' }}>{g.agentName} — {g.productName}</Text>
                <Text style={{ fontSize: 12, color: '#64748b' }}>Normally ~GHS {g.avg.toFixed(2)} each</Text>
              </View>
              <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#b45309' }}>{g.count} flagged</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ACTIVITY CARDS */}
      {saleAlerts.length === 0 ? (
        <Text style={styles.emptyText}>No activity yet.</Text>
      ) : (
        saleAlerts.map((a) => (
          <TouchableOpacity 
            key={a.id} 
            style={[
              styles.row, 
              { flexDirection: 'row', alignItems: 'center', padding: 16, borderLeftWidth: a.seen ? 0 : 4, borderLeftColor: a.seen ? 'transparent' : C.green, backgroundColor: a.seen ? C.white : '#f8fafc' }
            ]} 
            onPress={() => !a.seen && markAlertSeen(a)} 
            activeOpacity={a.seen ? 1 : 0.7}
          >
            {/* Avatar / Icon */}
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: a.seen ? '#f1f5f9' : '#dcfce7', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Text style={{ fontSize: 18 }}>{a.seen ? '🛍️' : '🔔'}</Text>
            </View>

            {/* Main Content */}
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink }}>{a.agentName}</Text>
                <Text style={{ fontSize: 12, color: C.sub, fontWeight: '600' }}>{new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
              </View>
              
              <Text style={{ fontSize: 14, color: '#334155' }}>
                {a.productName ? (
                  <>Sold <Text style={{ fontWeight: '700', color: C.ink }}>{a.items_sold} units</Text> of {a.productName}</>
                ) : (
                  'Logged a sale'
                )}
              </Text>
              
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ fontSize: 13, color: C.sub }}>📍 {a.store_name || 'Unknown Store'}</Text>
                {a.actual_cash != null && (
                  <Text style={{ fontSize: 14, fontWeight: '800', color: C.green }}>GHS {Number(a.actual_cash).toFixed(2)}</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );

  const renderAgents = () => {
    const withCash = (a) => sales.filter((s) => s.worker_id === a.id).reduce((sum, s) => sum + Number(s.actual_cash), 0);

    let activeAgents = agents.filter((a) => a.status !== 'former');
    const formerAgents = agents.filter((a) => a.status === 'former');

    if (agentSearch.trim()) {
      const q = agentSearch.trim().toLowerCase();
      activeAgents = activeAgents.filter((a) => a.full_name.toLowerCase().includes(q));
    }
    activeAgents = [...activeAgents].sort((a, b) => {
      if (agentSort === 'cash') return withCash(b) - withCash(a);
      return a.full_name.localeCompare(b.full_name);
    });

    return (
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.pageTitle}>Agents</Text>
        <TouchableOpacity style={styles.activityBanner} onPress={() => setScreen('activity')}>
          <Text style={styles.activityBannerText}>📋 View Activity Feed{unseenAlertCount ? ` — ${unseenAlertCount} new` : ''}</Text>
          <Text style={styles.activityBannerArrow}>›</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>Active Team ({activeAgents.length})</Text>
          <TouchableOpacity style={styles.secondaryBtn} onPress={() => setRegisterModalOpen(true)}>
            <Text style={styles.secondaryBtnText}>+ Register Agent</Text>
          </TouchableOpacity>
        </View>
        {activeAgents.length > 0 && (
          <TouchableOpacity onPress={deleteAllAgents} style={{ alignSelf: 'flex-end', marginBottom: 12 }}>
            <Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>Delete All Agents (Danger Zone)</Text>
          </TouchableOpacity>
        )}

        <TextInput style={styles.input} placeholder="Search agents by name..." value={agentSearch} onChangeText={setAgentSearch} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          <TouchableOpacity style={[styles.periodChip, agentSort === 'name' && styles.periodChipActive]} onPress={() => setAgentSort('name')}>
            <Text style={agentSort === 'name' ? styles.periodTextActive : styles.periodText}>Sort: Name</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.periodChip, agentSort === 'cash' && styles.periodChipActive]} onPress={() => setAgentSort('cash')}>
            <Text style={agentSort === 'cash' ? styles.periodTextActive : styles.periodText}>Sort: Top Cash</Text>
          </TouchableOpacity>
        </View>

        {activeAgents.length === 0 ? (
          <Text style={styles.emptyText}>No active agents yet.</Text>
        ) : (
          activeAgents.map((a) => {
            const agentSales = sales.filter((s) => s.worker_id === a.id);
            const agentCash = agentSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
            const isInactive = a.status === 'inactive';
            return (
                  <View key={a.id} style={[styles.agentCard, isInactive && styles.agentCardInactive]}>
                <TouchableOpacity onPress={() => setProfileAgent(a)}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowTitle}>{a.full_name}</Text>
                    <Text style={[styles.statusDot, isInactive ? styles.statusInactive : styles.statusActive]}>
                      {isInactive ? 'Inactive' : 'Active'}
                    </Text>
                  </View>
                  <Text style={styles.detail}>{agentSales.length} sale(s) · GHS {agentCash.toFixed(2)} total</Text>
                  <Text style={[styles.detail, { color: C.blue, fontWeight: '700', marginTop: 6 }]}>Tap to view full profile ›</Text>
                </TouchableOpacity>

                   <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 12 }}>
                  <TouchableOpacity style={styles.actionChip} onPress={() => openHistory(a)}>
                    <Text style={styles.actionChipText}>📈 Sales History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => setCalendarAgent(a)}>
                    <Text style={styles.actionChipText}>📅 Calendar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => openIssueHistory(a)}>
                    <Text style={styles.actionChipText}>📦 Issue History</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => openCommission(a)}>
                    <Text style={styles.actionChipText}>💰 Commission</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => openRouteModal(a)}>
                    <Text style={styles.actionChipText}>📍 Assign Route</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionChip} onPress={() => openRouteHistory(a)}>
                    <Text style={styles.actionChipText}>🗺️ Route History</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 }}>
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <TouchableOpacity onPress={() => sendAgentDigest(a, 'whatsapp')}><Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '600' }}>Send WhatsApp</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => sendAgentDigest(a, 'email')}><Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '600' }}>Send Email</Text></TouchableOpacity>
                  </View>
                  <TouchableOpacity onPress={() => setManageAgent(a)} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                    <Text style={{ fontSize: 13, color: '#334155', fontWeight: '700' }}>Manage ▾</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}

        {formerAgents.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 10 }]}>Former Agents ({formerAgents.length})</Text>
            {formerAgents.map((a) => {
              const agentSales = sales.filter((s) => s.worker_id === a.id);
              const agentCash = agentSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
              return (
                <View key={a.id} style={[styles.agentCard, styles.agentCardInactive]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.rowTitle}>{a.full_name}</Text>
                    <Text style={[styles.statusDot, styles.statusInactive]}>Former</Text>
                  </View>
                  <Text style={styles.detail}>{agentSales.length} sale(s) · GHS {agentCash.toFixed(2)} total (Preserved)</Text>

                  <View style={styles.agentLinkRow}>
                    <TouchableOpacity onPress={() => openHistory(a)}><Text style={styles.linkText}>Sales History</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => openIssueHistory(a)}><Text style={styles.linkText}>Issue History</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => openCommission(a)}><Text style={styles.linkText}>Commission</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setManageAgent(a)}><Text style={styles.manageText}>Manage ▾</Text></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    );
  };

  const renderStock = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <TouchableOpacity onPress={() => setScreen('reports')}><Text style={styles.linkText}>‹ Back to Reports</Text></TouchableOpacity>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <Text style={styles.pageTitle}>Stock & Issue</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={openIssueModal}>
          <Text style={styles.primaryBtnText}>+ Issue Stock</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Operations Summary</Text>
      <PeriodTabRow period={opsPeriod} setPeriod={setOpsPeriod} />
      
      {opsPeriod === 'custom' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Year" placeholderTextColor="#6b7280" keyboardType="numeric" value={opsCustomYear} onChangeText={setOpsCustomYear} />
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Month" placeholderTextColor="#6b7280" keyboardType="numeric" value={opsCustomMonth} onChangeText={setOpsCustomMonth} />
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Day" placeholderTextColor="#6b7280" keyboardType="numeric" value={opsCustomDay} onChangeText={setOpsCustomDay} />
        </View>
      )}
      <View style={styles.row}>
        <Text style={styles.detail}>Issued in period: {opsTotalIssued} units · Sold: {opsTotalSold} units</Text>
        <Text style={styles.detail}>Cash collected: GHS {opsTotalCash.toFixed(2)}</Text>
        <Text style={[styles.detail, { fontWeight: 'bold', color: C.ink }]}>Total remaining across all agents: {currentTotalRemainingAll} units</Text>
      </View>
      <Text style={styles.sectionTitle}>Agent Stock Balances</Text>
      {stockSummary.length === 0 ? (
        <Text style={styles.emptyText}>No stock issued to agents yet.</Text>
      ) : (
        stockSummary.map((item) => (
          <View key={item.key} style={styles.row}>
            <Text style={styles.rowTitle}>{item.agentName} — {item.productName}</Text>
            <Text style={styles.detail}>
              Issued: {item.issued} · Sold: {item.sold} · Remaining: <Text style={{ fontWeight: 'bold', color: item.remaining < 5 ? C.red : C.ink }}>{item.remaining}</Text>
            </Text>
          </View>
        ))
      )}

      <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Recent Issuances</Text>
      {issues.length === 0 ? (
        <Text style={styles.emptyText}>No recent issuances.</Text>
      ) : (
        issues.slice(0, 15).map((iss) => (
          <View key={iss.id} style={styles.row}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.rowTitle}>{iss.agentName} — {iss.productName}{iss.archived ? ' (archived)' : ''}</Text>
              <Text style={styles.detail}>{iss.quantity_issued} units</Text>
            </View>
            <Text style={styles.detail}>{new Date(iss.issued_at).toLocaleString()}</Text>
            <View style={styles.agentLinkRow}>
              <TouchableOpacity onPress={() => openCorrectIssue(iss)}><Text style={styles.actionText}>Edit Qty</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => toggleArchiveIssue(iss)}><Text style={styles.actionText}>{iss.archived ? 'Unarchive' : 'Archive'}</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => deleteIssue(iss)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

      const renderCorrections = () => (
    <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      
      {/* HEADER */}
      <View style={{ marginBottom: 24 }}>
        <TouchableOpacity onPress={() => setScreen('reports')} style={{ marginBottom: 12, alignSelf: 'flex-start' }}>
          <Text style={{ fontSize: 14, color: C.blue, fontWeight: '700' }}>‹ Back to Reports</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.5 }}>Corrections Audit</Text>
        <Text style={{ fontSize: 14, color: C.sub }}>Review pending requests and history.</Text>
      </View>

         {/* PENDING APPROVALS */}
      {pendingEdits.length > 0 && (
        <View style={{ marginBottom: 24 }}>
          <Text style={[styles.sectionTitle, { color: C.blue }]}>Pending Approval ({pendingEdits.length})</Text>
          {pendingEdits.map((req) => (
            <View key={req.id} style={[styles.targetBox, { borderColor: C.blue, borderWidth: 1.5 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }} numberOfLines={1}>{req.agentName}</Text>
                  <Text style={{ fontSize: 13, color: C.sub }}>{req.storeName}</Text>
                </View>
              </View>
              
              <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ fontSize: 13, color: C.sub }}>Old Data:</Text>
                  <Text style={{ fontSize: 13, color: C.ink, fontWeight: '600' }}>{req.oldItemsSold} sold · GHS {Number(req.oldActualCash).toFixed(2)}</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, color: C.sub }}>Requested:</Text>
                  <Text style={{ fontSize: 13, color: C.blue, fontWeight: '800' }}>{req.new_items_sold} sold · GHS {Number(req.new_actual_cash).toFixed(2)}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, fontStyle: 'italic', color: C.ink, marginBottom: 16 }}>"{req.reason}"</Text>
              
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.approveBtn, { flex: 1, backgroundColor: C.green, paddingVertical: 12, borderRadius: 10 }]} onPress={() => resolveEdit(req, true)}>
                  <Text style={[styles.approveBtnText, { fontSize: 15 }]}>✓ Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.rejectBtn, { flex: 1, backgroundColor: '#fee2e2', borderWidth: 0, paddingVertical: 12, borderRadius: 10 }]} onPress={() => resolveEdit(req, false)}>
                  <Text style={[styles.rejectBtnText, { color: '#dc2626', fontSize: 15 }]}>✕ Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* HISTORY LOG */}
      <Text style={styles.sectionTitle}>History Log</Text>
      <PeriodTabRow period={correctionPeriod} setPeriod={setCorrectionPeriod} />
      {correctionPeriod === 'custom' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1, marginBottom: 0 }]} placeholder="Year" keyboardType="numeric" value={correctionCustomYear} onChangeText={setCorrectionCustomYear} />
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1, marginBottom: 0 }]} placeholder="Month" keyboardType="numeric" value={correctionCustomMonth} onChangeText={setCorrectionCustomMonth} />
          <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1, marginBottom: 0 }]} placeholder="Day" keyboardType="numeric" value={correctionCustomDay} onChangeText={setCorrectionCustomDay} />
        </View>
      )}

      {correctionHistory.length === 0 ? (
        <Text style={styles.emptyText}>No correction records match this filter.</Text>
      ) : (
        correctionHistory.map((item) => (
          <View key={item.id} style={styles.targetBox}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{item.agentName}</Text>
                <Text style={{ fontSize: 13, color: C.sub }}>{item.storeName} · {new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={{ backgroundColor: item.type.includes('Approved') ? '#dcfce7' : item.type.includes('Rejected') ? '#fee2e2' : '#e0e7ff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: item.type.includes('Approved') ? '#166534' : item.type.includes('Rejected') ? '#991b1b' : '#3730a3' }}>{item.type}</Text>
              </View>
            </View>
            
            <Text style={{ fontSize: 14, color: C.ink, marginTop: 4 }}>{item.detail}</Text>
            {item.note && <Text style={{ fontSize: 13, fontStyle: 'italic', color: C.sub, marginTop: 6 }}>"{item.note}"</Text>}
            
            <View style={{ borderTopWidth: 1, borderTopColor: '#f1f5f9', marginTop: 12, paddingTop: 12, alignItems: 'flex-end' }}>
              <TouchableOpacity onPress={() => deleteCorrectionRecord(item)}>
                <Text style={{ fontSize: 13, color: '#dc2626', fontWeight: '600' }}>Delete Record</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const reorderSuggestions = (() => {
    const sevenDaysAgo = new Date(); sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return stockSummary
      .map((item) => {
        const recentSales = sales.filter(
          (s) => s.worker_id === item.agentId && s.productName === item.productName && new Date(s.created_at) >= sevenDaysAgo
        );
        const unitsSoldLast7Days = recentSales.reduce((sum, s) => sum + s.items_sold, 0);
        const dailyRate = unitsSoldLast7Days / 7;
        const daysLeft = dailyRate > 0 ? item.remaining / dailyRate : null;
        return { ...item, dailyRate, daysLeft };
      })
      .filter((item) => item.daysLeft !== null && item.daysLeft <= 3 && item.remaining > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  })();
  
   const renderAnalytics = () => {
    const totalWeekCash = last7Days.reduce((sum, d) => sum + d.cash, 0);
    const bestDay = last7Days.reduce((best, d) => d.cash > best.cash ? d : best, last7Days[0] || { cash: 0 });
    const activeAgentsCount = agents.filter((a) => a.status !== 'former').length;
    const avgPerAgent = activeAgentsCount > 0 ? (thisMonthCash / activeAgentsCount) : 0;

    // 💰 Payment Breakdown (Cash vs MoMo vs Credit)
    const thisMonthSales = sales.filter(s => isSameMonth(new Date(s.created_at), new Date()));
    const cashTotal = thisMonthSales.filter(s => s.payment_type === 'cash' || !s.payment_type).reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const momoTotal = thisMonthSales.filter(s => s.payment_type === 'momo').reduce((sum, s) => sum + Number(s.actual_cash), 0);
    const creditTotal = thisMonthSales.filter(s => s.payment_type === 'credit').reduce((sum, s) => sum + (Number(s.items_sold) * Number(s.unit_price || 0)), 0); // Estimates credit value
    const totalRevenue = cashTotal + momoTotal + creditTotal || 1; // Prevent divide by zero

    // ⚡ Agent Efficiency Sorting
    const sortedEfficiency = [...efficiencyByAgent].sort((a, b) => b.pct - a.pct);
    const topEfficiency = sortedEfficiency.slice(0, 3);
    const bottomEfficiency = sortedEfficiency.slice(-3).reverse();

    return (
      <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 120 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.pageTitle}>📊 Analytics</Text>
        <Text style={styles.detail}>Live business overview · {new Date().toLocaleDateString()}</Text>

        {/* TOP KPIs */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>This Week</Text>
            <Text style={styles.kpiValue}>GHS {totalWeekCash.toFixed(2)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>This Month</Text>
            <Text style={styles.kpiValue}>GHS {thisMonthCash.toFixed(2)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Best Day</Text>
            <Text style={styles.kpiValue}>{bestDay.label} · GHS {bestDay.cash.toFixed(0)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Avg / Agent</Text>
            <Text style={styles.kpiValue}>GHS {avgPerAgent.toFixed(0)}</Text>
          </View>
        </View>

        {/* 💰 PAYMENT BREAKDOWN */}
        <View style={styles.targetBox}>
          <Text style={styles.sectionTitle}>💰 How They Paid (This Month)</Text>
          <View style={{ flexDirection: 'row', height: 20, borderRadius: 10, overflow: 'hidden', marginVertical: 10 }}>
            {cashTotal > 0 && <View style={{ flex: cashTotal / totalRevenue, backgroundColor: '#16a34a' }} />}
            {momoTotal > 0 && <View style={{ flex: momoTotal / totalRevenue, backgroundColor: '#2563eb' }} />}
            {creditTotal > 0 && <View style={{ flex: creditTotal / totalRevenue, backgroundColor: '#d97706' }} />}
            {(cashTotal === 0 && momoTotal === 0 && creditTotal === 0) && <View style={{ flex: 1, backgroundColor: '#e2e8f0' }} />}
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <Text style={{ fontSize: 13, color: '#16a34a', fontWeight: '700' }}>💵 Cash: GHS {cashTotal.toFixed(2)}</Text>
            <Text style={{ fontSize: 13, color: '#2563eb', fontWeight: '700' }}>📱 MoMo: GHS {momoTotal.toFixed(2)}</Text>
            {creditTotal > 0 && <Text style={{ fontSize: 13, color: '#d97706', fontWeight: '700' }}>🧾 Credit: GHS {creditTotal.toFixed(2)}</Text>}
          </View>
        </View>

        {/* WEEKLY CHART */}
        <View style={styles.targetBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.sectionTitle}>Last 7 Days</Text>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('map')}>
              <Text style={styles.secondaryBtnText}>🗺️ Sales Map</Text>
            </TouchableOpacity>
          </View>
          {last7Days.map((d, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel}>{d.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(d.cash / maxDayCash) * 100}%`, backgroundColor: C.blue }]} />
              </View>
              <Text style={styles.barValue}>GHS {d.cash.toFixed(0)}</Text>
            </View>
          ))}
          <Text style={styles.detail}>📈 Total this week: GHS {totalWeekCash.toFixed(2)}</Text>
        </View>

        {/* ⚡ AGENT EFFICIENCY */}
        <View style={styles.targetBox}>
          <Text style={styles.sectionTitle}>⚡ Agent Efficiency</Text>
          <Text style={styles.detail}>Percentage of issued stock they have sold</Text>
          
          {efficiencyByAgent.length === 0 ? (
            <View>
              <Text style={styles.emptyText}>No stock issued yet.</Text>
              <Text style={styles.detail}>💡 Go to "Stock & Issue" to dispatch stock to agents.</Text>
            </View>
          ) : (
            <>
               <Text style={{ fontSize: 14, fontWeight: '700', color: C.green, marginTop: 10, marginBottom: 4 }}>🏆 Top Sellers</Text>
              {topEfficiency.map((a, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.rowTitle}>{a.name}</Text>
                  <Text style={{ color: C.green, fontWeight: '800', fontSize: 15 }}>
                    {a.hasIssueData ? `${a.pct}%` : `${a.sold} units sold`}
                  </Text>
                </View>
              ))}

              {bottomEfficiency.length > 0 && bottomEfficiency[0].pct < 50 && bottomEfficiency[0].hasIssueData && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: C.red, marginTop: 12, marginBottom: 4 }}>⚠️ Needs Coaching</Text>
                  {bottomEfficiency.filter(a => a.hasIssueData).map((a, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <Text style={styles.rowTitle}>{a.name}</Text>
                      <Text style={{ color: a.pct > 0 ? C.blue : C.red, fontWeight: '800', fontSize: 15 }}>{a.pct}%</Text>
                    </View>
                  ))}
                </>
              )}
            </>
          )}
        </View>

        {/* PRODUCTS */}
        <View style={styles.targetBox}>
          <Text style={styles.sectionTitle}>📦 Best-Selling Products</Text>
          {topProductsBySold.length === 0 ? <Text style={styles.emptyText}>No products yet.</Text> : topProductsBySold.map((p, i) => (
            <View key={i} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>{p.name}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${(p.sold / maxProductSold) * 100}%`, backgroundColor: C.blue }]} />
              </View>
              <Text style={styles.barValue}>{p.sold} units</Text>
            </View>
          ))}
        </View>

        {/* QUICK ACTIONS */}
        <View style={styles.targetBox}>
          <Text style={styles.sectionTitle}>🚀 Quick Actions</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 }}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={exportAllSalesCSV}>
              <Text style={styles.secondaryBtnText}>📥 Export CSV</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={exportAllAgentsPDF}>
              <Text style={styles.secondaryBtnText}>📄 Export Agents PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={() => setScreen('trips')}>
              <Text style={styles.secondaryBtnText}>🚚 Vehicle Trips</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  const renderTrips = () => <TripManager onBack={() => setScreen('overview')} />;

   return (
    <View style={styles.layout}>
      <Sidebar appName="FieldSales" greeting={`Hi, ${user?.name || 'Manager'}`} activeKey={screen} items={navItems} onLogout={onLogout} />

      <View style={styles.mainContent}>
        {screen === 'overview' && renderOverview()}
        {screen === 'reports' && renderReports()}
        {screen === 'agents' && renderAgents()}
        {screen === 'activity' && renderActivity()}
        {screen === 'stock' && renderStock()}
        {screen === 'corrections' && renderCorrections()}
        {screen === 'analytics' && renderAnalytics()}
        {screen === 'map' && <SalesMapScreen sales={sales} onBack={() => setScreen('reports')} />}
        {screen === 'trips' && renderTrips()}
      </View>

      {/* MODAL: Issue Stock */}
      <Modal visible={issueModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Issue Stock to Agent</Text>

            <Text style={styles.label}>Select Agent:</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {agents.filter((a) => a.status !== 'former').map((a) => (
                <TouchableOpacity key={a.id} style={[styles.periodChip, selectedAgent?.id === a.id && styles.periodChipActive]} onPress={() => setSelectedAgent(a)}>
                  <Text style={selectedAgent?.id === a.id ? styles.periodTextActive : styles.periodText}>{a.full_name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Products & Quantities:</Text>
            <ScrollView style={{ maxHeight: 200 }}>
              {issueItems.map((item, index) => (
                <View key={index} style={{ backgroundColor: C.bg, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: C.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                      {products.map((p) => (
                        <TouchableOpacity key={p.id} style={[styles.periodChip, item.product?.id === p.id && styles.periodChipActive]} onPress={() => updateIssueItem(index, 'product', p)}>
                          <Text style={item.product?.id === p.id ? styles.periodTextActive : styles.periodText}>{p.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {issueItems.length > 1 && (
                      <TouchableOpacity onPress={() => removeIssueItemLine(index)}><Text style={styles.deleteText}>Remove</Text></TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity onPress={() => updateIssueItem(index, 'isPack', !item.isPack)} style={{ paddingVertical: 6 }}>
                    <Text style={{ fontSize: 19, color: '#0b6b43', fontWeight: '600' }}>{item.isPack ? '☑' : '☐'} Issue as packs?</Text>
                  </TouchableOpacity>

                  {item.isPack ? (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <TextInput style={[styles.input, { minWidth: 80, flexGrow: 1 }]} placeholder="Packs" keyboardType="numeric" value={item.packCount || ''} onChangeText={(val) => updateIssuePack(index, 'packCount', val)} />
                      <TextInput style={[styles.input, { minWidth: 80, flexGrow: 1 }]} placeholder="Per pack" keyboardType="numeric" value={item.unitsPerPack || ''} onChangeText={(val) => updateIssuePack(index, 'unitsPerPack', val)} />
                      <TextInput style={[styles.input, { minWidth: 80, flexGrow: 1 }]} placeholder="Leftover" keyboardType="numeric" value={item.leftoverUnits || ''} onChangeText={(val) => updateIssuePack(index, 'leftoverUnits', val)} />
                    </View>
                  ) : (
                    <TextInput style={styles.input} placeholder="Quantity" keyboardType="numeric" value={item.qty} onChangeText={(val) => updateIssueItem(index, 'qty', val)} />
                  )}

                  <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="Expiry (YYYY-MM-DD)" value={item.expiry || ''} onChangeText={(val) => updateIssueExpiry(index, val)} />
                </View>         
              ))}
            </ScrollView>

            <TouchableOpacity style={{ marginVertical: 8 }} onPress={addIssueItemLine}><Text style={styles.linkText}>+ Add Another Product</Text></TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setIssueModalOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitIssue}><Text style={styles.primaryBtnText}>Confirm Issuance</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Sales History */}
      <Modal visible={!!historyAgent} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>{historyAgent?.full_name} — Sales History</Text>
            <PeriodTabRow period={historyPeriod} setPeriod={setHistoryPeriod} />
            {historyPeriod === 'custom' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Year" keyboardType="numeric" value={customYear} onChangeText={setCustomYear} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Month" keyboardType="numeric" value={customMonth} onChangeText={setCustomMonth} />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Day" keyboardType="numeric" value={customDay} onChangeText={setCustomDay} />
              </View>
            )}

            <TouchableOpacity onPress={() => setShowArchived((v) => !v)}>
              <Text style={styles.linkText}>{showArchived ? 'Hide archived' : 'Show archived'}</Text>
            </TouchableOpacity>

            <ReportActions
              onPrint={handlePrintSalesReport}
              shareText={salesShareText()}
              emailSubject={`${historyAgent?.full_name} Sales Report`}
              buildPdfHtml={buildSalesReportHTML}
              pdfFileName={`${historyAgent?.full_name}_sales_report`}
            />

            <ScrollView style={{ marginTop: 10 }}>
              {filteredHistory.length === 0 ? <Text style={styles.emptyText}>No sales in this period.</Text> : filteredHistory.map((s) => (
                <View key={s.id} style={styles.row}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.rowTitle}>{s.productName} ({s.store_name}){s.archived ? ' (archived)' : ''}</Text>
                    <Text style={styles.detail}>GHS {Number(s.actual_cash).toFixed(2)} · {s.payment_type === 'momo' ? '📱 MoMo' : '💵 Cash'}{s.payment_type === 'momo' && s.momo_ref ? ` (${s.momo_ref})` : ''}</Text>
                  </View>
                  <Text style={styles.detail}>Qty: {s.items_sold}{s.pack_count ? ` (${s.pack_count} packs × ${s.units_per_pack})` : ''} · Comm: GHS {Number(s.commission_earned || 0).toFixed(2)}{s.location_label ? ` · ${s.location_label}` : ''}</Text>
                  <View style={styles.agentLinkRow}>
                    <TouchableOpacity onPress={() => openCorrectSale(s)}><Text style={styles.actionText}>Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleArchiveSale(s)}><Text style={styles.actionText}>{s.archived ? 'Unarchive' : 'Archive'}</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteSale(s)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setHistoryAgent(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Issue History */}
      <Modal visible={!!issueHistoryAgent} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>{issueHistoryAgent?.full_name} — Issue History</Text>
            <PeriodTabRow period={issueHistoryPeriod} setPeriod={setIssueHistoryPeriod} />
            {issueHistoryPeriod === 'custom' && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Year" keyboardType="numeric" value={issueCustomYear} onChangeText={setIssueCustomYear} />
                <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Month" keyboardType="numeric" value={issueCustomMonth} onChangeText={setIssueCustomMonth} />
                <TextInput style={[styles.input, { minWidth: 90, flexGrow: 1 }]} placeholder="Day" keyboardType="numeric" value={issueCustomDay} onChangeText={setIssueCustomDay} />
              </View>
            )}

            <ReportActions
              onPrint={handlePrintIssueReport}
              shareText={issueShareText()}
              emailSubject={`${issueHistoryAgent?.full_name} Stock Report`}
              buildPdfHtml={buildIssueReportHTML}
              pdfFileName={`${issueHistoryAgent?.full_name}_stock_report`}
            />

            <ScrollView style={{ marginTop: 10 }}>
              {filteredIssues.length === 0 ? <Text style={styles.emptyText}>None.</Text> : filteredIssues.map((i) => (
                <View key={i.id} style={styles.row}>
                  <Text style={styles.rowTitle}>{i.productName}</Text>
                  <Text style={styles.detail}>{i.quantity_issued} units · {new Date(i.issued_at).toLocaleString()}</Text>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setIssueHistoryAgent(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

          {/* MODAL: Commission & Tips */}
      <Modal visible={!!commissionAgent} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '85%', padding: 0 }]}>
            
            {/* FIXED HEADER WITH CLOSE BUTTON */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{commissionAgent?.full_name} — Commission</Text>
              <TouchableOpacity onPress={() => setCommissionAgent(null)} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
              </TouchableOpacity>
            </View>

            {/* SCROLLABLE CONTENT */}
            <ScrollView style={{ padding: 20 }}>
              {commissionAgent && (
                <>
                <Text style={styles.detail}>Sales Commission: GHS {agentAutoCommission(commissionAgent.id).toFixed(2)}</Text>
                <Text style={styles.detail}>Adjustments/Tips: GHS {agentTipsTotal(commissionAgent.id).toFixed(2)}</Text>
                <Text style={styles.detail}>Already Paid: GHS {agentPaidTotal(commissionAgent.id).toFixed(2)}</Text>
                <Text style={[styles.rowTitle, { marginVertical: 8, color: agentOwed(commissionAgent.id) > 0.5 ? C.red : C.ink }]}>
                  Currently Owed: GHS {agentOwed(commissionAgent.id).toFixed(2)}
                </Text>

                <Text style={styles.sectionTitle}>Mark Commission as Paid</Text>
                <TextInput
                  style={styles.input}
                  placeholder={`Amount (owed: GHS ${agentOwed(commissionAgent.id).toFixed(2)})`}
                  keyboardType="numeric"
                  value={payAmount}
                  onChangeText={setPayAmount}
                />
                <TouchableOpacity style={styles.primaryBtn} onPress={submitPayment}><Text style={styles.primaryBtnText}>Record Payment</Text></TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Payment History</Text>
                <ScrollView style={{ maxHeight: 100 }}>
                  {agentPayments(commissionAgent.id).length === 0 ? <Text style={styles.emptyText}>No payments recorded yet.</Text> : agentPayments(commissionAgent.id).map((p) => (
                    <View key={p.id} style={styles.row}>
                      <Text style={styles.rowTitle}>GHS {Number(p.amount).toFixed(2)} paid</Text>
                      <Text style={styles.detail}>{new Date(p.paid_at).toLocaleString()}</Text>
                    </View>
                  ))}
                </ScrollView>

                <Text style={styles.sectionTitle}>Add Adjustment/Tip</Text>
                <TextInput style={styles.input} placeholder="Amount (e.g. 50 or -20)" keyboardType="numeric" value={tipAmount} onChangeText={setTipAmount} />
                <TextInput style={styles.input} placeholder="Note (optional)" value={tipNote} onChangeText={setTipNote} />
                <TouchableOpacity style={styles.primaryBtn} onPress={submitTip}><Text style={styles.primaryBtnText}>Add Adjustment</Text></TouchableOpacity>

                <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Adjustment History</Text>
                   <View style={{ maxHeight: 150 }}>
                  {agentTips(commissionAgent.id).map((t) => (
                    <View key={t.id} style={styles.row}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={styles.rowTitle}>GHS {Number(t.amount).toFixed(2)}</Text>
                        <TouchableOpacity onPress={() => deleteTip(t)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                      </View>
                      {t.note && <Text style={styles.detail}>{t.note}</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Edit Sale */}
      <Modal visible={!!correctModalSale} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Correct Sale Record</Text>
            <TextInput style={styles.input} placeholder="Quantity Sold" keyboardType="numeric" value={correctItemsSold} onChangeText={setCorrectItemsSold} />
            <TextInput style={styles.input} placeholder="Cash Collected" keyboardType="numeric" value={correctActualCash} onChangeText={setCorrectActualCash} />
            <TextInput style={styles.input} placeholder="Reason / Note" value={correctNote} onChangeText={setCorrectNote} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCorrectModalSale(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitCorrection}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Edit Issue Qty */}
      <Modal visible={!!correctIssueModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Issued Quantity</Text>
            <TextInput style={styles.input} placeholder="New Quantity" keyboardType="numeric" value={correctIssueQty} onChangeText={setCorrectIssueQty} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setCorrectIssueModal(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitCorrectIssue}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Manage Agent */}
      <Modal visible={!!manageAgent} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Manage — {manageAgent?.full_name}</Text>
            <Text style={styles.label}>These actions change what this account can do. Choose carefully.</Text>

            {manageAgent?.status === 'former' ? (
              <TouchableOpacity style={styles.manageOption} onPress={() => reactivateAgent(manageAgent)}>
                <Text style={styles.manageOptionText}>Reactivate Agent</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.manageOption} onPress={() => toggleAgentStatus(manageAgent)}>
                  <Text style={styles.manageOptionText}>{manageAgent?.status === 'inactive' ? 'Set Active' : 'Set Inactive'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.manageOption} onPress={() => setAgentFormer(manageAgent)}>
                  <Text style={styles.manageOptionText}>Mark as Former</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.manageOption} onPress={() => { 
              const a = manageAgent; 
              setManageAgent(null); 
              setTargetAgent(a); 
              setDailyTargetInput('50');
            }}>
              <Text style={styles.manageOptionText}>🎯 Set Daily Sales Target</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.manageOption} onPress={() => { const a = manageAgent; setManageAgent(null); setResetAgent(a); }}>
              <Text style={styles.manageOptionText}>Reset Login (Phone / Password)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.manageOption, styles.manageOptionDanger]} onPress={() => deleteAgent(manageAgent)}>
              <Text style={styles.manageOptionDangerText}>Delete Agent Permanently</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { marginTop: 12 }]} onPress={() => setManageAgent(null)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Monthly Target */}
      <Modal visible={targetModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Monthly Target</Text>
            <Text style={styles.label}>Target cash collection for this month (GHS)</Text>
            <TextInput style={styles.input} placeholder="e.g. 5000" keyboardType="numeric" value={targetAmount} onChangeText={setTargetAmount} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTargetModalOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitTarget}><Text style={styles.primaryBtnText}>Save Target</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Daily Target */}
      <Modal visible={!!targetAgent} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Daily Goal — {targetAgent?.full_name}</Text>
            <Text style={styles.label}>How many units should they sell per day?</Text>
           <TextInput 
  style={styles.input} 
  placeholder="e.g. 50" 
  keyboardType="numeric" 
  value={String(dailyTargetInput)} 
  onChangeText={(text) => setDailyTargetInput(text.replace(/[^0-9]/g, ''))} 
/>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setTargetAgent(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
<TouchableOpacity style={styles.primaryBtn} onPress={() => submitDailyTarget(dailyTargetInput)}>
                <Text style={styles.primaryBtnText}>Save Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmModal
        visible={!!confirmAction}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        destructive={confirmAction?.destructive}
        onConfirm={confirmAction?.onConfirm}
        onCancel={() => setConfirmAction(null)}
      />
            
      <LeaderboardModal
        visible={leaderboardOpen}
        sales={sales}
        agents={agents}
        onClose={() => setLeaderboardOpen(false)}
      />
      <ActivityCalendarModal
        visible={!!calendarAgent}
        agentName={calendarAgent?.full_name}
        sales={sales.filter((s) => s.worker_id === calendarAgent?.id)}
        onClose={() => setCalendarAgent(null)}
      />
      <Modal visible={!!routeHistoryAgent} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '75%' }]}>
            <Text style={styles.modalTitle}>{routeHistoryAgent?.full_name}'s Route History</Text>
            <ScrollView style={{ maxHeight: 350 }}>
              {routeHistoryList.length === 0 ? (
                <Text style={styles.emptyText}>No routes assigned yet.</Text>
              ) : (
                routeHistoryList.map((r) => (
                  <View key={r.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{r.store_name}{r.removed ? ' (removed)' : ''}</Text>
                    <Text style={styles.detail}>Status: {r.status} · Assigned {new Date(r.created_at).toLocaleDateString()}</Text>
                    <View style={{ flexDirection: 'row', gap: 14, marginTop: 6 }}>
                      <TouchableOpacity onPress={() => openEditRoute(r)}><Text style={styles.linkText}>Edit</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleRemoveRoute(r)}><Text style={styles.linkText}>{r.removed ? 'Restore' : 'Remove'}</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteRoutePermanently(r)}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setRouteHistoryAgent(null)} style={{ marginTop: 12 }}><Text style={styles.cancelBtnText}>Close</Text></TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={!!editRouteItem} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Route</Text>
            <Text style={styles.label}>Store or customer name</Text>
            <TextInput style={styles.input} value={editRouteStoreName} onChangeText={setEditRouteStoreName} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditRouteItem(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitEditRoute}><Text style={styles.primaryBtnText}>Save</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal visible={routeModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign Route — {routeAgent?.full_name}</Text>
            <Text style={styles.label}>Store or customer name</Text>
            <TextInput style={styles.input} value={routeStoreName} onChangeText={setRouteStoreName} placeholder="e.g. Kejetia Market Stall 4" />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRouteModalOpen(false)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.primaryBtn} onPress={submitRoute}><Text style={styles.primaryBtnText}>Assign</Text></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* MODAL: Agent Profile Drill-Down */}
      <Modal visible={!!profileAgent} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '85%', padding: 0 }]}>
            
            {/* HEADER */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <View>
                <Text style={{ fontSize: 22, fontWeight: '800', color: C.ink }}>{profileAgent?.full_name}</Text>
                <Text style={{ fontSize: 13, color: C.sub, marginTop: 2 }}>Agent Performance Profile</Text>
              </View>
              <TouchableOpacity onPress={() => setProfileAgent(null)} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
              </TouchableOpacity>
            </View>

                                                                                           {/* ✅ PERSONAL & COMPLIANCE BLOCK */}
            <View style={{ backgroundColor: '#f8fafc', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: C.ink, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>🏠 Personal & Compliance</Text>
              
              {/* ROW 1: Address & Emergency Contact */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Home Address</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, padding: 10, fontSize: 13 }]}
                    value={profileAgent?.compliance_info?.home_address || ''}
                    onChangeText={(text) => setProfileAgent({ 
                      ...profileAgent, 
                      compliance_info: { ...(profileAgent.compliance_info || {}), home_address: text } 
                    })}
                    placeholder="e.g. House No. 12, Yamfo"
                    placeholderTextColor="#94a3b8"
                    multiline
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Emergency Contact</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, padding: 10, fontSize: 13 }]}
                    value={profileAgent?.compliance_info?.emergency_contact || ''}
                    onChangeText={(text) => setProfileAgent({ 
                      ...profileAgent, 
                      compliance_info: { ...(profileAgent.compliance_info || {}), emergency_contact: text } 
                    })}
                    placeholder="e.g. 0244 123 456 (Wife)"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* ROW 2: DOB & Guarantor Name */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Date of Birth</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, padding: 10, fontSize: 13 }]}
                    value={profileAgent?.compliance_info?.date_of_birth || ''}
                    onChangeText={(text) => setProfileAgent({ 
                      ...profileAgent, 
                      compliance_info: { ...(profileAgent.compliance_info || {}), date_of_birth: text } 
                    })}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Guarantor Name</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, padding: 10, fontSize: 13 }]}
                    value={profileAgent?.compliance_info?.guarantor_name || ''}
                    onChangeText={(text) => setProfileAgent({ 
                      ...profileAgent, 
                      compliance_info: { ...(profileAgent.compliance_info || {}), guarantor_name: text } 
                    })}
                    placeholder="e.g. John Doe"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
              </View>

              {/* ROW 3: Guarantor Phone & Save Button */}
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 }}>Guarantor Phone</Text>
                  <TextInput
                    style={[styles.input, { marginBottom: 0, padding: 10, fontSize: 13 }]}
                    value={profileAgent?.compliance_info?.guarantor_phone || ''}
                    onChangeText={(text) => setProfileAgent({ 
                      ...profileAgent, 
                      compliance_info: { ...(profileAgent.compliance_info || {}), guarantor_phone: text } 
                    })}
                    placeholder="e.g. 0555 123 456"
                    placeholderTextColor="#94a3b8"
                  />
                </View>
                
                <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                  <TouchableOpacity
                    style={{ backgroundColor: C.green, paddingVertical: 14, borderRadius: 8, alignItems: 'center' }}
                    onPress={async () => {
                      try {
                        // We only update the one single JSON column
                        const { error } = await supabase.from('profiles')
                          .update({ compliance_info: profileAgent.compliance_info })
                          .eq('id', profileAgent.id);
                        
                        if (error) {
                          Alert.alert('Save Failed', 'Error: ' + error.message);
                        } else {
                          Alert.alert('Success', 'Details saved perfectly.');
                          setProfileAgent(null); 
                          fetchAll();
                        }
                      } catch (err) {
                        Alert.alert('System Error', err.message);
                      }
                    }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>Save Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <ScrollView style={{ padding: 20 }}>
              {profileAgent && (() => {
                // --- CALCULATIONS FOR THIS AGENT ---
                const agentSales = sales.filter((s) => s.worker_id === profileAgent.id);
                const agentTotalCash = agentSales.reduce((sum, s) => sum + Number(s.actual_cash), 0);
                const agentTotalUnits = agentSales.reduce((sum, s) => sum + s.items_sold, 0);
                
                const agentIssued = issues.filter((i) => i.agent_id === profileAgent.id).reduce((sum, i) => sum + i.quantity_issued, 0);
                const sellThrough = agentIssued > 0 ? Math.round((agentTotalUnits / agentIssued) * 100) : 0;

                // Top Product
                const productCounts = {};
                agentSales.forEach((s) => {
                  productCounts[s.productName] = (productCounts[s.productName] || 0) + s.items_sold;
                });
                const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];

                // Last 7 Days Chart
                const agent7Days = [];
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(); d.setDate(d.getDate() - i);
                  const dayCash = agentSales.filter((s) => isSameDay(new Date(s.created_at), d)).reduce((sum, s) => sum + Number(s.actual_cash), 0);
                  agent7Days.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), cash: dayCash });
                }
                const maxAgentDayCash = Math.max(...agent7Days.map((d) => d.cash), 1);

                return (
                  <>
                            {/* KPI CARDS */}
                    <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                      <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase' }}>Cash Collected</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: C.green, marginTop: 4 }}>GHS {agentTotalCash.toFixed(2)}</Text>
                      </View>
                      <View style={{ flex: 1, backgroundColor: '#f8fafc', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border }}>
                        <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', textTransform: 'uppercase' }}>Units Sold</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 4 }}>{agentTotalUnits}</Text>
                      </View>
                      {/*  NEW PROFIT CARD */}
                      <View style={{ flex: 1, backgroundColor: '#f0fdf4', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0' }}>
                        <Text style={{ fontSize: 11, color: '#166534', fontWeight: '700', textTransform: 'uppercase' }}>Net Profit</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: '#166534', marginTop: 4 }}>
                          GHS {(agentTotalCash - agentSales.reduce((sum, s) => sum + Number(s.commission_earned || 0), 0)).toFixed(2)}
                        </Text>
                      </View>
                    </View>

                    {/* SELL-THROUGH BAR */}
                    <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 16 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>Stock Sell-Through</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: sellThrough > 70 ? C.green : sellThrough > 40 ? C.blue : C.red }}>{sellThrough}%</Text>
                      </View>
                      <View style={{ height: 10, backgroundColor: '#f1f5f9', borderRadius: 5, overflow: 'hidden' }}>
                        <View style={{ height: 10, width: `${sellThrough}%`, backgroundColor: sellThrough > 70 ? C.green : sellThrough > 40 ? C.blue : C.red, borderRadius: 5 }} />
                      </View>
                      <Text style={{ fontSize: 12, color: C.sub, marginTop: 6 }}>{agentTotalUnits} sold of {agentIssued} issued</Text>
                    </View>

                    {/* TOP PRODUCT */}
                    {topProduct && (
                      <View style={{ backgroundColor: '#fdf7e6', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', marginBottom: 16 }}>
                        <Text style={{ fontSize: 11, color: '#b45309', fontWeight: '700', textTransform: 'uppercase' }}>🏆 Top Selling Product</Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: C.ink, marginTop: 4 }}>{topProduct[0]}</Text>
                        <Text style={{ fontSize: 13, color: '#b45309', fontWeight: '600', marginTop: 2 }}>{topProduct[1]} units sold</Text>
                      </View>
                    )}

                    {/* 7-DAY CHART */}
                    <Text style={{ fontSize: 15, fontWeight: '800', color: C.ink, marginBottom: 12, marginTop: 8 }}>Last 7 Days</Text>
                    <View style={{ backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: C.border, marginBottom: 20 }}>
                      {agent7Days.map((d, i) => (
                        <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 10 }}>
                          <Text style={{ width: 40, fontSize: 13, fontWeight: '600', color: C.ink }}>{d.label}</Text>
                          <View style={{ flex: 1, height: 12, backgroundColor: '#f1f5f9', borderRadius: 6, overflow: 'hidden' }}>
                            <View style={{ height: 12, width: `${(d.cash / maxAgentDayCash) * 100}%`, backgroundColor: C.blue, borderRadius: 6 }} />
                          </View>
                          <Text style={{ width: 70, fontSize: 12, fontWeight: '700', color: C.sub, textAlign: 'right' }}>GHS {d.cash.toFixed(0)}</Text>
                        </View>
                      ))}
                    </View>

                    {/* ACTION BUTTONS */}
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      <TouchableOpacity style={[styles.primaryBtn, { flex: 1, paddingVertical: 12 }]} onPress={() => { setProfileAgent(null); openHistory(profileAgent); }}>
                        <Text style={[styles.primaryBtnText, { textAlign: 'center' }]}>📈 Full Sales History</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryBtn, { flex: 1, paddingVertical: 12 }]} onPress={() => { setProfileAgent(null); openCommission(profileAgent); }}>
                        <Text style={[styles.secondaryBtnText, { textAlign: 'center' }]}>💰 Commission</Text>
                      </TouchableOpacity>
                    </View>

                  </>
                );
              })()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <AccountSettingsModal visible={passwordModalOpen} onClose={() => setPasswordModalOpen(false)} currentPhone={user?.phone} onUpdated={onLogout} />
      <HelpGuideModal visible={helpGuideOpen} onClose={() => setHelpGuideOpen(false)} role="manager" />
      <DocumentCaptureModal visible={documentsModalOpen} onClose={() => setDocumentsModalOpen(false)} userId={user.id} />
      <VoiceNoteModal visible={voiceNotesOpen} onClose={() => setVoiceNotesOpen(false)} userId={user.id} isManager={true} productNames={products.map((p) => p.name)} />
      <CreditLedgerModal visible={creditModalOpen} onClose={() => setCreditModalOpen(false)} />
      <AgentResetModal visible={!!resetAgent} onClose={() => setResetAgent(null)} agent={resetAgent} />
              <RegisterAgentModal visible={registerModalOpen} onClose={() => setRegisterModalOpen(false)} onRegistered={fetchAll} />
      <AISupportModal visible={aiAssistantOpen} onClose={() => setAiAssistantOpen(false)} /> 
      
      {/* MODAL: Business Expenses */}
          <Modal visible={expenseModalOpen} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={[styles.modalContent, { maxHeight: '85%', padding: 0 }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' }}>
              <Text style={styles.modalTitle}>💸 Business Expenses</Text>
              <TouchableOpacity onPress={() => setExpenseModalOpen(false)} style={{ backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#475569' }}>Close ✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }}>
              <View style={{ backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 20 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 8 }}>Log a New Expense</Text>
                <TextInput style={styles.input} placeholder="Category (e.g. Rent, Fuel, Salary)" value={expenseCategory} onChangeText={setExpenseCategory} />
                <TextInput style={styles.input} placeholder="Amount (GHS)" keyboardType="numeric" value={expenseAmount} onChangeText={setExpenseAmount} />
                <TextInput style={styles.input} placeholder="Note (optional)" value={expenseNote} onChangeText={setExpenseNote} />
                <TouchableOpacity style={styles.primaryBtn} onPress={submitExpense}>
                  <Text style={styles.primaryBtnText}>Save Expense</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.sectionTitle}>Expense History</Text>
              {expenses.length === 0 ? (
                <Text style={styles.emptyText}>No expenses logged yet.</Text>
              ) : (
                expenses.map((exp) => (
                  <View key={exp.id} style={styles.row}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={styles.rowTitle}>{exp.category}</Text>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: C.red }}>-GHS {Number(exp.amount).toFixed(2)}</Text>
                    </View>
                    {exp.note && <Text style={styles.detail}>{exp.note}</Text>}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <Text style={styles.detail}>{new Date(exp.created_at).toLocaleDateString()}</Text>
                      <TouchableOpacity onPress={() => deleteExpense(exp)}><Text style={{ fontSize: 12, color: '#dc2626', fontWeight: '600' }}>Delete</Text></TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const getStyles = (C) => StyleSheet.create({
    toastContainer: { 
    position: 'absolute', 
    top: 60, 
    alignSelf: 'center', 
    backgroundColor: '#0f172a', 
    paddingVertical: 12, 
    paddingHorizontal: 24, 
    borderRadius: 30, 
    zIndex: 9999, 
    elevation: 10, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8 
  },
  toastText: { 
    color: '#ffffff', 
    fontWeight: '800', 
    fontSize: 15 
  },
  activityBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.greenTint, borderWidth: 1, borderColor: C.green, borderRadius: 12, padding: 16, marginBottom: 16 },
  activityBannerText: { fontSize: 16, fontWeight: '800', color: C.ink },
  activityBannerArrow: { fontSize: 22, color: C.green, fontWeight: '800' },
  heroText: { fontSize: 16, color: C.ink, marginBottom: 16, lineHeight: 22 },
  actionBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.blueTint, borderRadius: 12, padding: 16, marginBottom: 16 },
  actionBannerText: { fontSize: 18, fontWeight: '700', color: C.ink, flex: 1, marginRight: 8 },
  helperText: { fontSize: 17, color: C.sub, marginBottom: 16 },
  reportCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 14, padding: 18, marginBottom: 12 },
  reportCardIcon: { fontSize: 30, marginRight: 14 },
  reportCardTitle: { fontSize: 17, fontWeight: '800', color: C.ink },
  reportCardSub: { fontSize: 13, color: C.sub, marginTop: 2 },
  layout: { flex: 1, flexDirection: 'row', backgroundColor: C.bg },
  mainContent: { flex: 1, padding: 16 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: C.ink, marginBottom: 16, letterSpacing: -0.5 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 12, marginTop: 16, letterSpacing: -0.3 },
  list: { flex: 1, padding: 24, paddingTop: 40, paddingBottom: 140, width: '100%', maxWidth: 900, alignSelf: 'center' },
  kpiRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  kpiCard: { width: '47%', backgroundColor: C.white, padding: 16, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  kpiLabel: { fontSize: 13, color: C.sub },
  kpiValue: { fontSize: 22, fontWeight: 'bold', color: C.ink, marginTop: 6 },
  row: { backgroundColor: C.white, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  agentCard: { backgroundColor: C.white, padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: C.border },
  agentCardInactive: { opacity: 0.7, backgroundColor: '#f1f5f9' },
  rowTitle: { fontSize: 18, fontWeight: 'bold', color: C.ink },
  detail: { fontSize: 13, color: C.sub, marginTop: 2 },
  locationSubDetail: { fontSize: 17, color: C.sub, marginBottom: 4, marginLeft: 2 },
  reasonText: { fontSize: 18, fontStyle: 'italic', color: C.ink, marginTop: 4 },
  statusDot: { fontSize: 17, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },
  statusActive: { backgroundColor: C.blueTint, color: C.blue },
  statusInactive: { backgroundColor: '#e2e8f0', color: C.sub },
    actionChip: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  actionChipText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  agentLinkRow: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  agentLinkRow: { flexDirection: 'row', gap: 12, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' },
  linkText: { fontSize: 13, color: C.blue, fontWeight: '600' },
  manageText: { fontSize: 13, color: C.sub, fontWeight: '700' },
  actionText: { fontSize: 13, color: C.ink, fontWeight: '500' },
  deleteText: { fontSize: 17, color: C.red, fontWeight: '700', paddingVertical: 8 },
  emptyText: { textAlign: 'center', color: C.sub, marginVertical: 20 },
  primaryBtn: { backgroundColor: C.blue, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  primaryBtnText: { color: C.white, fontWeight: 'bold', fontSize: 13, textAlign: 'center' },
  secondaryBtn: { backgroundColor: C.blueTint, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: C.blue },
  secondaryBtnText: { color: C.blue, fontWeight: 'bold', fontSize: 13 },
  approveBtn: { backgroundColor: C.blue, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  approveBtnText: { color: C.white, fontSize: 18, fontWeight: 'bold' },
  rejectBtn: { backgroundColor: C.redTint, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: C.red },
  rejectBtnText: { color: C.red, fontSize: 18, fontWeight: 'bold' },
  periodRow: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  periodChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e2e8f0' },
  periodChipActive: { backgroundColor: C.blue },
  periodText: { fontSize: 14, color: '#374151' },
  periodTextActive: { fontSize: 14, color: '#ffffff', fontWeight: 'bold' },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  barLabel: { width: 90, fontSize: 18, color: C.ink, fontWeight: '600' },
  barTrack: { flex: 1, height: 14, backgroundColor: '#f1f5f9', borderRadius: 7, overflow: 'hidden' },
  barFill: { height: 14, borderRadius: 7 },
  barValue: { width: 80, fontSize: 11, color: C.sub, textAlign: 'right' },
    targetBox: { 
    backgroundColor: C.white, 
    borderWidth: 1, 
    borderColor: C.border, 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12,
    elevation: 3
  },
  progressTrack: { height: 12, backgroundColor: '#e2e8f0', borderRadius: 6, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: 12, backgroundColor: C.blue, borderRadius: 6 },
  alertBox: { backgroundColor: C.redTint, borderWidth: 1, borderColor: C.red, borderRadius: 8, padding: 12, marginBottom: 16 },
  alertText: { fontSize: 13, color: C.red, marginTop: 4 },
  rowUnseen: { borderColor: C.green, borderWidth: 1.5, backgroundColor: C.greenTint },
modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', maxWidth: 480, backgroundColor: C.card, borderRadius: 12, padding: 20, borderWidth: 1, borderColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: C.ink, marginBottom: 12 },
    input: { 
    backgroundColor: '#ffffff',        // Force pure white background
    borderWidth: 1, 
    borderColor: '#cbd5e1', 
    borderRadius: 10, 
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#000000',                  // Force black text so it NEVER disappears
    placeholderTextColor: '#64748b',   // Force grey placeholders
    marginBottom: 12
  },
  label: { fontSize: 18, color: C.sub, marginBottom: 4 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, backgroundColor: C.background, borderWidth: 1, borderColor: C.border, alignItems: 'center' },
  cancelBtnText: { color: C.ink, fontSize: 17, fontWeight: '600' },
  manageOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
  manageOptionText: { fontSize: 17, fontWeight: '600', color: C.ink },
  manageOptionDanger: { borderBottomWidth: 0, marginTop: 4 },
  manageOptionDangerText: { fontSize: 17, fontWeight: '700', color: C.red },
});